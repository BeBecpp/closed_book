/**
 * Shared Midnight network plumbing for CLOSED BOOK's CLI scripts.
 *
 * Follows the official guides (docs.midnight.network):
 *   - guides/acquire-tokens      wallet construction (WalletFacade)
 *   - guides/deploy-and-operate  providers, CompiledContract, deployContract
 * and the pinned versions of the support matrix: Midnight.js 4.1.1, wallet
 * SDK 1.2.0, compact-runtime 0.16.0, proof server 8.1.0.
 *
 * Secrets never leave this machine: the wallet seed, evaluator secret and
 * private-state password live in .midnight/secrets.<network>.json
 * (git-ignored) or in environment variables for CI.
 */
import { WebSocket } from "ws";
(globalThis as unknown as { WebSocket: unknown }).WebSocket = WebSocket;

import { createHash, randomBytes } from "node:crypto";
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as Rx from "rxjs";
import { setNetworkId, getNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import * as ledgerApi from "@midnight-ntwrk/midnight-js-protocol/ledger";
import { CompiledContract } from "@midnight-ntwrk/midnight-js-protocol/compact-js";
import { levelPrivateStateProvider } from "@midnight-ntwrk/midnight-js-level-private-state-provider";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { httpClientProofProvider } from "@midnight-ntwrk/midnight-js-http-client-proof-provider";
import { NodeZkConfigProvider } from "@midnight-ntwrk/midnight-js-node-zk-config-provider";
import type { MidnightProvider, MidnightProviders, UnboundTransaction, WalletProvider } from "@midnight-ntwrk/midnight-js-types";
import { ttlOneHour } from "@midnight-ntwrk/midnight-js-utils";
import {
  createKeystore,
  DustWallet,
  HDWallet,
  NoOpTransactionHistoryStorage,
  PublicKey,
  Roles,
  ShieldedWallet,
  UnshieldedWallet,
  WalletFacade,
  type FacadeState,
  type UnshieldedKeystore,
} from "@midnight-ntwrk/wallet-sdk";
import { Contract } from "../../contract/src/managed/closed-book/contract/index.js";
import { witnesses, type ClosedBookPrivateState } from "../../src/lib/midnight/local-contract";
import { DEFAULT_PROOF_SERVER, networkById, type MidnightNetwork } from "../../src/lib/midnight/network";

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const CIRCUITS = ["attest"] as const;
export type ClosedBookCircuit = (typeof CIRCUITS)[number];
export const PRIVATE_STATE_ID = "closedBookPrivateState";
export type ClosedBookProviders = MidnightProviders<ClosedBookCircuit, typeof PRIVATE_STATE_ID, ClosedBookPrivateState>;

export function die(message: string): never {
  console.error(`\n${message}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface CliConfig {
  readonly network: MidnightNetwork;
  readonly proofServer: string;
  /** Full compile output (keys/ + zkir/), from `npm run contract:compile:full` or the CI artifact. */
  readonly keysDir: string;
  readonly secretsFile: string;
  readonly stateDir: string;
}

export function loadConfig(): CliConfig {
  const network = networkById(process.env.MIDNIGHT_NETWORK ?? "preprod");
  setNetworkId(network.id);
  return {
    network,
    proofServer: process.env.MIDNIGHT_PROOF_SERVER ?? DEFAULT_PROOF_SERVER,
    keysDir: path.resolve(root, process.env.CLOSEDBOOK_KEYS ?? "contract/build/closed-book"),
    secretsFile: path.join(root, ".midnight", `secrets.${network.id}.json`),
    stateDir: path.join(root, ".midnight", network.id),
  };
}

export interface Secrets {
  readonly walletSeed: string;
  readonly evaluatorSecret: string;
  readonly privateStatePassword: string;
}

const hex32 = /^[0-9a-f]{64}$/;

export function generateSecrets(): Secrets {
  // Password rules of levelPrivateStateProvider: >= 16 chars, 3 of 4 classes.
  return {
    walletSeed: randomBytes(32).toString("hex"),
    evaluatorSecret: randomBytes(32).toString("hex"),
    privateStatePassword: `Cb-${randomBytes(18).toString("base64url")}9!`,
  };
}

export function loadSecrets(config: CliConfig): Secrets {
  const fromEnv = {
    walletSeed: process.env.MIDNIGHT_WALLET_SEED,
    evaluatorSecret: process.env.CLOSEDBOOK_EVALUATOR_SECRET,
    privateStatePassword: process.env.CLOSEDBOOK_PRIVATE_STATE_PASSWORD,
  };
  let s: Partial<Secrets> = {};
  if (existsSync(config.secretsFile)) s = JSON.parse(readFileSync(config.secretsFile, "utf8")) as Partial<Secrets>;
  const merged = {
    walletSeed: fromEnv.walletSeed ?? s.walletSeed,
    evaluatorSecret: fromEnv.evaluatorSecret ?? s.evaluatorSecret,
    privateStatePassword: fromEnv.privateStatePassword ?? s.privateStatePassword,
  };
  if (!merged.walletSeed || !hex32.test(merged.walletSeed)) {
    die(`No wallet seed. Run \`npm run network:init\` (writes ${path.relative(root, config.secretsFile)}) or set MIDNIGHT_WALLET_SEED.`);
  }
  if (!merged.evaluatorSecret || !hex32.test(merged.evaluatorSecret)) die("No evaluator secret (CLOSEDBOOK_EVALUATOR_SECRET).");
  if (!merged.privateStatePassword || merged.privateStatePassword.length < 16) die("No private-state password (CLOSEDBOOK_PRIVATE_STATE_PASSWORD).");
  return merged as Secrets;
}

