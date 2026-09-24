/**
 * Receipt trust states. A self-consistent record must never earn a verified
 * verdict on its hashes alone; only its own issuer can raise it above
 * CLAIMED_PASS, and only a network verifier can make it NETWORK_VERIFIED.
 */
import { describe, expect, it } from "vitest";
import { deriveEvaluatorKey, fromHex, toHex } from "@/src/lib/commitments";
import type { AttestationAdapter } from "@/src/lib/attestation/adapter";
import { createDemoAdapter } from "@/src/lib/attestation/demo-adapter";
import { targetFor } from "@/src/lib/attestation/evaluation";
import { createMidnightLocalAdapter } from "@/src/lib/attestation/midnight-adapter";
import {
  checkIssuer,
  classifyReceipt,
  issuedStatus,
  RECEIPT_STATE,
  type IssuerLookups,
  type ReceiptStatus,
} from "@/src/lib/attestation/receipt";
import type { PublicAttestation } from "@/src/lib/attestation/types";
import { checkRecordIntegrity } from "@/src/lib/attestation/verify";
import { DEMO_EVALUATION, DEMO_PREDICATE } from "@/src/lib/demo/fixture";

async function deployment() {
  const evaluatorKey = toHex(await deriveEvaluatorKey(fromHex(DEMO_EVALUATION.evaluatorSecret)));
  return { evaluatorKey, predicate: DEMO_PREDICATE };
}

async function issue(adapter: AttestationAdapter): Promise<PublicAttestation> {
  const out = await adapter.attest({ evaluation: DEMO_EVALUATION, target: await targetFor(DEMO_EVALUATION) });
  if (out.status !== "ATTESTED") throw new Error("expected attestation");
  return out.attestation;
}

const none = async () => null;

/** Run the receipt pipeline exactly as the /verify page does. */
async function receipt(
  record: PublicAttestation,
  lookups: Partial<IssuerLookups>,
  reference: string = record.code,
): Promise<ReceiptStatus> {
  const integrity = await checkRecordIntegrity(record);
  const issuer = await checkIssuer(record, { demo: none, local: null, network: null, ...lookups });
  const referenceMatches = reference.toLowerCase() === record.code.toLowerCase();
  return classifyReceipt(record, { integrity, referenceMatches, issuer });
}

describe("DEMO records", () => {
  it("issued by this browser's demo adapter -> DEMO_PASS", async () => {
    const demo = createDemoAdapter({ deployment: await deployment() });
    const record = await issue(demo);
    expect(await receipt(record, { demo: (id) => demo.lookup(id) })).toBe("DEMO_PASS");
  });

  it("self-consistent link record the demo adapter never issued -> CLAIMED_PASS", async () => {
    const elsewhere = createDemoAdapter({ deployment: await deployment() });
    const here = createDemoAdapter({ deployment: await deployment() });
    const record = await issue(elsewhere);
    expect((await checkRecordIntegrity(record)).idMatches).toBe(true);
    expect(await receipt(record, { demo: (id) => here.lookup(id) })).toBe("CLAIMED_PASS");
  });

  it("swapped evaluator key: hashes still recompute, issuer disagrees -> ALTERED", async () => {
    const demo = createDemoAdapter({ deployment: await deployment() });
    const record = await issue(demo);
    const forged = { ...record, evaluatorKey: toHex(new Uint8Array(32).fill(9)) };
    expect((await checkRecordIntegrity(forged)).idMatches).toBe(true);
    expect(await receipt(forged, { demo: (id) => demo.lookup(id) })).toBe("ALTERED");
  });
});

describe("MIDNIGHT_LOCAL records", () => {
  it("found field-for-field on the local contract ledger -> LOCAL_CIRCUIT_ATTESTED", async () => {
    const local = createMidnightLocalAdapter({ deployment: await deployment() });
    const record = await issue(local);
    expect(await receipt(record, { local: (id) => local.lookup(id) })).toBe("LOCAL_CIRCUIT_ATTESTED");
  });

  it("local ledger unreachable -> CLAIMED_PASS, never attested", async () => {
    const local = createMidnightLocalAdapter({ deployment: await deployment() });
    const record = await issue(local);
    expect(await receipt(record, { local: null })).toBe("CLAIMED_PASS");
  });

  it("local ledger reachable but does not hold the record -> CLAIMED_PASS", async () => {
    const issuing = createMidnightLocalAdapter({ deployment: await deployment() });
    const other = createMidnightLocalAdapter({ deployment: await deployment() });
    const record = await issue(issuing);
    expect(await receipt(record, { local: (id) => other.lookup(id) })).toBe("CLAIMED_PASS");
  });

  it("demo record relabelled as MIDNIGHT_LOCAL is not attested by the demo registry", async () => {
    const demo = createDemoAdapter({ deployment: await deployment() });
    const relabelled: PublicAttestation = { ...(await issue(demo)), source: "MIDNIGHT_LOCAL" };
    const local = createMidnightLocalAdapter({ deployment: await deployment() });
    expect(
      await receipt(relabelled, { demo: (id) => demo.lookup(id), local: (id) => local.lookup(id) }),
    ).toBe("CLAIMED_PASS");
  });

  it("ledger holds the id but a field was edited -> ALTERED", async () => {
    const local = createMidnightLocalAdapter({ deployment: await deployment() });
    const record = await issue(local);
    const edited = { ...record, evaluatorKey: toHex(new Uint8Array(32).fill(1)) };
    expect(await receipt(edited, { local: (id) => local.lookup(id) })).toBe("ALTERED");
  });
});

