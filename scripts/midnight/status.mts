/**
 * npm run network:status [-- --full] — public wallet status on the network.
 * Read-only; submits nothing.
 *
 * By default it waits only for the unshielded sub-wallet (NIGHT, what the
 * faucet pays), which syncs in seconds, and reports the shielded and DUST
 * sub-wallets as progress. A first full sync of a fresh wallet can take a long
 * time (the DUST wallet scans the whole chain); --full waits for it.
 */
import * as Rx from "rxjs";
import { unshieldedToken } from "@midnight-ntwrk/midnight-js-protocol/ledger";
import { balances, buildWallet, loadConfig, loadSecrets, synced, unshieldedAddress } from "./lib.mjs";

const config = loadConfig();
const secrets = loadSecrets(config);
const full = process.argv.includes("--full");
console.log(`${config.network.label}`);
console.log(`  unshielded address  ${unshieldedAddress(secrets.walletSeed)}`);
const ctx = await buildWallet(config, secrets.walletSeed);
try {
  const complete = (p: unknown) => (p as { isStrictlyComplete?: () => boolean })?.isStrictlyComplete?.() === true;
  const state = full
    ? await synced(ctx)
    : await Rx.firstValueFrom(ctx.wallet.state().pipe(Rx.filter((s) => complete(s.unshielded.progress)), Rx.timeout(5 * 60_000)));
  const night = state.unshielded.balances[unshieldedToken().raw] ?? 0n;
  const coins = state.unshielded.availableCoins;
  console.log(`  NIGHT (unshielded)  ${night}  — unshielded wallet synced`);
  console.log(`  NIGHT UTXOs         ${coins.length} (${coins.filter((c) => c.meta.registeredForDustGeneration).length} registered for DUST)`);
  if (full) {
    console.log(`  DUST                ${balances(state).dust}  — all sub-wallets synced`);
  } else {
    const p = (x: unknown) => x as { appliedIndex?: bigint; highestRelevantWalletIndex?: bigint };
    console.log(`  shielded sync       ${p(state.shielded.state.progress).appliedIndex ?? "?"}/${p(state.shielded.state.progress).highestRelevantWalletIndex ?? "?"} (in progress; --full waits)`);
    console.log(`  DUST sync           ${p(state.dust.state.progress).appliedIndex ?? "?"}/${p(state.dust.state.progress).highestRelevantWalletIndex ?? "?"} (in progress; --full waits)`);
  }
  if (night === 0n) console.log(`\n  No NIGHT yet. Fund the address at ${config.network.faucet} (captcha; human step).`);
  else console.log("\n  Funded. Next: npm run network:dust (needs a full sync and a local proof server).");
} finally {
  await ctx.wallet.stop();
}
process.exit(0);
