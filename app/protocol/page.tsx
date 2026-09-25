import type { Metadata } from "next";
import Link from "next/link";
import { ArchitectureDiagram } from "@/components/diagrams/ArchitectureDiagram";
import { Bar } from "@/components/ui/Redaction";
import { SITE } from "@/src/lib/site/config";
import { Flag } from "@/components/ui/Flag";

export const metadata: Metadata = {
  title: "Protocol",
  description: "How CLOSED BOOK binds a private evaluation to a public release verdict, and what it does not prove.",
};

const TOC = [
  ["problem", "Problem"],
  ["threat-model", "Threat model"],
  ["public-data", "Public data"],
  ["private-data", "Private data"],
  ["commitments", "Commitments"],
  ["predicate", "Release predicate"],
  ["attestation", "Attestation"],
  ["verification", "Verification"],
  ["proves", "What CLOSED BOOK proves"],
  ["does-not-prove", "What it does not prove"],
  ["status", "Implementation status"],
] as const;

function H({ id, n, children }: { id: string; n: number; children: React.ReactNode }) {
  return (
    <div className="border-t border-ink pt-5">
      <p className="t-label text-graphite">§ {String(n).padStart(2, "0")}</p>
      <h2 id={id} className="t-h2 mt-2 scroll-mt-8">
        {children}
      </h2>
    </div>
  );
}

function Formula({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-line py-3 md:grid-cols-[12rem_minmax(0,1fr)] md:gap-6">
      <dt className="t-data font-semibold">{name}</dt>
      <dd className="t-data break-words text-graphite">{children}</dd>
    </div>
  );
}

const THREATS = [
  ["Evaluator dishonesty", "Not prevented. The evaluator is trusted for the truth of the results. The evaluator key makes every attestation attributable, and the evidence commitment lets an auditor later check the private record against what was attested."],
  ["Model-version mismatch", "Prevented. The circuit asserts the private model digest opens the public model commitment. An attestation for build A cannot be presented as one for build B."],
  ["Suite-version mismatch", "Prevented. The suite digest and salt must open the published suite commitment. Editing the suite after publication breaks the binding."],
  ["Tampered result", "Detected. Results are bound into the evidence commitment. A different result set does not open it."],
  ["Replay", "Prevented per release. The circuit allows one attestation per (model, suite, predicate), keyed in the ledger's releases map; a fresh evidence salt changes the id but not the release, and is refused. A newly committed suite is a new release."],
  ["Disclosure", "Minimised. Only values wrapped in disclose() reach the ledger: commitments, predicate, evaluator key and id. Salts stop low-entropy data from being brute-forced from commitments."],
  ["Fake frontend verification", "Addressed by receipt states. Recomputing hashes earns only CLAIMED PASS, because anyone can build a self-consistent record. DEMO PASS and LOCAL CIRCUIT ATTESTED require the record's own issuer to hold it field for field; NETWORK VERIFIED requires the deployed contract to hold the record field for field, which needs a deployment (not done yet)."],
] as const;

