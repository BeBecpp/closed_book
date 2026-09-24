import { describe, expect, it } from "vitest";
import { toHex, deriveEvaluatorKey, deriveReleaseKey, fromHex, pad32 } from "@/src/lib/commitments";
import { createDemoAdapter } from "@/src/lib/attestation/demo-adapter";
import { targetFor } from "@/src/lib/attestation/evaluation";
import {
  checkRecordIntegrity,
  decodeRecord,
  encodeRecord,
  measureDisclosure,
  openEvidence,
} from "@/src/lib/attestation/verify";
import type { PrivateEvaluation } from "@/src/lib/attestation/types";
import { DEMO_EVALUATION, DEMO_PREDICATE } from "@/src/lib/demo/fixture";

async function adapter() {
  const evaluatorKey = toHex(await deriveEvaluatorKey(fromHex(DEMO_EVALUATION.evaluatorSecret)));
  return createDemoAdapter({
    deployment: { evaluatorKey, predicate: DEMO_PREDICATE },
    now: () => new Date("2026-09-24T00:00:00Z"),
  });
}

const failing: PrivateEvaluation = { ...DEMO_EVALUATION, results: [true, false, true, true, true, true] };

describe("demo adapter", () => {
  it("all checks pass -> eligible attestation", async () => {
    const a = await adapter();
    const out = await a.attest({ evaluation: DEMO_EVALUATION, target: await targetFor(DEMO_EVALUATION) });
    expect(out.status).toBe("ATTESTED");
    if (out.status !== "ATTESTED") return;
    expect(out.attestation.source).toBe("DEMO");
    expect(out.attestation.code).toMatch(/^CB-[0-9A-F]{6}$/);
    expect(out.steps.every((s) => s.ok)).toBe(true);
    expect(await a.lookup(out.attestation.code)).toEqual(out.attestation);
    expect(await a.lookup(out.attestation.id)).toEqual(out.attestation);
  });

  it("one check fails -> attestation refused, nothing recorded, no check named", async () => {
    const a = await adapter();
    const out = await a.attest({ evaluation: failing, target: await targetFor(failing) });
    expect(out.status).toBe("REFUSED");
    if (out.status !== "REFUSED") return;
    expect(out.reason).toBe("PREDICATE_NOT_SATISFIED");
    const serialised = JSON.stringify(out).toLowerCase();
    for (const check of failing.suite.checks) {
      expect(serialised).not.toContain(check.name.toLowerCase());
      expect(serialised).not.toContain(check.category);
      for (const c of check.cases) expect(serialised).not.toContain(c.toLowerCase());
    }
  });

  it("different model commitment -> mismatch", async () => {
    const a = await adapter();
    const target = await targetFor(DEMO_EVALUATION);
    const other = await targetFor({
      ...DEMO_EVALUATION,
      model: { ...DEMO_EVALUATION.model, buildId: "CB-DEMO-05" },
    });
    const out = await a.attest({
      evaluation: DEMO_EVALUATION,
      target: { ...target, modelCommitment: other.modelCommitment },
    });
    expect(out.status === "REFUSED" && out.reason).toBe("MODEL_COMMITMENT_MISMATCH");
  });

  it("different suite commitment -> mismatch", async () => {
    const a = await adapter();
    const target = await targetFor(DEMO_EVALUATION);
    const other = await targetFor({ ...DEMO_EVALUATION, suite: { ...DEMO_EVALUATION.suite, version: "1.1" } });
    const out = await a.attest({
      evaluation: DEMO_EVALUATION,
      target: { ...target, suiteCommitment: other.suiteCommitment },
    });
    expect(out.status === "REFUSED" && out.reason).toBe("SUITE_COMMITMENT_MISMATCH");
  });

  it("wrong evaluator secret -> unauthorized", async () => {
    const a = await adapter();
    const intruder = { ...DEMO_EVALUATION, evaluatorSecret: `0x${"11".repeat(32)}` };
    const out = await a.attest({ evaluation: intruder, target: await targetFor(intruder) });
    expect(out.status === "REFUSED" && out.reason).toBe("UNAUTHORIZED_EVALUATOR");
  });

  it("replay of the same attestation is rejected", async () => {
    const a = await adapter();
    const req = { evaluation: DEMO_EVALUATION, target: await targetFor(DEMO_EVALUATION) };
    expect((await a.attest(req)).status).toBe("ATTESTED");
    const again = await a.attest(req);
    expect(again.status === "REFUSED" && again.reason).toBe("RELEASE_ALREADY_ATTESTED");
  });

  it("a fresh evidence salt does not buy a second attestation for the same release", async () => {
    const a = await adapter();
    const target = await targetFor(DEMO_EVALUATION);
    const first = await a.attest({ evaluation: DEMO_EVALUATION, target });
    if (first.status !== "ATTESTED") throw new Error("expected attestation");
    const resalted = { ...DEMO_EVALUATION, evidenceSalt: `0x${"77".repeat(32)}` };
    const second = await a.attest({ evaluation: resalted, target });
    expect(second.status).toBe("REFUSED");
    if (second.status !== "REFUSED") return;
    expect(second.reason).toBe("RELEASE_ALREADY_ATTESTED");
    expect(second.existing).toEqual({ id: first.attestation.id, code: first.attestation.code });
    expect(second.steps.at(-1)).toMatchObject({ key: "release", ok: false });
  });

  it("a different suite commitment is a different release", async () => {
    const a = await adapter();
    expect((await a.attest({ evaluation: DEMO_EVALUATION, target: await targetFor(DEMO_EVALUATION) })).status).toBe(
      "ATTESTED",
    );
    const resuited = { ...DEMO_EVALUATION, suiteSalt: `0x${"42".repeat(32)}` };
    const out = await a.attest({ evaluation: resuited, target: await targetFor(resuited) });
    expect(out.status).toBe("ATTESTED");
  });

  it("records carry a release key derived from model, suite and predicate", async () => {
    const a = await adapter();
    const target = await targetFor(DEMO_EVALUATION);
    const out = await a.attest({ evaluation: DEMO_EVALUATION, target });
    if (out.status !== "ATTESTED") throw new Error("expected attestation");
    const expected = await deriveReleaseKey(
      fromHex(target.modelCommitment),
      fromHex(target.suiteCommitment),
      pad32(DEMO_PREDICATE.id),
    );
    expect(out.attestation.version).toBe(2);
    expect(out.attestation.releaseKey).toBe(toHex(expected));
  });

  it("malformed input is refused, not thrown", async () => {
    const a = await adapter();
    const bad = { ...DEMO_EVALUATION, suiteSalt: "0x1234" };
    const out = await a.attest({ evaluation: bad, target: await targetFor(DEMO_EVALUATION) });
    expect(out.status === "REFUSED" && out.reason).toBe("INVALID_INPUT");
  });
});

