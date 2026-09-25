/**
 * npm run network:attest — one real CLOSED BOOK attestation on the deployed
 * contract, then a replay attempt for the same release.
 *
 *   PRIVATE EVALUATION -> Compact witness -> proof server -> proof ->
 *   Midnight transaction -> contract -> public attestation record
 *
 * The evaluation is the demo fixture (model CB-DEMO-04, six checks, 6/6)
 * signed with THIS machine's evaluator secret. Private witness values stay in
 * this process, the local proof server and the encrypted local private-state
 * store; only the public record is written to deployments/.
 *
 * Replay: a second call for the same (model, suite, predicate) with a fresh
 * evidence salt must be refused by the contract's release-uniqueness assert.
 * Midnight.js executes the circuit against the live contract state before
 * proving, so the refusal happens there and no transaction is submitted.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { findDeployedContract } from "@midnight-ntwrk/midnight-js-contracts";
import {
  bytes32FromHex,
  commitEvidence,
  deriveEvaluatorKey,
  deriveReleaseKey,
  digestManifest,
  pad32,
  packResults,
  randomBytes32,
  toHex,
} from "../../src/lib/commitments";
import { judgeNetworkRecord } from "../../src/lib/attestation/network-verifier";
import { attestationCode, modelManifest, suiteManifest, targetFor } from "../../src/lib/attestation/evaluation";
import type { PrivateEvaluation, PublicAttestation } from "../../src/lib/attestation/types";
import { encodeRecord } from "../../src/lib/attestation/verify";
import { DEMO_EVALUATION, DEMO_PREDICATE } from "../../src/lib/demo/fixture";
import type { ClosedBookPrivateState } from "../../src/lib/midnight/local-contract";
import { loadDeployment, loadNetworkAttestations, networkView, type NetworkAttestationEntry } from "../../src/lib/midnight/network-view";
import {
  balances,
  buildWallet,
  compiledContract,
  die,
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
const deployment = loadDeployment(config.network.id) ?? die(`No deployments/${config.network.id}.json. Run npm run network:deploy first.`);
const secrets = loadSecrets(config);
requireKeys(config);
await requireProofServer(config);

const evaluatorKey = toHex(await deriveEvaluatorKey(bytes32FromHex(secrets.evaluatorSecret)));
if (evaluatorKey.replace(/^0x/, "") !== deployment.evaluatorKey) {
  die("This machine's evaluator secret does not match the evaluator key the contract registered.");
}

async function witnessFor(evaluation: PrivateEvaluation): Promise<ClosedBookPrivateState> {
  return {
    evaluatorSecret: bytes32FromHex(evaluation.evaluatorSecret),
    modelDigest: await digestManifest(modelManifest(evaluation.model)),
    suiteDigest: await digestManifest(suiteManifest(evaluation.suite)),
    suiteSalt: bytes32FromHex(evaluation.suiteSalt),
    results: [...evaluation.results],
    evidenceSalt: bytes32FromHex(evaluation.evidenceSalt),
  };
}

const evaluation: PrivateEvaluation = {
  ...DEMO_EVALUATION,
  evaluatorSecret: secrets.evaluatorSecret,
  evidenceSalt: toHex(randomBytes32()),
};
const target = await targetFor(evaluation);
const model = bytes32FromHex(target.modelCommitment);
const suite = bytes32FromHex(target.suiteCommitment);
const predicateId = pad32(DEMO_PREDICATE.id);
const releaseKey = toHex(await deriveReleaseKey(model, suite, predicateId));

const ctx = await buildWallet(config, secrets.walletSeed);
const p = providers(config, ctx, secrets);
try {
  const b = balances(await synced(ctx));
  if (b.dust === 0n) die(`No DUST to pay fees. Run npm run network:dust.`);

  console.log(`Attesting on ${config.network.label} contract ${deployment.contractAddress}`);
  const found = await findDeployedContract(p, {
    contractAddress: deployment.contractAddress,
    compiledContract: compiledContract(config),
    privateStateId: PRIVATE_STATE_ID,
    initialPrivateState: await witnessFor(evaluation),
  });
  const tx = await found.callTx.attest(model, suite);
  // Destructure only public fields: txData.private holds the witness.
  const { txId, txHash, blockHeight, status } = tx.public;
  const id = toHex(tx.private.result);
  const evidence = toHex(await commitEvidence(model, suite, predicateId, packResults(evaluation.results), bytes32FromHex(evaluation.evidenceSalt)));

  const record: PublicAttestation = {
    version: 2,
    id,
    code: attestationCode(id),
    releaseKey,
    modelLabel: evaluation.model.buildId,
    modelCommitment: target.modelCommitment,
    suiteCommitment: target.suiteCommitment,
    predicate: DEMO_PREDICATE,
    evidenceCommitment: evidence,
    evaluatorKey,
    source: "MIDNIGHT",
    issuedAt: new Date().toISOString(),
    network: {
      network: config.network.id,
      contractAddress: deployment.contractAddress,
      txId: String(txId),
      txHash: txHash ? String(txHash) : null,
      blockHeight: typeof blockHeight === "number" ? blockHeight : null,
    },
  };
  console.log(`  status              ${status}`);
  console.log(`  transaction         ${record.network!.txId}`);
  console.log(`  attestation         ${record.code}  ${id}`);

  // Read back through the public indexer and judge exactly as the receipt does.
  const verdict = judgeNetworkRecord(record, deployment, await networkView(deployment, id));
  console.log(`  network read-back   ${verdict.check} — ${verdict.detail}`);
  if (verdict.check !== "match") die("The network does not hold this record as expected.");

  const file = path.join(root, "deployments", `${config.network.id}.attestations.json`);
  const entries: NetworkAttestationEntry[] = loadNetworkAttestations(config.network.id);
  entries.push({ record, submittedAt: new Date().toISOString() });
  writeFileSync(file, `${JSON.stringify(entries, null, 2)}\n`);
  const site = process.env.CLOSEDBOOK_SITE_URL ?? "";
  console.log(`  receipt             ${site}/verify/${record.code}#r=${encodeRecord(record)}`);

  // Replay: same release, fresh evidence salt.
  console.log("\nReplay: same model, suite and predicate with a fresh evidence salt");
  const replay = { ...evaluation, evidenceSalt: toHex(randomBytes32()) };
  await p.privateStateProvider.set(PRIVATE_STATE_ID, await witnessFor(replay));
  let replayOutcome: string;
  try {
    await found.callTx.attest(model, suite);
    replayOutcome = "ACCEPTED";
  } catch (e) {
    // Written to a committed file: keep only the leading message line.
    replayOutcome = String((e as Error).message).split("\n")[0].slice(0, 200);
  }
  console.log(`  outcome             ${replayOutcome}`);
  const replayFile = path.join(root, "deployments", `${config.network.id}.replay.json`);
  const prior = existsSync(replayFile) ? (JSON.parse(readFileSync(replayFile, "utf8")) as unknown[]) : [];
  prior.push({ attemptedAt: new Date().toISOString(), releaseKey, existingAttestation: id, outcome: replayOutcome });
  writeFileSync(replayFile, `${JSON.stringify(prior, null, 2)}\n`);
  if (!/release already attested/.test(replayOutcome)) die("Replay was not refused by the release-uniqueness assertion.");
} finally {
  await ctx.wallet.stop();
}
process.exit(0);
