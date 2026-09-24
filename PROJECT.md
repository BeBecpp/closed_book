# PROJECT — CLOSED BOOK

> Pass the test. Keep the test closed.

This file is the source of truth for what CLOSED BOOK is, what it claims,
and what it must never claim. Read it before changing anything.

---

## 1. Problem

AI developers publish safety claims about model releases: "this build passed
our red-team evaluation." The public has two bad options for checking that
claim:

1. **Publish the evaluation.** Red-team prompts, jailbreaks and exploit traces
   become public. The suite is burned: it leaks into training data, gets
   patched against specifically, and stops measuring anything. Publishing
   exploit traces can also hand attackers working material.
2. **Keep the evaluation secret.** The claim then rests on the reputation of
   whoever wrote the press release. Nobody outside can tell which build was
   tested, which suite was used, or whether the stated policy was applied.

Both options fail. The first destroys the test. The second destroys the
verifiability.

## 2. Solution

CLOSED BOOK is a privacy-preserving release attestation built on Midnight.

An independent evaluator runs a confidential evaluation against an exact model
build. The evaluator then produces an attestation that:

- is bound to a **model-build commitment** (the exact build that was tested),
- is bound to an **evaluation-suite commitment** (the exact suite that was
  used, without revealing it),
- states that the private results satisfy a **public release predicate**
  (e.g. *Safety Baseline 1: 6 of 6 required checks pass*),
- carries an **evidence commitment** so that the private record can later be
  opened to an auditor and checked against what was attested,
- and reveals nothing else.

On Midnight, the predicate check runs inside a Compact circuit over private
witness data. Only the public commitments and the verdict reach the ledger.

A failing evaluation cannot produce an attestation at all. The circuit's
assertions fail, so no proof and no transaction exist.

**A failed release does not become a proof.**

## 3. Product promise

> The proof is public. The evidence isn't.

- A verifier learns: which build, which suite (as a commitment), which
  predicate, which evaluator key, and that the predicate was satisfied.
- A verifier does not learn: prompts, outputs, exploit traces, which check
  failed in any earlier attempt, individual results, or evaluator notes.

## 4. Public / private boundary

| Data                                   | Visibility | Where it lives                          |
| -------------------------------------- | ---------- | --------------------------------------- |
| Model-build commitment                 | Public     | Ledger (attestation record)             |
| Evaluation-suite commitment            | Public     | Ledger (attestation record)             |
| Release predicate id + threshold       | Public     | Ledger (contract constant / record)     |
| Evidence commitment                    | Public     | Ledger (attestation record)             |
| Evaluator public key                   | Public     | Ledger (set at deployment)              |
| Attestation id                         | Public     | Ledger (map key)                        |
| Release key H(model, suite, predicate) | Public     | Ledger (`releases` map key)             |
| Verdict                                | Public     | Implied by record existence (PASS only) |
| Red-team prompts / suite contents      | Private    | Evaluator only                          |
| Model outputs, exploit traces          | Private    | Evaluator only                          |
| Individual check results               | Private    | Witness only, never disclosed           |
| Evaluator notes                        | Private    | Evaluator only, never hashed on-chain   |
| Salts, evaluator secret key            | Private    | Witness only                            |

There is no public FAIL record. Publishing "this build failed" would leak
information about the private suite and invite targeted probing. The absence
of a valid attestation is the only public signal of a failure.

## 5. Technical truth constraints

These are non-negotiable. Every page, README line and UI label must obey them.

1. **The model is not executed inside a ZK circuit.** The circuit checks a
   committed evaluation result against a predicate. It does not prove that the
   evaluation was performed honestly or at all.
2. **The evaluator is trusted for the truth of the results.** CLOSED BOOK
   removes the need to trust the *publisher of the claim*; it does not remove
   the need to trust the *evaluator's inputs*. Evaluator identity is bound by
   key, so a dishonest evaluator is at least accountable.
