# Protocol — CLOSED BOOK v1

> Verification without disclosure.

## Notation

- `H(a, b, …)` — Compact `persistentHash<Vector<n, Bytes<32>>>([a, b, …])`,
  which equals `SHA-256(a ‖ b ‖ …)` over 32-byte words. (Verified against the
  compiled contract in `tests/contract.test.ts`.)
- `pad(s)` — Compact `pad(32, s)`: UTF-8 bytes of `s`, zero-padded to 32.
- `digest(m)` — `SHA-256(canonicalJSON(m))`, keys sorted recursively.
- `pack(r)` — six booleans as a little-endian 32-byte word, bit `i` = check
  `i` passed (`Field as Bytes<32>` in Compact).

## Parties and setup

1. **Deployment.** The contract is deployed with
   `evaluatorKey = H(pad("closedbook:evaluator:v1"), sk)`,
   `predicate = pad("safety-baseline:1")`, `threshold = 6`.
   The constructor asserts `0 < threshold ≤ 6`.
2. **Model developer** publishes
   `modelCommitment = H(pad("closedbook:model:v1"), digest(modelManifest))`
   for the build it intends to release.
3. **Evaluator** fixes its suite and publishes
   `suiteCommitment = H(pad("closedbook:suite:v1"), digest(suiteManifest), suiteSalt)`.
   The suite manifest contains check definitions and sealed cases, never
   results.

## Evaluation (off-chain, private)

The evaluator runs the six checks against the build and records
`results ∈ {PASS, FAIL}⁶`, plus outputs, traces and notes that never leave
the evaluation.

## Attestation

The evaluator calls `attest(modelCommitment, suiteCommitment)` with private
witnesses `sk, modelDigest, suiteDigest, suiteSalt, results, evidenceSalt`
(`evidenceSalt` fresh per attempt). The circuit:

```
signer   = H(pad("closedbook:evaluator:v1"), sk)
assert signer == ledger.evaluator                         "not the registered evaluator"
assert H(pad("closedbook:model:v1"), modelDigest) == model "model commitment mismatch"
assert H(pad("closedbook:suite:v1"), suiteDigest, suiteSalt) == suite
                                                           "suite commitment mismatch"
assert popcount(results) >= ledger.threshold              "release predicate not satisfied"
release  = H(pad("closedbook:release:v1"), model, suite, ledger.predicate)
assert release ∉ ledger.releases                          "release already attested"
evidence = H(pad("closedbook:evidence:v1"), model, suite, ledger.predicate,
             pack(results), evidenceSalt)
id       = H(pad("closedbook:attestation:v1"), model, suite, ledger.predicate, evidence)
ledger.releases[release] = id
ledger.attestations[id]  = { model, suite, predicate, evidence, evaluator: signer }
ledger.attestationCount += 1
return id
```

If any assertion fails, no valid proof exists for the call, so no transaction
is accepted and the ledger is unchanged. **A failed release does not become
a proof.**

## Public record

```
id, model, suite, predicate, evidence, evaluator
```

The verdict is PASS by construction. The web product adds presentation
metadata (reference code `CB-` + first 3 bytes of `id`, build label, issue
time, source) that is not part of the ledger record.

## Verification

A verifier holding a record:

1. Recomputes `id` from `(model, suite, predicate, evidence)` and the release
   key from `(model, suite, predicate)`. Match ⇒ the record is internally
   consistent — and nothing more: anyone can construct such a record.
2. Compares `model` with the developer's published commitment for the
   release, and `suite` with the evaluator's published suite commitment.
3. Checks `evaluator` is the key of the evaluator it trusts, and that the
   contract's `threshold`/`predicate` are the rule it cares about.
4. Confirms the record with its issuer: on a Midnight network, that the
   record is in the contract's `attestations` map and `releases[release] = id`
   (the network verified the proof when it accepted the transaction). Until
   this step succeeds the verdict is only a claim. The web receipt's five
   states are defined in `src/lib/attestation/receipt.ts`.

## Audit opening

With `(results, evidenceSalt)` handed over by the evaluator, anyone can
recompute `evidence` and compare it with the record. A different result set
does not open it.

## Security properties (and their limits)

| Property | Holds because | Limit |
| --- | --- | --- |
| Binding to build | Model commitment opening asserted in-circuit | Does not bind the deployed service |
| Binding to suite | Salted suite commitment opening asserted in-circuit | Suite quality is out of scope |
| Predicate | Threshold read from ledger; popcount asserted | Results are evaluator-supplied |
| Attribution | Evaluator secret → registered key | Key compromise |
| One attestation per release | `releases` map keyed by H(model, suite, predicate); a fresh evidence salt does not help | Per contract; a new suite commitment is a new release |
| Hiding | 32-byte salts; only commitments disclosed | Existence of a PASS record is public |

## What is not in the protocol

Proof of model execution, proof that the evaluation happened, public failure
records, multi-evaluator quorum, revocation. These are deliberately out of
scope for v1.
