/**
 * LIVE Midnight network checks. Opt-in, because public CI cannot rely on the
 * network:  npm run test:network   (sets CLOSEDBOOK_LIVE_NETWORK=1)
 *
 * Always: the public indexer answers, a random address has no contract, and
 * a known foreign contract is not mistaken for CLOSED BOOK.
 * When deployments/<network>.json exists: every committed network
 * attestation must reach NETWORK_VERIFIED against the live contract.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { judgeNetworkRecord } from "@/src/lib/attestation/network-verifier";
import { checkIssuer, classifyReceipt } from "@/src/lib/attestation/receipt";
import { checkRecordIntegrity } from "@/src/lib/attestation/verify";
import { decodeClosedBookState, fetchContractStateHex } from "@/src/lib/midnight/ledger-reader";
import { networkById, type MidnightNetworkId } from "@/src/lib/midnight/network";
import { loadDeployment, loadNetworkAttestations, networkView } from "@/src/lib/midnight/network-view";

const live = process.env.CLOSEDBOOK_LIVE_NETWORK === "1";
const networkId = (process.env.CLOSEDBOOK_NETWORK ?? "preprod") as MidnightNetworkId;
const network = networkById(networkId);

/** The official leaderboard example's contract on Preprod (midnightntwrk/midnight-leaderboard). */
const FOREIGN_PREPROD_CONTRACT = "20ac3cceedeaf961aeccf79ae15e0f6d8ab29589921c5a7a71a111e7aa94c6d8";

describe.skipIf(!live)(`live ${network.label}`, { timeout: 60_000 }, () => {
  it("a random address has no contract", async () => {
    expect(await fetchContractStateHex(network.indexerHttp, randomBytes(32).toString("hex"))).toBeNull();
  });

  it.skipIf(networkId !== "preprod")("a foreign contract is not mistaken for CLOSED BOOK", async () => {
    const state = await fetchContractStateHex(network.indexerHttp, FOREIGN_PREPROD_CONTRACT);
    expect(state).not.toBeNull();
    const decoded = decodeClosedBookState(state!);
    expect(decoded.operations).not.toContain("attest");
    expect(decoded.attestVerifierKeySha256).toBeNull();
  });

  const deployment = loadDeployment(networkId);
  it.skipIf(!deployment)("the deployed CLOSED BOOK contract exists and is the one this repository compiled", async () => {
    const view = await networkView(deployment!, `0x${"00".repeat(32)}`);
    expect(view.kind).toBe("contract");
    if (view.kind !== "contract") return;
    expect(view.attestVerifierKeySha256).toBe(deployment!.attestVerifierKeySha256);
    expect(view.closedBookLedger).toBe(true);
  });

  for (const entry of deployment ? loadNetworkAttestations(networkId) : []) {
    it(`${entry.record.code} reaches NETWORK_VERIFIED against the live contract`, async () => {
      const view = await networkView(deployment!, entry.record.id);
      const verdict = judgeNetworkRecord(entry.record, deployment!, view);
      expect(verdict.check, verdict.detail).toBe("match");
      const status = classifyReceipt(entry.record, {
        integrity: await checkRecordIntegrity(entry.record),
        referenceMatches: true,
        issuer: await checkIssuer(entry.record, { demo: async () => null, local: null, network: async () => verdict.check }),
      });
      expect(status).toBe("NETWORK_VERIFIED");
    });
  }
});
