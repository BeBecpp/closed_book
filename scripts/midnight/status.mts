/**
 * npm run network:status — sync the wallet against the network and print
 * public balances. Read-only; submits nothing.
 */
import { balances, buildWallet, loadConfig, loadSecrets, synced, unshieldedAddress } from "./lib.mjs";

const config = loadConfig();
const secrets = loadSecrets(config);
console.log(`${config.network.label}`);
console.log(`  unshielded address  ${unshieldedAddress(secrets.walletSeed)}`);
console.log("  syncing wallet (this can take several minutes)…");
const ctx = await buildWallet(config, secrets.walletSeed);
try {
  const state = await synced(ctx);
  const b = balances(state);
  const coins = state.unshielded.availableCoins;
  console.log(`  NIGHT (unshielded)  ${b.night}`);
  console.log(`  DUST                ${b.dust}`);
  console.log(`  NIGHT UTXOs         ${coins.length} (${coins.filter((c) => c.meta.registeredForDustGeneration).length} registered for DUST)`);
  if (b.night === 0n) console.log(`\n  No NIGHT yet. Fund the address at ${config.network.faucet} (captcha; human step).`);
  else if (b.dust === 0n) console.log("\n  NIGHT present but no DUST. Run: npm run network:dust");
  else console.log("\n  Funded. Ready for: npm run network:deploy");
} finally {
  await ctx.wallet.stop();
}
process.exit(0);
