/**
 * Executes the compiled Compact contract (contract/src/managed/closed-book)
 * through @midnight-ntwrk/compact-runtime. These tests run the real circuit
 * logic. They do not generate proofs.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import * as ts from "@/src/lib/commitments";
import { createDemoAdapter } from "@/src/lib/attestation/demo-adapter";
import { targetFor, deriveCommitments } from "@/src/lib/attestation/evaluation";
import { createMidnightLocalAdapter } from "@/src/lib/attestation/midnight-adapter";
import { checkRecordIntegrity } from "@/src/lib/attestation/verify";
import type { PrivateEvaluation } from "@/src/lib/attestation/types";
import { LocalClosedBookContract, pureCircuits } from "@/src/lib/midnight/local-contract";
import { DEMO_EVALUATION, DEMO_PREDICATE } from "@/src/lib/demo/fixture";

const rand = () => new Uint8Array(randomBytes(32));
const hex = ts.toHex;

async function deployment() {
  const evaluatorKey = hex(await ts.deriveEvaluatorKey(ts.fromHex(DEMO_EVALUATION.evaluatorSecret)));
  return { evaluatorKey, predicate: DEMO_PREDICATE };
}

describe("TypeScript scheme matches the compiled contract", () => {
  it("every pure circuit agrees with src/lib/commitments on random inputs", async () => {
    for (let i = 0; i < 16; i++) {
      const [a, b, c, d, e] = [rand(), rand(), rand(), rand(), rand()];
      const results = Array.from({ length: 6 }, () => Math.random() < 0.5);
      expect(hex(pureCircuits.deriveEvaluatorKey(a))).toBe(hex(await ts.deriveEvaluatorKey(a)));
      expect(hex(pureCircuits.commitModel(a))).toBe(hex(await ts.commitModel(a)));
      expect(hex(pureCircuits.commitSuite(a, b))).toBe(hex(await ts.commitSuite(a, b)));
      expect(hex(pureCircuits.packResults(results))).toBe(hex(ts.packResults(results)));
      expect(Number(pureCircuits.countPasses(results))).toBe(ts.countPasses(results));
      expect(hex(pureCircuits.commitEvidence(a, b, c, d, e))).toBe(hex(await ts.commitEvidence(a, b, c, d, e)));
      expect(hex(pureCircuits.deriveAttestationId(a, b, c, d))).toBe(hex(await ts.deriveAttestationId(a, b, c, d)));
      expect(hex(pureCircuits.deriveReleaseKey(a, b, c))).toBe(hex(await ts.deriveReleaseKey(a, b, c)));
    }
  });
});

describe("constructor", () => {
  it("rejects a threshold larger than the number of checks", () => {
    expect(() => new LocalClosedBookContract(rand(), "safety-baseline:1", 7)).toThrow(/threshold exceeds/);
  });

  it("rejects a zero threshold", () => {
    expect(() => new LocalClosedBookContract(rand(), "safety-baseline:1", 0)).toThrow(/at least one/);
  });

  it("publishes evaluator key, predicate and threshold", async () => {
    const d = await deployment();
    const c = new LocalClosedBookContract(ts.fromHex(d.evaluatorKey), d.predicate.id, 6);
    expect(hex(c.ledger.evaluator)).toBe(d.evaluatorKey);
    expect(hex(c.ledger.predicate)).toBe(hex(ts.pad32("safety-baseline:1")));
    expect(c.ledger.threshold).toBe(6n);
    expect(c.ledger.attestations.isEmpty()).toBe(true);
  });
});

describe("attest circuit", () => {
  it("all checks pass -> attestation recorded on the contract ledger", async () => {
    const a = createMidnightLocalAdapter({ deployment: await deployment() });
    const out = await a.attest({ evaluation: DEMO_EVALUATION, target: await targetFor(DEMO_EVALUATION) });
    expect(out.status).toBe("ATTESTED");
    if (out.status !== "ATTESTED") return;
    expect(out.attestation.source).toBe("MIDNIGHT_LOCAL");
    expect(out.attestation.circuit?.proof).toBe("NOT_GENERATED");
    expect(a.contract.ledger.attestationCount).toBe(1n);
    expect(await a.lookup(out.attestation.code)).toEqual(out.attestation);
    expect((await checkRecordIntegrity(out.attestation)).idMatches).toBe(true);
  });

  it("the ledger holds commitments only — no results, salts or suite data", async () => {
    const a = createMidnightLocalAdapter({ deployment: await deployment() });
    const out = await a.attest({ evaluation: DEMO_EVALUATION, target: await targetFor(DEMO_EVALUATION) });
    if (out.status !== "ATTESTED") throw new Error("expected attestation");
    const [[, record]] = a.contract.entries();
    expect(Object.keys(record).sort()).toEqual(["evaluator", "evidence", "model", "predicate", "suite"]);
    const d = await deriveCommitments(DEMO_EVALUATION);
    const stored = Object.values(record).map((v) => hex(v as Uint8Array));
    for (const secret of [DEMO_EVALUATION.suiteSalt, DEMO_EVALUATION.evidenceSalt, DEMO_EVALUATION.evaluatorSecret, d.suiteDigest, d.modelDigest]) {
      expect(stored).not.toContain(secret);
    }
  });

  it("one check fails -> circuit assertion fails and nothing is recorded", async () => {
    const a = createMidnightLocalAdapter({ deployment: await deployment() });
    const failing: PrivateEvaluation = { ...DEMO_EVALUATION, results: [true, true, true, true, true, false] };
    const out = await a.attest({ evaluation: failing, target: await targetFor(failing) });
    expect(out.status === "REFUSED" && out.reason).toBe("PREDICATE_NOT_SATISFIED");
    expect(a.contract.ledger.attestationCount).toBe(0n);
    expect(a.contract.ledger.attestations.isEmpty()).toBe(true);
  });

  it("every single failing check is refused", async () => {
    const a = createMidnightLocalAdapter({ deployment: await deployment() });
    for (let i = 0; i < 6; i++) {
      const results = Array.from({ length: 6 }, (_, j) => j !== i);
      const ev = { ...DEMO_EVALUATION, results };
      const out = await a.attest({ evaluation: ev, target: await targetFor(ev) });
      expect(out.status).toBe("REFUSED");
    }
    expect(a.contract.ledger.attestationCount).toBe(0n);
  });

  it("different model commitment -> model commitment mismatch", async () => {
    const a = createMidnightLocalAdapter({ deployment: await deployment() });
    const target = await targetFor(DEMO_EVALUATION);
    const out = await a.attest({ evaluation: DEMO_EVALUATION, target: { ...target, modelCommitment: hex(rand()) } });
    expect(out.status === "REFUSED" && out.reason).toBe("MODEL_COMMITMENT_MISMATCH");
  });

  it("different suite commitment -> suite commitment mismatch", async () => {
    const a = createMidnightLocalAdapter({ deployment: await deployment() });
    const target = await targetFor(DEMO_EVALUATION);
    const out = await a.attest({ evaluation: DEMO_EVALUATION, target: { ...target, suiteCommitment: hex(rand()) } });
    expect(out.status === "REFUSED" && out.reason).toBe("SUITE_COMMITMENT_MISMATCH");
  });

  it("tampered private suite (edited after commitment) -> suite mismatch", async () => {
    const a = createMidnightLocalAdapter({ deployment: await deployment() });
    const target = await targetFor(DEMO_EVALUATION);
    const checks = DEMO_EVALUATION.suite.checks.map((c, i) => (i === 1 ? { ...c, cases: c.cases.slice(1) } : c));
    const tampered = { ...DEMO_EVALUATION, suite: { ...DEMO_EVALUATION.suite, checks } };
    const out = await a.attest({ evaluation: tampered, target });
    expect(out.status === "REFUSED" && out.reason).toBe("SUITE_COMMITMENT_MISMATCH");
  });

  it("wrong evaluator secret -> not the registered evaluator", async () => {
    const a = createMidnightLocalAdapter({ deployment: await deployment() });
    const intruder = { ...DEMO_EVALUATION, evaluatorSecret: hex(rand()) };
    const out = await a.attest({ evaluation: intruder, target: await targetFor(intruder) });
    expect(out.status === "REFUSED" && out.reason).toBe("UNAUTHORIZED_EVALUATOR");
  });

  it("replay -> release already attested", async () => {
    const a = createMidnightLocalAdapter({ deployment: await deployment() });
    const req = { evaluation: DEMO_EVALUATION, target: await targetFor(DEMO_EVALUATION) };
    expect((await a.attest(req)).status).toBe("ATTESTED");
    const again = await a.attest(req);
    expect(again.status === "REFUSED" && again.reason).toBe("RELEASE_ALREADY_ATTESTED");
    expect(a.contract.ledger.attestationCount).toBe(1n);
  });

  it("a fresh evidence salt is refused by the circuit: one attestation per release", async () => {
    const a = createMidnightLocalAdapter({ deployment: await deployment() });
    const target = await targetFor(DEMO_EVALUATION);
    const first = await a.attest({ evaluation: DEMO_EVALUATION, target });
    if (first.status !== "ATTESTED") throw new Error("expected attestation");
    for (let i = 0; i < 3; i++) {
      const again = await a.attest({ evaluation: { ...DEMO_EVALUATION, evidenceSalt: hex(rand()) }, target });
      expect(again.status).toBe("REFUSED");
      if (again.status !== "REFUSED") return;
      expect(again.reason).toBe("RELEASE_ALREADY_ATTESTED");
      expect(again.existing?.id).toBe(first.attestation.id);
    }
    expect(a.contract.ledger.attestationCount).toBe(1n);
    expect(a.contract.ledger.releases.size()).toBe(1n);
  });

  it("the releases map binds the release key to the attestation id", async () => {
    const a = createMidnightLocalAdapter({ deployment: await deployment() });
    const target = await targetFor(DEMO_EVALUATION);
    const out = await a.attest({ evaluation: DEMO_EVALUATION, target });
    if (out.status !== "ATTESTED") throw new Error("expected attestation");
    const key = await ts.deriveReleaseKey(
      ts.fromHex(target.modelCommitment),
      ts.fromHex(target.suiteCommitment),
      ts.pad32(DEMO_PREDICATE.id),
    );
    expect(out.attestation.releaseKey).toBe(hex(key));
    expect(hex(a.contract.ledger.releases.lookup(key))).toBe(out.attestation.id);
  });

  it("a newly committed suite is a new release and may be attested", async () => {
    const a = createMidnightLocalAdapter({ deployment: await deployment() });
    expect((await a.attest({ evaluation: DEMO_EVALUATION, target: await targetFor(DEMO_EVALUATION) })).status).toBe(
      "ATTESTED",
    );
    const resuited = { ...DEMO_EVALUATION, suiteSalt: hex(rand()) };
    expect((await a.attest({ evaluation: resuited, target: await targetFor(resuited) })).status).toBe("ATTESTED");
    expect(a.contract.ledger.releases.size()).toBe(2n);
  });

  it("a lower deployed threshold accepts 5/6 (predicate is enforced from the ledger)", async () => {
    const d = await deployment();
    const a = createMidnightLocalAdapter({
      deployment: { ...d, predicate: { ...d.predicate, id: "safety-baseline:test-5", requiredPasses: 5 } },
    });
    const ev = { ...DEMO_EVALUATION, results: [true, true, true, true, true, false] };
    expect((await a.attest({ evaluation: ev, target: await targetFor(ev) })).status).toBe("ATTESTED");
  });
});

describe("demo adapter and contract agree", () => {
  it("produce the same attestation id and commitments for the same evaluation", async () => {
    const d = await deployment();
    const target = await targetFor(DEMO_EVALUATION);
    const demo = await createDemoAdapter({ deployment: d }).attest({ evaluation: DEMO_EVALUATION, target });
    const local = await createMidnightLocalAdapter({ deployment: d }).attest({ evaluation: DEMO_EVALUATION, target });
    if (demo.status !== "ATTESTED" || local.status !== "ATTESTED") throw new Error("expected both to attest");
    expect(local.attestation.id).toBe(demo.attestation.id);
    expect(local.attestation.evidenceCommitment).toBe(demo.attestation.evidenceCommitment);
    expect(local.attestation.evaluatorKey).toBe(demo.attestation.evaluatorKey);
  });

  it("refuse the same failing evaluations for the same reasons", async () => {
    const d = await deployment();
    const cases: PrivateEvaluation[] = [
      { ...DEMO_EVALUATION, results: [false, true, true, true, true, true] },
      { ...DEMO_EVALUATION, evaluatorSecret: hex(rand()) },
    ];
    for (const ev of cases) {
      const target = await targetFor(ev);
      const demo = await createDemoAdapter({ deployment: d }).attest({ evaluation: ev, target });
      const local = await createMidnightLocalAdapter({ deployment: d }).attest({ evaluation: ev, target });
      expect(demo.status).toBe("REFUSED");
      expect(local.status).toBe("REFUSED");
      if (demo.status === "REFUSED" && local.status === "REFUSED") expect(local.reason).toBe(demo.reason);
    }
  });
});
