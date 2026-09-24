"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Row } from "@/components/ui/Row";
import { Hash } from "@/components/ui/Hash";
import { RedactedLines, SUITE_REDACTION } from "@/components/ui/Redaction";
import { SOURCE_LABEL } from "@/src/lib/attestation/adapter";
import { freshSalt, getDemoAdapter, resetDemoLedger } from "@/src/lib/attestation/browser";
import { targetFor } from "@/src/lib/attestation/evaluation";
import { encodeRecord } from "@/src/lib/attestation/verify";
import { DEMO_EVALUATION, DEMO_PREDICATE } from "@/src/lib/demo/fixture";
import { AlreadyAttested } from "./AlreadyAttested";
import { StepLog } from "./StepLog";
import { useAttestation } from "./useAttestation";

const ALL_PASS = DEMO_EVALUATION.results;

export function AttestationDemo() {
  const [results, setResults] = useState<boolean[]>([...ALL_PASS]);
  const { phase, steps, outcome, disclosed, error, attest, reset } = useAttestation();
  const passes = results.filter(Boolean).length;
  const running = phase === "running";

  const evaluation = useMemo(() => ({ ...DEMO_EVALUATION, results }), [results]);

  function toggle(i: number) {
    setResults((r) => r.map((v, j) => (j === i ? !v : v)));
    reset();
  }

  async function generate() {
    const adapter = await getDemoAdapter();
    // The model and suite commitments were published before the evaluation;
    // each attestation run draws a fresh evidence salt.
    const target = await targetFor(DEMO_EVALUATION);
    await attest(adapter, { ...evaluation, evidenceSalt: freshSalt() }, target);
  }

  function restore() {
    setResults([...ALL_PASS]);
    reset();
  }

  async function resetLedger() {
    await resetDemoLedger();
    reset();
  }

  return (
    <div className="grid lg:grid-cols-[minmax(0,1fr)_14px_minmax(0,1fr)]">
      {/* ---------------- PRIVATE ---------------- */}
      <section aria-labelledby="private-heading" className="bg-ink text-paper">
        <header className="flex items-baseline justify-between gap-4 px-5 pt-5 sm:px-8 sm:pt-7">
          <h3 id="private-heading" className="t-label">Private evaluation</h3>
          <span className="t-label text-paper/60">Evaluator only</span>
        </header>

        <dl className="mt-5 px-5 sm:px-8">
          <Row tone="ink" label="Model build">
            <span className="t-data">{DEMO_EVALUATION.model.buildId}</span>
          </Row>
          <Row tone="ink" label="Evaluation suite">
            <div
              className="scan text-paper/35"
              data-active={running}
              style={{ ["--scan-distance" as string]: "22ch" }}
            >
              <RedactedLines lines={SUITE_REDACTION} label="Evaluation suite, redacted" className="t-data" />
            </div>
          </Row>
          <Row tone="ink" label="Private checks">
            <ul className="-my-1" aria-label="Private checks. Select a check to toggle its result.">
              {DEMO_EVALUATION.suite.checks.map((check, i) => {
                const pass = results[i];
                return (
                  <li key={check.id}>
                    <button
                      type="button"
                      onClick={() => toggle(i)}
                      disabled={running}
                      aria-label={`${check.name}: ${pass ? "pass" : "fail"}. Toggle result.`}
                      className="group flex w-full items-baseline justify-between gap-3 py-1 text-left disabled:cursor-wait"
                    >
                      <span className="text-[0.9375rem] underline-offset-4 decoration-paper/40 group-hover:underline">
                        {check.name}
                      </span>
                      <span
                        className={`t-data min-w-[4.5ch] text-right font-medium transition-colors ${
                          pass ? "text-paper" : "text-signal"
                        }`}
                      >
                        {pass ? "PASS" : "FAIL"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Row>
          <Row tone="ink" label="Release condition">
            <p className="flex items-baseline gap-3">
              <span className={`whitespace-nowrap font-mono text-[1.75rem] leading-none tabular-nums ${passes < 6 ? "text-signal" : ""}`}>
                {passes} / 6
              </span>
              <span className="t-label text-paper/60">{DEMO_PREDICATE.requiredPasses} required</span>
            </p>
          </Row>
        </dl>

        <div className="px-5 pb-6 pt-4 sm:px-8 sm:pb-8">
          <button
            type="button"
            onClick={generate}
            disabled={running}
            className="t-label w-full bg-paper px-4 py-4 text-left text-ink hover:bg-line disabled:cursor-wait disabled:opacity-70 sm:w-auto"
          >
            {running ? "Generating attestation…" : "Generate attestation →"}
          </button>
          <div className="mt-3 flex flex-wrap items-baseline justify-between gap-3">
            <p className="text-[0.8125rem] text-paper/60">Select a check to fail it.</p>
            {results.some((r) => !r) && (
              <button type="button" onClick={restore} className="t-label text-paper/60 underline underline-offset-4 hover:text-paper">
                Restore all checks
              </button>
            )}
          </div>
          <StepLog steps={steps} running={running} />
        </div>
      </section>

      {/* ---------------- SPINE ---------------- */}
      <div aria-hidden="true" className="flex items-center justify-center bg-paper py-3 lg:py-0">
        <div className="h-[6px] w-full bg-ink lg:h-full lg:w-[6px]" />
      </div>

      {/* ---------------- PUBLIC ---------------- */}
      <section aria-labelledby="public-heading" aria-live="polite" className="border border-ink bg-paper">
        <header className="flex items-baseline justify-between gap-4 px-5 pt-5 sm:px-8 sm:pt-7">
          <h3 id="public-heading" className="t-label">Public attestation</h3>
          <span className="t-label text-graphite">Anyone</span>
        </header>

        <div className="px-5 pb-6 sm:px-8 sm:pb-8">
          {outcome?.status === "REFUSED" ? (
            <div className="fade-in mt-5">
              <p className="border-t border-ink pt-5 font-serif text-[2.5rem] leading-none text-signal sm:text-[3rem]">
                Attestation refused
              </p>
              <p className="mt-4 max-w-[38ch] text-[1.0625rem]">{outcome.message}</p>
              <p className="mt-2 max-w-[38ch] text-[1.0625rem]">No private evaluation data was disclosed.</p>
              <dl className="mt-6">
                <Row label="Verdict"><span className="t-data">No attestation issued</span></Row>
                <Row label="Which check failed"><span className="t-data text-graphite">Not disclosed</span></Row>
                <Row label="Prompt / output"><span className="t-data text-graphite">Not disclosed</span></Row>
                <Row label="Public record"><span className="t-data">None written</span></Row>
                <Row label="Source"><span className="t-data">{SOURCE_LABEL[outcome.source]}</span></Row>
              </dl>
              {outcome.existing && <AlreadyAttested existing={outcome.existing} onReset={resetLedger} />}
              <p className="mt-5 border-t border-line pt-4 text-[0.875rem] text-graphite">
                A failed release does not become a proof. On a network, the public would see only that no attestation
                exists for this build.
              </p>
            </div>
          ) : (
            <>
              <dl className="mt-5">
                <Row label="Attestation">
                  {outcome?.status === "ATTESTED" ? (
                    <span className="t-data fade-in font-semibold">{outcome.attestation.code}</span>
                  ) : (
                    <span className="t-data text-graphite">{running ? "Awaiting circuit…" : "—"}</span>
                  )}
                </Row>
                <Row label="Model build">
                  <Hash value={outcome?.status === "ATTESTED" ? outcome.attestation.modelCommitment : ""} />
                </Row>
                <Row label="Suite commitment">
                  <Hash value={outcome?.status === "ATTESTED" ? outcome.attestation.suiteCommitment : ""} />
                </Row>
                <Row label="Predicate">
                  <span className={`t-data ${outcome ? "" : "text-graphite"}`}>{outcome ? DEMO_PREDICATE.label : "—"}</span>
                </Row>
                <Row label="Verdict">
                  {outcome?.status === "ATTESTED" ? (
                    <span className="fade-in flex flex-wrap items-baseline gap-3">
                      <span className="font-mono text-[1.75rem] font-medium leading-none">PASS</span>
                      <span className="t-label whitespace-nowrap border border-dashed border-ink px-1.5 py-0.5">Demo · simulated</span>
                    </span>
                  ) : (
                    <span className="t-data text-graphite">—</span>
                  )}
                </Row>
                <Row label="Checks satisfied">
                  <span className={`t-data ${outcome ? "" : "text-graphite"}`}>
                    {outcome?.status === "ATTESTED" ? `${DEMO_PREDICATE.requiredPasses} / ${DEMO_PREDICATE.checkCount}` : "—"}
                  </span>
                </Row>
                <Row label="Private plaintext in record">
                  <span className={`t-data ${disclosed === null ? "text-graphite" : ""}`}>
                    {disclosed === null ? "—" : `${disclosed} bytes found`}
                  </span>
                </Row>
                <Row label="Status">
                  {outcome?.status === "ATTESTED" ? (
                    <span className="t-data fade-in">
                      Demo pass · not a cryptographic attestation · {SOURCE_LABEL.DEMO}
                    </span>
                  ) : (
                    <span className="t-data text-graphite">{error ? `Error: ${error}` : "Nothing published"}</span>
                  )}
                </Row>
              </dl>
              {outcome?.status === "ATTESTED" ? (
                <div className="fade-in mt-5 flex flex-col gap-3 border-t border-ink pt-4 sm:flex-row sm:items-baseline sm:justify-between">
                  <p className="max-w-[40ch] text-[0.8125rem] text-graphite">
                    Simulated verdict: the demo adapter runs the contract&rsquo;s checks in your browser. No
                    zero-knowledge proof, no chain. The plaintext scan looks for the demo&rsquo;s cases, check names,
                    notes, salts and secret; commitments are published by design.
                  </p>
                  <Link
                    href={`/verify/${outcome.attestation.code}#r=${encodeRecord(outcome.attestation)}`}
                    className="t-label shrink-0 underline underline-offset-4"
                  >
                    Open the receipt →
                  </Link>
                </div>
              ) : (
                <p className="mt-5 border-t border-line pt-4 text-[0.875rem] text-graphite">
                  The public side receives commitments and a verdict. It never receives the suite, the outputs or the
                  individual results.
                </p>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
