/**
 * npm run network:dust — register this wallet's NIGHT UTXOs for DUST
 * generation, which pays transaction fees (example-bboard generate-dust.ts).
 */
import * as Rx from "rxjs";
import { buildWallet, die, loadConfig, loadSecrets, requireProofServer, synced } from "./lib.mjs";

const config = loadConfig();
const secrets = loadSecrets(config);
await requireProofServer(config);
const ctx = await buildWallet(config, secrets.walletSeed);
try {
  const state = await synced(ctx);
  const utxos = state.unshielded.availableCoins.filter((c) => !c.meta.registeredForDustGeneration);
  if (state.unshielded.availableCoins.length === 0) die("No NIGHT UTXOs. Fund the wallet from the faucet first (npm run network:status).");
  if (utxos.length === 0) {
    console.log("All NIGHT UTXOs are already registered for DUST generation.");
  } else {
    const dustState = await ctx.wallet.dust.waitForSyncedState();
    const recipe = await ctx.wallet.registerNightUtxosForDustGeneration(
      utxos,
      ctx.unshieldedKeystore.getPublicKey(),
      (payload) => ctx.unshieldedKeystore.signData(payload),
      dustState.address,
    );
    const tx = await ctx.wallet.finalizeRecipe(recipe);
    const txId = await ctx.wallet.submitTransaction(tx);
    console.log(`DUST registration submitted: ${txId}`);
  }
  const dust = await Rx.firstValueFrom(
    ctx.wallet.state().pipe(
      Rx.map((s) => s.dust.balance(new Date())),
      Rx.filter((d) => d > 0n),
      Rx.timeout(20 * 60_000),
    ),
  );
  console.log(`DUST balance: ${dust}. Ready for: npm run network:deploy`);
} finally {
  await ctx.wallet.stop();
}
process.exit(0);
