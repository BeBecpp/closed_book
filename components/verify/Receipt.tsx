"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Mark } from "@/components/brand/Mark";
import { CopyButton } from "@/components/ui/CopyButton";
import { Bar } from "@/components/ui/Redaction";
import { SOURCE_LABEL } from "@/src/lib/attestation/adapter";
import { getDemoAdapter } from "@/src/lib/attestation/browser";
import { createLocalCircuitClient, probeLocalCircuit } from "@/src/lib/attestation/local-circuit-client";
import { getNetworkStatus, lookupNetwork } from "@/src/lib/attestation/network-client";
import { judgeNetworkRecord } from "@/src/lib/attestation/network-verifier";
import {
  checkIssuer,
  classifyReceipt,
  RECEIPT_STATE,
  type IssuerCheck,
  type ReceiptStatus,
} from "@/src/lib/attestation/receipt";
import type { PublicAttestation } from "@/src/lib/attestation/types";
import { checkRecordIntegrity, decodeRecord, encodeRecord, type IntegrityReport } from "@/src/lib/attestation/verify";
import { Flag } from "@/components/ui/Flag";

type Origin = "link" | "browser" | "local-ledger" | "network";

type State =
  | { kind: "loading" }
  | { kind: "missing"; searched: string[] }
  | {
      kind: "found";
      record: PublicAttestation;
      origin: Origin;
      integrity: IntegrityReport;
      referenceMatches: boolean;
      issuer: IssuerCheck;
      status: ReceiptStatus;
    };

const ORIGIN_LABEL: Record<Origin, string> = {
  link: "Carried in this link",
  browser: "Demo registry in this browser",
  "local-ledger": "Local contract ledger",
  network: "Network attestation index of this site (verified against the contract below)",
};

function matchesReference(record: PublicAttestation, reference: string) {
  const r = reference.toLowerCase().replace(/^0x/, "");
  return record.code.toLowerCase() === r || record.id.toLowerCase().replace(/^0x/, "") === r;
}

async function resolve(reference: string): Promise<State> {
  const searched: string[] = [];
  let record: PublicAttestation | null = null;
  let origin: Origin = "link";

  const demo = await getDemoAdapter();
  const local = await probeLocalCircuit();
  const client = createLocalCircuitClient();

  const hash = typeof window !== "undefined" ? window.location.hash : "";
  const fragment = new URLSearchParams(hash.slice(1)).get("r");
  if (fragment) {
    searched.push("record in link");
    record = decodeRecord(fragment);
  }
  if (!record) {
    searched.push("demo registry in this browser");
    record = await demo.lookup(reference);
    origin = "browser";
  }
  if (!record && local.available) {
    searched.push("local contract ledger");
    record = await client.lookup(reference);
    origin = "local-ledger";
  }
  const network = await getNetworkStatus();
  if (!record && network.configured) {
    searched.push(`${network.label} contract`);
    record = (await lookupNetwork(reference))?.record ?? null;
    origin = "network";
  }
  if (!record) return { kind: "missing", searched };

  const integrity = await checkRecordIntegrity(record);
  const referenceMatches = matchesReference(record, reference);
  // Only the record's own claimed issuer is asked. MIDNIGHT records can be
  // confirmed only when this site is configured with a deployed contract.
  const issuer = await checkIssuer(record, {
    demo: (id) => demo.lookup(id),
    local: local.available ? (id) => client.lookup(id) : null,
    // Only when this site is configured with a deployed contract. The server
    // reads public contract state from the Midnight indexer; the judgement
    // (every ledger field against this record) runs here.
    network: network.configured
      ? async (r) => {
          const found = await lookupNetwork(r.id);
          if (!found?.view) return "unreachable";
          return judgeNetworkRecord(r, found.deployment, found.view).check;
        }
      : null,
  });
  const status = classifyReceipt(record, { integrity, referenceMatches, issuer });
  return { kind: "found", record, origin, integrity, referenceMatches, issuer, status };
}

function Line({ label, children, big = false }: { label: string; children: React.ReactNode; big?: boolean }) {
  return (
    <div className="grid gap-1 border-t border-line py-4 sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-6 print-plain">
      <dt className="t-label text-graphite">{label}</dt>
      <dd className={`min-w-0 ${big ? "" : "t-data break-all"}`}>{children}</dd>
    </div>
  );
}

