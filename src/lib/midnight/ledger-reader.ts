/**
 * Read CLOSED BOOK's public ledger from a Midnight network, through the
 * public indexer — no wallet, no private data.
 *
 * Query shape and decoding follow @midnight-ntwrk/midnight-js-indexer-public-
 * data-provider 4.1.1 (CONTRACT_STATE_QUERY + ContractState.deserialize). The
 * decoded state is interpreted with the compiled contract's own `ledger()`.
 *
 * Node / server only (compact-runtime loads WASM from disk).
 */
import { createHash } from "node:crypto";
import { ContractState } from "@midnight-ntwrk/compact-runtime";
import { ledger, type Ledger } from "../../../contract/src/managed/closed-book/contract/index.js";

export const CONTRACT_STATE_QUERY = `query CONTRACT_STATE_QUERY($address: HexEncoded!) {
  contractAction(address: $address) { state }
}`;

export class NetworkUnavailableError extends Error {}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/** Latest serialized contract state (hex), or null if no contract exists at the address. */
export async function fetchContractStateHex(
  indexerHttp: string,
  address: string,
  fetchImpl: FetchLike = fetch,
): Promise<string | null> {
  let res: Response;
  try {
    res = await fetchImpl(indexerHttp, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: CONTRACT_STATE_QUERY, variables: { address: address.replace(/^0x/, "") } }),
      signal: AbortSignal.timeout(20_000),
    });
  } catch (e) {
    throw new NetworkUnavailableError(`indexer unreachable: ${(e as Error).message}`);
  }
  if (!res.ok) throw new NetworkUnavailableError(`indexer returned HTTP ${res.status}`);
  const body = (await res.json()) as { data?: { contractAction?: { state?: string } | null }; errors?: { message: string }[] };
  if (body.errors?.length) throw new NetworkUnavailableError(`indexer error: ${body.errors[0].message}`);
  return body.data?.contractAction?.state ?? null;
}

export interface DecodedContract {
  readonly operations: string[];
  /** sha256 of the `attest` operation's verifier key, if the contract has one. */
  readonly attestVerifierKeySha256: string | null;
  /** CLOSED BOOK ledger, or null when the state does not decode as one. */
  readonly ledger: Ledger | null;
}

/**
 * Decode a serialized contract state. Operations and the `attest` verifier
 * key are read first; the ledger is decoded with CLOSED BOOK's layout only if
 * that succeeds, and is null otherwise. Callers must still compare the
 * verifier key with the deployment record before trusting the ledger.
 */
export function decodeClosedBookState(stateHex: string): DecodedContract {
  const state = ContractState.deserialize(Buffer.from(stateHex.replace(/^0x/, ""), "hex"));
  const operations = state.operations().map((op) => (typeof op === "string" ? op : Buffer.from(op).toString("hex")));
  const attest = state.operation("attest");
  let decoded: Ledger | null = null;
  try {
    decoded = ledger(state.data);
    // Touch every field once so a foreign layout fails here, not later.
    void [decoded.evaluator, decoded.predicate, decoded.threshold, decoded.attestationCount];
    decoded.attestations.size();
    decoded.releases.size();
  } catch {
    decoded = null;
  }
  return {
    operations,
    // A contract compiled without proving keys has an `attest` operation but no verifier key.
    attestVerifierKeySha256: attest?.verifierKey ? createHash("sha256").update(attest.verifierKey).digest("hex") : null,
    ledger: decoded,
  };
}

/** The public ledger entry for one attestation id, as the contract stores it. */
export interface LedgerAttestation {
  readonly id: string;
  readonly model: string;
  readonly suite: string;
  readonly predicate: string;
  readonly evidence: string;
  readonly evaluator: string;
  /** releases[H(model, suite, predicate)] as stored on the ledger, or null. */
  readonly releaseTarget: string | null;
  readonly releaseKey: string;
  readonly threshold: number;
}

const hex = (b: Uint8Array) => `0x${Buffer.from(b).toString("hex")}`;

export function lookupAttestation(l: Ledger, idHex: string, releaseKeyOf: (m: Uint8Array, s: Uint8Array, p: Uint8Array) => Uint8Array): LedgerAttestation | null {
  const id = Buffer.from(idHex.replace(/^0x/, ""), "hex");
  if (id.length !== 32 || !l.attestations.member(id)) return null;
  const r = l.attestations.lookup(id);
  const releaseKey = releaseKeyOf(r.model, r.suite, r.predicate);
  return {
    id: hex(id),
    model: hex(r.model),
    suite: hex(r.suite),
    predicate: hex(r.predicate),
    evidence: hex(r.evidence),
    evaluator: hex(r.evaluator),
    releaseKey: hex(releaseKey),
    releaseTarget: l.releases.member(releaseKey) ? hex(l.releases.lookup(releaseKey)) : null,
    threshold: Number(l.threshold),
  };
}
