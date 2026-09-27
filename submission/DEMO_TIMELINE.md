# CLOSED BOOK — demo video timeline

Target 2:34 of narration plus a 4-second end card, about **2:38 total**. Hard
limit 2:55. Narration source: `VOICEOVER_ELEVENLABS.txt` (327 words, about 135
words per minute with pauses).

**Record the screen first, silently, following this timeline. Add the
ElevenLabs audio afterwards.** Timings assume the generated audio matches the
estimates; after generating it, check each paragraph's real start time in the
audio and nudge the cuts.

**Tabs to preload, in this order:**
1. https://closed-book.vercel.app/
2. https://closed-book.vercel.app/protocol#attestation
3. https://github.com/BeBecpp/closed_book/blob/main/contract/src/closed-book.compact
4. https://github.com/BeBecpp/closed_book/blob/main/proofs/evidence.json
5. https://github.com/BeBecpp/closed_book#network-status

**Before recording:** in tab 1, open DevTools → Application → Local Storage and
clear `closedbook.demo.registry.v2` (or use a fresh browser profile). Otherwise
a pass from an earlier run shows "one attestation per release" instead of a
fresh attestation.

---

### 00:00.0 – 00:12.0 · Identity / hook
- **Screen:** tab 1, the cover — "Pass the test. Keep the test closed." — at the top of the page.
- **Cursor:** still for the first 2 s, then rest in empty paper space on the right.
- **Voice (P1):** "This is CLOSED BOOK, built for Midnight Korea Hackathon 2026. It proves that an AI release passed a confidential safety evaluation, without publishing the evaluation itself."

### 00:12.0 – 00:28.0 · Problem
- **Screen:** stay on the cover. At 00:18, scroll slowly (about 2 s) until the redaction block and "The proof is public. The evidence isn't." sit mid-screen. At 00:25, scroll to "§ 01 — Demonstration" and stop with the two panels fully visible.
- **Cursor:** hover over the redaction bars at 00:20.
- **Voice (P2):** "AI red-team suites contain secret prompts, working exploits, and model outputs. Publish them, and the test is burned. Keep them secret, and nobody outside can verify the safety claim. CLOSED BOOK is a third option."

### 00:28.0 – 00:55.0 · Success
- **Screen:** both panels visible: ink on the left, paper on the right.
- **00:28:** move the cursor down the six PASS values on the left.
- **00:36:** click **Generate attestation →**. The assertion log runs; the right panel fills.
- **00:41:** move the cursor to the right panel: Model build → Suite commitment → Predicate → **PASS · Demo · simulated**.
- **00:50:** hover over "Private plaintext in record · 0 bytes found".
- **Voice (P3):** "On the left is the private evaluation. The evaluator holds it. Six confidential checks, all passing. I generate an attestation. On the right is what the public receives: a commitment to the exact model build, a commitment to the exact test suite, the release rule, and a pass. Not the suite. Not the outputs. Not the individual results."

### 00:55.0 – 01:18.0 · Refusal (hero moment)
- **00:55:** click **Secret exfiltration**. It turns FAIL in orange; the release condition reads **5 / 6** in orange.
- **01:00:** click **Generate attestation →**.
- **01:03:** the right panel shows **Attestation refused**. Keep the cursor still.
- **01:08:** move slowly over "Which check failed · Not disclosed", "Prompt / output · Not disclosed", "Public record · None written".
- **01:14:** hold still until 01:18.
- **Voice (P4):** "Now one private check fails. Secret exfiltration. Five out of six. I try again. The attestation is refused. And look at what the public learns. Not which test failed. Not which prompt was used. Not what the model said. A failed release does not become a proof."

### 01:18.0 – 01:44.0 · Midnight / Compact
- **01:18:** switch to tab 2 (Protocol → Attestation). The architecture diagram is visible: private evaluator → Midnight · Compact → public attestation.
- **01:26:** scroll slowly to the `attest` code block. Pause on the five `assert` lines.
- **01:36:** switch to tab 3 (the GitHub contract) and scroll to `export circuit attest`. Hold.
- **Voice (P5):** "This rule lives in a Compact contract on Midnight. The attest circuit takes the private results as a witness, and asserts five things. The evaluator is authorized. The model is the committed build. The suite is the committed suite. The private results meet the threshold. And this release has not been attested before. Only commitments are disclosed."

### 01:44.0 – 02:04.0 · Real ZK evidence
- **01:44:** switch to tab 4 (`proofs/evidence.json`).
- **01:48:** scroll to `"success"`: show the `wasm` and `server` blocks (bytes, sha256).
- **01:55:** scroll to `"negative"`: show `"Failed direct assertion"` and `"status": 400`.
- **02:00:** hold on `controlThreshold5`.
- **Voice (P6):** "This is not only a browser simulation. The compiled circuit produced a real zero-knowledge proof, with Midnight's official proof server and its WASM prover. When the witness is changed to five out of six, the constraint system itself rejects it. No proof exists."

### 02:04.0 – 02:22.0 · Technical honesty
- **02:04:** switch to tab 5 (README → Network status). Keep "**Not claimed**" / "not deployed" visible.
- **02:14:** scroll up slightly to the status table so the "Network deployment · Not claimed" row is on screen.
- **Voice (P7):** "The Preprod deployment scripts and the network verifier are implemented. I do not claim an on-chain deployment yet, because the test wallet still needs the faucet step. Demo, local circuit, and network verification stay separate trust states, by design."

### 02:22.0 – 02:34.0 · Close
- **02:22:** switch back to tab 1 and scroll to the top (cover). Cursor still.
- **Voice (P8):** "CLOSED BOOK turns a private evaluation into a verifiable release claim, without burning the evidence. The proof is public. The evidence isn't."

### 02:34.0 – 02:38.0 · End card (optional, no voice)
- A plain ink card: **CLOSED BOOK** / *Pass the test. Keep the test closed.* / closed-book.vercel.app.

---

**Do not show:**
- any terminal holding `.midnight/secrets.*`;
- the `.midnight` folder;
- GitHub settings pages;
- any live proof generation (it takes 90–300 s; the committed evidence is the demo).
