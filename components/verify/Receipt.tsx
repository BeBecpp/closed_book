"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Mark } from "@/components/brand/Mark";
import { CopyButton } from "@/components/ui/CopyButton";
import { Bar } from "@/components/ui/Redaction";
import { SOURCE_DISCLAIMER, SOURCE_LABEL } from "@/src/lib/attestation/adapter";
import { getDemoAdapter } from "@/src/lib/attestation/browser";
import { createLocalCircuitClient, probeLocalCircuit } from "@/src/lib/attestation/local-circuit-client";
import type { PublicAttestation } from "@/src/lib/attestation/types";
import { checkRecordIntegrity, decodeRecord, encodeRecord, type IntegrityReport } from "@/src/lib/attestation/verify";
import { Flag } from "@/components/ui/Flag";

type Origin = "link" | "browser" | "local-ledger";

type State =
  | { kind: "loading" }
  | { kind: "missing"; searched: string[] }
  | {
      kind: "found";
      record: PublicAttestation;
      origin: Origin;
      integrity: IntegrityReport;
      referenceMatches: boolean;
      ledger: "found" | "absent" | "unreachable" | "n/a";
    };

const ORIGIN_LABEL: Record<Origin, string> = {
  link: "Carried in this link",
  browser: "Demo registry in this browser",
  "local-ledger": "Local contract ledger",
};

function matchesReference(record: PublicAttestation, reference: string) {
  const r = reference.toLowerCase().replace(/^0x/, "");
  return record.code.toLowerCase() === r || record.id.toLowerCase().replace(/^0x/, "") === r;
}

async function resolve(reference: string): Promise<State> {
  const searched: string[] = [];
  let record: PublicAttestation | null = null;
  let origin: Origin = "link";

  const hash = typeof window !== "undefined" ? window.location.hash : "";
  const fragment = new URLSearchParams(hash.slice(1)).get("r");
  if (fragment) {
    searched.push("record in link");
    record = decodeRecord(fragment);
  }
  if (!record) {
    searched.push("demo registry in this browser");
    record = await (await getDemoAdapter()).lookup(reference);
    origin = "browser";
  }
  const local = await probeLocalCircuit();
  const client = createLocalCircuitClient();
  if (!record && local.available) {
    searched.push("local contract ledger");
    record = await client.lookup(reference);
    origin = "local-ledger";
  }
  if (!record) return { kind: "missing", searched };

  let ledger: "found" | "absent" | "unreachable" | "n/a" = "n/a";
  if (record.source === "MIDNIGHT_LOCAL") {
    if (!local.available) ledger = "unreachable";
    else ledger = (await client.lookup(record.id))?.evidenceCommitment === record.evidenceCommitment ? "found" : "absent";
  }

  return {
    kind: "found",
    record,
    origin,
    integrity: await checkRecordIntegrity(record),
    referenceMatches: matchesReference(record, reference),
    ledger,
  };
}

function Line({ label, children, big = false }: { label: string; children: React.ReactNode; big?: boolean }) {
  return (
    <div className="grid gap-1 border-t border-line py-4 sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-6 print-plain">
      <dt className="t-label text-graphite">{label}</dt>
      <dd className={`min-w-0 ${big ? "" : "t-data break-all"}`}>{children}</dd>
    </div>
  );
}

function Check({ label, ok, detail }: { label: string; ok: boolean | null; detail: string }) {
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-6 gap-y-1 border-t border-line py-3 print-plain">
      <span>{label}</span>
      <span className={`t-label ${ok === null ? "text-graphite" : ""}`}>
        {ok === null ? "Not applicable" : ok ? "Match" : <Flag>Mismatch</Flag>}
      </span>
      <span className="col-span-2 text-[0.8125rem] text-graphite">{detail}</span>
    </li>
  );
}

function proofLine(record: PublicAttestation): string {
  // No network verifier is configured, so a Midnight proof claim is shown as a claim.
  if (record.source === "MIDNIGHT") return "Claimed Midnight proof · not verified by this page";
  if (record.source === "MIDNIGHT_LOCAL") return "Not generated · circuit executed locally";
  return "None · demo adapter";
}

export function Receipt({ reference }: { reference: string }) {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let live = true;
    resolve(reference).then((s) => live && setState(s));
    return () => {
      live = false;
    };
  }, [reference]);

  return (
    <div className="mx-auto max-w-[880px] px-4 pb-8 pt-10 sm:px-8 sm:pt-16">
      <article className="border border-ink bg-paper print-plain" aria-labelledby="receipt-title">
        <header className="flex items-center justify-between gap-4 border-b border-ink px-5 py-4 sm:px-10 print-plain">
          <div className="flex items-center gap-3">
            <Mark size={22} />
            <span className="text-[0.8125rem] font-semibold tracking-[0.14em]">CLOSED BOOK</span>
          </div>
          <p className="t-label text-graphite">Public attestation</p>
        </header>

        <div className="px-5 pb-8 pt-8 sm:px-10 sm:pb-12 sm:pt-12">
          {state.kind === "loading" && (
            <p className="t-label text-graphite" role="status">
              Resolving {reference}…
            </p>
          )}

          {state.kind === "missing" && (
            <div>
              <p className="t-label text-graphite">Attestation</p>
              <h1 id="receipt-title" className="mt-2 font-mono text-[2rem] break-all sm:text-[2.75rem]">
                {reference}
              </h1>
              <p className="t-h2 mt-8 max-w-[22ch]">No attestation found.</p>
              <p className="mt-4 max-w-[52ch] text-graphite">
                A failed release does not become a proof. If an evaluation did not satisfy the release predicate, there
                is no record to find — and no way to tell which check failed.
              </p>
              <dl className="mt-8">
                <Line label="Searched">{state.searched.join(" · ")}</Line>
              </dl>
              <p className="no-print mt-8">
                <Link href="/evaluate" className="t-label underline underline-offset-4">
                  Open the evaluator console →
                </Link>
              </p>
            </div>
          )}

          {state.kind === "found" && <Found state={state} />}
        </div>
      </article>
    </div>
  );
}