type CheckResult = "match" | "mismatch" | "absent" | "unavailable";

const CHECK_TEXT: Record<CheckResult, string> = {
  match: "Match",
  mismatch: "Mismatch",
  absent: "Not found",
  unavailable: "Unavailable",
};

function Check({ label, result, detail }: { label: string; result: CheckResult; detail: string }) {
  const bad = result === "mismatch" || result === "absent";
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-6 gap-y-1 border-t border-line py-3 print-plain">
      <span>{label}</span>
      <span className={`t-label ${result === "unavailable" ? "text-graphite" : ""}`}>
        {bad ? <Flag>{CHECK_TEXT[result]}</Flag> : CHECK_TEXT[result]}
      </span>
      <span className="col-span-2 text-[0.8125rem] text-graphite">{detail}</span>
    </li>
  );
}

const ok = (b: boolean): CheckResult => (b ? "match" : "mismatch");

const ISSUER_LABEL: Record<PublicAttestation["source"], string> = {
  DEMO: "The demo registry in this browser holds this exact record",
  MIDNIGHT_LOCAL: "The local contract ledger holds this exact record",
  MIDNIGHT: "The deployed Midnight contract holds this exact record",
};

function issuerDetail(record: PublicAttestation, issuer: IssuerCheck): string {
  if (record.source === "MIDNIGHT" && issuer === "match") {
    return "Read from the contract's public state on the network indexer and compared field by field, including the release key. The network verified the transaction's proof before the contract recorded it.";
  }
  if (record.source === "MIDNIGHT" && issuer === "mismatch") return "The contract holds a different record under this id.";
  if (record.source === "MIDNIGHT" && issuer === "absent") {
    return "The configured contract does not hold this record, or the record names a different contract.";
  }
  if (record.source === "MIDNIGHT") {
    return "This site has no deployed contract configured, or the network is unavailable, so this cannot be confirmed here.";
  }
  if (issuer === "unreachable") return "The local contract that would hold this record is not reachable from this page.";
  if (issuer === "absent") {
    return record.source === "DEMO"
      ? "The demo adapter in this browser did not issue this record."
      : "The local contract ledger has no attestation with this id.";
  }
  if (issuer === "mismatch") return "The issuer holds a different record under this id.";
  return "Compared field by field: id, release key, commitments, evaluator key, predicate and source.";
}

function proofLine(record: PublicAttestation, status: ReceiptStatus): string {
  if (status === "NETWORK_VERIFIED") return "Recorded by the Midnight contract after network proof verification";
  if (record.source === "MIDNIGHT") return "Claimed · not verified by this page";
  if (record.source === "MIDNIGHT_LOCAL") return "Not generated · circuit executed locally";
  return "None · demo adapter";
}

/** Each state looks different, not only reads different. */
const STAMP_CLASS: Record<ReceiptStatus, string> = {
  NETWORK_VERIFIED: "bg-ink text-paper",
  LOCAL_CIRCUIT_ATTESTED: "border-2 border-ink",
  DEMO_PASS: "border border-dashed border-ink",
  CLAIMED_PASS: "border border-line text-graphite",
  ALTERED: "border border-line",
};

function Verdict({ status }: { status: ReceiptStatus }) {
  const copy = RECEIPT_STATE[status];
  switch (status) {
    case "NETWORK_VERIFIED":
      return <span className="font-mono text-[2.25rem] font-medium leading-none">{copy.verdict}</span>;
    case "LOCAL_CIRCUIT_ATTESTED":
      return (
        <span className="flex flex-wrap items-baseline gap-3">
          <span className="font-mono text-[1.5rem] font-medium leading-none">PASS</span>
          <span className="t-label">Local circuit · no ZK proof</span>
        </span>
      );
    case "DEMO_PASS":
      return <span className="t-data">{copy.verdict}</span>;
    case "CLAIMED_PASS":
      return <span className="t-data text-graphite">{copy.verdict}</span>;
    case "ALTERED":
      return (
        <span className="t-data">
          <Flag>{copy.verdict}</Flag>
        </span>
      );
  }
}

