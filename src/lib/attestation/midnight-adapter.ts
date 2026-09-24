/**
 * MIDNIGHT ADAPTER.
 *
 * `createMidnightLocalAdapter` executes the compiled Compact contract
 * (contract/src/closed-book.compact, compiler 0.31.1) in-process via
 * @midnight-ntwrk/compact-runtime 0.16.0. Every assertion in the `attest`
 * circuit runs against the private witness. Records are read back from the
 * contract's ledger state.
 *
 * What it does not do (yet): generate a zero-knowledge proof via a proof
 * server, or submit a transaction to a Midnight network. Records it produces
 * are stamped `source: "MIDNIGHT_LOCAL"` and carry `proof: "NOT_GENERATED"`.
 * A network deployment is described in docs/ARCHITECTURE.md and is not
 * claimed anywhere in the product.
 *
 * Server / Node only.
 */
import { bytes32FromHex, digestManifest, fromHex, toHex } from "../commitments";
import { CONTRACT_INFO, LocalClosedBookContract, pureCircuits } from "../midnight/local-contract";
import { SOURCE_DISCLAIMER, SOURCE_LABEL, type AttestationAdapter } from "./adapter";
import { REFUSAL_MESSAGE, STEP_LABEL, type Deployment } from "./demo-adapter";
import { attestationCode, modelManifest, suiteManifest } from "./evaluation";
import type { AttestOutcome, AttestRequest, AttestStep, PublicAttestation, RefusalReason } from "./types";

/** Maps each circuit assertion message to a refusal and the step it fails. */
const ASSERTIONS: ReadonlyArray<[string, RefusalReason, AttestStep["key"]]> = [
  ["not the registered evaluator", "UNAUTHORIZED_EVALUATOR", "evaluator"],
  ["model commitment mismatch", "MODEL_COMMITMENT_MISMATCH", "model"],
  ["suite commitment mismatch", "SUITE_COMMITMENT_MISMATCH", "suite"],
  ["release predicate not satisfied", "PREDICATE_NOT_SATISFIED", "predicate"],
  ["release already attested", "RELEASE_ALREADY_ATTESTED", "release"],
];

const STEP_ORDER: readonly AttestStep["key"][] = ["evaluator", "model", "suite", "predicate", "release"];

export function classifyCircuitError(error: unknown): { reason: RefusalReason; failedAt: AttestStep["key"] } | null {
  const message = error instanceof Error ? error.message : String(error);
  for (const [needle, reason, failedAt] of ASSERTIONS) {
    if (message.includes(needle)) return { reason, failedAt };
  }
  return null;
}

export interface MidnightLocalAdapterOptions {
  readonly deployment: Deployment;
  readonly now?: () => Date;
}

export interface MidnightLocalAdapter extends AttestationAdapter {
  readonly contract: LocalClosedBookContract;
}

