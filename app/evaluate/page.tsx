import type { Metadata } from "next";
import { EvaluatorConsole } from "@/components/evaluate/EvaluatorConsole";

export const metadata: Metadata = {
  title: "Evaluator console",
  description: "Hold a private evaluation, bind it to a model and a suite, and issue a release attestation.",
};

export default function EvaluatePage() {
  return (
    <div className="mx-auto max-w-[1320px] px-4 sm:px-8">
      <div className="grid gap-6 pb-12 pt-10 sm:pt-16 lg:grid-cols-12">
        <p className="t-label lg:col-span-3">
          <span className="text-graphite">Console</span> — Evaluator
        </p>
        <div className="lg:col-span-9">
          <h1 className="t-h1 max-w-[18ch]">Evaluation record</h1>
          <p className="mt-4 max-w-[60ch] text-graphite">
            Everything on this page stays on this device except the section marked <em>Public</em>. Change the
            evaluation, break a binding, fail a check — then try to attest.
          </p>
        </div>
      </div>
      <EvaluatorConsole />
    </div>
  );
}
