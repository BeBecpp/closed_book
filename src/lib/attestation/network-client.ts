"use client";

import type { Deployment } from "../midnight/network";
import type { NetworkView } from "./network-verifier";
import type { PublicAttestation } from "./types";

export type NetworkStatus =
  | { readonly configured: false; readonly reason?: string }
  | {
      readonly configured: true;
      readonly label: string;
      readonly deployment: Deployment;
      readonly attestations: readonly { code: string; id: string; txId: string | null; submittedAt: string }[];
    };

let status: Promise<NetworkStatus> | null = null;

/** Whether this site verifies against a deployed CLOSED BOOK contract (cached per page). */
export function getNetworkStatus(): Promise<NetworkStatus> {
  status ??= fetch("/api/network", { cache: "no-store" })
    .then((r) => (r.ok ? (r.json() as Promise<NetworkStatus>) : { configured: false as const }))
    .catch(() => ({ configured: false as const, reason: "Network status unavailable." }));
  return status;
}

export interface NetworkLookup {
  readonly deployment: Deployment;
  /** Known network record (with transaction metadata), if the reference names one. */
  readonly record: PublicAttestation | null;
  /** Public contract state for the id, as read from the Midnight indexer by this site's server. */
  readonly view: NetworkView | null;
}

export async function lookupNetwork(ref: string): Promise<NetworkLookup | null> {
  try {
    const r = await fetch(`/api/network/attestation/${encodeURIComponent(ref)}`, { cache: "no-store" });
    if (!r.ok) return null;
    const body = (await r.json()) as { configured: boolean } & Partial<NetworkLookup>;
    if (!body.configured || !body.deployment) return null;
    return { deployment: body.deployment, record: body.record ?? null, view: body.view ?? null };
  } catch {
    return null;
  }
}
