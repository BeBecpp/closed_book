import type {
  AttestationSource,
  AttestOutcome,
  AttestRequest,
  AttestStep,
  PublicAttestation,
} from "./types";

/**
 * The integration boundary. Every way of producing an attestation — the
 * demo adapter, the local Compact circuit, and eventually a Midnight network
 * deployment — implements this interface. UI code imports nothing else.
 */
export interface AttestationAdapter {
  readonly source: AttestationSource;
  /** Short label shown on every record this adapter produces. */
  readonly label: string;
  /** One sentence, plain, saying exactly what this adapter does and does not do. */
  readonly disclaimer: string;

  attest(request: AttestRequest, onStep?: (step: AttestStep) => void): Promise<AttestOutcome>;

  /** Look up a recorded attestation by full hex id or CB- code. */
  lookup(idOrCode: string): Promise<PublicAttestation | null>;
}

export const SOURCE_LABEL: Record<AttestationSource, string> = {
  DEMO: "DEMO ADAPTER",
  MIDNIGHT_LOCAL: "MIDNIGHT · LOCAL CIRCUIT",
  MIDNIGHT: "MIDNIGHT · NETWORK",
};

/** Shown wherever a user could choose the network path. Nothing is deployed. */
export const NETWORK_UNAVAILABLE =
  "Not deployed. No CLOSED BOOK contract is live on a Midnight network from this repository, so no proof or transaction is ever shown.";

export const SOURCE_DISCLAIMER: Record<AttestationSource, string> = {
  DEMO:
    "Commitments and the release predicate are computed in your browser with the same encoding as the Compact contract. No zero-knowledge proof is generated and nothing is written to a chain.",
  MIDNIGHT_LOCAL:
    "The compiled Compact contract ran in-process on this machine and its circuit assertions accepted the private witness. No proof was generated and nothing was submitted to a Midnight network.",
  MIDNIGHT:
    "A proven transaction recorded on a Midnight network.",
};
