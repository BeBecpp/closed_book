# Architecture

CLOSED BOOK has three layers: a Compact contract that states the rule, a
TypeScript library that reproduces the contract's commitments exactly, and a
web product that talks to both through one adapter interface.

```
  CONFIDENTIAL EVALUATOR                      (evaluator's machine only)

  private tests  ─┐
  private outputs ├─►  private results (6 × PASS/FAIL)
  evaluator notes ┘    suite manifest + salt
                       model manifest
                       evaluator secret
            │
            ▼
  commitments + private witness
            │         modelCommitment  = H(tag, digest(model manifest))
            │         suiteCommitment  = H(tag, digest(suite manifest), suiteSalt)
            ▼
  ┌─────────────────────────────────────────────┐
  │ MIDNIGHT / COMPACT   closed-book.compact    │
  │                                             │
  │ circuit attest(model, suite)                │
  │   assert evaluator key                      │
  │   assert model commitment opens             │
  │   assert suite commitment opens             │
  │   assert passes >= threshold                │
  │   assert release not yet attested           │
  │   disclose(releaseKey, id, record)          │
  └─────────────────────────────────────────────┘
            │   (any assert fails → no proof → no transaction → no record)
            ▼
  PUBLIC ATTESTATION                           (ledger)

  model commitment
  suite commitment
  predicate (id + threshold)
  evidence commitment
  evaluator key
  release key (one attestation per model, suite, predicate)
  verdict (PASS — implied by the record's existence)
  proof metadata (only when a real Midnight transaction exists)
```

## Components

| Path | Role |
| --- | --- |
| `contract/src/closed-book.compact` | The contract. Ledger, witnesses, pure commitment circuits, `attest`. |
| `contract/src/managed/closed-book/` | Compiler output (JS + ZKIR, `--skip-zk`). Committed; CI recompiles and diffs it. |
| `src/lib/commitments/` | Byte-exact TypeScript mirror of the contract's commitment scheme (Web Crypto SHA-256). |
| `src/lib/attestation/types.ts` | Public/private data types, `AttestationSource`, outcomes. |
| `src/lib/attestation/adapter.ts` | The `AttestationAdapter` interface. The UI depends only on this. |
| `src/lib/attestation/demo-adapter.ts` | DEMO: the circuit's assertions in TypeScript. Browser-safe. |
| `src/lib/attestation/midnight-adapter.ts` | MIDNIGHT_LOCAL: runs the compiled contract via `@midnight-ntwrk/compact-runtime`. Node only. |
| `src/lib/attestation/local-circuit-client.ts` | Browser client for the local circuit endpoint. |
| `src/lib/attestation/verify.ts` | Public checks: id and release-key recomputation, auditor opening, plaintext leak scan, share links. |
| `src/lib/attestation/receipt.ts` | Receipt trust states and the issuer check that earns them. |
| `src/lib/midnight/local-contract.ts` | Witnesses and an in-process contract instance. |
| `app/api/circuit/*` | Local-only route handlers that execute the circuit. Refuse non-local hosts. |
| `app/` | Routes: `/`, `/evaluate`, `/verify/[id]`, `/protocol`. |

## The adapter boundary

```ts
interface AttestationAdapter {
  source: "DEMO" | "MIDNIGHT_LOCAL" | "MIDNIGHT";
  label: string;
  disclaimer: string;
  attest(request, onStep?): Promise<AttestOutcome>;
  lookup(idOrCode): Promise<PublicAttestation | null>;
}
```

Every record carries its `source`. The UI renders the source label on every
public record and receipt. A `source` is a claim, not a verdict: the receipt
earns one of five trust states (`src/lib/attestation/receipt.ts`) by asking
the record's own issuer whether it holds that exact record. Hashes that
recompute earn only `CLAIMED PASS`. Proof metadata is shown as verified only
in `NETWORK VERIFIED`, which needs a `NetworkVerifier` that does not exist yet.

