"use client";

import { SOURCE_DISCLAIMER, SOURCE_LABEL, type AttestationAdapter } from "./adapter";
import type { AttestOutcome, PublicAttestation } from "./types";

export interface LocalCircuitStatus {
  readonly available: boolean;
  readonly reason?: string;
  readonly contract?: { contract: string; circuit: string; compiler: string; runtime: string };
}

const ENDPOINT = "/api/circuit";

/** Is the local Compact circuit endpoint reachable from this page? */
export async function probeLocalCircuit(): Promise<LocalCircuitStatus> {
  try {
    const res = await fetch(ENDPOINT, { cache: "no-store" });
    if (!res.ok) return { available: false, reason: `Endpoint returned ${res.status}.` };
    return (await res.json()) as LocalCircuitStatus;
  } catch {
    return { available: false, reason: "Endpoint unreachable." };
  }
}

/**
 * Client for the MIDNIGHT_LOCAL adapter. The private witness is posted to the
 * evaluator's own local Next.js process (the endpoint refuses non-local
 * hosts), which executes the compiled Compact circuit.
 */
export function createLocalCircuitClient(): AttestationAdapter {
  return {
    source: "MIDNIGHT_LOCAL",
    label: SOURCE_LABEL.MIDNIGHT_LOCAL,
    disclaimer: SOURCE_DISCLAIMER.MIDNIGHT_LOCAL,
    async attest(request, onStep) {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json" },
        // Notes are never an input to the circuit, so they never leave the page.
        body: JSON.stringify({ ...request, evaluation: { ...request.evaluation, notes: "" } }),
      });
      if (!res.ok) throw new Error(`Local circuit endpoint returned ${res.status}`);
      const outcome = (await res.json()) as AttestOutcome;
      outcome.steps.forEach((s) => onStep?.(s));
      return outcome;
    },
    async lookup(idOrCode) {
      const res = await fetch(`${ENDPOINT}/${encodeURIComponent(idOrCode)}`, { cache: "no-store" });
      if (!res.ok) return null;
      const body = (await res.json()) as { record: PublicAttestation | null };
      return body.record;
    },
  };
}