export default function ProtocolPage() {
  return (
    <div className="mx-auto max-w-[1320px] px-4 sm:px-8">
      <header className="grid gap-6 pb-12 pt-10 sm:pt-16 lg:grid-cols-12">
        <p className="t-label lg:col-span-3">
          <span className="text-graphite">Document</span> — Protocol v1
        </p>
        <div className="lg:col-span-9">
          <h1 className="t-h1 max-w-[16ch]">Verification without disclosure.</h1>
          <p className="mt-5 max-w-[60ch] text-[1.125rem] leading-[1.55]">
            CLOSED BOOK checks a committed, private evaluation result against a public release predicate, bound to an
            exact model-build commitment and an exact evaluation-suite commitment. It proves the release condition. It
            does not reveal the evaluation, and it does not run the model inside a circuit.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-12">
        <nav aria-label="Contents" className="lg:col-span-3">
          <ol className="lg:sticky lg:top-8">
            {TOC.map(([id, label], i) => (
              <li key={id} className="border-t border-line py-2 first:border-ink">
                <a href={`#${id}`} className="flex gap-3 text-[0.9375rem] hover:underline underline-offset-4">
                  <span className="t-data w-6 text-graphite">{String(i + 1).padStart(2, "0")}</span>
                  {label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <article className="min-w-0 space-y-20 lg:col-span-9 [&_p]:max-w-[66ch]">
          <section>
            <H id="problem" n={1}>Problem</H>
            <p className="mt-5">
              A safety claim about an AI release is only as good as the evaluation behind it. Publishing a red-team suite
              burns it: prompts leak into training data, get patched individually and stop measuring anything, and
              exploit traces become working material for attackers. Keeping the suite secret leaves the public trusting
              the press release.
            </p>
            <p className="mt-4">
              CLOSED BOOK gives a third option: publish a verdict that is cryptographically bound to the exact build and
              the exact suite, and keep the evidence closed.
            </p>
          </section>

          <section>
            <H id="threat-model" n={2}>Threat model</H>
            <dl className="mt-6">
              {THREATS.map(([t, d]) => (
                <div key={t} className="grid gap-1 border-b border-line py-4 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-6">
                  <dt className="font-medium">{t}</dt>
                  <dd className="text-graphite">{d}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-[0.9375rem] text-graphite">
              Full analysis:{" "}
              <a className="text-ink underline underline-offset-4" href={`${SITE.repository}/blob/main/docs/THREAT-MODEL.md`} rel="noreferrer">
                docs/THREAT-MODEL.md
              </a>
            </p>
          </section>

          <section aria-labelledby="public-data">
            <H id="public-data" n={3}>Public data</H>
            <div className="mt-6 grid md:grid-cols-[minmax(0,1fr)_10px_minmax(0,1fr)]">
              <div className="border border-ink p-5">
                <p className="t-label">Public · on the ledger</p>
                <ul className="t-data mt-4 space-y-2">
                  <li>model commitment</li>
                  <li>suite commitment</li>
                  <li>predicate id + threshold</li>
                  <li>evidence commitment</li>
                  <li>evaluator public key</li>
                  <li>attestation id</li>
                  <li>release key</li>
                </ul>
              </div>
              <div className="my-2 h-[6px] bg-ink md:mx-auto md:my-0 md:h-auto md:w-[6px]" aria-hidden="true" />
              <div className="bg-ink p-5 text-paper">
                <p className="t-label">Private · witness only</p>
                <ul className="t-data mt-4 space-y-2 text-paper/35">
                  {[16, 12, 18, 10, 14, 9].map((w, i) => (
                    <li key={i} aria-hidden="true"><Bar w={w} /></li>
                  ))}
                </ul>
                <p className="sr-only">Private values are redacted.</p>
              </div>
            </div>
            <p className="mt-5">
              The verdict is implied by the existence of a record: the circuit can only produce PASS. There is no public
              FAIL record, because a published failure leaks information about the suite and invites targeted probing.
            </p>
          </section>

          <section>
            <H id="private-data" n={4}>Private data</H>
            <ul className="mt-6">
              {[
                ["Sealed test cases", "The red-team prompts and scenarios."],
                ["Model outputs and exploit traces", "What the model did under test."],
                ["Individual check results", "Six booleans, supplied as a witness, never disclosed."],
                ["Evaluator notes", "Never hashed, never committed."],
                ["Salts and evaluator secret", "Witness inputs that make commitments hiding and attestations attributable."],
                ["Unpublished thresholds", "Where a policy keeps internal limits private, they stay inside the evaluation."],
              ].map(([k, v]) => (
                <li key={k} className="grid gap-1 border-b border-line py-3 md:grid-cols-[18rem_minmax(0,1fr)] md:gap-6">
                  <span className="font-medium">{k}</span>
                  <span className="text-graphite">{v}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <H id="commitments" n={5}>Commitments</H>
            <p className="mt-5">
              H is Compact&rsquo;s <code className="t-data">persistentHash</code> over a vector of 32-byte words, which is
              SHA-256 of their concatenation. Every domain tag is <code className="t-data">pad(32, …)</code>. The
              TypeScript library in <code className="t-data">src/lib/commitments</code> reproduces each value byte for
              byte; the test suite checks it against the compiled contract.
            </p>
            <dl className="mt-6 border-t border-ink">
              <Formula name="evaluatorKey">H(&quot;closedbook:evaluator:v1&quot;, secret)</Formula>
              <Formula name="modelCommitment">H(&quot;closedbook:model:v1&quot;, SHA-256(canonical(model manifest)))</Formula>
              <Formula name="suiteCommitment">H(&quot;closedbook:suite:v1&quot;, SHA-256(canonical(suite manifest)), suiteSalt)</Formula>
              <Formula name="evidenceCommitment">H(&quot;closedbook:evidence:v1&quot;, model, suite, predicate, pack(results), evidenceSalt)</Formula>
              <Formula name="attestationId">H(&quot;closedbook:attestation:v1&quot;, model, suite, predicate, evidence)</Formula>
              <Formula name="releaseKey">H(&quot;closedbook:release:v1&quot;, model, suite, predicate)</Formula>
            </dl>
            <p className="mt-4 text-[0.9375rem] text-graphite">
              pack(results) sets bit i when check i passed, little-endian in one 32-byte word. Salts are 32 random bytes.
              A fresh evidence salt is drawn for every attestation.
            </p>
          </section>

          <section>
            <H id="predicate" n={6}>Release predicate</H>
            <p className="mt-5">
              The predicate is public and fixed when the contract is deployed: an identifier and a threshold in the
              ledger. <strong className="font-semibold">Safety Baseline 1</strong> requires all six checks to pass —
              prompt injection, secret exfiltration, PII leakage, tool abuse, policy bypass and unsafe escalation.
            </p>
            <pre className="t-data mt-6 overflow-x-auto border-l-2 border-ink bg-ink/[0.04] p-4">{`export ledger predicate: Bytes<32>;   // pad(32, "safety-baseline:1")
export ledger threshold: Uint<8>;     // 6

assert(countPasses(results) >= threshold, "release predicate not satisfied");`}</pre>
          </section>

          <section>
            <H id="attestation" n={7}>Attestation</H>
            <p className="mt-5">
              The evaluator calls one circuit, <code className="t-data">attest(model, suite)</code>. Private inputs come
              from witnesses. The circuit asserts five things, then records the attestation. If any assertion fails, no
              proof can be generated and nothing is recorded.
            </p>
            <ArchitectureDiagram />
            <pre className="t-data overflow-x-auto border-l-2 border-ink bg-ink/[0.04] p-4">{`export circuit attest(model: Bytes<32>, suite: Bytes<32>): Bytes<32> {
  const signer = deriveEvaluatorKey(evaluatorSecret());
  assert(signer == evaluator, "not the registered evaluator");
  assert(commitModel(modelDigest()) == model, "model commitment mismatch");
  assert(commitSuite(suiteDigest(), suiteSalt()) == suite, "suite commitment mismatch");

  const results = checkResults();
  assert(countPasses(results) >= threshold, "release predicate not satisfied");

  const release = deriveReleaseKey(model, suite, predicate);
  assert(!releases.member(disclose(release)), "release already attested");

  const evidence = commitEvidence(model, suite, predicate, packResults(results), evidenceSalt());
  const id = deriveAttestationId(model, suite, predicate, evidence);

  releases.insert(disclose(release), disclose(id));
  attestations.insert(disclose(id), disclose(Attestation { ... }));
  attestationCount.increment(1);
  return disclose(id);
}`}</pre>
            <p className="mt-4 text-[0.9375rem] text-graphite">
              Every <code className="t-data">disclose()</code> in the contract is a deliberate, reviewable disclosure.
              The compiler refuses to put witness-derived data on the ledger without one.{" "}
              <a className="text-ink underline underline-offset-4" href={`${SITE.repository}/blob/main/contract/src/closed-book.compact`} rel="noreferrer">
                Full contract source
              </a>
            </p>
          </section>

          <section>
            <H id="verification" n={8}>Verification</H>
            <ol className="mt-6">
              {[
                ["Find the record", "Look up the attestation id on the contract ledger (or open a receipt link, which carries the public record)."],
                ["Recompute the id", "Hash the public fields. A match means the record is self-consistent — nothing more. Anyone can build a self-consistent record, so this alone never makes a verdict verified."],
                ["Check the bindings", "Compare the model commitment with the one the developer published for the release, and the suite commitment with the evaluator's published suite commitment."],
                ["Check the key", "Confirm the evaluator key is the independent evaluator you expected."],
                ["Check the proof", "On a Midnight network, the transaction's zero-knowledge proof is verified by the network when it is accepted. The demo and local modes do not produce one, and say so."],
              ].map(([k, v], i) => (
                <li key={k} className="grid grid-cols-[2.5rem_minmax(0,1fr)] border-b border-line py-4">
                  <span className="t-data text-graphite">{String(i + 1).padStart(2, "0")}</span>
                  <span>
                    <span className="font-medium">{k}.</span> <span className="text-graphite">{v}</span>
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-5">
              Auditors can go one step further. Given the private opening — the six results and the evidence salt —
              anyone can check it against the public evidence commitment. A tampered result set does not open it.
            </p>
          </section>

          <section>
            <H id="proves" n={9}>What CLOSED BOOK proves</H>
            <ul className="mt-6 space-y-3">
              {[
                "The holder of the registered evaluator key produced this attestation.",
                "They knew a model digest that opens the public model-build commitment.",
                "They knew a suite digest and salt that open the public suite commitment.",
                "They held six check results, committed in the evidence commitment, that satisfy the public release predicate.",
                "No attestation existed yet for this release: this model build, this suite, this predicate.",
              ].map((t) => (
                <li key={t} className="flex gap-4 border-b border-line pb-3">
                  <span aria-hidden="true" className="mt-2 inline-block size-2 shrink-0 bg-ink" />
                  {t}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <H id="does-not-prove" n={10}>What it does not prove</H>
            <ul className="mt-6 space-y-3">
              {[
                "That the model was executed, or executed correctly. The model never runs inside a circuit.",
                "That the evaluation was actually performed, or that the results are true. The evaluator is trusted for its inputs.",
                "That the suite is good, complete, current or representative of real-world risk.",
                "That the build deployed in production is the build that was evaluated. That needs a separate deployment attestation.",
                "That a model is safe. It proves a stated release condition was met on a stated suite.",
              ].map((t) => (
                <li key={t} className="flex gap-4 border-b border-line pb-3">
                  <span aria-hidden="true" className="mt-2 inline-block size-2 shrink-0 bg-signal" />
                  {t}
                </li>
              ))}
            </ul>
            <p className="t-h2 mt-10 max-w-[24ch]">Trust the attestation, not the press release — and know exactly what the attestation says.</p>
          </section>

          <section>
            <H id="status" n={11}>Implementation status</H>
            <table className="mt-6 w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-ink">
                  <th scope="col" className="t-label py-2 pr-4 font-medium text-graphite">Mode</th>
                  <th scope="col" className="t-label py-2 pr-4 font-medium text-graphite">What runs</th>
                  <th scope="col" className="t-label py-2 font-medium text-graphite">Status</th>
                </tr>
              </thead>
              <tbody className="align-top">
                <tr className="border-b border-line">
                  <td className="t-data py-3 pr-4">DEMO ADAPTER</td>
                  <td className="py-3 pr-4 text-graphite">TypeScript mirror of the circuit, in the browser. Real commitments, no proof.</td>
                  <td className="t-label py-3">Working</td>
                </tr>
                <tr className="border-b border-line">
                  <td className="t-data py-3 pr-4">MIDNIGHT · LOCAL CIRCUIT</td>
                  <td className="py-3 pr-4 text-graphite">The compiled Compact contract (0.31.1) executed via compact-runtime 0.16.0 on the evaluator&rsquo;s machine. No proof.</td>
                  <td className="t-label py-3">Working locally</td>
                </tr>
                <tr className="border-b border-line">
                  <td className="t-data py-3 pr-4">ZK PROOF (OFFLINE)</td>
                  <td className="py-3 pr-4 text-graphite">Real proof of one <code className="t-data">attest</code> call from the compiled circuit: proving keys from CI, official proof server 8.1.0 and WASM prover. 5/6 cannot be proven. Not bound to a transaction.</td>
                  <td className="t-label py-3">Generated</td>
                </tr>
                <tr className="border-b border-line">
                  <td className="t-data py-3 pr-4">MIDNIGHT · NETWORK</td>
                  <td className="py-3 pr-4 text-graphite">Proven transaction on a Midnight network via proof server and wallet. Scripts and the receipt verifier exist; deployment waits on a funded wallet.</td>
                  <td className="t-label py-3"><Flag>Not deployed</Flag></td>
                </tr>
              </tbody>
            </table>
            <p className="mt-6">
              <Link href="/evaluate" className="t-label bg-ink px-5 py-4 text-paper hover:bg-graphite inline-block">
                Open the evaluation →
              </Link>
            </p>
          </section>
        </article>
      </div>
    </div>
  );
}
