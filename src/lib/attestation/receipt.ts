/**
 * Receipt trust states.
 *
 * A receipt must never let a self-consistent record earn a verified verdict
 * just because its hashes recompute: anyone can build such a record. Each
 * state below says exactly what was established, and they are mutually
 * exclusive.
 *
 *   ALTERED                  The record contradicts itself or the address.
 *   CLAIMED_PASS             Self-consistent, but no issuer confirmed it.
 *   DEMO_PASS                The demo adapter in this browser issued this
 *                            exact record. A simulated verdict.
 *   LOCAL_CIRCUIT_ATTESTED   The compiled Compact contract on this machine
 *                            holds this exact record in its ledger. No proof.
 *   NETWORK_VERIFIED         A network verifier confirmed the proven
 *                            transaction. No such verifier exists in this
 *                            repository, so this state is currently
 *                            unreachable.
 */
import type { IntegrityReport } from "./verify";
import type { PublicAttestation } from "./types";

export type ReceiptStatus =
  | "ALTERED"
  | "CLAIMED_PASS"
  | "DEMO_PASS"
  | "LOCAL_CIRCUIT_ATTESTED"
  | "NETWORK_VERIFIED";

/**
 * Result of asking the record's claimed issuer whether it holds this record:
 * the demo registry in this browser for DEMO, the local contract ledger for
 * MIDNIGHT_LOCAL, a network verifier for MIDNIGHT.
 */
export type IssuerCheck = "match" | "mismatch" | "absent" | "unreachable";

export interface ReceiptEvidence {
  readonly integrity: IntegrityReport;
  readonly referenceMatches: boolean;
  readonly issuer: IssuerCheck;
}

/** The fields an issuer holds and must agree on, field for field. */
export function sameRecord(a: PublicAttestation, b: PublicAttestation): boolean {
  const n = (h: string) => h.toLowerCase();
  return (
    n(a.id) === n(b.id) &&
    n(a.releaseKey) === n(b.releaseKey) &&
    n(a.modelCommitment) === n(b.modelCommitment) &&
    n(a.suiteCommitment) === n(b.suiteCommitment) &&
    n(a.evidenceCommitment) === n(b.evidenceCommitment) &&
    n(a.evaluatorKey) === n(b.evaluatorKey) &&
    a.predicate.id === b.predicate.id &&
    a.predicate.requiredPasses === b.predicate.requiredPasses &&
    a.source === b.source
  );
}

export function issuerCheck(record: PublicAttestation, held: PublicAttestation | null | undefined): IssuerCheck {
  if (held === undefined) return "unreachable";
  if (held === null) return "absent";
  return sameRecord(record, held) ? "match" : "mismatch";
}

/**
 * Confirms a MIDNIGHT record against the network: the proven transaction and
 * the contract's ledger entry. Must not return "match" unless a real proof
 * was verified. No implementation exists in this repository.
 */
export type NetworkVerifier = (record: PublicAttestation) => Promise<IssuerCheck>;

export interface IssuerLookups {
  /** The demo registry in this browser. */
  readonly demo: (id: string) => Promise<PublicAttestation | null>;
  /** The local contract ledger, or null when not reachable from this page. */
  readonly local: ((id: string) => Promise<PublicAttestation | null>) | null;
  /** Null until a real network verifier exists. */
  readonly network: NetworkVerifier | null;
}

/** Ask the record's own claimed issuer — and only that issuer — about it. */
export async function checkIssuer(record: PublicAttestation, lookups: IssuerLookups): Promise<IssuerCheck> {
  switch (record.source) {
    case "DEMO":
      return issuerCheck(record, await lookups.demo(record.id));
    case "MIDNIGHT_LOCAL":
      return lookups.local ? issuerCheck(record, await lookups.local(record.id)) : "unreachable";
    case "MIDNIGHT":
      return lookups.network ? lookups.network(record) : "unreachable";
  }
}

export function classifyReceipt(record: PublicAttestation, e: ReceiptEvidence): ReceiptStatus {
  const selfConsistent =
    e.integrity.idMatches && e.integrity.releaseMatches && e.integrity.codeMatches && e.referenceMatches;
  if (!selfConsistent) return "ALTERED";
  // An issuer that holds a different record under the same id contradicts it.
  if (e.issuer === "mismatch") return "ALTERED";
  if (e.issuer !== "match") return "CLAIMED_PASS";
  switch (record.source) {
    case "DEMO":
      return "DEMO_PASS";
    case "MIDNIGHT_LOCAL":
      return "LOCAL_CIRCUIT_ATTESTED";
    case "MIDNIGHT":
      return "NETWORK_VERIFIED";
  }
}

export interface ReceiptStateCopy {
  /** Short state label, shown as the receipt's status stamp. */
  readonly stamp: string;
  /** How the verdict line reads in this state. */
  readonly verdict: string;
  /** One or two plain sentences: what was and was not established. */
  readonly meaning: string;
}

export const RECEIPT_STATE: Record<ReceiptStatus, ReceiptStateCopy> = {
  NETWORK_VERIFIED: {
    stamp: "Network verified",
    verdict: "PASS",
    meaning: "A Midnight network verified the zero-knowledge proof for this attestation.",
  },
  LOCAL_CIRCUIT_ATTESTED: {
    stamp: "Local circuit attested",
    verdict: "PASS · local circuit",
    meaning:
      "The compiled Compact contract running on this machine accepted the attestation and holds this exact record in its ledger. No zero-knowledge proof was generated and no network has seen it.",
  },
  DEMO_PASS: {
    stamp: "Demo pass · simulated",
    verdict: "PASS · simulated",
    meaning:
      "Issued by the demo adapter in this browser, which runs the contract's checks in TypeScript. This is a simulated verdict, not a cryptographic attestation.",
  },
  CLAIMED_PASS: {
    stamp: "Claimed pass · unverified",
    verdict: "PASS · claimed, not verified",
    meaning:
      "This record is internally consistent, but its issuer did not confirm it. Anyone can construct a self-consistent record, so treat the verdict as a claim.",
  },
  ALTERED: {
    stamp: "Altered record",
    verdict: "Not shown",
    meaning: "This record contradicts its own public fields, the address it was opened at, or its issuer. Treat it as altered.",
  },
};

/**
 * The state a freshly issued record is in, as seen by the page that issued
 * it: the issuer just returned it. Network issuance does not exist yet.
 */
export function issuedStatus(record: PublicAttestation): ReceiptStatus {
  if (record.source === "DEMO") return "DEMO_PASS";
  if (record.source === "MIDNIGHT_LOCAL") return "LOCAL_CIRCUIT_ATTESTED";
  return "CLAIMED_PASS";
}
