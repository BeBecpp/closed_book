# CLOSED BOOK — Midnight Korea Hackathon 2026 · final form answers

Copy each block into the matching field. Fields in [BRACKETS] need your own
registration details; do not guess them.

==================================================
TEAM / PROJECT NAME
==================================================

CLOSED BOOK

==================================================
PARTICIPATION TYPE
==================================================

[FILL FROM LUMA — SOLO OR TEAM]

==================================================
AFFILIATION / NAME
==================================================

[FILL EXACTLY AS REGISTERED ON LUMA]
(If team: name / email / role for every member.)

==================================================
REPRESENTATIVE CONTACT
==================================================

[FILL EMAIL OR DISCORD HANDLE]

==================================================
GITHUB
==================================================

https://github.com/BeBecpp/closed_book

==================================================
MIDNIGHTNTWRK TOPIC
==================================================

Confirmed. The repository topics include `midnightntwrk` (verified with the
GitHub API on 2026-09-27).

==================================================
PROJECT OVERVIEW
==================================================

AI safety evaluations create a transparency paradox. A red-team suite is only
useful while it stays secret: once its prompts, exploit traces and model
outputs are published, they leak into training data, get patched one by one,
and stop measuring anything. But a suite that stays completely secret gives
the public nothing to check. A statement that "this model passed our safety
evaluation" becomes a press release that outsiders must simply trust.

AI labs, independent evaluators, and the regulators and users who rely on
release decisions all face this problem.

CLOSED BOOK resolves it by proving the verdict while keeping the evidence
closed. The evaluator commits to an exact model build and an exact
confidential test suite, runs the evaluation privately, and supplies the
private results. A Compact circuit on Midnight checks those results against
a public release rule (Safety Baseline 1: six of six checks must pass).

If the results satisfy the rule, the public receives an attestation:
- the model-build commitment;
- the suite commitment;
- the predicate;
- a salted evidence commitment;
- the evaluator key;
- an attestation id.

It never receives the prompts, the outputs, the exploit traces, the
individual results or the evaluator's notes.

The failure path matters as much as the success path. If even one private
check fails, no attestation can be produced — no proof exists for that
statement — and the public still does not learn which test failed, which
prompt was used, or what the model said.

Each release (model, suite, predicate) can be attested once. A public receipt
lets anyone check a record, and it separates demo, local-circuit and network
trust states so nothing is ever labelled as verified beyond what was actually
verified.

The proof is public. The evidence isn't.

==================================================
MIDNIGHT IMPLEMENTATION
==================================================

Midnight is necessary because CLOSED BOOK must reason over values that cannot
be published. Without privacy, the evaluator would have to disclose the
confidential evaluation and burn it. Without verifiability, the public would
have to trust a private claim. Midnight lets one Compact circuit compute over
private witness data and disclose only the commitments the release
attestation needs.

The contract (contract/src/closed-book.compact, Compact 0.31.1) exposes one
circuit, attest(model, suite).

Private witness values:
- evaluator secret;
- model digest;
- suite digest;
- suite salt;
- the six check results;
- evidence salt.

Public ledger values:
- evaluator key;
- release predicate and threshold;
- per attestation: model commitment, suite commitment, evidence commitment,
  attestation id and release key.

The circuit enforces five assertions:
1. Authorization: the witness secret hashes to the registered evaluator key.
2. Model binding: the private model digest opens the public model-build
   commitment.
3. Suite binding: the private suite digest and salt open the public suite
   commitment.
4. Release predicate: the six private results satisfy the public threshold.
5. Release uniqueness: no attestation exists yet for
   H(model, suite, predicate), so a fresh evidence salt cannot mint a second
   one.

Only values wrapped in disclose() reach the ledger: the release key, the
attestation id and the commitment record. The compiler rejects any other
witness-derived disclosure, so the privacy boundary can be read from the
source. The TypeScript library reproduces every commitment byte for byte, and
the tests check it against the compiled contract.

Real zero-knowledge evidence (proofs/evidence.json):
- **Keys:** proving keys for attest were generated in CI with the official
  toolchain (prover key 19.5 MB, verifier key 2,119 bytes).
- **6/6 proven:** a witness with all six checks passing produced a real PLONK
  proof from the compiled circuit, with both the official Midnight proof
  server 8.1.0 and the official WASM prover.
- **5/6 rejected:** the same witness with one check failed is rejected by the
  actual ZK constraint system ("Failed direct assertion"; the proof server
  returns HTTP 400). No proof exists.
- **Control:** the same five-of-six witness satisfies the constraints under a
  threshold-5 deployment, showing that the release predicate is what refuses
  it.

The circuit also runs through compact-runtime in 77 automated tests and in
the web app's local-circuit mode.

Network status: scripts for Preprod deploy, attest and verify are
implemented. A public-indexer reader is tested live against Preprod. A
network verifier promotes a receipt to "Network verified" only when the
deployed contract holds the exact record. No Preprod deployment is claimed
yet, because funding the test wallet requires the faucet's human captcha
step. The standalone proofs above are not bound to a transaction.

==================================================
PROJECT DECK
==================================================

[GOOGLE SLIDES URL]

==================================================
DEMO VIDEO
==================================================

[YOUTUBE OR LOOM URL]

==================================================
DEMO URL
==================================================

https://closed-book.vercel.app/

==================================================
ACADEMY
==================================================

Explorer: [UPLOAD CERTIFICATE IF AVAILABLE]
Scholar:  [UPLOAD CERTIFICATE IF AVAILABLE]