export function saveSecrets(config: CliConfig, secrets: Secrets) {
  mkdirSync(path.dirname(config.secretsFile), { recursive: true });
  writeFileSync(config.secretsFile, `${JSON.stringify(secrets, null, 2)}\n`, { mode: 0o600 });
}

export function gitCommit(): string {
  return execSync("git rev-parse HEAD", { cwd: root }).toString().trim();
}

export const sha256 = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");

export function requireKeys(config: CliConfig) {
  for (const f of ["keys/attest.prover", "keys/attest.verifier", "zkir/attest.bzkir"]) {
    if (!existsSync(path.join(config.keysDir, f))) {
      die(
        `Missing proving material ${path.join(config.keysDir, f)}.\n` +
          "Run `npm run contract:compile:full` on an AVX2 machine, or download the\n" +
          "'closed-book-proving-keys' artifact from the CI 'zk-proof' job into contract/build/closed-book.",
      );
    }
  }
  return sha256(new Uint8Array(readFileSync(path.join(config.keysDir, "keys/attest.verifier"))));
}

export async function requireProofServer(config: CliConfig) {
  try {
    const res = await fetch(`${config.proofServer.replace(/\/$/, "")}/version`, { signal: AbortSignal.timeout(5000) });
    return (await res.text()).trim();
  } catch {
    die(
      `Proof server not reachable at ${config.proofServer}.\n` +
        "Start it locally (it receives private witness data, so it must run on a machine you control):\n" +
        "  docker run -p 6300:6300 midnightntwrk/proof-server:8.1.0",
    );
  }
}

// ---------------------------------------------------------------------------
// Wallet (guides/acquire-tokens)
// ---------------------------------------------------------------------------

export interface WalletContext {
  readonly wallet: WalletFacade;
  readonly shieldedSecretKeys: ledgerApi.ZswapSecretKeys;
  readonly dustSecretKey: ledgerApi.DustSecretKey;
  readonly unshieldedKeystore: UnshieldedKeystore;
}

export function deriveKeys(seedHex: string) {
  const hd = HDWallet.fromSeed(Buffer.from(seedHex, "hex"));
  if (hd.type !== "seedOk") throw new Error("Invalid wallet seed");
  const result = hd.hdWallet.selectAccount(0).selectRoles([Roles.Zswap, Roles.NightExternal, Roles.Dust]).deriveKeysAt(0);
  if (result.type !== "keysDerived") throw new Error("Key derivation failed");
  hd.hdWallet.clear();
  return result.keys;
}

/** Offline: the unshielded address a faucet should pay. */
export function unshieldedAddress(seedHex: string): string {
  const keys = deriveKeys(seedHex);
  return String(createKeystore(keys[Roles.NightExternal], getNetworkId()).getBech32Address().asString());
}