describe("public verification", () => {
  it("record integrity: id recomputes from public fields", async () => {
    const a = await adapter();
    const out = await a.attest({ evaluation: DEMO_EVALUATION, target: await targetFor(DEMO_EVALUATION) });
    if (out.status !== "ATTESTED") throw new Error("expected attestation");
    const report = await checkRecordIntegrity(out.attestation);
    expect(report.idMatches).toBe(true);
    expect(report.codeMatches).toBe(true);

    const edited = { ...out.attestation, suiteCommitment: out.attestation.modelCommitment };
    const editedReport = await checkRecordIntegrity(edited);
    expect(editedReport.idMatches).toBe(false);
    expect(editedReport.codeMatches).toBe(true);

    const recoded = { ...out.attestation, code: "CB-000000" };
    expect((await checkRecordIntegrity(recoded)).codeMatches).toBe(false);

    const rereleased = { ...out.attestation, releaseKey: out.attestation.id };
    const rereleasedReport = await checkRecordIntegrity(rereleased);
    expect(rereleasedReport.releaseMatches).toBe(false);
    expect(rereleasedReport.idMatches).toBe(true);
  });

  it("tampered private data does not open the evidence commitment", async () => {
    const a = await adapter();
    const out = await a.attest({ evaluation: DEMO_EVALUATION, target: await targetFor(DEMO_EVALUATION) });
    if (out.status !== "ATTESTED") throw new Error("expected attestation");
    const honest = { results: DEMO_EVALUATION.results, evidenceSalt: DEMO_EVALUATION.evidenceSalt };
    expect(await openEvidence(out.attestation, honest)).toBe(true);
    expect(await openEvidence(out.attestation, { ...honest, results: failing.results })).toBe(false);
    expect(await openEvidence(out.attestation, { ...honest, evidenceSalt: `0x${"00".repeat(32)}` })).toBe(false);
  });

  it("discloses zero bytes of private plaintext", async () => {
    const a = await adapter();
    const out = await a.attest({ evaluation: DEMO_EVALUATION, target: await targetFor(DEMO_EVALUATION) });
    if (out.status !== "ATTESTED") throw new Error("expected attestation");
    expect(measureDisclosure(out.attestation, DEMO_EVALUATION)).toBe(0);
    // The scan measures plaintext leakage, not record size: the record itself
    // is hundreds of bytes of commitments and labels.
    expect(JSON.stringify(out.attestation).length).toBeGreaterThan(300);
    expect(measureDisclosure(null, DEMO_EVALUATION)).toBe(0);
    const leaky = { ...out.attestation, modelLabel: DEMO_EVALUATION.suite.checks[1].cases[0] };
    expect(measureDisclosure(leaky, DEMO_EVALUATION)).toBeGreaterThan(0);
  });

  it("share-link encoding round-trips", async () => {
    const a = await adapter();
    const out = await a.attest({ evaluation: DEMO_EVALUATION, target: await targetFor(DEMO_EVALUATION) });
    if (out.status !== "ATTESTED") throw new Error("expected attestation");
    expect(decodeRecord(encodeRecord(out.attestation))).toEqual(out.attestation);
    expect(decodeRecord("not-a-record")).toBeNull();
  });
});
