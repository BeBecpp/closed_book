/**
 * Types for the attestation boundary. The UI depends only on these and on
 * the AttestationAdapter interface in ./adapter.ts.
 */

/**
 * Where an attestation came from. These are not interchangeable and the UI
 * must never present one as another.
 *
 * - DEMO:           TypeScript demo adapter. Real SHA-256 commitments, real
 *                   predicate enforcement, no zero-knowledge proof, no chain.
 * - MIDNIGHT_LOCAL: The compiled Compact contract executed in-process through
 *                   @midnight-ntwrk/compact-runtime. The circuit's assertions
 *                   run; no proof is generated; nothing is submitted.
 * - MIDNIGHT:       A proven transaction on a Midnight network. Not produced
 *                   by this repository yet.
 */
export type AttestationSource = "DEMO" | "MIDNIGHT_LOCAL" | "MIDNIGHT";

export interface ReleasePredicate {
  /** Encoded into the contract as pad(32, id). */
  readonly id: string;
  readonly label: string;
  readonly requiredPasses: number;
  readonly checkCount: number;
  readonly statement: string;
}

export interface CheckDefinition {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  /** Sealed test cases. Never rendered, never disclosed. */
  readonly cases: readonly string[];
}

export interface ModelBuild {
  /** Human label for the build, e.g. CB-DEMO-04. */
  readonly buildId: string;
  /** Build manifest. Its canonical-JSON SHA-256 is the model digest. */
  readonly manifest: Readonly<Record<string, string | number>>;
}

export interface EvaluationSuite {
  readonly name: string;
  readonly version: string;
  readonly checks: readonly CheckDefinition[];
}

/** Everything the evaluator holds. None of this is published. */
export interface PrivateEvaluation {
  readonly evaluationId: string;
  readonly model: ModelBuild;
  readonly suite: EvaluationSuite;
  /** Aligned with suite.checks. */
  readonly results: readonly boolean[];
  readonly suiteSalt: string;
  readonly evidenceSalt: string;
  readonly evaluatorSecret: string;
  readonly notes: string;
}

/** The public commitments an attestation is requested against. */
export interface AttestationTarget {
  readonly modelCommitment: string;
  readonly suiteCommitment: string;
}

export interface AttestRequest {
  readonly evaluation: PrivateEvaluation;
  readonly target: AttestationTarget;
}

/** The public record. This is all a verifier ever receives. */
export interface PublicAttestation {
  readonly version: 1;
  readonly id: string;
  readonly code: string;
  readonly modelLabel: string;
  readonly modelCommitment: string;
  readonly suiteCommitment: string;
  readonly predicate: ReleasePredicate;
  readonly evidenceCommitment: string;
  readonly evaluatorKey: string;
  readonly source: AttestationSource;
  readonly issuedAt: string;
  /** Present only for MIDNIGHT_LOCAL: what actually executed. */
  readonly circuit?: {
    readonly contract: string;
    readonly circuit: string;
    readonly compiler: string;
    readonly runtime: string;
    readonly proof: "NOT_GENERATED";
  };
}

export type RefusalReason =
  | "PREDICATE_NOT_SATISFIED"
  | "MODEL_COMMITMENT_MISMATCH"
  | "SUITE_COMMITMENT_MISMATCH"
  | "UNAUTHORIZED_EVALUATOR"
  | "ALREADY_RECORDED"
  | "INVALID_INPUT";

export interface AttestStep {
  readonly key: "evaluator" | "model" | "suite" | "predicate" | "record";
  readonly label: string;
  readonly ok: boolean;
}

export type AttestOutcome =
  | {
      readonly status: "ATTESTED";
      readonly attestation: PublicAttestation;
      readonly steps: readonly AttestStep[];
    }
  | {
      readonly status: "REFUSED";
      readonly reason: RefusalReason;
      /** Public-safe message. Never names a check, prompt or output. */
      readonly message: string;
      readonly source: AttestationSource;
      readonly steps: readonly AttestStep[];
    };
