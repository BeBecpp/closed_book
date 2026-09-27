# Deck content — CLOSED BOOK · Midnight Korea Hackathon 2026

- **File:** `D:\closed-book-submission\deck\CLOSED-BOOK-Midnight-Korea-2026.pptx`.
  A copy is committed as `submission/CLOSED-BOOK-Midnight-Korea-2026.pptx`.
- **Format:** 8 slides, 16:9, with speaker notes on every slide.
- **Palette:** ink `#0A0A0A` · paper `#F1EEE6` · graphite `#6C6A64` · signal `#E95136`.
- **Type:** Instrument Serif (statements), Instrument Sans (body), IBM Plex Mono (labels and data).
  All three are Google Fonts, so Google Slides renders them. PowerPoint without them falls back to Calibri.

**No** stock art, crypto imagery or gradients. Visuals are the brand mark, redaction bars and the real product screenshots.

---

## 1 · Cover
**On slide**
- CLOSED BOOK
- *Pass the test. / Keep the test closed.*
- Privacy-preserving AI safety attestations on Midnight.
- Midnight Korea Hackathon 2026

**Visual:** mark top left; three rows of redaction bars at bottom right with "The proof is public. The evidence isn't."

**Notes:** An evaluator can prove that an exact AI model build passed a confidential safety evaluation without publishing the evaluation.

## 2 · The transparency paradox
**On slide**
- AI safety tests are most valuable when they are secret.
- Safety claims are most valuable when they are verifiable.
- **Publish the test** (outlined box): benchmark leakage → exploit leakage → the test loses its value.
- **Hide the test** (ink box): outsiders cannot verify the claim → trust the evaluator → a press release.
- *CLOSED BOOK provides a third option.*

**Notes:** Red-team suites only work while secret; a secret suite gives outsiders nothing to check.

## 3 · CLOSED BOOK
**On slide:** three boxes, left to right.
- **Private evaluator** (ink): secret tests, model outputs, six private results, salts · evaluator secret.
- → *witness* →
- **Midnight · Compact** (outlined): `circuit attest(model, suite)` and its five asserts.
- → *disclose* →
- **Public attestation** (outlined): model commitment, suite commitment, predicate, evidence commitment, evaluator key, attestation id.

Large line: **The proof is public.** *The evidence isn't.*

**Notes:** Only commitments cross to the public side.

## 4 · One demo, two outcomes
**On slide**
- Screenshots `demo-pass.png` | `demo-refused.png`
- **6 / 6 PASS** → attestation produced
- **5 / 6** → attestation refused
- *The public does not learn which test failed.*

**Notes:** Live at closed-book.vercel.app. A failed release does not become a proof.

## 5 · What the Compact circuit proves
**On slide:** five numbered gates.
- 01 Authorization — Registered evaluator
- 02 Model binding — Exact model build
- 03 Suite binding — Exact secret suite
- 04 Release predicate — Meets threshold
- 05 Release uniqueness — One per release

Bar: `private witness → five assertions → disclose( commitments only )`

Footer: Any assertion fails → no proof → no transaction → no record.

**Notes:** The compiler rejects any undeclared disclosure, so the privacy boundary is readable in the source.

## 6 · Real zero-knowledge evidence (ink slide)
**On slide**
- **6 / 6 PROVEN** — Real PLONK proof from the compiled attest circuit
- **5 / 6 REJECTED** (signal) — Constraint layer: Failed direct assertion. Proof server: HTTP 400. No proof.
- Toolchain: Compact 0.31.1 · compact-runtime 0.16.0
- Provers: official proof server 8.1.0 · official WASM prover
- Proving key: ~19.5 MB (19,485,981 bytes)
- Verifier key: 2,119 bytes
- Boxed: *Standalone proof generated. Network deployment not claimed.*

**Notes:** Source `proofs/evidence.json`. A threshold-5 control accepts the same witness, so the predicate is what refuses it.

## 7 · Trust boundary
**On slide:** What CLOSED BOOK proves, and what it does not.
- **Proves:** authorized evaluator · exact model commitment · exact suite commitment · private threshold satisfaction · evidence binding · release uniqueness.
- **Does not prove** (signal squares): LLM execution inside ZK · truthful measurements by the evaluator · suite quality · universal model safety.
- *The protocol makes a narrow claim — and proves that claim precisely.*

## 8 · Close (ink slide)
**On slide**
- Verification without disclosure.
- **For:** AI labs · independent safety evaluators · model governance teams · regulated AI releases.
- **Now:** real Compact circuit · real ZK proof · working DApp · reproducible tests + CI.
- **Next:** public Midnight deployment · multi-evaluator attestations · real evaluation pipelines.
- *Pass the test. Keep the test closed.*
- closed-book.vercel.app · github.com/BeBecpp/closed_book

## Upload to Google Slides
1. Upload the PPTX to Google Drive.
2. Open it with Google Slides.
3. Share → General access: *Anyone with the link* → *Viewer*.
4. Copy the link into the form.
