# Demo script

Three minutes. Every step below is real behaviour of this repository.

## Setup

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## 1. The cover (10 s)

> "Pass the test. Keep the test closed."

AI labs make safety claims. Publishing the red-team suite burns it. Keeping it
secret means trusting the press release. CLOSED BOOK publishes a verifiable
verdict and keeps the evidence closed.

## 2. The pass (40 s)

Scroll to **§ 01 — Demonstration**.

- Left, on ink: the **private evaluation**. Build `CB-DEMO-04`, a redacted
  suite, six checks, `6 / 6`.
- Click **Generate attestation →**. The assertion log runs: evaluator key,
  model binding, suite binding, release predicate, record.
- Right, on paper: the **public attestation**. Model and suite commitments,
  `Safety Baseline 1`, **PASS**, `0 bytes` disclosed, and the source label
  **DEMO ADAPTER**.

Say: the demo adapter uses the same byte encoding and the same five
assertions as the Compact contract — the tests prove they agree — but it is
not a zero-knowledge proof, and the page says so.

## 3. The refusal (40 s)

- Click **Secret exfiltration** → it turns to **FAIL**. Private status: `5 / 6`.
- Generate again.
- Public side: **Attestation refused.** *The private evaluation does not
  satisfy the release policy. No private evaluation data was disclosed.*
  Which check failed: *Not disclosed.* Prompt / output: *Not disclosed.*

Say: a failed release does not become a proof. On Midnight, the assertion
fails inside the circuit, so no proof can exist and nothing reaches the
ledger.

## 4. The real circuit (50 s)

Open **/evaluate** (running locally).

- § 7: choose **MIDNIGHT · LOCAL CIRCUIT**. This runs the compiled Compact
  contract (toolchain 0.31.1, runtime 0.16.0) on this machine.
- § 9: **Generate attestation →**. Record source: `MIDNIGHT · LOCAL CIRCUIT`.
- § 3: click **Edit the sealed suite after publication**. The suite
  commitment turns **Diverged**. Generate: *not bound to the published suite
  commitment*.
- § 6: choose **Unregistered key**. Generate: refused.

Optional terminal proof:

```bash
npm run contract:demo
```

prints a transcript of the compiled contract accepting the passing evaluation
and refusing: a failed check, a wrong model, an edited suite, an unregistered
key, and a replay.

## 5. The receipt (30 s)

Click **Open the public receipt →**.

- `CB-XXXXXX`, model build, evaluation suite, predicate, **PASS**, proof line
  stating exactly what happened, `0 bytes` disclosed.
- **Checks run in this browser**: id recomputed from the public fields —
  Match. For local-circuit records, the record is looked up on the local
  contract ledger.
- **Print receipt**, **Copy attestation id**, **Copy model commitment**.

## 6. Close (10 s)

Open **/protocol → What it does not prove**. CLOSED BOOK proves a stated
release condition over a committed suite, bound to an exact build and an
accountable evaluator. It does not prove a model is safe.

> The proof is public. The evidence isn't.

## Honest status line for judges

- DEMO adapter: working, in browser.
- Compact contract: compiles with 0.31.1; executed by tests, CLI and the web
  console via compact-runtime.
- Zero-knowledge proofs and Midnight network deployment: **not done**. See
  `docs/ARCHITECTURE.md → Path to a Midnight network deployment`.
