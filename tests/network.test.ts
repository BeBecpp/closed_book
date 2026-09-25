/**
 * Network configuration, the indexer reader and network receipt
 * verification. Deterministic: the "indexer" is a local fetch stub that
 * returns a REAL serialized ContractState produced by running the compiled
 * contract — the same format the Midnight indexer serves. The live-network
 * checks are in tests/network.live.test.ts (opt-in).
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  ContractOperation,
  createCircuitContext,
  createConstructorContext,
  sampleContractAddress,
} from "@midnight-ntwrk/compact-runtime";
import { Contract, pureCircuits } from "@/contract/src/managed/closed-book/contract/index.js";
import { deriveEvaluatorKey, fromHex, pad32, toHex } from "@/src/lib/commitments";
import { createDemoAdapter } from "@/src/lib/attestation/demo-adapter";
import { targetFor, deriveCommitments } from "@/src/lib/attestation/evaluation";
import { judgeNetworkRecord, type NetworkView } from "@/src/lib/attestation/network-verifier";
import { checkIssuer, classifyReceipt } from "@/src/lib/attestation/receipt";
import type { PublicAttestation } from "@/src/lib/attestation/types";
import { checkRecordIntegrity } from "@/src/lib/attestation/verify";
import { DEMO_EVALUATION, DEMO_PREDICATE } from "@/src/lib/demo/fixture";
import {
  decodeClosedBookState,
  fetchContractStateHex,
  lookupAttestation,
  NetworkUnavailableError,
} from "@/src/lib/midnight/ledger-reader";
import { witnesses, type ClosedBookPrivateState } from "@/src/lib/midnight/local-contract";
import { networkById, NETWORKS, parseDeployment, type Deployment } from "@/src/lib/midnight/network";
import { networkView } from "@/src/lib/midnight/network-view";

const ADDRESS = "ab".repeat(32);
const TX = "00".repeat(32);

/** Run the compiled contract once (6/6) and serialize the resulting ContractState. */
async function realNetworkState() {
  const evaluatorKey = await deriveEvaluatorKey(fromHex(DEMO_EVALUATION.evaluatorSecret));
  const d = await deriveCommitments(DEMO_EVALUATION);
  const blank: ClosedBookPrivateState = {
    evaluatorSecret: new Uint8Array(32),
    modelDigest: new Uint8Array(32),
    suiteDigest: new Uint8Array(32),
    suiteSalt: new Uint8Array(32),
    results: [false, false, false, false, false, false],
    evidenceSalt: new Uint8Array(32),
  };
  const contract = new Contract<ClosedBookPrivateState>(witnesses);
  const init = contract.initialState(createConstructorContext(blank, "0".repeat(64)), evaluatorKey, pad32(DEMO_PREDICATE.id), 6n);
  const ctx = createCircuitContext(sampleContractAddress(), init.currentZswapLocalState, init.currentContractState, blank);
  const privateState: ClosedBookPrivateState = {
    evaluatorSecret: fromHex(DEMO_EVALUATION.evaluatorSecret),
    modelDigest: fromHex(d.modelDigest),
    suiteDigest: fromHex(d.suiteDigest),
    suiteSalt: fromHex(DEMO_EVALUATION.suiteSalt),
    results: [...DEMO_EVALUATION.results],
    evidenceSalt: fromHex(DEMO_EVALUATION.evidenceSalt),
  };
  const call = contract.impureCircuits.attest(
    { ...ctx, currentPrivateState: privateState },
    fromHex(d.modelCommitment),
    fromHex(d.suiteCommitment),
  );
  const state = init.currentContractState;
  state.data = call.context.currentQueryContext.state;
  // As a real deployment does: install the attest verifier key (generated in CI, committed in proofs/).
  const vk = new Uint8Array(readFileSync("proofs/attest.verifier"));
  const op = new ContractOperation();
  op.verifierKey = vk;
  state.setOperation("attest", op);
  const stateHex = Buffer.from(state.serialize()).toString("hex");
  return { stateHex, attestationId: toHex(call.result), evaluatorKey: toHex(evaluatorKey), vkSha: createHash("sha256").update(vk).digest("hex") };
}

function deployment(over: Partial<Deployment> & { attestVerifierKeySha256: string; evaluatorKey: string }): Deployment {
  return parseDeployment({
    network: "preprod",
    contractAddress: ADDRESS,
    deployTxId: TX,
    deployTxHash: null,
    blockHeight: 1,
    blockHash: null,
    gitCommit: "a".repeat(40),
    compactVersion: "0.31.1",
    runtimeVersion: "0.16.0",
    predicateId: DEMO_PREDICATE.id,
    threshold: 6,
    deployedAt: "2026-09-25T00:00:00Z",
    ...over,
  });
}

const indexerReturning = (stateHex: string | null) => async () =>
  new Response(JSON.stringify({ data: { contractAction: stateHex === null ? null : { state: stateHex } } }), { status: 200 });

