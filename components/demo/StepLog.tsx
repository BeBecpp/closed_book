import type { AttestStep } from "@/src/lib/attestation/types";
import { Flag } from "@/components/ui/Flag";

/** The evaluator-side circuit log. Lists assertions, never data. */
export function StepLog({
  steps,
  running,
  tone = "ink",
}: {
  steps: readonly AttestStep[];
  running: boolean;
  tone?: "ink" | "paper";
}) {
  if (!steps.length && !running) return null;
  const muted = tone === "ink" ? "text-paper/60" : "text-graphite";
  return (
    <ol className="mt-5 space-y-1 t-data" aria-label="Circuit assertions">
      {steps.map((s) => (
        <li key={s.key} className="fade-in flex justify-between gap-4">
          <span className={muted}>assert · {s.label}</span>
          {s.ok ? <span>ok</span> : tone === "ink" ? <span className="text-signal">failed</span> : <Flag>failed</Flag>}
        </li>
      ))}
      {running && (
        <li className={`${muted} flex justify-between gap-4`}>
          <span>running</span>
          <span aria-hidden="true">…</span>
        </li>
      )}
    </ol>
  );
}
