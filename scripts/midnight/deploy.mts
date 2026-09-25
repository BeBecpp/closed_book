/**
 * npm run network:deploy — deploy the committed CLOSED BOOK contract to a
 * Midnight network and write deployments/<network>.json from the values the
 * network returned. Never writes a field it did not receive.
 *
 * Requires: funded wallet with DUST, local proof server, proving keys.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { deployContract } from "@midnight-ntwrk/midnight-js-contracts";
import { deriveEvaluatorKey, fromHex, pad32, toHex } from "../../src/lib/commitments";
import { DEMO_PREDICATE } from "../../src/lib/demo/fixture";
import { parseDeployment } from "../../src/lib/midnight/network";
import { networkView } from "../../src/lib/midnight/network-view";
import {
  balances,
  buildWallet,
  compiledContract,
  die,
  EMPTY_PRIVATE_STATE,
  gitCommit,
  loadConfig,
  loadSecrets,
  PRIVATE_STATE_ID,
  providers,
  requireKeys,
  requireProofServer,
  root,
  synced,
} from "./lib.mjs";

const config = loadConfig();
const out = path.join(root, "deployments", `${config.network.id}.json`);
if (existsSync(out) && !process.argv.includes("--new")) {
  die(`${path.relative(root, out)} exists: a contract is already deployed. Pass --new to deploy another (the record is replaced).`);
}
const secrets = loadSecrets(config);
const verifierKeySha = requireKeys(config);
const proofServerVersion = await requireProofServer(config);
const evaluatorKey = await deriveEvaluatorKey(fromHex(secrets.evaluatorSecret));

console.log(`Deploying CLOSED BOOK to ${config.network.label}`);
console.log(`  proof server        ${config.proofServer} (${proofServerVersion})`);
console.log(`  attest verifier     sha256 ${verifierKeySha}`);
console.log(`  evaluator key       ${toHex(evaluatorKey)}`);
console.log(`  predicate           ${DEMO_PREDICATE.id}, threshold ${DEMO_PREDICATE.requiredPasses}`);

const ctx = await buildWallet(config, secrets.walletSeed);
try {
  const b = balances(await synced(ctx));
  if (b.dust === 0n) die(`No DUST to pay fees (NIGHT ${b.night}). Fund at ${config.network.faucet}, then npm run network:dust.`);
  const deployed = await deployContract(providers(config, ctx, secrets), {
    compiledContract: compiledContract(config),
    privateStateId: PRIVATE_STATE_ID,
    initialPrivateState: EMPTY_PRIVATE_STATE,
    args: [evaluatorKey, pad32(DEMO_PREDICATE.id), BigInt(DEMO_PREDICATE.requiredPasses)],
  });
  const pub = deployed.deployTxData.public;
  const record = parseDeployment({
    network: config.network.id,
    contractAddress: String(pub.contractAddress),
    deployTxId: String(pub.txId),
    deployTxHash: pub.txHash ? String(pub.txHash) : null,
    blockHeight: typeof pub.blockHeight === "number" ? pub.blockHeight : null,
    blockHash: pub.blockHash ? String(pub.blockHash) : null,
    gitCommit: gitCommit(),
    compactVersion: "0.31.1",
    runtimeVersion: "0.16.0",
    attestVerifierKeySha256: verifierKeySha,
    evaluatorKey: toHex(evaluatorKey),
    predicateId: DEMO_PREDICATE.id,
    threshold: DEMO_PREDICATE.requiredPasses,
    deployedAt: new Date().toISOString(),
  });
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(record, null, 2)}\n`);
  console.log(`\nDeployed.`);
  console.log(`  contract address    ${record.contractAddress}`);
  console.log(`  deploy tx           ${record.deployTxId}`);
  console.log(`  block height        ${record.blockHeight ?? "(not reported)"}`);

  // Independent read-back through the public indexer.
  const view = await networkView(record, `0x${"00".repeat(32)}`);
  if (view.kind !== "contract" || view.attestVerifierKeySha256 !== verifierKeySha) {
    die(`Read-back mismatch: the indexer does not (yet) show this CLOSED BOOK contract (${view.kind}).`);
  }
  console.log(`  indexer read-back   contract found; attest verifier key matches`);
  console.log(`\nWrote ${path.relative(root, out)}. Commit it so the web app verifies against this contract.`);
} finally {
  await ctx.wallet.stop();
}
process.exit(0);
