/**
 * Read-only check of the public indexer path against a live Midnight network.
 *
 *   npx tsx scripts/midnight/probe-indexer.ts [network] [address...]
 *
 * With no address it probes a random (non-existent) contract address, which
 * must come back as "no contract". Needs no wallet, no funds, no private data.
 */
import { randomBytes } from "node:crypto";
import { decodeClosedBookState, fetchContractStateHex } from "../../src/lib/midnight/ledger-reader";
import { networkById } from "../../src/lib/midnight/network";

const [networkArg = "preprod", ...addresses] = process.argv.slice(2);
const network = networkById(networkArg);
const targets = addresses.length ? addresses : [randomBytes(32).toString("hex")];

console.log(`${network.label} indexer: ${network.indexerHttp}`);
for (const address of targets) {
  const state = await fetchContractStateHex(network.indexerHttp, address);
  if (state === null) {
    console.log(`  ${address.slice(0, 16)}…  no contract at this address`);
    continue;
  }
  const decoded = decodeClosedBookState(state);
  console.log(`  ${address.slice(0, 16)}…  state ${state.length / 2} bytes`);
  console.log(`    operations              ${decoded.operations.join(", ")}`);
  console.log(`    attest verifier sha256  ${decoded.attestVerifierKeySha256 ?? "(no attest operation)"}`);
  console.log(`    CLOSED BOOK ledger      ${decoded.ledger ? `decoded, ${decoded.ledger.attestationCount} attestation(s)` : "does not decode"}`);
}
