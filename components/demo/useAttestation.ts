"use client";

import { useCallback, useRef, useState } from "react";
import type { AttestationAdapter } from "@/src/lib/attestation/adapter";
import type { AttestOutcome, AttestStep, AttestationTarget, PrivateEvaluation } from "@/src/lib/attestation/types";
import { measureDisclosure } from "@/src/lib/attestation/verify";

export type Phase = "idle" | "running" | "done";

const STEP_PAUSE_MS = 170;

function reducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/**
 * Runs an attestation through an adapter and paces the step log so a human
 * can read it. The pacing is presentation only; the result is whatever the
 * adapter returned.
 */
export function useAttestation() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [steps, setSteps] = useState<AttestStep[]>([]);
  const [outcome, setOutcome] = useState<AttestOutcome | null>(null);
  const [disclosed, setDisclosed] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const run = useRef(0);

  const reset = useCallback(() => {
    run.current++;
    setPhase("idle");
    setSteps([]);
    setOutcome(null);
    setDisclosed(null);
    setError(null);
  }, []);

  const attest = useCallback(
    async (adapter: AttestationAdapter, evaluation: PrivateEvaluation, target: AttestationTarget) => {
      const id = ++run.current;
      setPhase("running");
      setSteps([]);
      setOutcome(null);
      setDisclosed(null);
      setError(null);
      try {
        const result = await adapter.attest({ evaluation, target });
        const pause = reducedMotion() ? 0 : STEP_PAUSE_MS;
        for (const s of result.steps) {
          if (pause) await new Promise((r) => setTimeout(r, pause));
          if (run.current !== id) return;
          setSteps((prev) => [...prev, s]);
        }
        if (run.current !== id) return;
        const publicPayload = result.status === "ATTESTED" ? result.attestation : null;
        setDisclosed(measureDisclosure(publicPayload, evaluation));
        setOutcome(result);
      } catch (e) {
        if (run.current !== id) return;
        setError((e as Error).message);
      } finally {
        if (run.current === id) setPhase("done");
      }
    },
    [],
  );

  return { phase, steps, outcome, disclosed, error, attest, reset };
}
