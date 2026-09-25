#!/usr/bin/env node
/**
 * Generate a REAL zero-knowledge proof for one call of the compiled CLOSED
 * BOOK `attest` circuit, and show that a 5/6 evaluation cannot produce one.
 *
 *   node scripts/proof-demo.mjs [--keys contract/build/closed-book]
 *                               [--params .cache/zk-params]
 *                               [--server http://127.0.0.1:6300]
 *                               [--out proofs]
 *
 * Requirements (fails loudly if missing):
 *   - proving keys from a FULL compile (`npm run contract:compile:full`, needs
 *     an AVX2 CPU, or the CI job `zk-proof`): <keys>/keys/attest.{prover,verifier}
 *     and <keys>/zkir/attest.bzkir
 *   - the public SRS parameters bls_midnight_2p<k>, fetched once from
 *     https://srs.midnight.network/ into --params
 *
 * Provers:
 *   - always: the official WASM prover @midnight-ntwrk/zkir-v2 (no native CPU
 *     requirements, runs on any machine);
 *   - with --server: the official Midnight proof server (/prove, /check).
 *
 * What this is and is not:
 *   - The preimage comes from the real compiled circuit via compact-runtime,
 *     and the proof is a real PLONK proof for that statement. The Midnight
 *     prover verifies each proof against the verifier key before returning it
 *     (midnight-ledger transient-crypto/src/proofs.rs).
 *   - The proof is standalone: it is not bound to a transaction (binding input
 *     and commitment randomness are 0), and nothing is submitted to a network.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import * as rt from "@midnight-ntwrk/compact-runtime";
import { createCheckPayload, createProvingPayload } from "@midnight-ntwrk/ledger-v8";
import { check, prove, Zkir } from "@midnight-ntwrk/zkir-v2";
import { Contract, ledger } from "../contract/src/managed/closed-book/contract/index.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const KEYS = path.resolve(root, arg("keys", "contract/build/closed-book"));
const PARAMS = path.resolve(root, arg("params", process.env.MIDNIGHT_PP ?? ".cache/zk-params"));
const SERVER = arg("server", process.env.PROOF_SERVER_URL ?? "");
const OUT = path.resolve(root, arg("out", "proofs"));
const CIRCUIT = "attest";

const fail = (msg) => {
  console.error(`\nproof-demo: ${msg}`);
  process.exit(1);
};
const sha = (b) => createHash("sha256").update(b).digest("hex");
const hex = (b) => `0x${Buffer.from(b).toString("hex")}`;
const u8 = (p) => new Uint8Array(readFileSync(p));

// ---------------------------------------------------------------------------
// Key material and parameters
// ---------------------------------------------------------------------------
const files = {
  prover: path.join(KEYS, "keys", `${CIRCUIT}.prover`),
  verifier: path.join(KEYS, "keys", `${CIRCUIT}.verifier`),
  bzkir: path.join(KEYS, "zkir", `${CIRCUIT}.bzkir`),
};
for (const [name, p] of Object.entries(files)) {
  if (!existsSync(p)) {
    fail(
      `missing ${name}: ${p}\n` +
        `Proving keys come from a full compile: npm run contract:compile:full (AVX2 CPU),\n` +
        `or download the 'closed-book-proving-keys' artifact of the CI 'zk-proof' job.`,
    );
  }
}
const material = { proverKey: u8(files.prover), verifierKey: u8(files.verifier), ir: u8(files.bzkir) };
const k = Zkir.deserialize(material.ir).getK();

// The key material must belong to the committed circuit: compare the ZKIR the
// keys were built from with the committed (--skip-zk) ZKIR.
const committedZkir = readFileSync(path.join(root, "contract/src/managed/closed-book/zkir/attest.zkir"), "utf8");
if (Buffer.compare(Buffer.from(Zkir.fromJson(committedZkir).serialize()), Buffer.from(Zkir.deserialize(material.ir).serialize())) !== 0) {
  fail("the key material's ZKIR does not match the committed contract's ZKIR — keys are from a different circuit");
}

async function params(kk) {
  const name = `bls_midnight_2p${kk}`;
  const file = path.join(PARAMS, name);
  if (!existsSync(file)) {
    mkdirSync(PARAMS, { recursive: true });
    const url = `https://srs.midnight.network/${name}`;
    console.log(`  fetching ${url}`);
    const res = await fetch(url);
    if (!res.ok) fail(`could not fetch ${url}: HTTP ${res.status}`);
    writeFileSync(file, new Uint8Array(await res.arrayBuffer()));
  }
  return u8(file);
}
const paramsUsed = {};
const kmp = {
  lookupKey: async (loc) => (loc === CIRCUIT ? material : undefined),
  getParams: async (kk) => {
    const p = await params(kk);
    paramsUsed[`bls_midnight_2p${kk}`] = { bytes: p.length, sha256: sha(p) };
    return p;
  },
};

// ---------------------------------------------------------------------------
// Deterministic demo evaluation (private witness)
// ---------------------------------------------------------------------------
const pad = (s) => {
  const b = new Uint8Array(32);
  b.set(new TextEncoder().encode(s));
  return b;
};
const H = (...parts) => new Uint8Array(createHash("sha256").update(Buffer.concat(parts)).digest());
const seed = (label) => H(Buffer.from(`closedbook proof-demo: ${label}`));

const evaluatorSecret = seed("evaluator secret");
const modelDigest = seed("model manifest CB-DEMO-04");
const suiteDigest = seed("sealed suite v1");
const suiteSalt = seed("suite salt");
const evidenceSalt = seed("evidence salt");
const ALL_PASS = [true, true, true, true, true, true];
const FIVE_OF_SIX = [true, false, true, true, true, true];

const evaluatorKey = H(pad("closedbook:evaluator:v1"), evaluatorSecret);
const model = H(pad("closedbook:model:v1"), modelDigest);
const suite = H(pad("closedbook:suite:v1"), suiteDigest, suiteSalt);

const blank = {
  evaluatorSecret: new Uint8Array(32),
  modelDigest: new Uint8Array(32),
  suiteDigest: new Uint8Array(32),
  suiteSalt: new Uint8Array(32),
  results: [false, false, false, false, false, false],
  evidenceSalt: new Uint8Array(32),
};
const witness = (key) => ({ privateState }) => [privateState, privateState[key]];
const contract = new Contract({
  evaluatorSecret: witness("evaluatorSecret"),
  modelDigest: witness("modelDigest"),
  suiteDigest: witness("suiteDigest"),
  suiteSalt: witness("suiteSalt"),
  checkResults: witness("results"),
  evidenceSalt: witness("evidenceSalt"),
});

function deploy(threshold) {
  const init = contract.initialState(
    rt.createConstructorContext(blank, "0".repeat(64)),
    evaluatorKey,
    pad("safety-baseline:1"),
    BigInt(threshold),
  );
  return rt.createCircuitContext(rt.sampleContractAddress(), init.currentZswapLocalState, init.currentContractState, blank);
}

function runAttest(ctx, results) {
  const state = { evaluatorSecret, modelDigest, suiteDigest, suiteSalt, results, evidenceSalt };
  return contract.impureCircuits.attest({ ...ctx, currentPrivateState: state }, model, suite);
}

const preimageOf = (pd, outputs = pd.privateTranscriptOutputs) =>
  rt.proofDataIntoSerializedPreimage(pd.input, pd.output, pd.publicTranscript, outputs, CIRCUIT);

async function server(route, body) {
  const res = await fetch(`${SERVER.replace(/\/$/, "")}${route}`, {
    method: "POST",
    headers: { "Content-Type": "application/octet-stream" },
    body,
  });
  const bytes = new Uint8Array(await res.arrayBuffer());
  return { ok: res.ok, status: res.status, bytes, text: res.ok ? "" : Buffer.from(bytes).toString("utf8").slice(0, 400) };
}

const errText = (e) => String(e?.message ?? e).replace(/\s+/g, " ").slice(0, 300);

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------
console.log("CLOSED BOOK · real ZK proof for the compiled `attest` circuit");
console.log(`  circuit k        ${k}`);
console.log(`  prover key       ${material.proverKey.length} bytes  sha256 ${sha(material.proverKey)}`);
console.log(`  verifier key     ${material.verifierKey.length} bytes  sha256 ${sha(material.verifierKey)}`);

let serverVersion = null;
if (SERVER) {
  try {
    const v = await fetch(`${SERVER.replace(/\/$/, "")}/version`);
    serverVersion = (await v.text()).trim();
  } catch (e) {
    fail(`proof server not reachable at ${SERVER}: ${errText(e)}`);
  }
  console.log(`  proof server     ${SERVER} (version ${serverVersion})`);
}

const evidence = {
  generatedAt: new Date().toISOString(),
  gitCommit: (() => {
    try {
      return execSync("git rev-parse HEAD", { cwd: root }).toString().trim();
    } catch {
      return null;
    }
  })(),
  environment: { node: process.version, platform: `${process.platform}-${process.arch}`, ci: Boolean(process.env.CI) },
  toolchain: {
    compact: JSON.parse(readFileSync(path.join(root, "contract/src/managed/closed-book/compiler/contract-info.json"), "utf8"))["compiler-version"],
    compactRuntime: "0.16.0",
    zkirV2: JSON.parse(readFileSync(path.join(root, "node_modules/@midnight-ntwrk/zkir-v2/package.json"), "utf8")).version,
    ledgerV8: JSON.parse(readFileSync(path.join(root, "node_modules/@midnight-ntwrk/ledger-v8/package.json"), "utf8")).version,
    proofServer: serverVersion,
  },
  circuit: {
    name: CIRCUIT,
    k,
    proverKey: { bytes: material.proverKey.length, sha256: sha(material.proverKey) },
    verifierKey: { bytes: material.verifierKey.length, sha256: sha(material.verifierKey) },
    bzkir: { bytes: material.ir.length, sha256: sha(material.ir) },
  },
  statement: {
    note: "Deterministic demo evaluation. Public inputs of the call; the witness is not recorded here.",
    evaluatorKey: hex(evaluatorKey),
    modelCommitment: hex(model),
    suiteCommitment: hex(suite),
    predicate: "safety-baseline:1",
    threshold: 6,
  },
  params: paramsUsed,
  success: null,
  negative: {},
};

// 1. Success: 6 / 6
console.log("\n1. 6 / 6 private checks pass (threshold 6)");
const ok = runAttest(deploy(6), ALL_PASS);
const pre = preimageOf(ok.proofData);
evidence.statement.attestationId = hex(ok.result);
evidence.statement.releaseKey = hex(H(pad("closedbook:release:v1"), model, suite, pad("safety-baseline:1")));
const l = ledger(ok.context.currentQueryContext.state);
if (!l.attestations.member(ok.result)) fail("circuit ran but the attestation is not in the resulting ledger state");
console.log(`  attestation id   ${hex(ok.result)}`);
console.log(`  preimage         ${pre.length} bytes`);

await check(pre, kmp);
console.log("  wasm check       constraints satisfied");
let t = Date.now();
const wasmProof = await prove(pre, kmp);
const wasmMs = Date.now() - t;
console.log(`  wasm prove       ${wasmProof.length} bytes in ${(wasmMs / 1000).toFixed(1)} s  sha256 ${sha(wasmProof)}`);
mkdirSync(OUT, { recursive: true });
writeFileSync(path.join(OUT, "attest-6of6.wasm.proof"), wasmProof);
evidence.success = {
  results: "6/6",
  preimage: { bytes: pre.length, sha256: sha(pre) },
  wasm: { file: "attest-6of6.wasm.proof", bytes: wasmProof.length, sha256: sha(wasmProof), seconds: wasmMs / 1000 },
};

if (SERVER) {
  t = Date.now();
  const r = await server("/prove", createProvingPayload(pre, undefined, material));
  if (!r.ok) fail(`proof server /prove failed for the 6/6 case: HTTP ${r.status} ${r.text}`);
  const ms = Date.now() - t;
  writeFileSync(path.join(OUT, "attest-6of6.server.proof"), r.bytes);
  console.log(`  server prove     ${r.bytes.length} bytes in ${(ms / 1000).toFixed(1)} s  sha256 ${sha(r.bytes)}`);
  evidence.success.server = { file: "attest-6of6.server.proof", bytes: r.bytes.length, sha256: sha(r.bytes), seconds: ms / 1000 };
}

// 2. Negative: 5 / 6
console.log("\n2. 5 / 6 private checks pass (threshold 6) — must not produce a proof");
try {
  runAttest(deploy(6), FIVE_OF_SIX);
  fail("compact-runtime accepted a 5/6 evaluation");
} catch (e) {
  console.log(`  circuit execution   refused: ${errText(e)}`);
  evidence.negative.runtime = { refused: true, error: errText(e) };
}

// Bypass the runtime: inject the 5/6 result vector into the 6/6 preimage.
// Witness call order in `attest`: secret, modelDigest, suiteDigest, suiteSalt,
// checkResults (index 4, six 1-byte booleans), evidenceSalt.
const outs = ok.proofData.privateTranscriptOutputs;
if (outs.length !== 6 || outs[4].value.length !== 6) fail("unexpected private transcript layout");
const forged = outs.map((o, i) => (i !== 4 ? o : { ...o, value: o.value.map((v, j) => (FIVE_OF_SIX[j] ? v : new Uint8Array())) }));
const forgedPre = preimageOf(ok.proofData, forged);
try {
  await check(forgedPre, kmp);
  fail("the ZK constraint checker accepted a 5/6 witness");
} catch (e) {
  console.log(`  wasm check          rejected: ${errText(e)}`);
  evidence.negative.wasmCheck = { rejected: true, error: errText(e) };
}
try {
  await prove(forgedPre, kmp);
  fail("the WASM prover produced a proof for a 5/6 witness");
} catch (e) {
  console.log(`  wasm prove          no proof: ${errText(e)}`);
  evidence.negative.wasmProve = { proof: false, error: errText(e) };
}
if (SERVER) {
  const c = await server("/check", createCheckPayload(forgedPre, material.ir));
  if (c.ok) fail("proof server /check accepted a 5/6 witness");
  console.log(`  server check        rejected: HTTP ${c.status} ${c.text}`);
  const p = await server("/prove", createProvingPayload(forgedPre, undefined, material));
  if (p.ok) fail("proof server /prove produced a proof for a 5/6 witness");
  console.log(`  server prove        no proof: HTTP ${p.status} ${p.text}`);
  evidence.negative.server = { check: { status: c.status, error: c.text }, prove: { status: p.status, error: p.text } };
}

// 3. Control: the same 5/6 witness under a threshold-5 deployment is provable,
// so the refusal above is the release predicate, not a malformed witness.
console.log("\n3. Control: 5 / 6 under a threshold-5 deployment");
const control = runAttest(deploy(5), FIVE_OF_SIX);
await check(preimageOf(control.proofData), kmp);
console.log("  wasm check          constraints satisfied (threshold is what gates 5/6)");
evidence.negative.controlThreshold5 = { constraintsSatisfied: true };

writeFileSync(path.join(OUT, "evidence.json"), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(`\nWrote ${path.relative(root, path.join(OUT, "evidence.json"))}`);
console.log("Result: real proof generated for 6/6; no proof obtainable for 5/6.");
