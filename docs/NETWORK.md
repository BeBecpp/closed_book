# Midnight network: proofs, deployment, verification

What is real today, how to reproduce it, and exactly what is still blocked.
Nothing on this page describes a step as done unless its evidence is
committed in this repository or linked from a CI run.

## Status

| Step | Status | Evidence |
| --- | --- | --- |
| Proving keys for `attest` | ✅ Generated in CI (AVX2 runner) | [`proofs/evidence.json`](../proofs/evidence.json) · CI job *Proving keys + real ZK proof* |
| Real ZK proof, 6/6 | ✅ Official proof server 8.1.0 **and** official WASM prover | `proofs/attest-6of6.server.proof`, `proofs/attest-6of6.wasm.proof` |
| Same proof on a non-AVX2 laptop | ✅ WASM prover, 301.8 s | [`proofs/evidence.local-wasm.json`](../proofs/evidence.local-wasm.json) |
| 5/6 cannot be proven | ✅ Refused at the runtime **and** at the ZK constraint layer | `proofs/evidence.json` → `negative` |
| Public indexer read path | ✅ Against live Preprod | `npm run test:network`, `npm run network:probe` |
| Network verifier → `NETWORK VERIFIED` | ✅ Implemented and tested on real serialized contract state | `tests/network.test.ts` |
| Wallet identity + sync | ✅ Local identity; the unshielded wallet syncs against Preprod in seconds (balance **0 NIGHT**, checked 2026-09-25). ⚠ The first **full** sync of a fresh wallet is slow: the DUST sub-wallet advanced about 1,700 of 1,562,784 indices per 30 s on the development laptop | `npm run network:init`, `npm run network:status` |
| **Funding (tNIGHT → DUST)** | ⛔ **Human step:** the faucet is behind a captcha | — |
| **Deployment to Preprod** | ⛔ Blocked on funding (and a proof server) | no `deployments/preprod.json` |
| **Network attestation + replay refusal** | ⛔ Blocked on deployment | no `deployments/preprod.attestations.json` |

The receipt can only reach `NETWORK VERIFIED` once a deployment record is
committed. Until then it cannot, by construction.

## 1. Real ZK proofs (done)

```bash
npm install
# Proving keys need an AVX2 CPU. Either:
npm run contract:compile:full           # AVX2 machine: writes contract/build/closed-book
# or download the 'closed-book-proving-keys' artifact of the CI 'zk-proof' job into contract/build/closed-book

npm run proof:demo                                   # WASM prover (any CPU)
npm run proof:demo -- --server http://127.0.0.1:6300 # also the official proof server
```

`proof:demo` builds the preimage from the **compiled `attest` circuit**:
compact-runtime executes the circuit with the private witness, then
`proofDataIntoSerializedPreimage` hands it to the prover. The prover checks
the proof against `attest.verifier` before returning it
(midnight-ledger `transient-crypto/src/proofs.rs`).

Recorded run (CI, `ubuntu-latest`, AVX2; Compact 0.31.1; proof server 8.1.0;
zkir-v2 2.1.0; ledger-v8 8.1.0):

| | |
| --- | --- |
| circuit | `attest`, k = 16 |
| `attest.prover` | 19,485,981 bytes · sha256 `9edb23db…19cc7a` |
| `attest.verifier` | 2,119 bytes · sha256 `ef267dc2…47cf6d1` (committed: `proofs/attest.verifier`) |
| public SRS | `bls_midnight_2p16` from `https://srs.midnight.network/` |
| 6/6 proof, proof server | 4,508 bytes in 10.3 s |
| 6/6 proof, WASM prover | 4,501 bytes in 88.8 s (CI) · 301.8 s (Ivy Bridge laptop, no AVX2) |

**What the proof is:** a real PLONK proof for one call of `attest` with the
demo statement. **What it is not:** bound to a transaction (binding input and
commitment randomness are 0), or submitted anywhere. There is no standalone
JavaScript verifier in the Midnight packages; the network verifies proofs when
it accepts a transaction.

### The 5/6 negative test

| Attempt | Result |
| --- | --- |
| Execute `attest` with 5/6 (threshold 6) | `failed assert: release predicate not satisfied`. No preimage exists. |
| Inject the 5/6 result vector into the 6/6 preimage, WASM `check` / `prove` | `Failed direct assertion`. No proof. |
| Same, official proof server `/check` and `/prove` | `HTTP 400 bad input`. No proof. |
| Control: same 5/6 witness under a **threshold-5** deployment | constraints satisfied |