describe("MIDNIGHT network records", () => {
  it("claimed network record with no network verifier -> CLAIMED_PASS", async () => {
    const demo = createDemoAdapter({ deployment: await deployment() });
    const claimed: PublicAttestation = { ...(await issue(demo)), source: "MIDNIGHT" };
    // Even every other issuer "holding" it must not help: only the network counts.
    const status = await receipt(claimed, {
      demo: (id) => demo.lookup(id),
      local: async () => claimed,
      network: null,
    });
    expect(status).toBe("CLAIMED_PASS");
  });

  it("NETWORK_VERIFIED is reachable only through a network verifier", async () => {
    const demo = createDemoAdapter({ deployment: await deployment() });
    const claimed: PublicAttestation = { ...(await issue(demo)), source: "MIDNIGHT" };
    const verifier = async () => "match" as const;
    expect(await receipt(claimed, { network: verifier })).toBe("NETWORK_VERIFIED");
    const rejecting = async () => "absent" as const;
    expect(await receipt(claimed, { network: rejecting })).toBe("CLAIMED_PASS");
  });

  it("a network match cannot rescue an altered record", async () => {
    const demo = createDemoAdapter({ deployment: await deployment() });
    const claimed: PublicAttestation = { ...(await issue(demo)), source: "MIDNIGHT" };
    const altered = { ...claimed, suiteCommitment: claimed.modelCommitment };
    expect(await receipt(altered, { network: async () => "match" as const })).toBe("ALTERED");
  });
});

describe("self-consistency gates every state", () => {
  it("broken id -> ALTERED even when the issuer holds the original", async () => {
    const demo = createDemoAdapter({ deployment: await deployment() });
    const record = await issue(demo);
    const broken = { ...record, evidenceCommitment: record.modelCommitment };
    expect(await receipt(broken, { demo: (id) => demo.lookup(id) })).toBe("ALTERED");
  });

  it("broken release key -> ALTERED", async () => {
    const demo = createDemoAdapter({ deployment: await deployment() });
    const record = await issue(demo);
    expect(await receipt({ ...record, releaseKey: record.id }, { demo: (id) => demo.lookup(id) })).toBe("ALTERED");
  });

  it("opened at the wrong reference -> ALTERED", async () => {
    const demo = createDemoAdapter({ deployment: await deployment() });
    const record = await issue(demo);
    expect(await receipt(record, { demo: (id) => demo.lookup(id) }, "CB-000000")).toBe("ALTERED");
  });
});

describe("state copy cannot be confused", () => {
  const states = Object.keys(RECEIPT_STATE) as ReceiptStatus[];

  it("every state has a distinct stamp and verdict", () => {
    expect(new Set(states.map((s) => RECEIPT_STATE[s].stamp)).size).toBe(states.length);
    expect(new Set(states.map((s) => RECEIPT_STATE[s].verdict)).size).toBe(states.length);
  });

  it("only NETWORK_VERIFIED says 'verified' without a negation", () => {
    for (const s of states) {
      const text = `${RECEIPT_STATE[s].stamp} ${RECEIPT_STATE[s].verdict}`
        .toLowerCase()
        .replace(/unverified|not verified/g, "");
      if (s === "NETWORK_VERIFIED") expect(text).toContain("verified");
      else expect(text).not.toContain("verified");
    }
  });

  it("demo and local states name what they are", () => {
    expect(RECEIPT_STATE.DEMO_PASS.verdict).toMatch(/simulated/);
    expect(RECEIPT_STATE.DEMO_PASS.meaning).toMatch(/not a cryptographic attestation/);
    expect(RECEIPT_STATE.LOCAL_CIRCUIT_ATTESTED.meaning).toMatch(/No zero-knowledge proof/);
    expect(RECEIPT_STATE.CLAIMED_PASS.verdict).toMatch(/not verified/);
  });

  it("issuing pages label their own records without claiming network verification", async () => {
    const demoRecord = await issue(createDemoAdapter({ deployment: await deployment() }));
    const localRecord = await issue(createMidnightLocalAdapter({ deployment: await deployment() }));
    expect(issuedStatus(demoRecord)).toBe("DEMO_PASS");
    expect(issuedStatus(localRecord)).toBe("LOCAL_CIRCUIT_ATTESTED");
    expect(issuedStatus({ ...demoRecord, source: "MIDNIGHT" })).toBe("CLAIMED_PASS");
  });
});
