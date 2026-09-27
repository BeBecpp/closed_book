# CLOSED BOOK — 90-second review

**Live demo:** <https://closed-book.vercel.app/>
**Repository:** <https://github.com/BeBecpp/closed_book>

CLOSED BOOK lets an evaluator prove that an exact AI model build passed a
confidential safety evaluation, without revealing the test suite, outputs,
exploit traces or individual results.

1. **Generate a 6/6 attestation.** On the live demo, press *Generate attestation →*. The public side receives commitments and a PASS (stamped *Demo · simulated*).
2. **Fail one private check.** Click *Secret exfiltration*, then generate again.
3. **Observe the refusal.** *Attestation refused.* The public learns nothing about which check failed, the prompt, or the output.
4. **Inspect the contract:** [`contract/src/closed-book.compact`](../contract/src/closed-book.compact). The `attest` circuit has five assertions: evaluator, model binding, suite binding, release predicate, release uniqueness. Only commitments are disclosed.
5. **Inspect the ZK evidence:** [`proofs/evidence.json`](../proofs/evidence.json). It records a real 6/6 proof and three refusals of the 5/6 case.
6. **Reproduce:**

   ```bash
   git clone https://github.com/BeBecpp/closed_book.git && cd closed_book
   npm ci && npm run verify && npm run contract:demo
   ```

## What is real
- **Contract:** a Compact contract (toolchain 0.31.1), compiled and committed. Its circuit logic is executed by 77 automated tests, by `npm run contract:demo` and by the web app's local-circuit mode.
- **Proofs:** proving keys generated with the official toolchain. A real PLONK proof of the 6/6 case from the compiled `attest` circuit, by Midnight's official proof server 8.1.0 and by the official WASM prover.
- **Negative case:** the 5/6 case is rejected by the ZK constraint system itself ("Failed direct assertion"; the proof server returns HTTP 400). A threshold-5 control shows the predicate is what refuses it.
- **CI:** green on every push.

## What is not claimed
- **No Midnight deployment:** there is no Preprod contract address, no transaction and no on-chain attestation. Deploy, attest and verify scripts, a live-tested indexer reader and a network verifier exist, but funding the test wallet needs the faucet's captcha.
- **Proofs are standalone:** the ZK proofs are not bound to a transaction.
- **Scope of the claim:** the evaluator is trusted for the truth of its measurements. The model is not executed in zero knowledge.
