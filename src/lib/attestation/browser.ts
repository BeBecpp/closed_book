"use client";

import { deriveEvaluatorKey, fromHex, randomBytes32, toHex } from "../commitments";
import { DEMO_EVALUATOR_SECRET, DEMO_PREDICATE } from "../demo/fixture";
import type { AttestationAdapter } from "./adapter";
import { createDemoAdapter } from "./demo-adapter";
import { BrowserRegistry } from "./registry";

let demo: Promise<AttestationAdapter> | null = null;
let registry: BrowserRegistry | null = null;

/** The demo adapter, deployed for the demo evaluator, with a browser registry. */
export function getDemoAdapter(): Promise<AttestationAdapter> {
  demo ??= (async () => {
    const evaluatorKey = toHex(await deriveEvaluatorKey(fromHex(DEMO_EVALUATOR_SECRET)));
    return createDemoAdapter({
      deployment: { evaluatorKey, predicate: DEMO_PREDICATE },
      registry: (registry = new BrowserRegistry()),
    });
  })();
  return demo;
}

/**
 * Clear the demo adapter's ledger in this browser. The demo allows one
 * attestation per release, exactly like the contract; this is how a visitor
 * starts the demonstration over. It has no counterpart on a real ledger.
 */
export async function resetDemoLedger(): Promise<void> {
  await getDemoAdapter();
  registry?.clear();
}

/** Each attestation run draws a fresh evidence salt. */
export function freshSalt(): string {
  return toHex(randomBytes32());
}
