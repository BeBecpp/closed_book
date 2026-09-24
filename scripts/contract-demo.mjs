#!/usr/bin/env node
/**
 * Runs the CLOSED BOOK demo scenario against the compiled Compact contract
 * (contract/src/managed/closed-book) through @midnight-ntwrk/compact-runtime,
 * and prints a transcript.
 *
 * This executes the real circuit logic. It does not generate zero-knowledge
 * proofs and does not touch a Midnight network.
 *
 * Plain JavaScript and node:crypto on purpose: it is an independent check of
 * the commitment encoding used by src/lib/commitments.
 */
import { createHash, randomBytes } from "node:crypto";
import {
  createCircuitContext,
  createConstructorContext,
  sampleContractAddress,
} from "@midnight-ntwrk/compact-runtime";
import { Contract, ledger } from "../contract/src/managed/closed-book/contract/index.js";

const pad = (s) => {
  const b = new Uint8Array(32);
  b.set(new TextEncoder().encode(s));
  return b;
};
const H = (...parts) => new Uint8Array(createHash("sha256").update(Buffer.concat(parts)).digest());
const hex = (b) => `0x${Buffer.from(b).toString("hex")}`;
const short = (b) => `${hex(b).slice(0, 10)}…${hex(b).slice(-4)}`;

// ---- private evaluation (evaluator only) ----
const evaluatorSecret = new Uint8Array(randomBytes(32));
const modelDigest = H(Buffer.from("CB-DEMO-04 build manifest"));
const suiteDigest = H(Buffer.from("sealed suite: six checks"));
const suiteSalt = new Uint8Array(randomBytes(32));

// ---- public commitments ----
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
const witness = (k) => ({ privateState }) => [privateState, privateState[k]];
const contract = new Contract({
  evaluatorSecret: witness("evaluatorSecret"),
  modelDigest: witness("modelDigest"),
  suiteDigest: witness("suiteDigest"),
  suiteSalt: witness("suiteSalt"),
  checkResults: witness("results"),
  evidenceSalt: witness("evidenceSalt"),
});

const init = contract.initialState(createConstructorContext(blank, "0".repeat(64)), evaluatorKey, pad("safety-baseline:1"), 6n);
let ctx = createCircuitContext(sampleContractAddress(), init.currentZswapLocalState, init.currentContractState, blank);

function attempt(title, target, state) {
  process.stdout.write(`\n${title}\n`);
  try {
    const r = contract.impureCircuits.attest({ ...ctx, currentPrivateState: state }, target.model, target.suite);
    ctx = { ...r.context, currentPrivateState: blank };
    process.stdout.write(`  ATTESTED   id ${hex(r.result)}\n`);
    return r.result;
  } catch (e) {
    process.stdout.write(`  REFUSED    ${String(e.message ?? e).replace(/^.*failed assert: /, "")}\n`);
    return null;
  }
}

const honest = { evaluatorSecret, modelDigest, suiteDigest, suiteSalt, results: [true, true, true, true, true, true] };
const target = { model, suite };

console.log("CLOSED BOOK · compiled contract transcript (local circuit execution, no proof, no network)");
console.log(`  evaluator key      ${short(evaluatorKey)}`);
console.log(`  model commitment   ${short(model)}`);
console.log(`  suite commitment   ${short(suite)}`);
console.log(`  predicate          safety-baseline:1 · threshold ${ledger(ctx.currentQueryContext.state).threshold}`);

const salt1 = new Uint8Array(randomBytes(32));
const id = attempt("1. All six checks pass", target, { ...honest, evidenceSalt: salt1 });
attempt("2. Secret exfiltration fails (5 / 6)", target, {
  ...honest,
  results: [true, false, true, true, true, true],
  evidenceSalt: new Uint8Array(randomBytes(32)),
});
attempt("3. Attest against a different model commitment", { ...target, model: H(Buffer.from("other build")) }, {
  ...honest,
  evidenceSalt: new Uint8Array(randomBytes(32)),
});
attempt("4. Suite edited after its commitment was published", target, {
  ...honest,
  suiteDigest: H(Buffer.from("edited suite")),
  evidenceSalt: new Uint8Array(randomBytes(32)),
});
attempt("5. Unregistered evaluator key", target, {
  ...honest,
  evaluatorSecret: new Uint8Array(randomBytes(32)),
  evidenceSalt: new Uint8Array(randomBytes(32)),
});
attempt("6. Replay of attempt 1", target, { ...honest, evidenceSalt: salt1 });

const l = ledger(ctx.currentQueryContext.state);
console.log(`\nLedger: ${l.attestationCount} attestation(s)`);
for (const [key, rec] of l.attestations) {
  console.log(`  ${hex(key)}`);
  for (const [k, v] of Object.entries(rec)) console.log(`    ${k.padEnd(10)} ${short(v)}`);
}
const expectedId =
  id &&
  H(
    pad("closedbook:attestation:v1"),
    model,
    suite,
    pad("safety-baseline:1"),
    H(pad("closedbook:evidence:v1"), model, suite, pad("safety-baseline:1"), (() => { const w = new Uint8Array(32); w[0] = 63; return w; })(), salt1),
  );
const ok = id && hex(expectedId) === hex(id) && l.attestationCount === 1n;
console.log(`\nIndependent SHA-256 recomputation of attestation 1: ${ok ? "MATCH" : "MISMATCH"}`);
process.exit(ok ? 0 : 1);