| Source | Produced by | What actually happens | Proof | On chain |
| --- | --- | --- | --- | --- |
| `DEMO` | `demo-adapter.ts` | TypeScript runs the same five assertions over the same bytes | No | No |
| `MIDNIGHT_LOCAL` | `midnight-adapter.ts` | The compiled Compact circuit executes; ledger state is updated in-process | No | No |
| `MIDNIGHT` | not implemented | Proof server generates a proof; wallet submits; network verifies | Yes | Yes |

Equivalence of `DEMO` and `MIDNIGHT_LOCAL` is tested: for the same evaluation
they produce the same attestation id, evidence commitment and evaluator key,
and refuse the same failing evaluations for the same reasons
(`tests/contract.test.ts`).

## Why the local circuit is a server route

`@midnight-ntwrk/compact-runtime` loads a WASM module from disk and is
ESM-only. Running it in the Next.js server process (`serverExternalPackages`)
avoids bundling WASM into the browser. Because the route receives private
witness data, it only answers requests addressed to `localhost` — the same
trust model as Midnight's own proof server, which must run on a machine the
prover controls. On a hosted deployment the route reports itself unavailable
and the UI disables that adapter.

## Toolchain

| Component | Version | Why pinned |
| --- | --- | --- |
| Compact toolchain | 0.31.1 | Current deployable toolchain on Preview/Preprod/Mainnet per the Midnight support matrix. 0.34.x targets ledger 9, not yet deployed. |
| Language | `pragma language_version 0.23;` | Matches toolchain 0.31.x. |
| `@midnight-ntwrk/compact-runtime` | 0.16.0 (exact) | Generated code calls `checkRuntimeVersion('0.16.0')`; minor version must match. |
| Next.js | 16.3.6 | App Router, Turbopack. |
| Node | 24 (`.nvmrc`) | compact-runtime requires modern ESM + WASM. |

## Proving keys

`npm run contract:compile` uses `--skip-zk`: it produces the circuit's JS
implementation and ZKIR, which is what tests and the local adapter execute.
`npm run contract:compile:full` also generates prover/verifier keys into
`contract/build/` (git-ignored). The key generator requires a CPU with AVX2;
on the machine this repository was built on (Intel Ivy Bridge, AVX only) it
exits with SIGILL, so keys have not been generated locally. CI can generate
them on demand (`workflow_dispatch` with `proving_keys: true`).

## Path to a Midnight network deployment

Not done. What it requires, from the current Midnight documentation:

1. Generate proving keys (`contract:compile:full`) on an AVX2 machine.
2. Run a proof server locally:
   `docker run -p 6300:6300 midnightntwrk/proof-server:8.1.0 midnight-proof-server -v`
3. A Lace wallet on Preprod (or the wallet SDK for Node), funded with tNIGHT
   from the Preprod faucet and registered for DUST generation (fees).
4. Deploy with Midnight.js 4.1.x (`midnight-js-contracts`,
   `midnight-js-http-client-proof-provider`,
   `midnight-js-indexer-public-data-provider`,
   `midnight-js-level-private-state-provider`,
   `midnight-js-node-zk-config-provider`), passing the evaluator key,
   predicate id and threshold to the constructor.
5. Implement a `MIDNIGHT` adapter whose `attest` submits `attest(model, suite)`
   as a proven transaction and whose `lookup` reads `attestations` and
   `releases` from the indexer.
6. Implement `NetworkVerifier` (`src/lib/attestation/receipt.ts`): confirm the
   transaction was accepted by the network (which verified its proof) on the
   expected contract address, and that the ledger holds this exact record with
   `releases[releaseKey] = id`. Pass it as `network` in the receipt's issuer
   lookups. Only then can a receipt reach `NETWORK VERIFIED`.

The contract, witnesses, commitment encoding and adapter interface do not need
to change for this step.
