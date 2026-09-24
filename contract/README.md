# contract/

The CLOSED BOOK Compact contract.

| Path | |
| --- | --- |
| `src/closed-book.compact` | Source. `pragma language_version 0.23;` |
| `src/managed/closed-book/` | Compiler output from `compact compile +0.31.1 --skip-zk`. Committed so tests run without a compiler; CI recompiles and fails on any diff. |
| `build/` | Full build with proving keys (`npm run contract:compile:full`). Git-ignored. |

## Compile

```bash
# once: install the Compact devtool and pin the toolchain (Linux, macOS, WSL)
curl --proto '=https' --tlsv1.2 -LsSf https://github.com/midnightntwrk/compact/releases/latest/download/compact-installer.sh | sh
compact update 0.31.1

# from the repository root
npm run contract:compile        # JS + ZKIR
npm run contract:compile:full   # + prover/verifier keys (needs an AVX2 CPU)
```

On Windows the script runs the compiler inside WSL.

## Circuits

| Circuit | Kind | Purpose |
| --- | --- | --- |
| `attest(model, suite)` | impure, proven | The attestation. Five assertions, then one ledger insert. |
| `deriveEvaluatorKey`, `commitModel`, `commitSuite`, `packResults`, `countPasses`, `commitEvidence`, `deriveReleaseKey`, `deriveAttestationId` | pure | The commitment scheme, exported so off-chain code can use the contract as the reference. |

## Ledger

```
evaluator: Bytes<32>                     registered evaluator key
predicate: Bytes<32>                     pad(32, "safety-baseline:1")
threshold: Uint<8>                       6
attestations: Map<Bytes<32>, Attestation>   attestation id -> record
releases: Map<Bytes<32>, Bytes<32>>          H(model, suite, predicate) -> attestation id
attestationCount: Counter
```

## Run it

```bash
npm run contract:demo   # transcript: pass, fail, wrong model, edited suite, wrong key, replay, re-salted replay
npm test                # includes tests/contract.test.ts
```

Both execute the compiled circuit through `@midnight-ntwrk/compact-runtime`
0.16.0. Neither generates a zero-knowledge proof.
