"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { StepLog } from "@/components/demo/StepLog";
import { useAttestation } from "@/components/demo/useAttestation";
import { Hash } from "@/components/ui/Hash";
import { RedactedLines } from "@/components/ui/Redaction";
import { NETWORK_UNAVAILABLE, SOURCE_LABEL } from "@/src/lib/attestation/adapter";
import { freshSalt, getDemoAdapter, resetDemoLedger } from "@/src/lib/attestation/browser";
import { RECEIPT_STATE, issuedStatus } from "@/src/lib/attestation/receipt";
import { AlreadyAttested } from "@/components/demo/AlreadyAttested";
import { deriveCommitments, type DerivedCommitments } from "@/src/lib/attestation/evaluation";
import {
  createLocalCircuitClient,
  probeLocalCircuit,
  type LocalCircuitStatus,
} from "@/src/lib/attestation/local-circuit-client";
import type { AttestationTarget, PrivateEvaluation } from "@/src/lib/attestation/types";
import { encodeRecord } from "@/src/lib/attestation/verify";
import { DEMO_EVALUATION, DEMO_PREDICATE } from "@/src/lib/demo/fixture";
import { Flag } from "@/components/ui/Flag";

type AdapterChoice = "DEMO" | "MIDNIGHT_LOCAL";

const UNREGISTERED_SECRET = `0x${"5e".repeat(32)}`;

function Section({
  n,
  title,
  scope = "Private",
  children,
}: {
  n: string;
  title: string;
  scope?: "Private" | "Public" | "Contract";
  children: React.ReactNode;
}) {
  const id = `sec-${n}`;
  return (
    <section aria-labelledby={id} className="grid gap-4 border-t border-ink py-8 lg:grid-cols-12 lg:gap-6">
      <div className="lg:col-span-3">
        <p className="t-label text-graphite">§ {n}</p>
        <h2 id={id} className="t-label mt-1">
          {title}
        </h2>
        <p className={`t-label mt-3 inline-block px-1.5 py-0.5 ${scope === "Public" ? "bg-ink text-paper" : "border border-line text-graphite"}`}>
          {scope}
        </p>
      </div>
      <div className="min-w-0 lg:col-span-9">{children}</div>
    </section>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="grid gap-1 border-b border-line py-3 sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-6">
      <div className="t-label text-graphite pt-0.5">{label}</div>
      <div className="min-w-0">
        {children}
        {hint && <p className="mt-1 text-[0.8125rem] text-graphite">{hint}</p>}
      </div>
    </div>
  );
}

const input =
  "t-data w-full border-b border-ink bg-transparent py-1 outline-none focus-visible:outline-2 focus-visible:outline-offset-4";

function Binding({ live, pinned }: { live?: string; pinned?: string }) {
  if (!live || !pinned) return <span className="t-label text-graphite">Computing…</span>;
  const bound = live === pinned;
  return (
    <span className="t-label" role="status">
      {bound ? "Bound — matches the published commitment" : <Flag>Diverged — no longer matches the published commitment</Flag>}
    </span>
  );
}