export function createMidnightLocalAdapter(options: MidnightLocalAdapterOptions): MidnightLocalAdapter {
  const { deployment } = options;
  const now = options.now ?? (() => new Date());
  const contract = new LocalClosedBookContract(
    bytes32FromHex(deployment.evaluatorKey),
    deployment.predicate.id,
    deployment.predicate.requiredPasses,
  );
  // Labels and issue times are presentation metadata, not ledger state.
  const meta = new Map<string, { modelLabel: string; issuedAt: string }>();

  function toRecord(idHex: string): PublicAttestation | null {
    const onLedger = contract.lookup(fromHex(idHex));
    if (!onLedger) return null;
    const m = meta.get(idHex);
    const releaseKey = pureCircuits.deriveReleaseKey(onLedger.model, onLedger.suite, onLedger.predicate);
    return {
      version: 2,
      id: idHex,
      code: attestationCode(idHex),
      releaseKey: toHex(releaseKey),
      modelLabel: m?.modelLabel ?? "",
      modelCommitment: toHex(onLedger.model),
      suiteCommitment: toHex(onLedger.suite),
      predicate: deployment.predicate,
      evidenceCommitment: toHex(onLedger.evidence),
      evaluatorKey: toHex(onLedger.evaluator),
      source: "MIDNIGHT_LOCAL",
      issuedAt: m?.issuedAt ?? "",
      circuit: { ...CONTRACT_INFO, proof: "NOT_GENERATED" },
    };
  }

  async function attest(request: AttestRequest, onStep?: (s: AttestStep) => void): Promise<AttestOutcome> {
    const steps: AttestStep[] = [];
    const emit = (key: AttestStep["key"], ok: boolean) => {
      const s = { key, label: STEP_LABEL[key], ok };
      steps.push(s);
      onStep?.(s);
    };
    const refuse = (reason: RefusalReason, existing?: { id: string; code: string }): AttestOutcome => ({
      status: "REFUSED",
      reason,
      message: REFUSAL_MESSAGE[reason],
      source: "MIDNIGHT_LOCAL",
      steps,
      ...(existing ? { existing } : {}),
    });

    const { evaluation, target } = request;
    let model, suite, privateState;
    try {
      model = bytes32FromHex(target.modelCommitment);
      suite = bytes32FromHex(target.suiteCommitment);
      if (evaluation.results.length !== 6) return refuse("INVALID_INPUT");
      privateState = {
        evaluatorSecret: bytes32FromHex(evaluation.evaluatorSecret),
        modelDigest: await digestManifest(modelManifest(evaluation.model)),
        suiteDigest: await digestManifest(suiteManifest(evaluation.suite)),
        suiteSalt: bytes32FromHex(evaluation.suiteSalt),
        results: [...evaluation.results],
        evidenceSalt: bytes32FromHex(evaluation.evidenceSalt),
      };
    } catch {
      return refuse("INVALID_INPUT");
    }

    let idBytes: Uint8Array;
    try {
      idBytes = contract.attest(model, suite, privateState);
    } catch (error) {
      const classified = classifyCircuitError(error);
      if (!classified) throw error;
      for (const key of STEP_ORDER) {
        if (key === classified.failedAt) {
          emit(key, false);
          break;
        }
        emit(key, true);
      }
      if (classified.reason === "RELEASE_ALREADY_ATTESTED") {
        const existing = contract.releaseOf(pureCircuits.deriveReleaseKey(model, suite, contract.ledger.predicate));
        if (existing) {
          const hex = toHex(existing);
          return refuse(classified.reason, { id: hex, code: attestationCode(hex) });
        }
      }
      return refuse(classified.reason);
    }

    for (const key of STEP_ORDER) emit(key, true);
    const id = toHex(idBytes);
    meta.set(id, { modelLabel: evaluation.model.buildId, issuedAt: now().toISOString() });
    const attestation = toRecord(id);
    if (!attestation) throw new Error("attest circuit succeeded but no ledger record was found");
    return { status: "ATTESTED", attestation, steps };
  }

  async function lookup(idOrCode: string): Promise<PublicAttestation | null> {
    const key = idOrCode.trim().toLowerCase();
    if (/^(0x)?[0-9a-f]{64}$/.test(key)) return toRecord(key.startsWith("0x") ? key : `0x${key}`);
    for (const [id] of contract.entries()) {
      const hex = toHex(id);
      if (attestationCode(hex).toLowerCase() === key) return toRecord(hex);
    }
    return null;
  }

  return {
    source: "MIDNIGHT_LOCAL",
    label: SOURCE_LABEL.MIDNIGHT_LOCAL,
    disclaimer: SOURCE_DISCLAIMER.MIDNIGHT_LOCAL,
    contract,
    attest,
    lookup,
  };
}

/**
 * Network status. There is no deployed contract behind this repository, so
 * the product never shows MIDNIGHT (network) records.
 */
export const MIDNIGHT_NETWORK = {
  deployed: false,
  reason:
    "No CLOSED BOOK contract is deployed to a Midnight network from this repository. Deployment requires a proof server, a funded wallet and generated proving keys; see docs/ARCHITECTURE.md.",
} as const;
