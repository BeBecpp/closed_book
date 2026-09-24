# Threat model

## Actors

| Actor | Wants | Trusted for |
| --- | --- | --- |
| Model developer | A credible release claim | Publishing the model-build commitment for the release |
| Independent evaluator | To attest without burning the suite | **The truth of the results.** Holding its secret key. |
| Public verifier | To know what was tested and whether it passed | Nothing |
| Attacker | Suite contents; a fake or replayed attestation; a failing build presented as passing | — |
| Midnight network | — | Verifying proofs and ordering transactions (network mode only) |

## Assets

Suite contents; individual results; which check failed; evaluator secret;
integrity of the public record.

## Threats

### 1. Evaluator dishonesty
**Threat.** The evaluator reports PASS for checks it never ran, or lies about
results.
**Status: not prevented.** No circuit can prove that an off-chain evaluation
happened or that a model behaved a certain way. CLOSED BOOK makes the
evaluator **accountable**, not infallible:
- every attestation is bound to the evaluator's key;
- the evidence commitment fixes the result set; an auditor given the opening
  (results + evidence salt) can check it, and the evaluator cannot later
  present a different set (`openEvidence`, tested).
Mitigation beyond this repository: multiple independent evaluators, audits,
TEEs for the evaluation harness.

### 2. Model-version mismatch
**Threat.** An attestation for build A is presented as covering build B.
**Status: prevented by the circuit.** `assert(commitModel(modelDigest()) ==
model)`. The attestation names one model commitment; the developer publishes
the commitment for what it ships. Tested: `different model commitment →
mismatch`.
**Residual.** Nothing proves the deployed service runs build A. That needs a
separate deployment/serving attestation.

### 3. Suite-version mismatch
**Threat.** The evaluator publishes a suite commitment, then evaluates with an
easier suite.
**Status: prevented, to the extent the suite commitment is published first.**
The circuit asserts the suite digest and salt open the public suite
commitment. Editing the suite after publication breaks the binding (tested,
and demonstrable in `/evaluate`).
**Residual.** A suite committed once can be weak from the start; commitments
say nothing about quality.

### 4. Tampered result
**Threat.** The private result set is altered after the attestation (e.g. for
an audit).
**Status: detected.** Results are packed into the salted evidence commitment
recorded on the ledger. Any altered result set fails to open it (tested).
A tampered *public* record fails id recomputation on the receipt page
(tested).

### 5. Replay
**Threat.** The same attestation is submitted again, or copied onto another
contract.
**Status: prevented within a contract.** The id is a ledger map key and the
circuit asserts it is absent before inserting. Across contracts, the record
names the evaluator key and predicate; verifiers should check the contract
address they trust. On a network, Midnight's transaction model additionally
binds each proof to its transaction.

### 6. Disclosure risk
**Threat.** Private data leaks through the public record, refusal messages,
timing or the UI.
**Status: minimised and measured.**
- Only `disclose()`d values reach the ledger (see PRIVACY-BOUNDARY.md).
- All commitments over private data are salted; evidence salts are fresh per
  attempt.
- Refusal messages are fixed strings naming the predicate, never a check
  (tested: serialised refusal contains no check name, category or case).
- There is no FAIL record.
**Residual.**
- The *existence* of an attestation reveals that all required checks passed
  (by design).
- If an evaluator attests for many builds and some never appear, absence is a
  weak signal of failure.
- With a threshold below the check count, the evidence commitment is still
  hiding, but a verifier learns the pass count was ≥ threshold.
- Timing of attempts on a network is observable.

### 7. Fake frontend verification
**Threat.** A web page shows "verified" for something that was not verified,
or a forged link claims a Midnight proof.
**Status: addressed by construction and labelling.**
- Every record carries `source`; every view renders it.
- No view renders proof or transaction metadata unless the source is
  `MIDNIGHT`, and none produces that source today.
- A receipt recomputes the attestation id from the public fields in the
  viewer's browser. It is honest about what that means: integrity, not
  predicate satisfaction.
- A link whose record claims `MIDNIGHT` is displayed as a **claim**, "not
  verified by this page".
**Residual.** A user must trust whichever page recomputes the id — ideally one
they run themselves (`npm run dev`) or the contract ledger directly.

### 8. Limits of trusted evaluation input
The circuit checks *consistency*: key, bindings, predicate, uniqueness. It
cannot check *truth*. The suite could be trivial, the model outputs could be
misjudged, the evaluator could be compromised. CLOSED BOOK narrows the claim
to one precise statement — "this key attests that this build passed this
committed suite under this public rule" — and makes that statement
verifiable without disclosure. It is not a certificate that a model is safe.

### 9. Local circuit endpoint
**Threat.** Private witness data posted to a remote server.
**Status: prevented by host check.** `/api/circuit` answers only requests
whose URL host and `Host` header are `localhost`/`127.0.0.1`/`::1`, and can be
disabled with `CLOSEDBOOK_LOCAL_CIRCUIT=off`. On a hosted deployment the UI
shows the adapter as unavailable.

### 10. Demo fixture secrets
The demo evaluator secret and suite salt are fixed values in the repository
so the demo is reproducible. They protect nothing. The console can draw fresh
salts; a real deployment must generate its secret and salts locally and never
commit them.