export function EvaluatorConsole() {
  const [evaluationId, setEvaluationId] = useState(DEMO_EVALUATION.evaluationId);
  const [buildId, setBuildId] = useState(DEMO_EVALUATION.model.buildId);
  const [artifact, setArtifact] = useState(String(DEMO_EVALUATION.model.manifest.artifact));
  const [suiteEdited, setSuiteEdited] = useState(false);
  const [suiteSalt, setSuiteSalt] = useState(DEMO_EVALUATION.suiteSalt);
  const [results, setResults] = useState<boolean[]>([...DEMO_EVALUATION.results]);
  const [notes, setNotes] = useState(DEMO_EVALUATION.notes);
  const [registeredKey, setRegisteredKey] = useState(true);
  const [adapterChoice, setAdapterChoice] = useState<AdapterChoice>("DEMO");
  const [local, setLocal] = useState<LocalCircuitStatus | null>(null);
  const [derived, setDerived] = useState<DerivedCommitments | null>(null);
  const [published, setPublished] = useState<AttestationTarget | null>(null);
  const { phase, steps, outcome, disclosed, error, attest, reset } = useAttestation();

  const evaluation: PrivateEvaluation = useMemo(() => {
    const checks = DEMO_EVALUATION.suite.checks.map((c, i) =>
      suiteEdited && i === 1 ? { ...c, cases: c.cases.slice(1) } : c,
    );
    return {
      ...DEMO_EVALUATION,
      evaluationId,
      model: { buildId, manifest: { ...DEMO_EVALUATION.model.manifest, artifact } },
      suite: { ...DEMO_EVALUATION.suite, checks },
      suiteSalt,
      results,
      notes,
      evaluatorSecret: registeredKey ? DEMO_EVALUATION.evaluatorSecret : UNREGISTERED_SECRET,
    };
  }, [evaluationId, buildId, artifact, suiteEdited, suiteSalt, results, notes, registeredKey]);

  useEffect(() => {
    let live = true;
    deriveCommitments(evaluation).then((d) => {
      if (!live) return;
      setDerived(d);
      setPublished((p) => p ?? { modelCommitment: d.modelCommitment, suiteCommitment: d.suiteCommitment });
    });
    return () => {
      live = false;
    };
  }, [evaluation]);

  useEffect(() => {
    probeLocalCircuit().then(setLocal);
  }, []);

  const passes = results.filter(Boolean).length;
  const running = phase === "running";
  const cases = evaluation.suite.checks.reduce((n, c) => n + c.cases.length, 0);

  function change<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      reset();
    };
  }

  function publishCurrent() {
    if (!derived) return;
    setPublished({ modelCommitment: derived.modelCommitment, suiteCommitment: derived.suiteCommitment });
    reset();
  }

  async function generate() {
    if (!published) return;
    const adapter = adapterChoice === "MIDNIGHT_LOCAL" ? createLocalCircuitClient() : await getDemoAdapter();
    await attest(adapter, { ...evaluation, evidenceSalt: freshSalt() }, published);
  }

  return (
    <div>
      <Section n="1" title="Evaluation">
        <Field label="Evaluation ID">
          <input
            aria-label="Evaluation ID"
            className={input}
            value={evaluationId}
            onChange={(e) => change(setEvaluationId)(e.target.value)}
            spellCheck={false}
          />
        </Field>
        <Field label="Evaluator notes" hint="Never hashed, committed or published.">
          <textarea
            aria-label="Evaluator notes"
            className={`${input} min-h-20 resize-y font-sans text-[0.9375rem]`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>
      </Section>

      <Section n="2" title="Model build">
        <Field label="Model build">
          <input
            aria-label="Model build identifier"
            className={input}
            value={buildId}
            onChange={(e) => change(setBuildId)(e.target.value)}
            spellCheck={false}
          />
        </Field>
        <Field label="Artifact" hint="Part of the build manifest. Paste a real weights digest here for a real build.">
          <input
            aria-label="Build artifact description or digest"
            className={input}
            value={artifact}
            onChange={(e) => change(setArtifact)(e.target.value)}
            spellCheck={false}
          />
        </Field>
        <Field label="Model digest">
          <Hash value={derived?.modelDigest ?? ""} full />
        </Field>
        <Field label="Model build commitment">
          <Hash value={derived?.modelCommitment ?? ""} full />
          <div className="mt-2">
            <Binding live={derived?.modelCommitment} pinned={published?.modelCommitment} />
          </div>
        </Field>
      </Section>

      <Section n="3" title="Evaluation suite">
        <Field label="Evaluation suite">
          <span className="t-data">
            {evaluation.suite.name} · v{evaluation.suite.version}
          </span>
        </Field>
        <Field label="Sealed cases" hint={`${cases} cases in 6 checks, held on this device. Never rendered.`}>
          <div className="scan" data-active={running} style={{ ["--scan-distance" as string]: "30ch" }}>
            <RedactedLines lines={[[24, 6], [12, 15], [28], [9, 18]]} label="Suite contents, redacted" className="t-data" />
          </div>
          <button
            type="button"
            onClick={() => change(setSuiteEdited)(!suiteEdited)}
            className="t-label mt-3 underline underline-offset-4"
            aria-pressed={suiteEdited}
          >
            {suiteEdited ? "Undo the suite edit" : "Edit the sealed suite after publication"}
          </button>
        </Field>
        <Field label="Suite salt" hint="Keeps the suite commitment from being guessed. Private.">
          <span className="t-data text-graphite" aria-label="Suite salt, hidden">
            {"•".repeat(16)}
          </span>
          <button type="button" onClick={() => change(setSuiteSalt)(freshSalt())} className="t-label ml-4 underline underline-offset-4">
            Draw new salt
          </button>
        </Field>
        <Field label="Suite commitment">
          <Hash value={derived?.suiteCommitment ?? ""} full />
          <div className="mt-2">
            <Binding live={derived?.suiteCommitment} pinned={published?.suiteCommitment} />
          </div>
        </Field>
      </Section>

      <Section n="4" title="Private checks">
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">Private check results. Toggle a result to change it.</caption>
          <thead>
            <tr className="border-b border-ink">
              <th scope="col" className="t-label py-2 font-medium text-graphite">Code</th>
              <th scope="col" className="t-label py-2 font-medium text-graphite">Check</th>
              <th scope="col" className="t-label py-2 text-right font-medium text-graphite">Result</th>
            </tr>
          </thead>
          <tbody>
            {evaluation.suite.checks.map((c, i) => (
              <tr key={c.id} className="border-b border-line">
                <td className="t-data py-2.5 text-graphite">{c.id}</td>
                <td className="py-2.5">{c.name}</td>
                <td className="py-2.5 text-right">
                  <button
                    type="button"
                    onClick={() => change(setResults)(results.map((v, j) => (j === i ? !v : v)))}
                    aria-label={`${c.name}: ${results[i] ? "pass" : "fail"}. Toggle result.`}
                    className={`t-data min-w-[6ch] border px-2 py-0.5 font-medium ${
                      results[i] ? "border-ink" : "border-signal bg-ink text-signal"
                    }`}
                  >
                    {results[i] ? "PASS" : "FAIL"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="t-label pt-3 text-graphite" colSpan={2}>Passed</td>
              <td className={`pt-3 text-right font-mono text-[1.75rem] leading-none ${passes < DEMO_PREDICATE.requiredPasses ? "text-signal" : ""}`}>
                {passes} / 6
              </td>
            </tr>
          </tfoot>
        </table>
      </Section>

      <Section n="5" title="Release predicate" scope="Contract">
        <Field label="Predicate">
          <span className="t-data">{DEMO_PREDICATE.label}</span>
          <span className="t-data ml-3 text-graphite">{DEMO_PREDICATE.id}</span>
        </Field>
        <Field label="Rule" hint="Fixed at deployment in the contract's public ledger. The evaluator cannot change it.">
          <span>{DEMO_PREDICATE.statement}</span>
          <span className="t-data ml-3 text-graphite">
            countPasses(results) ≥ {DEMO_PREDICATE.requiredPasses}
          </span>
        </Field>
      </Section>

      <Section n="6" title="Evaluator key">
        <Field label="Signing key" hint="The contract accepts attestations only from the key registered at deployment.">
          <div role="radiogroup" aria-label="Signing key" className="flex flex-wrap gap-x-6 gap-y-2">
            {[
              [true, "Registered evaluator"],
              [false, "Unregistered key"],
            ].map(([value, label]) => (
              <label key={String(label)} className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="signing-key"
                  checked={registeredKey === value}
                  onChange={() => change(setRegisteredKey)(value as boolean)}
                  className="accent-ink"
                />
                <span className="text-[0.9375rem]">{label as string}</span>
              </label>
            ))}
          </div>
        </Field>
        <Field label="Evaluator public key">
          <Hash value={derived?.evaluatorKey ?? ""} full />
        </Field>
      </Section>

      <Section n="7" title="Attestation adapter" scope="Contract">
        <fieldset>
          <legend className="sr-only">Attestation adapter</legend>
          <ul>
            <li className="border-b border-line py-3">
              <label className="flex cursor-pointer gap-3">
                <input
                  type="radio"
                  name="adapter"
                  checked={adapterChoice === "DEMO"}
                  onChange={() => change(setAdapterChoice)("DEMO")}
                  className="mt-1 accent-ink"
                />
                <span>
                  <span className="t-label block">{SOURCE_LABEL.DEMO}</span>
                  <span className="text-[0.875rem] text-graphite">
                    Same commitments and assertions as the contract, computed in this browser. No proof, no chain.
                  </span>
                </span>
              </label>
            </li>
            <li className="border-b border-line py-3">
              <label className={`flex gap-3 ${local?.available ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}>
                <input
                  type="radio"
                  name="adapter"
                  disabled={!local?.available}
                  checked={adapterChoice === "MIDNIGHT_LOCAL"}
                  onChange={() => change(setAdapterChoice)("MIDNIGHT_LOCAL")}
                  className="mt-1 accent-ink"
                />
                <span>
                  <span className="t-label block">{SOURCE_LABEL.MIDNIGHT_LOCAL}</span>
                  <span className="text-[0.875rem] text-graphite">
                    {local === null
                      ? "Checking for the local circuit…"
                      : local.available
                        ? `The compiled Compact contract (compiler ${local.contract?.compiler}, runtime ${local.contract?.runtime}) executes on this machine. Assertions run; no proof is generated; nothing is submitted.`
                        : `Unavailable here. ${local.reason ?? ""} Run the project locally with npm run dev.`}
                  </span>
                </span>
              </label>
            </li>
            <li className="border-b border-line py-3">
              <label className="flex cursor-not-allowed gap-3 opacity-60">
                <input type="radio" name="adapter" disabled className="mt-1" />
                <span>
                  <span className="t-label block">{SOURCE_LABEL.MIDNIGHT}</span>
                  <span className="text-[0.875rem] text-graphite">{NETWORK_UNAVAILABLE}</span>
                </span>
              </label>
            </li>
          </ul>
        </fieldset>
      </Section>

      <Section n="8" title="Disclosure" scope="Public">
        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <h3 className="t-label border-b border-ink pb-2">Becomes public</h3>
            <ul className="t-data">
              <li className="flex justify-between gap-4 border-b border-line py-2"><span>modelCommitment</span><Hash value={published?.modelCommitment ?? ""} /></li>
              <li className="flex justify-between gap-4 border-b border-line py-2"><span>suiteCommitment</span><Hash value={published?.suiteCommitment ?? ""} /></li>
              <li className="flex justify-between gap-4 border-b border-line py-2"><span>predicate</span><span>{DEMO_PREDICATE.id}</span></li>
              <li className="flex justify-between gap-4 border-b border-line py-2"><span>evidenceCommitment</span><span className="text-graphite">at issue</span></li>
              <li className="flex justify-between gap-4 border-b border-line py-2"><span>evaluatorKey</span><Hash value={derived?.evaluatorKey ?? ""} /></li>
              <li className="flex justify-between gap-4 border-b border-line py-2"><span>releaseKey</span><span className="text-graphite">at issue</span></li>
            </ul>
          </div>
          <div>
            <h3 className="t-label border-b border-ink pb-2">Never leaves this device</h3>
            <ul className="t-data">
              {["Sealed test cases", "Model outputs", "Individual results", "Evaluator notes", "Suite and evidence salts", "Evaluator secret"].map((x) => (
                <li key={x} className="border-b border-line py-2 text-graphite">{x}</li>
              ))}
            </ul>
          </div>
        </div>
        {published && derived && (published.modelCommitment !== derived.modelCommitment || published.suiteCommitment !== derived.suiteCommitment) && (
          <p className="mt-4 text-[0.875rem]">
            The attestation targets the <em>published</em> commitments. Your current evaluation no longer matches them.{" "}
            <button type="button" onClick={publishCurrent} className="t-label underline underline-offset-4">
              Publish current commitments
            </button>
          </p>
        )}
      </Section>

      <Section n="9" title="Attestation">
        <button
          type="button"
          onClick={generate}
          disabled={running || !published}
          className="t-label w-full bg-ink px-5 py-4 text-left text-paper hover:bg-graphite disabled:cursor-wait disabled:opacity-60 sm:w-auto"
        >
          {running ? "Running the circuit…" : "Generate attestation →"}
        </button>
        <p className="mt-2 text-[0.8125rem] text-graphite">
          Using {SOURCE_LABEL[adapterChoice]}. A fresh evidence salt is drawn for each attempt.
        </p>
        <div className="max-w-[560px]">
          <StepLog steps={steps} running={running} tone="paper" />
        </div>

        <div aria-live="polite">
          {error && <p className="mt-6"><Flag>The adapter failed: {error}</Flag></p>}

          {outcome?.status === "REFUSED" && (
            <div className="fade-in mt-8 border-t border-ink pt-5">
              <p className="font-serif text-[2.5rem] leading-none text-signal">Attestation refused</p>
              <p className="mt-3 max-w-[52ch] text-[1.0625rem]">{outcome.message}</p>
              <p className="mt-1 max-w-[52ch] text-[1.0625rem]">No private evaluation data was disclosed.</p>
              <p className="t-label mt-4 text-graphite">
                {outcome.reason} · {SOURCE_LABEL[outcome.source]} · no public record written
              </p>
              {outcome.existing && (
                <AlreadyAttested
                  existing={outcome.existing}
                  onReset={
                    outcome.source === "DEMO"
                      ? async () => {
                          await resetDemoLedger();
                          reset();
                        }
                      : undefined
                  }
                />
              )}
            </div>
          )}

          {outcome?.status === "ATTESTED" && (
            <div className="fade-in mt-8 border border-ink p-5 sm:p-8">
              <div className="flex flex-wrap items-baseline justify-between gap-4">
                <p className="font-mono text-[2rem] font-medium leading-none">{outcome.attestation.code}</p>
                <p className="t-label border border-ink px-2 py-1">
                  {RECEIPT_STATE[issuedStatus(outcome.attestation)].stamp} · {SOURCE_LABEL[outcome.attestation.source]}
                </p>
              </div>
              <dl className="mt-6">
                {[
                  ["Model build", outcome.attestation.modelCommitment],
                  ["Suite commitment", outcome.attestation.suiteCommitment],
                  ["Evidence commitment", outcome.attestation.evidenceCommitment],
                  ["Release key", outcome.attestation.releaseKey],
                  ["Attestation id", outcome.attestation.id],
                ].map(([k, v]) => (
                  <div key={k} className="grid gap-1 border-t border-line py-2.5 sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-6">
                    <dt className="t-label text-graphite">{k}</dt>
                    <dd className="t-data break-all">{v}</dd>
                  </div>
                ))}
                <div className="grid gap-1 border-t border-line py-2.5 sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-6">
                  <dt className="t-label text-graphite">Verdict</dt>
                  <dd className="t-data font-semibold">
                    {RECEIPT_STATE[issuedStatus(outcome.attestation)].verdict} · {DEMO_PREDICATE.label}
                  </dd>
                </div>
                <div className="grid gap-1 border-t border-line py-2.5 sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-6">
                  <dt className="t-label text-graphite">Private plaintext in record</dt>
                  <dd className="t-data">
                    {disclosed ?? 0} bytes found
                    <span className="mt-1 block font-sans text-[0.8125rem] text-graphite">
                      Scanned for this evaluation&rsquo;s cases, check names, notes, salts and secret. Commitments and
                      labels are published by design.
                    </span>
                  </dd>
                </div>
              </dl>
              <Link
                href={`/verify/${outcome.attestation.code}#r=${encodeRecord(outcome.attestation)}`}
                className="t-label mt-6 inline-block underline underline-offset-4"
              >
                Open the public receipt →
              </Link>
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}