The control shows the refusal is the release predicate, not a malformed
witness.

## 2. Network identity (human steps)

```bash
npm run network:init      # offline; writes .midnight/secrets.preprod.json (git-ignored)
```

It prints the **unshielded address** and the **evaluator key** — nothing
secret. Then:

1. Open <https://midnight-tmnight-preprod.nethermind.dev/>, paste the address,
   solve the captcha, request tNIGHT. **This cannot be automated** (Cloudflare
   Turnstile), and it must not be.
2. `npm run network:status` — prints the NIGHT balance as soon as the unshielded
   wallet syncs (seconds). `npm run network:status -- --full` waits for all three
   sub-wallets. A fresh wallet's first full sync scans the whole chain and can
   take hours; `MIDNIGHT_SYNC_TIMEOUT_MIN` raises the limit (default 60).
3. Start a proof server and register NIGHT for DUST (fees):
   ```bash
   docker run -p 6300:6300 midnightntwrk/proof-server:8.1.0
   npm run network:dust
   ```

The proof server receives private witness data. Run it on a machine you
control, never as a shared service.

## 3. Deploy, attest, verify

```bash
npm run network:deploy    # writes deployments/preprod.json from the network's answers
npm run network:attest    # one real attestation + replay attempt; writes deployments/preprod.attestations.json
npm run network:verify    # re-verifies every recorded attestation against the live contract
npm run test:network      # opt-in live tests, including NETWORK_VERIFIED for each record
```

Commit `deployments/*.json`. The web app then:
- shows the real contract, deploy transaction and attestations in `/evaluate`
  (MIDNIGHT · NETWORK);
- verifies receipts against the live contract and can reach
  **NETWORK VERIFIED**.

### Without Docker locally: GitHub Actions

`.github/workflows/network.yml` runs one step at a time with the official
proof server inside the job. Add three repository secrets with the values from
`.midnight/secrets.preprod.json`:
- `MIDNIGHT_WALLET_SEED`
- `CLOSEDBOOK_EVALUATOR_SECRET`
- `CLOSEDBOOK_PRIVATE_STATE_PASSWORD`

Then dispatch *Midnight network* with the steps `status` → `dust` → `deploy`.
Commit the `deployments/` artifact, then run `attest` and commit its artifact.

## What each network step establishes

- **deploy:** the contract at `contractAddress` is read back through the
  public indexer, and its `attest` verifier key must hash to the key this
  repository compiled.
- **attest:** the record is read back from the contract's public state and
  judged exactly as the receipt judges it:
  - contract identity;
  - evaluator, predicate and threshold;
  - every stored field;
  - `releases[releaseKey] = id`.
- **replay:** a second call for the same (model, suite, predicate) with a
  fresh evidence salt must fail with `release already attested`. Midnight.js
  executes the circuit against the live contract state before proving, so the
  refusal happens there and no transaction is submitted.

## Verification wording

The web app does not run a SNARK verifier. `NETWORK VERIFIED` means:
- the configured CLOSED BOOK contract (identified by its verifier-key hash)
  holds this exact record, field for field; and
- the network verified the transaction's zero-knowledge proof before the
  contract recorded it.

The receipt says it this way: *"Recorded by the Midnight contract after
network proof verification."*

The contract state is read by this site's server from the public indexer. To
remove that trust, run `npm run network:verify` yourself.

## Privacy boundary on the network path

| Value | Where it lives |
| --- | --- |
| Wallet seed, evaluator secret, private-state password | `.midnight/secrets.<network>.json` on the evaluator's machine (git-ignored) or GitHub secrets |
| Witness (digests, salts, six results) | the evaluator's process, the local proof server, the encrypted local private-state store (`.midnight/<network>/level-db`) |
| Commitments, evaluator key, release key, attestation id | public: ledger, `deployments/*.json`, receipts |

The hosted site never receives witness data:
- `/api/circuit` refuses non-local hosts;
- `/api/network/*` receives only ids and returns public state.

**Demo caveat:** `network:attest` attests the public demo fixture (model
`CB-DEMO-04`, the synthetic suite). The suite and its salt are in this
repository, so its suite commitment can be opened by anyone. The evaluator
secret and evidence salt are fresh and stay local. A real evaluation would use
a private suite and salt.
