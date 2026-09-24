# Privacy boundary

> Nothing sensitive leaves the evaluation.

This document lists every value in the system, where it lives, and whether it
ever crosses to the public side. If a value is not listed here, it must not be
added to the public record without updating this file.

## The rule in the contract

Compact refuses to write witness-derived data to the ledger, return it, or
pass it on unless it is wrapped in `disclose()`. Every disclosure in
`contract/src/closed-book.compact` is therefore explicit:

| `disclose(...)` site | Value | Derived from private data? |
| --- | --- | --- |
| constructor | `evaluatorKey`, `predicateId`, `requiredPasses` | No — deployment parameters |
| `attest` | `id` (map key, and return value) | Yes — hash of commitments incl. evidence commitment |
| `attest` | `Attestation { model, suite, predicate, evidence, evaluator }` | `evidence` and `evaluator` are hashes of private data |

Nothing else reaches the ledger. The six results, the digests, the salts and
the evaluator secret are consumed inside the circuit only.

## Inventory

| Value | Held by | Public? | Protection |
| --- | --- | --- | --- |
| Sealed test cases (prompts, scenarios) | Evaluator | Never | Only their digest enters a salted commitment |
| Model outputs, exploit traces | Evaluator | Never | Not an input to anything |
| Evaluator notes | Evaluator | Never | Not hashed, not committed, not sent to the local circuit* |
| Individual check results (6 booleans) | Evaluator → witness | Never | Enter only the salted evidence commitment |
| Which check failed | Evaluator | Never | Refusal messages name the predicate, never a check |
| Suite digest | Evaluator → witness | Never | Committed with a 32-byte salt |
| Suite salt | Evaluator → witness | Never | Random 32 bytes |
| Evidence salt | Evaluator → witness | Never | Fresh random 32 bytes per attestation |
| Evaluator secret | Evaluator → witness | Never | Only its hash (the key) is public |
| Model digest | Evaluator → witness | Not directly | Its commitment is public; the developer may publish the digest |
| Model commitment | Public | Yes | — |
| Suite commitment | Public | Yes | Hiding (salted) |
| Evidence commitment | Public | Yes | Hiding (salted); opens only with results + salt |
| Predicate id + threshold | Public | Yes | — |
| Evaluator key | Public | Yes | — |
| Attestation id | Public | Yes | — |
| Build label (e.g. `CB-DEMO-04`) | Public (receipt only) | Yes | Informational; not bound — the commitment is the binding |

\* The web console sends the evaluation to the local circuit endpoint on the
evaluator's own machine with `notes` blanked first. The endpoint refuses
non-local hosts.

## Why salts

Six booleans have 64 possible values. Without a salt, anyone could hash all 64
and read the results straight off an evidence commitment. The same applies to
a suite built from guessable components. Every commitment over private data
therefore includes 32 random bytes.

## Why there is no FAIL record

A public "build X failed Safety Baseline 1" tells an attacker that the suite
found something, invites probing of the build, and — if repeated per check —
leaks the suite's structure. The only public signal of failure is the absence
of an attestation.

## Measured, not asserted

`measureDisclosure()` in `src/lib/attestation/verify.ts` serialises the public
payload and counts bytes of every private plaintext (cases, check names and
ids, notes, salts, secret) that appear in it. The UI shows this number; the
tests require it to be 0 and require a deliberately leaky record to score
above 0.

## Where the browser stores things

- The demo registry (`localStorage`, key `closedbook.demo.registry.v1`) holds
  **public records only**.
- Private evaluation state lives in React state and is lost on reload.
- Receipt share links carry the public record in the URL fragment (`#r=`),
  which browsers do not send to servers.