function Found({ state }: { state: Extract<State, { kind: "found" }> }) {
  const { record, integrity } = state;
  const verified = integrity.idMatches && integrity.codeMatches && state.referenceMatches;
  const link =
    typeof window === "undefined" ? "" : `${window.location.origin}/verify/${record.code}#r=${encodeRecord(record)}`;

  return (
    <>
      <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div>
          <p className="t-label text-graphite">Attestation</p>
          <h1 id="receipt-title" className="mt-2 font-mono text-[2.5rem] font-medium leading-none sm:text-[3.5rem]">
            {record.code}
          </h1>
        </div>
        <p className="t-label bg-ink px-2 py-1 text-paper justify-self-start sm:justify-self-end">
          {SOURCE_LABEL[record.source]}
        </p>
      </div>

      <dl className="mt-10">
        <Line label="Model build">
          {record.modelLabel && <span className="block font-sans text-[0.9375rem]">{record.modelLabel}</span>}
          {record.modelCommitment}
        </Line>
        <Line label="Evaluation suite">{record.suiteCommitment}</Line>
        <Line label="Release predicate" big>
          <span className="block">{record.predicate.label}</span>
          <span className="t-data text-graphite">
            {record.predicate.id} · {record.predicate.requiredPasses} of {record.predicate.checkCount} required checks
          </span>
        </Line>
        <Line label="Verdict" big>
          {verified ? (
            <span className="font-mono text-[2.25rem] font-medium leading-none">PASS</span>
          ) : (
            <span className="t-data">
              <Flag>Not shown — this record fails its integrity checks</Flag>
            </span>
          )}
        </Line>
        <Line label="Proof" big>
          <span className="t-data">{proofLine(record)}</span>
        </Line>
        <Line label="Private evidence disclosed" big>
          <span className="t-data">0 bytes</span>
          <span className="mt-1 block text-[0.8125rem] text-graphite">
            This record holds commitments, the predicate and a build label. None of its fields carries a prompt, an
            output or a check result.
          </span>
        </Line>
        <Line label="Evidence commitment">{record.evidenceCommitment}</Line>
        <Line label="Evaluator key">{record.evaluatorKey}</Line>
        <Line label="Attestation id">{record.id}</Line>
        {record.circuit && (
          <Line label="Circuit">
            {record.circuit.contract} · {record.circuit.circuit} · compiler {record.circuit.compiler} · runtime{" "}
            {record.circuit.runtime}
          </Line>
        )}
        {record.issuedAt && <Line label="Issued">{record.issuedAt}</Line>}
      </dl>

      <section className="mt-10" aria-labelledby="checks-title">
        <h2 id="checks-title" className="t-label border-b border-ink pb-3 print-plain">
          Checks run in this browser
        </h2>
        <ul>
          <Check
            label="Attestation id recomputes from the public fields"
            ok={integrity.idMatches}
            detail="SHA-256 over the domain tag, model, suite, predicate and evidence commitments — the same derivation as the contract."
          />
          <Check label="Reference code derives from the id" ok={integrity.codeMatches} detail="CB- followed by the first three bytes of the id." />
          <Check label="Requested reference matches this record" ok={state.referenceMatches} detail="The address you opened names this attestation." />
          <Check
            label="Record present on the contract ledger"
            ok={state.ledger === "n/a" || state.ledger === "unreachable" ? null : state.ledger === "found"}
            detail={
              state.ledger === "n/a"
                ? "Demo records are not on any ledger."
                : state.ledger === "unreachable"
                  ? "The local contract that issued this record is not reachable from this browser."
                  : "Looked up by id on the locally executed contract's ledger state."
            }
          />
        </ul>
        <p className="mt-4 border-t border-ink pt-4 text-[0.9375rem] print-plain">
          {verified
            ? record.source === "MIDNIGHT"
              ? "Record integrity holds. This record claims a Midnight network proof; this page has no network verifier configured, so that claim is not verified here."
              : "Record integrity holds. The issuing adapter states: " + SOURCE_DISCLAIMER[record.source]
            : <Flag>This record does not match its own public fields. Treat it as altered.</Flag>}
        </p>
        <p className="mt-2 text-[0.8125rem] text-graphite">Source of this copy: {ORIGIN_LABEL[state.origin]}.</p>
      </section>

      <div className="mt-10 border-t border-line pt-6 print-plain" aria-hidden="true">
        <p className="t-label text-graphite">Evaluation evidence</p>
        <div className="t-data mt-3 space-y-2">
          <p className="flex gap-[0.6ch]"><Bar w={18} /><Bar w={9} /><Bar w={12} /></p>
          <p className="flex gap-[0.6ch]"><Bar w={26} /><Bar w={7} /></p>
        </div>
        <p className="t-label mt-3 text-graphite">The evidence stays closed.</p>
      </div>

      <div className="no-print mt-10 flex flex-wrap gap-x-8 gap-y-4 border-t border-ink pt-6">
        <button type="button" onClick={() => window.print()} className="t-label bg-ink px-4 py-3 text-paper hover:bg-graphite">
          Print receipt
        </button>
        <CopyButton value={record.code} label="Copy attestation id" className="py-3" />
        <CopyButton value={record.modelCommitment} label="Copy model commitment" className="py-3" />
        <CopyButton value={record.suiteCommitment} label="Copy suite commitment" className="py-3" />
        {link && <CopyButton value={link} label="Copy link" className="py-3" />}
      </div>
    </>
  );
}
