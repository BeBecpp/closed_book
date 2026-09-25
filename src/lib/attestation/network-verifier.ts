/**
 * Network verification for MIDNIGHT (network) attestation records.
 *
 * The verifier does not check proof bytes itself. It establishes that the
 * record is held, field for field, by the configured CLOSED BOOK contract on
 * a Midnight network. The network verified the transaction's zero-knowledge
 * proof when it accepted the transaction; that is why the ledger holds the
 * record at all. Wording elsewhere must say exactly that: "recorded by the
 * Midnight contract after network proof verification".
 *
 * Pure and client-safe. The view comes from src/lib/midnight/ledger-reader.ts
 * (server side), which reads public contract state from the indexer.
 */
import { pad32, toHex } from "../commitments";
import type { Deployment } from "../midnight/network";
import { sameAddress } from "../midnight/network";
import type { IssuerCheck } from "./receipt";
import type { PublicAttestation } from "./types";

/** What a verifier learns from the network about one attestation id. */
export type NetworkView =
  | { readonly kind: "unavailable"; readonly reason: string }
  | { readonly kind: "no-contract" }
  | {
      readonly kind: "contract";
      readonly attestVerifierKeySha256: string | null;
      readonly closedBookLedger: boolean;
      readonly contractEvaluator: string | null;
      readonly contractPredicate: string | null;
      readonly contractThreshold: number | null;
      readonly attestation: {
        readonly id: string;
        readonly model: string;
        readonly suite: string;
        readonly predicate: string;
        readonly evidence: string;
        readonly evaluator: string;
        readonly releaseKey: string;
        readonly releaseTarget: string | null;
      } | null;
    };

export interface NetworkCheck {
  readonly check: IssuerCheck;
  readonly detail: string;
}

const n = (h: string | null | undefined) => (h ?? "").toLowerCase().replace(/^0x/, "");

/**
 * Decide the issuer check for a MIDNIGHT record against the configured
 * deployment and what the network holds. Only "match" can lead to
 * NETWORK_VERIFIED, and only when every one of these holds:
 *   - the record names the configured network and contract address,
 *   - a contract exists at that address and is CLOSED BOOK (its `attest`
 *     verifier key hashes to the key this repository deployed),
 *   - the contract's evaluator, predicate and threshold are the deployed ones,
 *   - the attestation id is in the contract's `attestations` map,
 *   - every stored field equals the record's, and
 *   - `releases[releaseKey]` points at this id.
 */
export function judgeNetworkRecord(record: PublicAttestation, deployment: Deployment, view: NetworkView): NetworkCheck {
  const meta = record.network;
  if (!meta) return { check: "absent", detail: "The record carries no network provenance." };
  if (meta.network !== deployment.network || !sameAddress(meta.contractAddress, deployment.contractAddress)) {
    return {
      check: "absent",
      detail: `The record names a different contract (${meta.network} ${meta.contractAddress}) than the one this site verifies.`,
    };
  }
  if (view.kind === "unavailable") return { check: "unreachable", detail: `Network unavailable: ${view.reason}` };
  if (view.kind === "no-contract") return { check: "unreachable", detail: "No contract exists at the configured address." };
  if (n(view.attestVerifierKeySha256) !== n(deployment.attestVerifierKeySha256) || !view.closedBookLedger) {
    return { check: "unreachable", detail: "The contract at the configured address is not the deployed CLOSED BOOK contract." };
  }
  if (
    n(view.contractEvaluator) !== n(deployment.evaluatorKey) ||
    n(view.contractPredicate) !== n(toHex(pad32(deployment.predicateId))) ||
    view.contractThreshold !== deployment.threshold
  ) {
    return { check: "unreachable", detail: "The contract's evaluator, predicate or threshold differ from the deployment record." };
  }
  const a = view.attestation;
  if (!a) return { check: "absent", detail: "The contract's ledger has no attestation with this id." };
  const fieldsMatch =
    n(a.id) === n(record.id) &&
    n(a.model) === n(record.modelCommitment) &&
    n(a.suite) === n(record.suiteCommitment) &&
    n(a.evidence) === n(record.evidenceCommitment) &&
    n(a.evaluator) === n(record.evaluatorKey) &&
    n(a.predicate) === n(toHex(pad32(record.predicate.id))) &&
    record.predicate.requiredPasses === deployment.threshold &&
    n(a.releaseKey) === n(record.releaseKey) &&
    n(a.releaseTarget) === n(record.id);
  if (!fieldsMatch) return { check: "mismatch", detail: "The contract holds a different record under this id." };
  return {
    check: "match",
    detail: "Recorded by the Midnight contract after network proof verification; every ledger field matches this receipt.",
  };
}
