"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Hash } from "@/components/ui/Hash";
import { NETWORK_UNAVAILABLE, SOURCE_LABEL } from "@/src/lib/attestation/adapter";
import { getNetworkStatus, type NetworkStatus } from "@/src/lib/attestation/network-client";

/**
 * The MIDNIGHT · NETWORK entry of the evaluator console. Shows real deployment
 * data only when a deployment record is committed; otherwise says plainly that
 * nothing is deployed. Network attestations are submitted from the evaluator's
 * machine (`npm run network:attest`: local wallet + local proof server), never
 * from this page, so private witness data never reaches a hosted server.
 */
export function NetworkOption() {
  const [status, setStatus] = useState<NetworkStatus | null>(null);
  useEffect(() => {
    getNetworkStatus().then(setStatus);
  }, []);

  if (!status?.configured) {
    return (
      <li className="border-b border-line py-3">
        <label className="flex cursor-not-allowed gap-3 opacity-60">
          <input type="radio" name="adapter" disabled className="mt-1" />
          <span>
            <span className="t-label block">{SOURCE_LABEL.MIDNIGHT}</span>
            <span className="text-[0.875rem] text-graphite">{status === null ? "Checking…" : NETWORK_UNAVAILABLE}</span>
          </span>
        </label>
      </li>
    );
  }

  const d = status.deployment;
  return (
    <li className="border-b border-line py-3">
      <span className="t-label block">
        {SOURCE_LABEL.MIDNIGHT} · {status.label}
      </span>
      <dl className="mt-2 grid gap-x-6 gap-y-1 text-[0.875rem] sm:grid-cols-[9rem_minmax(0,1fr)]">
        <dt className="t-label text-graphite">Contract</dt>
        <dd className="t-data break-all">{d.contractAddress}</dd>
        <dt className="t-label text-graphite">Deploy tx</dt>
        <dd className="t-data break-all">{d.deployTxId}</dd>
        <dt className="t-label text-graphite">Evaluator key</dt>
        <dd><Hash value={d.evaluatorKey} /></dd>
      </dl>
      {status.attestations.length > 0 && (
        <ul className="mt-3">
          {status.attestations.map((a) => (
            <li key={a.id} className="flex flex-wrap items-baseline justify-between gap-3 border-t border-line py-2">
              <Link href={`/verify/${a.code}`} className="t-data underline underline-offset-4">
                {a.code}
              </Link>
              <span className="t-data text-graphite">tx {a.txId ? `${a.txId.slice(0, 16)}…` : "—"}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-[0.8125rem] text-graphite">
        Network attestations are submitted from the evaluator&rsquo;s machine with <code className="t-data">npm run network:attest</code>{" "}
        (local wallet and local proof server). Private witness data never passes through this site.
      </p>
    </li>
  );
}
