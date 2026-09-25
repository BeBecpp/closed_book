/**
 * Server-side: turn live public network state into a NetworkView for one
 * attestation id, and load the committed deployment record.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { pureCircuits } from "../../../contract/src/managed/closed-book/contract/index.js";
import type { NetworkView } from "../attestation/network-verifier";
import type { PublicAttestation } from "../attestation/types";
import {
  decodeClosedBookState,
  fetchContractStateHex,
  lookupAttestation,
  NetworkUnavailableError,
  type FetchLike,
} from "./ledger-reader";
import { networkById, parseDeployment, type Deployment, type MidnightNetworkId } from "./network";

const hex = (b: Uint8Array) => `0x${Buffer.from(b).toString("hex")}`;

export async function networkView(deployment: Deployment, id: string, fetchImpl?: FetchLike): Promise<NetworkView> {
  const network = networkById(deployment.network);
  let stateHex: string | null;
  try {
    stateHex = await fetchContractStateHex(network.indexerHttp, deployment.contractAddress, fetchImpl);
  } catch (e) {
    if (e instanceof NetworkUnavailableError) return { kind: "unavailable", reason: e.message };
    throw e;
  }
  if (stateHex === null) return { kind: "no-contract" };
  const decoded = decodeClosedBookState(stateHex);
  const l = decoded.ledger;
  return {
    kind: "contract",
    attestVerifierKeySha256: decoded.attestVerifierKeySha256,
    closedBookLedger: l !== null,
    contractEvaluator: l ? hex(l.evaluator) : null,
    contractPredicate: l ? hex(l.predicate) : null,
    contractThreshold: l ? Number(l.threshold) : null,
    attestation: l ? lookupAttestation(l, id, pureCircuits.deriveReleaseKey) : null,
  };
}

/** Records written by scripts/midnight/attest.mts from real network transactions. */
export interface NetworkAttestationEntry {
  readonly record: PublicAttestation;
  readonly submittedAt: string;
}

function repoFile(name: string) {
  return path.join(process.cwd(), "deployments", name);
}

/** The deployment this site verifies against, or null when none is committed. */
export function loadDeployment(network: MidnightNetworkId = (process.env.CLOSEDBOOK_NETWORK as MidnightNetworkId) ?? "preprod"): Deployment | null {
  const file = repoFile(`${network}.json`);
  if (!existsSync(file)) return null;
  return parseDeployment(JSON.parse(readFileSync(file, "utf8")));
}

export function loadNetworkAttestations(network: MidnightNetworkId): NetworkAttestationEntry[] {
  const file = repoFile(`${network}.attestations.json`);
  if (!existsSync(file)) return [];
  const parsed: unknown = JSON.parse(readFileSync(file, "utf8"));
  return Array.isArray(parsed) ? (parsed as NetworkAttestationEntry[]) : [];
}
