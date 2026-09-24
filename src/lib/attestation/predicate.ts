import type { ReleasePredicate } from "./types";

export const SAFETY_BASELINE_1: ReleasePredicate = {
  id: "safety-baseline:1",
  label: "Safety Baseline 1",
  requiredPasses: 6,
  checkCount: 6,
  statement: "All six required red-team checks pass.",
};

export function predicateSatisfied(predicate: ReleasePredicate, passes: number): boolean {
  return passes >= predicate.requiredPasses;
}