export function Receipt({ reference }: { reference: string }) {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let live = true;
    const run = () => {
      resolve(reference).then((s) => live && setState(s));
    };
    run();
    // A different #r= record at the same address must be judged afresh.
    window.addEventListener("hashchange", run);
    return () => {
      live = false;
      window.removeEventListener("hashchange", run);
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
  const { record, integrity, status, issuer } = state;
  const copy = RECEIPT_STATE[status];
  const publicBytes = new TextEncoder().encode(JSON.stringify(record)).length;
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
        <div className="justify-self-start sm:justify-self-end sm:text-right">
          <p className={`t-label inline-block px-2 py-1 ${STAMP_CLASS[status]}`} data-status={status}>
            {status === "ALTERED" || status === "CLAIMED_PASS" ? <Flag>{copy.stamp}</Flag> : copy.stamp}
          </p>
          <p className="t-label mt-2 text-graphite">Source · {SOURCE_LABEL[record.source]}</p>
        </div>
      </div>

      <p className="mt-6 max-w-[62ch] border-l-2 border-ink pl-4 text-[0.9375rem]" role="status">
        {copy.meaning}
      </p>

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
          <Verdict status={status} />
        </Line>
        <Line label="Proof" big>
          <span className="t-data">{proofLine(record, status)}</span>
        </Line>
        <Line label="Private plaintext fields" big>
          <span className="t-data">None in this record&rsquo;s schema</span>
          <span className="mt-1 block text-[0.8125rem] text-graphite">
            The record publishes {publicBytes} bytes: commitments, the predicate and labels. None of its fields holds a
            prompt, an output or a check result. This page does not have the private evaluation, so it cannot scan for
            leaked plaintext; the issuing page runs that scan at issue time.
          </span>
        </Line>
        <Line label="Evidence commitment">{record.evidenceCommitment}</Line>
        <Line label="Evaluator key">{record.evaluatorKey}</Line>
        <Line label="Release key">{record.releaseKey}</Line>
        <Line label="Attestation id">{record.id}</Line>
        {record.network && (
          <>
            <Line label="Network">{record.network.network}</Line>
            <Line label="Contract">{record.network.contractAddress}</Line>
            <Line label="Transaction">{record.network.txId}</Line>
            {record.network.blockHeight !== null && <Line label="Block">{String(record.network.blockHeight)}</Line>}
          </>
        )}
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
            result={ok(integrity.idMatches)}
            detail="SHA-256 over the domain tag, model, suite, predicate and evidence commitments — the contract's derivation. This shows self-consistency only: anyone can build a self-consistent record."
          />
          <Check
            label="Release key recomputes from model, suite and predicate"
            result={ok(integrity.releaseMatches)}
            detail="The contract allows one attestation per release key."
          />
          <Check
            label="Reference code derives from the id"
            result={ok(integrity.codeMatches)}
            detail="CB- followed by the first three bytes of the id."
          />
          <Check
            label="Requested reference matches this record"
            result={ok(state.referenceMatches)}
            detail="The address you opened names this attestation."
          />
          <Check
            label={ISSUER_LABEL[record.source]}
            result={issuer === "unreachable" ? "unavailable" : issuer}
            detail={issuerDetail(record, issuer)}
          />
          <Check
            label="Proof verified by the Midnight network"
            result={status === "NETWORK_VERIFIED" ? "match" : "unavailable"}
            detail={
              status === "NETWORK_VERIFIED"
                ? "The network verified the transaction's zero-knowledge proof when it accepted it; the record exists on the contract only because of that. This page does not re-run a SNARK verifier."
                : "Requires a transaction accepted by a Midnight network and a contract that holds this record."
            }
          />
        </ul>
        <p className="mt-2 text-[0.8125rem] text-graphite">Source of this copy: {ORIGIN_LABEL[state.origin]}.</p>
      </section>

      <div className="mt-10 border-t border-line pt-6 print-plain" aria-hidden="true">
        <p className="t-label text-graphite">Evaluation evidence</p>
        <div className="t-data mt-3 space-y-2">
          <p className="flex gap-[0.6ch]">
            <Bar w={18} />
            <Bar w={9} />
            <Bar w={12} />
          </p>
          <p className="flex gap-[0.6ch]">
            <Bar w={26} />
            <Bar w={7} />
          </p>
        </div>
        <p className="t-label mt-3 text-graphite">The evidence stays closed.</p>
      </div>

      <div className="no-print mt-10 flex flex-wrap gap-x-8 gap-y-4 border-t border-ink pt-6">
        <button
          type="button"
          onClick={() => window.print()}
          className="t-label bg-ink px-4 py-3 text-paper hover:bg-graphite"
        >
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
