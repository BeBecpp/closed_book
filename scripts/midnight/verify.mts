/**
 * npm run network:verify — re-verify every committed network attestation
 * against the live contract through the public indexer. No wallet, no
 * private data. Exits non-zero unless every record is NETWORK_VERIFIED.
 */
import { judgeNetworkRecord } from "../../src/lib/attestation/network-verifier";
import { checkIssuer, classifyReceipt } from "../../src/lib/attestation/receipt";
import { checkRecordIntegrity } from "../../src/lib/attestation/verify";
import { loadDeployment, loadNetworkAttestations, networkView } from "../../src/lib/midnight/network-view";
import { die, loadConfig } from "./lib.mjs";

const config = loadConfig();
const deployment = loadDeployment(config.network.id) ?? die(`No deployments/${config.network.id}.json — nothing is deployed.`);
const view0 = await networkView(deployment, `0x${"00".repeat(32)}`);
console.log(`${config.network.label} · contract ${deployment.contractAddress}`);
if (view0.kind !== "contract") die(`  contract: ${view0.kind === "unavailable" ? view0.reason : "not found at this address"}`);
console.log(`  attest verifier key ${view0.attestVerifierKeySha256 === deployment.attestVerifierKeySha256 ? "matches this repository's compiled key" : "DOES NOT MATCH"}`);

const entries = loadNetworkAttestations(config.network.id);
if (entries.length === 0) console.log("  no network attestations recorded yet");
let failures = 0;
for (const { record } of entries) {
  const verdict = judgeNetworkRecord(record, deployment, await networkView(deployment, record.id));
  const status = classifyReceipt(record, {
    integrity: await checkRecordIntegrity(record),
    referenceMatches: true,
    issuer: await checkIssuer(record, { demo: async () => null, local: null, network: async () => verdict.check }),
  });
  if (status !== "NETWORK_VERIFIED") failures++;
  console.log(`  ${record.code}  ${status}  tx ${record.network?.txId}  — ${verdict.detail}`);
}
process.exit(failures ? 1 : 0);