/** The record a successful network attestation of DEMO_EVALUATION produces. */
async function networkRecord(id: string, over: Partial<PublicAttestation> = {}): Promise<PublicAttestation> {
  const evaluatorKey = toHex(await deriveEvaluatorKey(fromHex(DEMO_EVALUATION.evaluatorSecret)));
  const demo = createDemoAdapter({ deployment: { evaluatorKey, predicate: DEMO_PREDICATE } });
  const out = await demo.attest({ evaluation: DEMO_EVALUATION, target: await targetFor(DEMO_EVALUATION) });
  if (out.status !== "ATTESTED") throw new Error("expected attestation");
  expect(out.attestation.id).toBe(id); // demo adapter and contract agree byte for byte
  return {
    ...out.attestation,
    source: "MIDNIGHT",
    network: { network: "preprod", contractAddress: ADDRESS, txId: TX, txHash: null, blockHeight: 1 },
    ...over,
  };
}

async function receiptStatus(record: PublicAttestation, d: Deployment, view: NetworkView) {
  const integrity = await checkRecordIntegrity(record);
  const issuer = await checkIssuer(record, {
    demo: async () => null,
    local: null,
    network: async (r) => judgeNetworkRecord(r, d, view).check,
  });
  return classifyReceipt(record, { integrity, referenceMatches: true, issuer });
}

describe("network configuration", () => {
  it("knows the current public networks and rejects others", () => {
    expect(networkById("preprod").indexerHttp).toBe("https://indexer.preprod.midnight.network/api/v4/graphql");
    expect(NETWORKS.preview.node).toBe("https://rpc.preview.midnight.network");
    expect(() => networkById("testnet-02")).toThrow(/unknown Midnight network/);
    expect(() => networkById("mainnet")).toThrow();
  });

  it("parses a complete deployment record and normalises hex", () => {
    const d = deployment({ attestVerifierKeySha256: "c".repeat(64), evaluatorKey: `0x${"d".repeat(64)}` });
    expect(d.evaluatorKey).toBe("d".repeat(64));
    expect(d.network).toBe("preprod");
  });

  it("rejects malformed or incomplete deployment records", () => {
    const base = { attestVerifierKeySha256: "c".repeat(64), evaluatorKey: "d".repeat(64) };
    expect(() => deployment({ ...base, contractAddress: "zz" })).toThrow(/contractAddress/);
    expect(() => deployment({ ...base, threshold: 7 })).toThrow(/threshold/);
    expect(() => deployment({ ...base, gitCommit: "abc" })).toThrow(/gitCommit/);
    expect(() => deployment({ ...base, deployedAt: "yesterday" })).toThrow(/deployedAt/);
    expect(() => parseDeployment({ network: "preprod" })).toThrow();
    expect(() => parseDeployment(null)).toThrow();
  });
});

describe("indexer reader", () => {
  it("decodes a real serialized CLOSED BOOK contract state", async () => {
    const s = await realNetworkState();
    const decoded = decodeClosedBookState(s.stateHex);
    expect(decoded.operations).toContain("attest");
    expect(decoded.ledger).not.toBeNull();
    expect(decoded.ledger!.attestationCount).toBe(1n);
    const entry = lookupAttestation(decoded.ledger!, s.attestationId, pureCircuits.deriveReleaseKey);
    expect(entry?.id).toBe(s.attestationId);
    expect(entry?.releaseTarget).toBe(s.attestationId);
    expect(lookupAttestation(decoded.ledger!, toHex(new Uint8Array(32)), pureCircuits.deriveReleaseKey)).toBeNull();
  });

  it("returns null for an address with no contract", async () => {
    expect(await fetchContractStateHex("https://indexer.test", ADDRESS, indexerReturning(null))).toBeNull();
  });

  it("reports network errors as unavailable, not as absence", async () => {
    const down = async () => {
      throw new TypeError("fetch failed");
    };
    await expect(fetchContractStateHex("https://indexer.test", ADDRESS, down)).rejects.toBeInstanceOf(NetworkUnavailableError);
    const http500 = async () => new Response("boom", { status: 500 });
    await expect(fetchContractStateHex("https://indexer.test", ADDRESS, http500)).rejects.toBeInstanceOf(NetworkUnavailableError);
    const gqlError = async () => new Response(JSON.stringify({ errors: [{ message: "bad address" }] }), { status: 200 });
    await expect(fetchContractStateHex("https://indexer.test", ADDRESS, gqlError)).rejects.toBeInstanceOf(NetworkUnavailableError);
  });
});

