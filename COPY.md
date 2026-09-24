# COPY — CLOSED BOOK

Canonical language. Use these lines verbatim; do not paraphrase them into
marketing.

## Primary

| Use | Line |
| --- | --- |
| Name | CLOSED BOOK |
| Primary line | Pass the test. Keep the test closed. |
| Secondary line | Prove the verdict. Keep the evidence private. |
| Core thought | The proof is public. The evidence isn't. |
| One-sentence description | Publish a verifiable safety verdict for an AI release without publishing the red-team suite behind it. |

## Supporting lines

- Verification without disclosure.
- Nothing sensitive leaves the evaluation.
- Trust the attestation, not the press release.
- A failed release does not become a proof.
- The evidence stays closed.

## Interface strings

| Context | String |
| --- | --- |
| Primary CTA (home) | OPEN THE EVALUATION → |
| Nav CTA | OPEN EVALUATION → |
| Secondary CTA | READ THE PROTOCOL |
| Generate | GENERATE ATTESTATION → |
| Private panel | PRIVATE EVALUATION · EVALUATOR ONLY |
| Public panel | PUBLIC ATTESTATION · ANYONE |
| Refusal title | Attestation refused |
| Refusal body | The private evaluation does not satisfy the release policy. |
| Refusal assurance | No private evaluation data was disclosed. |
| Not found | No attestation found. |
| Receipt footer | The evidence stays closed. |
| Leak scan (issuing pages) | Private plaintext in record · 0 bytes found |
| Refusal, public side | Public record · None written |

## Receipt states (never interchangeable)

| State | Earned when | Verdict reads |
| --- | --- | --- |
| `ALTERED` | The record contradicts its own id, release key or code, the address it was opened at, or its issuer | Not shown |
| `CLAIMED PASS` | Self-consistent, but its claimed issuer did not confirm it (a share link from elsewhere, an unreachable local ledger, or any `MIDNIGHT` record) | PASS · claimed, not verified |
| `DEMO PASS` | The demo adapter in this browser issued this exact record | PASS · simulated |
| `LOCAL CIRCUIT ATTESTED` | Self-consistent, reference matches, and the local contract ledger holds this exact record field for field | PASS · local circuit (no ZK proof) |
| `NETWORK VERIFIED` | A network verifier confirmed the proven transaction. **No verifier exists in this repository, so this state is unreachable today.** | PASS |

Only `NETWORK VERIFIED` may use the word "verified" without a negation.

## Source labels (never interchangeable)

| Source | Label | Plain statement |
| --- | --- | --- |
| DEMO | DEMO ADAPTER | Computed in your browser. No zero-knowledge proof, no chain. |
| MIDNIGHT_LOCAL | MIDNIGHT · LOCAL CIRCUIT | The compiled Compact contract ran on this machine. No proof was generated; nothing was submitted. |
| MIDNIGHT | MIDNIGHT · NETWORK | A proven transaction on a Midnight network. (Not deployed.) |

## Words we use carefully

- **Verified** — as a verdict, only for `NETWORK VERIFIED`. Individual checks
  say "Match". Never "verified on-chain" without a real Midnight transaction.
- **0 bytes** — always "of private plaintext found in the record", never
  "disclosed" on its own: the record does publish commitments and labels.
- **Proof** — only for a zero-knowledge proof. The demo and local modes do not
  produce one and say "Not generated".
- **Prove** (the product claims) — always with its object: "proves the
  release condition", never "proves the model is safe".

## Forbidden

revolutionary · cutting-edge · next-generation · AI-powered · seamless ·
transformative · unlock the power of · reimagine · supercharge