3. **Never show "verified" for something that was not verified.** The UI
   distinguishes three sources of truth:
   - `DEMO` — the in-browser demo adapter. It computes real SHA-256
     commitments and enforces the predicate in TypeScript. It is **not** a
     zero-knowledge proof and **not** on-chain. Always labelled `DEMO ADAPTER`.
   - `MIDNIGHT-LOCAL` — the compiled Compact contract executed in-process via
     `@midnight-ntwrk/compact-runtime`. The real circuit logic runs and
     accepts or rejects; no proof is generated and nothing is submitted.
   - `MIDNIGHT` — a proven transaction on a Midnight network. Only this source
     may display proof or transaction metadata. It is not claimed until it
     actually happens.
4. **No fake hashes, fake transaction ids, fake explorer links, fake
   deployments, fake metrics or fake customers.** Every hash displayed is
   computed from real inputs at runtime.

## 6. MVP

- Compact contract `contract/src/closed-book.compact` with:
  - evaluator key and release threshold fixed at deployment,
  - `attest` circuit: fixed-size (6) private result vector, private openings,
    predicate assertion, evidence commitment, one attestation per
    release (model, suite, predicate),
  - public ledger map of attestation records.
- TypeScript commitment library (`src/lib/commitments`) that matches the
  contract's encoding.
- Attestation adapter boundary (`src/lib/attestation`): `types.ts`,
  `adapter.ts`, `demo-adapter.ts`, `midnight-adapter.ts`.
- Web app: `/`, `/evaluate`, `/verify/[id]`, `/protocol`.
- Tests: predicate, commitments, mismatch cases, tampering, determinism,
  adapter behaviour, and contract execution via the Compact runtime.
- Docs: README, BRAND, COPY, docs/ARCHITECTURE, PRIVACY-BOUNDARY,
  THREAT-MODEL, PROTOCOL, DEMO.
- CI: install, lint, typecheck, test, build.

## 7. Non-goals

- Running or proving model inference in ZK.
- Proving that red-team tests are good, complete or representative.
- A marketplace, a leaderboard, a token, multi-evaluator governance.
- User accounts, persistence servers, or analytics.
- Publishing negative (FAIL) attestations.

## 8. Demo scenario

1. The evaluator console holds a private evaluation of build `CB-DEMO-04`:
   six checks (prompt injection, secret exfiltration, PII leakage, tool abuse,
   policy bypass, unsafe escalation), all PASS.
2. The evaluator generates an attestation. The public side shows the model
   commitment, suite commitment, predicate `Safety Baseline 1`, verdict PASS,
   6/6, labelled a simulated demo pass, and a leak scan that finds
   `0 bytes` of the evaluation's private plaintext in the public record.
3. The evaluator flips *Secret exfiltration* to FAIL. Private status reads
   5/6. Generating now yields **ATTESTATION REFUSED**. The public side learns
   nothing about which check failed, what prompt was used or what output
   caused it.
4. The public verification receipt `/verify/<id>` shows the attestation and
   lets anyone recompute the attestation id from the public fields.

## 9. Definition of done

- `npm run verify` (lint, typecheck, test, build) passes on a clean clone.
- The Compact contract compiles with the pinned compiler, and the committed
  compiled output matches the source.
- Contract tests execute the compiled circuit and prove: pass → record,
  fail → rejection, mismatched model/suite → rejection, tampered data →
  mismatch, replay (including a fresh evidence salt for the same release)
  → rejection.
- Receipts never call a record verified on hashes alone: five tested trust
  states (ALTERED, CLAIMED PASS, DEMO PASS, LOCAL CIRCUIT ATTESTED, NETWORK
  VERIFIED — the last unreachable until a network verifier exists).
- No UI state claims proof or on-chain verification unless it happened.
- No TODO/FIXME/placeholder/lorem text, dead links, or fake identifiers.
- Mobile layout at 390 px is intentionally designed.
