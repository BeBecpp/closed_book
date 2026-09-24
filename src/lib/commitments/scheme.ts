/**
 * CLOSED BOOK commitment scheme, v1.
 *
 * This module mirrors the pure circuits in contract/src/closed-book.compact
 * byte for byte. Compact's `persistentHash<Vector<n, Bytes<32>>>` is SHA-256
 * over the concatenated 32-byte elements, and `Field as Bytes<32>` is
 * little-endian. tests/contract.test.ts checks this equivalence against the
 * compiled contract for every function here.
 */
import { type Bytes32, concat, pad32, utf8 } from "./bytes";

export const CHECK_COUNT = 6;

export const DOMAIN = {
  evaluator: pad32("closedbook:evaluator:v1"),
  model: pad32("closedbook:model:v1"),
  suite: pad32("closedbook:suite:v1"),
  evidence: pad32("closedbook:evidence:v1"),
  attestation: pad32("closedbook:attestation:v1"),
  release: pad32("closedbook:release:v1"),
} as const;

export async function sha256(data: Uint8Array): Promise<Bytes32> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", data as BufferSource);
  return new Uint8Array(digest);
}

/** persistentHash<Vector<n, Bytes<32>>>([...parts]) */
export async function persistentHash(parts: readonly Bytes32[]): Promise<Bytes32> {
  for (const p of parts) {
    if (p.length !== 32) throw new Error("persistentHash parts must be 32 bytes");
  }
  return sha256(concat(parts));
}

export function deriveEvaluatorKey(secret: Bytes32): Promise<Bytes32> {
  return persistentHash([DOMAIN.evaluator, secret]);
}

export function commitModel(modelDigest: Bytes32): Promise<Bytes32> {
  return persistentHash([DOMAIN.model, modelDigest]);
}

export function commitSuite(suiteDigest: Bytes32, salt: Bytes32): Promise<Bytes32> {
  return persistentHash([DOMAIN.suite, suiteDigest, salt]);
}

function assertResults(results: readonly boolean[]): void {
  if (results.length !== CHECK_COUNT) {
    throw new Error(`expected ${CHECK_COUNT} check results, got ${results.length}`);
  }
}

/** Bit i set <=> check i passed; encoded as a little-endian 32-byte word. */
export function packResults(results: readonly boolean[]): Bytes32 {
  assertResults(results);
  let mask = 0;
  results.forEach((passed, i) => {
    if (passed) mask |= 1 << i;
  });
  const out = new Uint8Array(32);
  out[0] = mask;
  return out;
}

export function countPasses(results: readonly boolean[]): number {
  assertResults(results);
  return results.filter(Boolean).length;
}

export function commitEvidence(
  model: Bytes32,
  suite: Bytes32,
  predicateId: Bytes32,
  packed: Bytes32,
  salt: Bytes32,
): Promise<Bytes32> {
  return persistentHash([DOMAIN.evidence, model, suite, predicateId, packed, salt]);
}

/** One key per (model, suite, predicate). The contract allows one attestation per key. */
export function deriveReleaseKey(model: Bytes32, suite: Bytes32, predicateId: Bytes32): Promise<Bytes32> {
  return persistentHash([DOMAIN.release, model, suite, predicateId]);
}

export function deriveAttestationId(
  model: Bytes32,
  suite: Bytes32,
  predicateId: Bytes32,
  evidence: Bytes32,
): Promise<Bytes32> {
  return persistentHash([DOMAIN.attestation, model, suite, predicateId, evidence]);
}

/**
 * Canonical JSON: object keys sorted recursively, no whitespace. Used to
 * derive the model and suite digests from their manifests.
 */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`;
}

export function digestManifest(manifest: unknown): Promise<Bytes32> {
  return sha256(utf8(canonicalJson(manifest)));
}