describe("network receipt verification", () => {
  it("record held field for field by the deployed contract -> NETWORK_VERIFIED", async () => {
    const s = await realNetworkState();
    const d = deployment({ attestVerifierKeySha256: s.vkSha, evaluatorKey: s.evaluatorKey });
    const view = await networkView(d, s.attestationId, indexerReturning(s.stateHex));
    const record = await networkRecord(s.attestationId);
    expect(judgeNetworkRecord(record, d, view).detail).toMatch(/after network proof verification/);
    expect(await receiptStatus(record, d, view)).toBe("NETWORK_VERIFIED");
  });

  it("a field that differs from the ledger -> ALTERED", async () => {
    const s = await realNetworkState();
    const d = deployment({ attestVerifierKeySha256: s.vkSha, evaluatorKey: s.evaluatorKey });
    const view = await networkView(d, s.attestationId, indexerReturning(s.stateHex));
    const record = await networkRecord(s.attestationId);
    // The evaluator key is not part of the id: integrity holds, the ledger disagrees.
    const edited = { ...record, evaluatorKey: toHex(new Uint8Array(32).fill(7)) };
    expect((await checkRecordIntegrity(edited)).idMatches).toBe(true);
    expect(await receiptStatus(edited, d, view)).toBe("ALTERED");
  });

  it("an attestation the contract does not hold -> CLAIMED_PASS", async () => {
    const s = await realNetworkState();
    const d = deployment({ attestVerifierKeySha256: s.vkSha, evaluatorKey: s.evaluatorKey });
    const emptyView = await networkView(d, toHex(new Uint8Array(32).fill(1)), indexerReturning(s.stateHex));
    const record = await networkRecord(s.attestationId);
    expect(await receiptStatus(record, d, emptyView)).toBe("CLAIMED_PASS");
  });

  it("a record naming a different contract address -> CLAIMED_PASS", async () => {
    const s = await realNetworkState();
    const d = deployment({ attestVerifierKeySha256: s.vkSha, evaluatorKey: s.evaluatorKey });
    const view = await networkView(d, s.attestationId, indexerReturning(s.stateHex));
    const record = await networkRecord(s.attestationId);
    const elsewhere = { ...record, network: { ...record.network!, contractAddress: "cd".repeat(32) } };
    expect(await receiptStatus(elsewhere, d, view)).toBe("CLAIMED_PASS");
  });

  it("a contract at the address that is not the deployed CLOSED BOOK -> CLAIMED_PASS", async () => {
    const s = await realNetworkState();
    const d = deployment({ attestVerifierKeySha256: "e".repeat(64), evaluatorKey: s.evaluatorKey });
    const view = await networkView(d, s.attestationId, indexerReturning(s.stateHex));
    expect(judgeNetworkRecord(await networkRecord(s.attestationId), d, view).detail).toMatch(/not the deployed CLOSED BOOK/);
    expect(await receiptStatus(await networkRecord(s.attestationId), d, view)).toBe("CLAIMED_PASS");
  });

  it("no contract at the configured address -> CLAIMED_PASS", async () => {
    const s = await realNetworkState();
    const d = deployment({ attestVerifierKeySha256: s.vkSha, evaluatorKey: s.evaluatorKey });
    const view = await networkView(d, s.attestationId, indexerReturning(null));
    expect(await receiptStatus(await networkRecord(s.attestationId), d, view)).toBe("CLAIMED_PASS");
  });

  it("network unavailable -> CLAIMED_PASS, never verified", async () => {
    const s = await realNetworkState();
    const d = deployment({ attestVerifierKeySha256: s.vkSha, evaluatorKey: s.evaluatorKey });
    const view = await networkView(d, s.attestationId, async () => {
      throw new TypeError("fetch failed");
    });
    expect(view.kind).toBe("unavailable");
    expect(await receiptStatus(await networkRecord(s.attestationId), d, view)).toBe("CLAIMED_PASS");
  });

  it("a ledger whose releases entry points elsewhere -> ALTERED", async () => {
    const s = await realNetworkState();
    const d = deployment({ attestVerifierKeySha256: s.vkSha, evaluatorKey: s.evaluatorKey });
    const view = await networkView(d, s.attestationId, indexerReturning(s.stateHex));
    if (view.kind !== "contract" || !view.attestation) throw new Error("expected contract view");
    const replayed: NetworkView = { ...view, attestation: { ...view.attestation, releaseTarget: toHex(new Uint8Array(32).fill(2)) } };
    expect(await receiptStatus(await networkRecord(s.attestationId), d, replayed)).toBe("ALTERED");
  });

  it("a MIDNIGHT record without network provenance is only a claim", async () => {
    const s = await realNetworkState();
    const d = deployment({ attestVerifierKeySha256: s.vkSha, evaluatorKey: s.evaluatorKey });
    const view = await networkView(d, s.attestationId, indexerReturning(s.stateHex));
    const record = await networkRecord(s.attestationId);
    const noProvenance: PublicAttestation = { ...record, network: undefined };
    expect(await receiptStatus(noProvenance, d, view)).toBe("CLAIMED_PASS");
  });

  it("DEMO and MIDNIGHT_LOCAL records are never judged by the network verifier", async () => {
    const s = await realNetworkState();
    const d = deployment({ attestVerifierKeySha256: s.vkSha, evaluatorKey: s.evaluatorKey });
    const view = await networkView(d, s.attestationId, indexerReturning(s.stateHex));
    const record = await networkRecord(s.attestationId);
    for (const source of ["DEMO", "MIDNIGHT_LOCAL"] as const) {
      expect(await receiptStatus({ ...record, source }, d, view)).toBe("CLAIMED_PASS");
    }
  });
});
