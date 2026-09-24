/**
 * DEMO ADAPTER.
 *
 * Runs the same checks, in the same order, as the `attest` circuit in
 * contract/src/closed-book.compact, using the same byte encoding. It is a
 * faithful model of the contract's logic, not a zero-knowledge proof, and
 * nothing it produces is on a chain. Every record it creates is stamped
 * `source: "DEMO"`.
 */
import {
  bytes32FromHex,
  commitEvidence,
  commitModel,
  commitSuite,
  countPasses,
  deriveAttestationId,
  deriveEvaluatorKey,
  digestManifest,
  equalBytes,
  pad32,
  packResults,
  toHex,
  CHECK_COUNT,
} from "../commitments";
import { SOURCE_DISCLAIMER, SOURCE_LABEL, type AttestationAdapter } from "./adapter";
import { attestationCode, modelManifest, suiteManifest } from "./evaluation";
import { predicateSatisfied } from "./predicate";
import { MemoryRegistry, type AttestationRegistry } from "./registry";
import type {
  AttestOutcome,
  AttestRequest,
  AttestStep,
  PublicAttestation,
  RefusalReason,
  ReleasePredicate,
} from "./types";

/** Public parameters fixed when the contract is deployed. */
export interface Deployment {
  readonly evaluatorKey: string;
  readonly predicate: ReleasePredicate;
}

export const REFUSAL_MESSAGE: Record<RefusalReason, string> = {
  PREDICATE_NOT_SATISFIED: "The private evaluation does not satisfy the release policy.",
  MODEL_COMMITMENT_MISMATCH: "The evaluation is not bound to the published model-build commitment.",
  SUITE_COMMITMENT_MISMATCH: "The evaluation is not bound to the published suite commitment.",
  UNAUTHORIZED_EVALUATOR: "The signing key is not the registered evaluator for this contract.",
  ALREADY_RECORDED: "This exact attestation has already been recorded.",
  INVALID_INPUT: "The evaluation record is malformed.",
};

export const STEP_LABEL: Record<AttestStep["key"], string> = {
  evaluator: "Evaluator key",
  model: "Model-build binding",
  suite: "Suite binding",
  predicate: "Release predicate",
  record: "Attestation record",
};

export interface DemoAdapterOptions {
  readonly deployment: Deployment;
  readonly registry?: AttestationRegistry;
  readonly now?: () => Date;
}

export function createDemoAdapter(options: DemoAdapterOptions): AttestationAdapter {
  const { deployment } = options;
  const registry = options.registry ?? new MemoryRegistry();
  const now = options.now ?? (() => new Date());

  async function attest(request: AttestRequest, onStep?: (s: AttestStep) => void): Promise<AttestOutcome> {
    const steps: AttestStep[] = [];
    const step = (key: AttestStep["key"], ok: boolean) => {
      const s = { key, label: STEP_LABEL[key], ok };
      steps.push(s);
      onStep?.(s);
    };
    const refuse = (reason: RefusalReason): AttestOutcome => ({
      status: "REFUSED",
      reason,
      message: REFUSAL_MESSAGE[reason],
      source: "DEMO",
      steps,
    });

    const { evaluation, target } = request;
    let secret, suiteSalt, evidenceSalt, targetModel, targetSuite, evaluatorKey;
    try {
      if (evaluation.results.length !== CHECK_COUNT || evaluation.suite.checks.length !== CHECK_COUNT) {
        return refuse("INVALID_INPUT");
      }
      secret = bytes32FromHex(evaluation.evaluatorSecret);
      suiteSalt = bytes32FromHex(evaluation.suiteSalt);
      evidenceSalt = bytes32FromHex(evaluation.evidenceSalt);
      targetModel = bytes32FromHex(target.modelCommitment);
      targetSuite = bytes32FromHex(target.suiteCommitment);
      evaluatorKey = bytes32FromHex(deployment.evaluatorKey);
    } catch {
      return refuse("INVALID_INPUT");
    }

    // 1. assert(deriveEvaluatorKey(evaluatorSecret()) == evaluator)
    const signer = await deriveEvaluatorKey(secret);
    const signerOk = equalBytes(signer, evaluatorKey);
    step("evaluator", signerOk);
    if (!signerOk) return refuse("UNAUTHORIZED_EVALUATOR");

    // 2. assert(commitModel(modelDigest()) == model)
    const modelOk = equalBytes(await commitModel(await digestManifest(modelManifest(evaluation.model))), targetModel);
    step("model", modelOk);
    if (!modelOk) return refuse("MODEL_COMMITMENT_MISMATCH");

    // 3. assert(commitSuite(suiteDigest(), suiteSalt()) == suite)
    const suiteOk = equalBytes(
      await commitSuite(await digestManifest(suiteManifest(evaluation.suite)), suiteSalt),
      targetSuite,
    );
    step("suite", suiteOk);
    if (!suiteOk) return refuse("SUITE_COMMITMENT_MISMATCH");

    // 4. assert(countPasses(results) >= threshold)
    const predicateOk = predicateSatisfied(deployment.predicate, countPasses(evaluation.results));
    step("predicate", predicateOk);
    if (!predicateOk) return refuse("PREDICATE_NOT_SATISFIED");

    // 5. evidence commitment, attestation id, replay check
    const predicateId = pad32(deployment.predicate.id);
    const evidence = await commitEvidence(
      targetModel,
      targetSuite,
      predicateId,
      packResults(evaluation.results),
      evidenceSalt,
    );
    const id = toHex(await deriveAttestationId(targetModel, targetSuite, predicateId, evidence));
    if (registry.has(id)) {
      step("record", false);
      return refuse("ALREADY_RECORDED");
    }

    const attestation: PublicAttestation = {
      version: 1,
      id,
      code: attestationCode(id),
      modelLabel: evaluation.model.buildId,
      modelCommitment: toHex(targetModel),
      suiteCommitment: toHex(targetSuite),
      predicate: deployment.predicate,
      evidenceCommitment: toHex(evidence),
      evaluatorKey: toHex(signer),
      source: "DEMO",
      issuedAt: now().toISOString(),
    };
    registry.put(attestation);
    step("record", true);
    return { status: "ATTESTED", attestation, steps };
  }

  return {
    source: "DEMO",
    label: SOURCE_LABEL.DEMO,
    disclaimer: SOURCE_DISCLAIMER.DEMO,
    attest,
    lookup: async (idOrCode) => registry.get(idOrCode),
  };
}
