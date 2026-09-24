import {
  bytes32FromHex,
  commitModel,
  commitSuite,
  deriveEvaluatorKey,
  digestManifest,
  toHex,
} from "../commitments";
import type { AttestationTarget, EvaluationSuite, ModelBuild, PrivateEvaluation } from "./types";

export interface DerivedCommitments {
  readonly modelDigest: string;
  readonly modelCommitment: string;
  readonly suiteDigest: string;
  readonly suiteCommitment: string;
  readonly evaluatorKey: string;
}

/** The suite manifest is the check definitions only — never the results. */
export function suiteManifest(suite: EvaluationSuite) {
  return {
    name: suite.name,
    version: suite.version,
    checks: suite.checks.map((c) => ({ id: c.id, name: c.name, category: c.category, cases: [...c.cases] })),
  };
}

export function modelManifest(model: ModelBuild) {
  return { buildId: model.buildId, ...model.manifest };
}

export async function deriveCommitments(evaluation: PrivateEvaluation): Promise<DerivedCommitments> {
  const modelDigest = await digestManifest(modelManifest(evaluation.model));
  const suiteDigest = await digestManifest(suiteManifest(evaluation.suite));
  const modelCommitment = await commitModel(modelDigest);
  const suiteCommitment = await commitSuite(suiteDigest, bytes32FromHex(evaluation.suiteSalt));
  const evaluatorKey = await deriveEvaluatorKey(bytes32FromHex(evaluation.evaluatorSecret));
  return {
    modelDigest: toHex(modelDigest),
    modelCommitment: toHex(modelCommitment),
    suiteDigest: toHex(suiteDigest),
    suiteCommitment: toHex(suiteCommitment),
    evaluatorKey: toHex(evaluatorKey),
  };
}

/** The target an honest evaluator attests against: its own commitments. */
export async function targetFor(evaluation: PrivateEvaluation): Promise<AttestationTarget> {
  const d = await deriveCommitments(evaluation);
  return { modelCommitment: d.modelCommitment, suiteCommitment: d.suiteCommitment };
}

export function attestationCode(idHex: string): string {
  const clean = idHex.startsWith("0x") ? idHex.slice(2) : idHex;
  return `CB-${clean.slice(0, 6).toUpperCase()}`;
}