export async function buildWallet(config: CliConfig, seedHex: string): Promise<WalletContext> {
  const keys = deriveKeys(seedHex);
  const shieldedSecretKeys = ledgerApi.ZswapSecretKeys.fromSeed(keys[Roles.Zswap]);
  const dustSecretKey = ledgerApi.DustSecretKey.fromSeed(keys[Roles.Dust]);
  const unshieldedKeystore = createKeystore(keys[Roles.NightExternal], getNetworkId());
  const indexerClientConnection = { indexerHttpUrl: config.network.indexerHttp, indexerWsUrl: config.network.indexerWs };
  const shieldedConfig = {
    networkId: getNetworkId(),
    indexerClientConnection,
    provingServerUrl: new URL(config.proofServer),
    relayURL: new URL(config.network.node.replace(/^http/, "ws")),
  };
  const unshieldedConfig = { networkId: getNetworkId(), indexerClientConnection, txHistoryStorage: new NoOpTransactionHistoryStorage() };
  const dustConfig = { ...shieldedConfig, costParameters: { additionalFeeOverhead: 1_000n, feeBlocksMargin: 5 } };
  const wallet = await WalletFacade.init({
    configuration: { ...shieldedConfig, ...unshieldedConfig, ...dustConfig },
    shielded: (cfg) => ShieldedWallet(cfg).startWithSecretKeys(shieldedSecretKeys),
    unshielded: (cfg) => UnshieldedWallet(cfg).startWithPublicKey(PublicKey.fromKeyStore(unshieldedKeystore)),
    dust: (cfg) => DustWallet(cfg).startWithSecretKey(dustSecretKey, ledgerApi.LedgerParameters.initialParameters().dust),
  });
  await wallet.start(shieldedSecretKeys, dustSecretKey);
  return { wallet, shieldedSecretKeys, dustSecretKey, unshieldedKeystore };
}

const complete = (p: unknown) =>
  typeof (p as { isStrictlyComplete?: unknown })?.isStrictlyComplete === "function" &&
  (p as { isStrictlyComplete: () => boolean }).isStrictlyComplete();

/** Wait until all three sub-wallets report strictly complete sync (bboard wallet-utils). */
export function synced(ctx: WalletContext, timeoutMs = 15 * 60_000): Promise<FacadeState> {
  return Rx.firstValueFrom(
    ctx.wallet.state().pipe(
      Rx.filter((s) => complete(s.shielded.state.progress) && complete(s.dust.state.progress) && complete(s.unshielded.progress)),
      Rx.timeout(timeoutMs),
    ),
  );
}

export function balances(state: FacadeState) {
  const night = state.unshielded.balances[ledgerApi.unshieldedToken().raw] ?? 0n;
  return { night, dust: state.dust.balance(new Date()) };
}

// ---------------------------------------------------------------------------
// Providers and compiled contract (guides/deploy-and-operate)
// ---------------------------------------------------------------------------

export function walletProvider(ctx: WalletContext): WalletProvider & MidnightProvider {
  return {
    getCoinPublicKey: () => ctx.shieldedSecretKeys.coinPublicKey,
    getEncryptionPublicKey: () => ctx.shieldedSecretKeys.encryptionPublicKey,
    async balanceTx(tx: UnboundTransaction, ttl: Date = ttlOneHour()) {
      const recipe = await ctx.wallet.balanceUnboundTransaction(
        tx,
        { shieldedSecretKeys: ctx.shieldedSecretKeys, dustSecretKey: ctx.dustSecretKey },
        { ttl },
      );
      const signed = await ctx.wallet.signRecipe(recipe, (payload) => ctx.unshieldedKeystore.signData(payload));
      return ctx.wallet.finalizeRecipe(signed);
    },
    submitTx: (tx) => ctx.wallet.submitTransaction(tx),
  };
}

export function providers(config: CliConfig, ctx: WalletContext, secrets: Secrets): ClosedBookProviders {
  const zkConfigProvider = new NodeZkConfigProvider<ClosedBookCircuit>(config.keysDir);
  const w = walletProvider(ctx);
  mkdirSync(config.stateDir, { recursive: true });
  return {
    privateStateProvider: levelPrivateStateProvider<typeof PRIVATE_STATE_ID, ClosedBookPrivateState>({
      midnightDbName: path.join(config.stateDir, "level-db"),
      privateStateStoreName: "closed-book-private-state",
      signingKeyStoreName: "closed-book-signing-keys",
      privateStoragePasswordProvider: () => secrets.privateStatePassword,
      accountId: String(ctx.unshieldedKeystore.getBech32Address().asString()),
    }),
    publicDataProvider: indexerPublicDataProvider(config.network.indexerHttp, config.network.indexerWs),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(config.proofServer, zkConfigProvider),
    walletProvider: w,
    midnightProvider: w,
  };
}

export function compiledContract(config: CliConfig) {
  return CompiledContract.make<Contract<ClosedBookPrivateState>>("closed-book", Contract<ClosedBookPrivateState>).pipe(
    CompiledContract.withWitnesses(witnesses as never),
    CompiledContract.withCompiledFileAssets(config.keysDir),
  );
}

export const EMPTY_PRIVATE_STATE: ClosedBookPrivateState = {
  evaluatorSecret: new Uint8Array(32),
  modelDigest: new Uint8Array(32),
  suiteDigest: new Uint8Array(32),
  suiteSalt: new Uint8Array(32),
  results: [false, false, false, false, false, false],
  evidenceSalt: new Uint8Array(32),
};
