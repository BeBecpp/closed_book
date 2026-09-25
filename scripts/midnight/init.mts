/**
 * npm run network:init — create this machine's CLOSED BOOK network identity.
 *
 * Offline. Generates a wallet seed, an evaluator secret and a private-state
 * password into .midnight/secrets.<network>.json (git-ignored, mode 600) and
 * prints only PUBLIC values: the unshielded address to fund and the evaluator
 * key the contract will register. Refuses to overwrite existing secrets.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { deriveEvaluatorKey, fromHex, toHex } from "../../src/lib/commitments";
import { die, generateSecrets, loadConfig, root, saveSecrets, unshieldedAddress } from "./lib.mjs";

const config = loadConfig();
if (existsSync(config.secretsFile)) {
  die(`${path.relative(root, config.secretsFile)} already exists. Delete it deliberately if you want a new identity.`);
}
const secrets = generateSecrets();
saveSecrets(config, secrets);
const evaluatorKey = toHex(await deriveEvaluatorKey(fromHex(secrets.evaluatorSecret)));

console.log(`CLOSED BOOK network identity for ${config.network.label}`);
console.log(`  secrets written     ${path.relative(root, config.secretsFile)}  (git-ignored; never commit or paste it)`);
console.log(`  unshielded address  ${unshieldedAddress(secrets.walletSeed)}`);
console.log(`  evaluator key       ${evaluatorKey}`);
console.log("\nNext (human steps):");
console.log(`  1. Open ${config.network.faucet}, paste the unshielded address, solve the captcha, request tNIGHT.`);
console.log("  2. npm run network:status   — wait until the NIGHT balance is non-zero");
console.log("  3. npm run network:dust     — register NIGHT for DUST (fees); needs a local proof server");
console.log("\nTo run the network steps in GitHub Actions instead, add three repository secrets with the");
console.log("values from the secrets file: MIDNIGHT_WALLET_SEED, CLOSEDBOOK_EVALUATOR_SECRET, CLOSEDBOOK_PRIVATE_STATE_PASSWORD.");
