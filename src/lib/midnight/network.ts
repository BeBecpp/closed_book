/**
 * Midnight network configuration and the deployment record format.
 *
 * Endpoints are copied from the official "Networks and environments"
 * reference (docs.midnight.network/guides/networks-and-environments). The proof
 * server is always local: it receives private witness data.
 *
 * A deployment record (deployments/<network>.json) is written only by
 * scripts/midnight/deploy.ts from the values the network returned. It is
 * never hand-authored; parseDeployment rejects anything malformed.
 */

export type MidnightNetworkId = "preprod" | "preview";

export interface MidnightNetwork {
  readonly id: MidnightNetworkId;
  readonly label: string;
  readonly indexerHttp: string;
  readonly indexerWs: string;
  readonly node: string;
  readonly faucet: string;
}

export const NETWORKS: Record<MidnightNetworkId, MidnightNetwork> = {
  preprod: {
    id: "preprod",
    label: "Midnight Preprod",
    indexerHttp: "https://indexer.preprod.midnight.network/api/v4/graphql",
    indexerWs: "wss://indexer.preprod.midnight.network/api/v4/graphql/ws",
    node: "https://rpc.preprod.midnight.network",
    faucet: "https://midnight-tmnight-preprod.nethermind.dev/",
  },
  preview: {
    id: "preview",
    label: "Midnight Preview",
    indexerHttp: "https://indexer.preview.midnight.network/api/v4/graphql",
    indexerWs: "wss://indexer.preview.midnight.network/api/v4/graphql/ws",
    node: "https://rpc.preview.midnight.network",
    faucet: "https://midnight-tmnight-preview.nethermind.dev/",
  },
};

export const DEFAULT_PROOF_SERVER = "http://127.0.0.1:6300";

export function networkById(id: string): MidnightNetwork {
  if (id === "preprod" || id === "preview") return NETWORKS[id];
  throw new Error(`unknown Midnight network "${id}" (expected preprod or preview)`);
}

/** What deploy.ts records. Every field comes from the toolchain or the network. */
export interface Deployment {
  readonly network: MidnightNetworkId;
  readonly contractAddress: string;
  readonly deployTxId: string;
  readonly deployTxHash: string | null;
  readonly blockHeight: number | null;
  readonly blockHash: string | null;
  readonly gitCommit: string;
  readonly compactVersion: string;
  readonly runtimeVersion: string;
  /** sha256 of the `attest` verifier key the contract was deployed with. */
  readonly attestVerifierKeySha256: string;
  readonly evaluatorKey: string;
  readonly predicateId: string;
  readonly threshold: number;
  readonly deployedAt: string;
}

const HEX = /^[0-9a-f]+$/;

function hexField(o: Record<string, unknown>, key: string, bytes?: number): string {
  const v = o[key];
  if (typeof v !== "string") throw new Error(`deployment.${key} must be a string`);
  const clean = v.toLowerCase().replace(/^0x/, "");
  if (!HEX.test(clean) || clean.length % 2 !== 0) throw new Error(`deployment.${key} must be hex`);
  if (bytes !== undefined && clean.length !== bytes * 2) throw new Error(`deployment.${key} must be ${bytes} bytes`);
  return clean;
}

function stringField(o: Record<string, unknown>, key: string): string {
  const v = o[key];
  if (typeof v !== "string" || v.trim() === "") throw new Error(`deployment.${key} must be a non-empty string`);
  return v;
}

function optional<T>(o: Record<string, unknown>, key: string, read: () => T): T | null {
  return o[key] === null || o[key] === undefined ? null : read();
}

/** Strict parser: a deployment record either is complete and well-formed, or is rejected. */
export function parseDeployment(input: unknown): Deployment {
  if (typeof input !== "object" || input === null) throw new Error("deployment must be an object");
  const o = input as Record<string, unknown>;
  const network = networkById(stringField(o, "network")).id;
  const threshold = o.threshold;
  if (typeof threshold !== "number" || !Number.isInteger(threshold) || threshold < 1 || threshold > 6) {
    throw new Error("deployment.threshold must be an integer 1..6");
  }
  const blockHeight = optional(o, "blockHeight", () => {
    const b = o.blockHeight;
    if (typeof b !== "number" || !Number.isInteger(b) || b < 0) throw new Error("deployment.blockHeight must be a non-negative integer");
    return b;
  });
  const deployedAt = stringField(o, "deployedAt");
  if (Number.isNaN(Date.parse(deployedAt))) throw new Error("deployment.deployedAt must be an ISO date");
  return {
    network,
    contractAddress: hexField(o, "contractAddress"),
    deployTxId: stringField(o, "deployTxId"),
    deployTxHash: optional(o, "deployTxHash", () => stringField(o, "deployTxHash")),
    blockHeight,
    blockHash: optional(o, "blockHash", () => stringField(o, "blockHash")),
    gitCommit: hexField(o, "gitCommit", 20),
    compactVersion: stringField(o, "compactVersion"),
    runtimeVersion: stringField(o, "runtimeVersion"),
    attestVerifierKeySha256: hexField(o, "attestVerifierKeySha256", 32),
    evaluatorKey: hexField(o, "evaluatorKey", 32),
    predicateId: stringField(o, "predicateId"),
    threshold,
    deployedAt,
  };
}

/** Network provenance attached to a MIDNIGHT (network) attestation record. */
export interface NetworkAttestationMeta {
  readonly network: MidnightNetworkId;
  readonly contractAddress: string;
  readonly txId: string;
  readonly txHash: string | null;
  readonly blockHeight: number | null;
}

export const sameAddress = (a: string, b: string) =>
  a.toLowerCase().replace(/^0x/, "") === b.toLowerCase().replace(/^0x/, "");
