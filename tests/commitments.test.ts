import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  canonicalJson,
  commitEvidence,
  commitModel,
  commitSuite,
  concat,
  countPasses,
  deriveAttestationId,
  DOMAIN,
  fromHex,
  packResults,
  pad32,
  shortHex,
  toHex,
} from "@/src/lib/commitments";
import { deriveCommitments } from "@/src/lib/attestation/evaluation";
import { DEMO_EVALUATION } from "@/src/lib/demo/fixture";

const b = (n: number) => new Uint8Array(32).fill(n);
const nodeSha = (...parts: Uint8Array[]) => new Uint8Array(createHash("sha256").update(concat(parts)).digest());

describe("commitment scheme", () => {
  it("pad32 mirrors Compact pad(32, s)", () => {
    const p = pad32("closedbook:model:v1");
    expect(p.length).toBe(32);
    expect(new TextDecoder().decode(p.slice(0, 19))).toBe("closedbook:model:v1");
    expect([...p.slice(19)].every((x) => x === 0)).toBe(true);
    expect(() => pad32("x".repeat(33))).toThrow();
  });

  it("persistentHash is domain-separated SHA-256 over 32-byte words", async () => {
    expect(await commitModel(b(7))).toEqual(nodeSha(DOMAIN.model, b(7)));
    expect(await commitSuite(b(1), b(2))).toEqual(nodeSha(DOMAIN.suite, b(1), b(2)));
  });

  it("is deterministic", async () => {
    const a = await deriveCommitments(DEMO_EVALUATION);
    const c = await deriveCommitments(DEMO_EVALUATION);
    expect(a).toEqual(c);
  });

  it("different domains never collide for the same input", async () => {
    const m = await commitModel(b(3));
    const s = await commitSuite(b(3), new Uint8Array(32));
    expect(toHex(m)).not.toBe(toHex(s));
  });

  it("suite commitment is hiding: a different salt changes it", async () => {
    expect(toHex(await commitSuite(b(1), b(2)))).not.toBe(toHex(await commitSuite(b(1), b(3))));
  });

  it("packs results little-endian, bit i = check i", () => {
    expect(packResults([true, true, true, true, true, true])[0]).toBe(0b111111);
    expect(packResults([true, false, true, true, true, true])[0]).toBe(0b111101);
    expect([...packResults([true, true, true, true, true, true]).slice(1)].every((x) => x === 0)).toBe(true);
    expect(() => packResults([true])).toThrow();
  });

  it("counts passes", () => {
    expect(countPasses([true, true, true, true, true, true])).toBe(6);
    expect(countPasses([true, false, true, true, true, true])).toBe(5);
  });

  it("evidence and attestation id change with any bound input", async () => {
    const e1 = await commitEvidence(b(1), b(2), pad32("safety-baseline:1"), packResults(Array(6).fill(true)), b(9));
    const e2 = await commitEvidence(b(1), b(2), pad32("safety-baseline:1"), packResults([...Array(5).fill(true), false]), b(9));
    expect(toHex(e1)).not.toBe(toHex(e2));
    const id1 = await deriveAttestationId(b(1), b(2), pad32("safety-baseline:1"), e1);
    const id2 = await deriveAttestationId(b(1), b(4), pad32("safety-baseline:1"), e1);
    expect(toHex(id1)).not.toBe(toHex(id2));
  });

  it("canonical JSON sorts keys recursively", () => {
    expect(canonicalJson({ b: 1, a: { d: 2, c: [3, { f: 1, e: 0 }] } })).toBe('{"a":{"c":[3,{"e":0,"f":1}],"d":2},"b":1}');
  });

  it("hex helpers round-trip and truncate consistently", () => {
    const h = toHex(b(0xab));
    expect(toHex(fromHex(h))).toBe(h);
    expect(shortHex(h)).toBe("0xabababab…abab");
    expect(() => fromHex("0xzz")).toThrow();
  });
});
