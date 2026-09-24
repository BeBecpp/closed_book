<img src="public/brand/mark.svg" width="48" height="48" alt="" />

# CLOSED BOOK

**Pass the test. Keep the test closed.**

CLOSED BOOK is a privacy-preserving release attestation for AI models, built
on [Midnight](https://midnight.network). An independent evaluator runs a
confidential red-team evaluation against an exact model build, then publishes a
verifiable verdict: *this build passed this committed suite under this public
release rule*. The prompts, outputs, exploit traces and individual results
stay private.

> The proof is public. The evidence isn't.

| | |
| --- | --- |
| **Contract** | [`contract/src/closed-book.compact`](contract/src/closed-book.compact). Compiles with Compact 0.31.1 and is executed by the tests, the CLI and the web console. |
| **Web** | Next.js 16. Routes: `/`, `/evaluate`, `/verify/[id]`, `/protocol`. |
| **Status** | Circuit logic: working. Zero-knowledge proofs and a Midnight network deployment: **not done** ([details](#15-limitations)). |

---

## 1. What it is

A Compact contract and a web product that turn a private evaluation into a
public attestation with one circuit, `attest(model, suite)`. The circuit
checks five things:

1. The caller holds the registered evaluator key.
2. The private model digest opens the public **model-build commitment**.
3. The private suite digest and salt open the public **evaluation-suite commitment**.
4. The six private check results satisfy the public **release predicate**.
5. This attestation has not been recorded before.

If all five hold, the contract records commitments only. If any fails, there
is no proof and no record. **A failed release does not become a proof.**

## 2. Why privacy is necessary

A red-team suite loses its value once it is published: prompts get patched
one by one, leak into training data and stop measuring anything, and exploit
traces help attackers. A suite kept secret gives the public nothing to check,
so it has to trust whoever makes the safety claim. The privacy in CLOSED BOOK
is what lets the evaluation stay useful and still be verified.

## 3. Demo

```bash
npm install
npm run dev          # http://localhost:3000
```

- **Home → § 01 Demonstration.** Generate an attestation, then fail
  *Secret exfiltration* and try again. The result is **Attestation refused**,
  and the public side never learns which check failed.
- **/evaluate.** The evaluator console. Break the model or suite binding,
  switch to an unregistered key, and choose the **MIDNIGHT · LOCAL CIRCUIT**
  adapter to run the compiled Compact contract.
- **/verify/[id].** A printable public receipt that recomputes the
  attestation id in your browser.
- **`npm run contract:demo`.** A terminal transcript of the compiled contract
  accepting and refusing six scenarios.

The full walkthrough is in [docs/DEMO.md](docs/DEMO.md).

## 4. What stays private

- sealed test cases (prompts, scenarios)
- model outputs and exploit traces
- individual check results, and which check failed
- evaluator notes
- salts and the evaluator secret key

None of it reaches the ledger. Every commitment over private data is salted.
See [docs/PRIVACY-BOUNDARY.md](docs/PRIVACY-BOUNDARY.md).

## 5. What becomes public

| Field | Meaning |
| --- | --- |
| `model` | Model-build commitment |
| `suite` | Evaluation-suite commitment (salted) |
| `predicate` | Release predicate id, e.g. `safety-baseline:1`, threshold 6 of 6 |
| `evidence` | Salted commitment to the six results; an auditor can open it |
| `evaluator` | Registered evaluator key |
| `id` | Attestation id, recomputable from the fields above |

There is no FAIL record. The only public sign of a failure is that no
attestation exists.

## 6. Architecture

```
CONFIDENTIAL EVALUATOR              private tests · outputs · results · notes · salts
        │
        ▼
commitments + private witness
        │
        ▼
MIDNIGHT / COMPACT                  attest(model, suite): 5 assertions, disclose() commitments only
        │
        ▼
PUBLIC ATTESTATION                  model · suite · predicate · evidence · evaluator · id
```

The UI depends on a single interface, `AttestationAdapter`
([src/lib/attestation/adapter.ts](src/lib/attestation/adapter.ts)).

| Source | What runs | Proof | Chain |
| --- | --- | --- | --- |
| `DEMO ADAPTER` | The circuit's assertions in TypeScript, in the browser, over the same bytes | No | No |
| `MIDNIGHT · LOCAL CIRCUIT` | The compiled Compact contract via `@midnight-ntwrk/compact-runtime`, on your machine | No | No |
| `MIDNIGHT · NETWORK` | Not implemented | — | — |

Every record carries its source, and the UI never shows proof or transaction
metadata that did not come from a real Midnight transaction. More in
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## 7. How Midnight is used

- **Compact contract** with private `witness` inputs (results, digests,
  salts, secret key) and a public ledger (`evaluator`, `predicate`,
  `threshold`, `attestations`, `attestationCount`).
- **Explicit disclosure.** Only values wrapped in `disclose()` reach the
  ledger: the attestation id and the commitment record. The compiler refuses
  any other witness-derived disclosure.
- **`persistentHash` commitments.** These turn out to be SHA-256 over 32-byte
  words. [`src/lib/commitments`](src/lib/commitments) reproduces them byte for
  byte in the browser, and the tests check this against the compiled
  contract's pure circuits on random inputs.
- **Assertions as the release gate.** A predicate failure is a circuit
  assertion failure, so no proof can be produced for a failing evaluation.
- **Pinned toolchain.** Compact 0.31.1 (language 0.23) and compact-runtime
  0.16.0, the deployable combination on the current Midnight support matrix.

## 8. Repository structure

```
app/                     routes: /, /evaluate, /verify/[id], /protocol, /api/circuit
components/              brand, site chrome, demo, console, receipt, diagrams
src/lib/commitments/     commitment scheme (mirrors the contract)
src/lib/attestation/     types, adapter, demo-adapter, midnight-adapter, verify, registry
src/lib/midnight/        compiled-contract wrapper, local-only server guard
src/lib/demo/            demo fixture (synthetic, harmless cases)
contract/src/            closed-book.compact + compiled output (managed/)
scripts/                 compile-contract.mjs, contract-demo.mjs
tests/                   commitments, demo adapter, compiled contract
docs/                    ARCHITECTURE, PRIVACY-BOUNDARY, THREAT-MODEL, PROTOCOL, DEMO
public/brand/            mark.svg, mark-reversed.svg, wordmark.svg
BRAND.md COPY.md PROJECT.md
```

## 9. Local setup

Requirements: Node 24 (see `.nvmrc`; 22.15 or later works) and npm.

```bash
npm install
```

The compiled contract is committed, so you do not need the Compact compiler
for tests, the demo or the web app.

## 10. Compile

To recompile the contract, first install the Compact devtool on Linux, macOS
or WSL and pin the toolchain:

```bash
curl --proto '=https' --tlsv1.2 -LsSf https://github.com/midnightntwrk/compact/releases/latest/download/compact-installer.sh | sh
compact update 0.31.1
```

Then run either:

```bash
npm run contract:compile        # --skip-zk: JS + ZKIR into contract/src/managed
npm run contract:compile:full   # also generates proving keys (needs an AVX2 CPU)
```

On Windows the script runs the compiler inside WSL. It fails loudly if it
cannot find a compiler.

## 11. Test

```bash
npm run test
```

The suite has 37 tests:

- **Commitments.** Determinism, domain separation, salting, packing, and
  canonical JSON.
- **Demo adapter.** All checks pass → attestation. One fails → refused, with
  no check named. Model mismatch, suite mismatch, wrong key, replay,
  malformed input, record tampering, auditor opening, zero disclosure, and
  share-link round-trip.
- **Compiled contract.** Every pure circuit matches TypeScript on random
  inputs. Constructor bounds. Pass → ledger record. Each single failing
  check → refused with an empty ledger. Model mismatch, suite mismatch,
  tampered suite, wrong key, replay, and a lower threshold. The demo adapter
  and the contract agree on ids and on refusals.

```bash
npm run verify   # lint → typecheck → test → build
```

## 12. Run

```bash
npm run dev                 # development
npm run build && npm start  # production
npm run contract:demo       # compiled-contract transcript
```

The local-circuit adapter only answers requests to `localhost`. Set
`CLOSEDBOOK_LOCAL_CIRCUIT=off` to disable it.

## 13. Verification flow

1. Open a receipt: `/verify/CB-XXXXXX`. Share links carry the public record in
   the URL fragment, which is never sent to a server.
2. The page recomputes the attestation id from the public fields with the
   contract's derivation.
3. For local-circuit records, it looks the id up on the local contract ledger.
4. It shows the source and says plainly what was and was not verified. A link
   that claims a Midnight network proof is shown as a claim, not as verified.
5. An auditor given `(results, evidenceSalt)` can open the evidence commitment
   (`openEvidence` in [src/lib/attestation/verify.ts](src/lib/attestation/verify.ts)).

Protocol specification: [docs/PROTOCOL.md](docs/PROTOCOL.md).

## 14. Threat model

| Threat | Status |
| --- | --- |
| Evaluator dishonesty | **Not prevented.** The evaluator is trusted for its results. It is accountable through its key and the evidence commitment. |
| Model-version mismatch | Prevented in-circuit |
| Suite-version mismatch | Prevented in-circuit, once the suite commitment is published |
| Tampered result | Detected (evidence commitment, id recomputation) |
| Replay | Prevented (ledger map membership) |
| Disclosure | Minimised: salts, `disclose()` discipline, no FAIL records, and a measured 0 bytes |
| Fake frontend verification | Source labels on every record. Network-proof claims are never displayed as verified. |

Full analysis: [docs/THREAT-MODEL.md](docs/THREAT-MODEL.md).

## 15. Limitations

- **No zero-knowledge proofs have been generated.** The proving-key generator
  crashes with SIGILL on the development machine, whose CPU has no AVX2. CI can
  generate keys on demand: run the workflow manually with `proving_keys`. This
  has not been run yet.
- **No Midnight network deployment.** There is no deployed contract address, no
  transaction, and no explorer link. The steps are listed in
  [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#path-to-a-midnight-network-deployment).
- **The model is not executed in a circuit**, and nothing proves the
  evaluation took place or that the results are true.
- **The evaluation is fixed at six checks** (`Vector<6, Boolean>`) and uses a
  single registered evaluator.
- **The demo fixture uses fixed salts and a fixed evaluator secret** so the
  demo is reproducible. They protect nothing.
- **The local circuit keeps its ledger in memory**, so it resets when the dev
  server restarts.

## 16. Hackathon submission notes

- **Privacy is the product.** Without hiding, the suite is burned. Without
  verifiability, the claim is only a press release.
- **One primitive, done properly.** One circuit, five assertions, and an
  explicit list of every `disclose()`.
- **Nothing faked.** Every hash on screen is computed at runtime from real
  inputs. Every record is labelled `DEMO`, `MIDNIGHT · LOCAL CIRCUIT` or (not
  yet) `MIDNIGHT`.
- **Reproducible.** Run `npm install && npm run verify` on a clean clone. CI
  also recompiles the contract with the official `setup-compact-action` and
  fails if the committed output drifts.
- **Supporting docs.** Brand system in [BRAND.md](BRAND.md), canonical copy in
  [COPY.md](COPY.md), and system definition in [PROJECT.md](PROJECT.md).

## License

MIT. See [LICENSE](LICENSE).
