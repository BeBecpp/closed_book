import Link from "next/link";
import { AttestationDemo } from "@/components/demo/AttestationDemo";
import { Bar } from "@/components/ui/Redaction";

const SEEN = [
  ["Model build commitment", "Binds the attestation to one exact build."],
  ["Evaluation-suite commitment", "Binds it to one exact suite, without revealing it."],
  ["Release predicate", "The public rule the private results had to satisfy."],
  ["Verdict", "PASS. A failing evaluation produces no record at all."],
  ["Attestation reference", "An id anyone can recompute from the public fields."],
] as const;

const CLOSED = [
  [9, "Secret prompts"],
  [7, "Raw outputs"],
  [11, "Exploit traces"],
  [6, "Individual failures"],
  [8, "Evaluator notes"],
] as const;

const STEPS = [
  ["01", "Evaluate", "A private red-team evaluation is performed against an exact model build."],
  ["02", "Commit", "The model build and the test suite are cryptographically bound, then published as commitments."],
  ["03", "Prove", "The private results are checked against the release predicate inside a Compact circuit."],
  ["04", "Verify", "The public receives the verdict without receiving the evidence."],
] as const;

function SectionHead({ code, label, children }: { code: string; label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-4 border-t border-ink pt-5 sm:grid-cols-12">
      <p className="t-label sm:col-span-3">
        <span className="text-graphite">{code}</span> — {label}
      </p>
      <h2 className="t-h2 sm:col-span-9 max-w-[22ch]">{children}</h2>
    </div>
  );
}

export default function Home() {
  return (
    <>
      {/* ---------------- COVER ---------------- */}
      <section className="mx-auto max-w-[1320px] px-4 sm:px-8" aria-labelledby="cover-title">
        <div className="flex items-baseline justify-between gap-4 pt-6 sm:pt-8">
          <p className="t-label">Closed Book</p>
          <p className="t-label text-graphite">Release attestation · Midnight</p>
        </div>

        <div className="grid gap-10 pb-16 pt-16 sm:pt-24 lg:grid-cols-12 lg:pb-24">
          <h1 id="cover-title" className="t-display lg:col-span-10">
            Pass the test.
            <br />
            <span className="italic">Keep the test closed.</span>
          </h1>

          <div className="lg:col-span-5 lg:col-start-1">
            <p className="max-w-[34ch] text-[1.1875rem] leading-[1.5]">
              Publish a verifiable safety verdict for an AI release without publishing the red-team suite behind it.
            </p>
            <div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-8">
              <Link href="/evaluate" className="t-label bg-ink px-5 py-4 text-paper hover:bg-graphite">
                Open the evaluation →
              </Link>
              <Link href="/protocol" className="t-label underline underline-offset-[6px] hover:decoration-2">
                Read the protocol
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5 lg:col-start-8 lg:self-end">
            <div className="border-t border-ink pt-4" role="img" aria-label="A redacted document: the evaluation stays closed">
              <div className="t-data space-y-2 text-ink">
                <p className="flex gap-[0.6ch]"><Bar w={14} /><Bar w={8} /><Bar w={11} /></p>
                <p className="flex gap-[0.6ch]"><Bar w={22} /><Bar w={6} /></p>
                <p className="flex gap-[0.6ch]"><Bar w={9} /><Bar w={17} /></p>
              </div>
            </div>
            <p className="t-label mt-4 text-graphite">The proof is public. The evidence isn&rsquo;t.</p>
          </div>
        </div>
      </section>

      {/* ---------------- DEMONSTRATION ---------------- */}
      <section id="demonstration" aria-labelledby="demo-title" className="mx-auto max-w-[1320px] px-4 sm:px-8">
        <div className="grid gap-4 border-t border-ink pt-5 sm:grid-cols-12">
          <p className="t-label sm:col-span-3">
            <span className="text-graphite">§ 01</span> — Demonstration
          </p>
          <div className="sm:col-span-9">
            <h2 id="demo-title" className="t-h2 max-w-[22ch]">One evaluation. Two readers.</h2>
            <p className="mt-3 max-w-[58ch] text-graphite">
              The evaluator holds the left side. The world receives the right. Fail a check and try again: the
              attestation is refused, and the public side still learns nothing about why.
            </p>
          </div>
        </div>
        <div className="mt-10">
          <AttestationDemo />
        </div>
      </section>

      {/* ---------------- BOUNDARY ---------------- */}
      <section aria-label="Public and private boundary" className="mx-auto mt-28 max-w-[1320px] px-4 sm:px-8">
        <SectionHead code="§ 02" label="Boundary">
          What crosses the spine, and what never does.
        </SectionHead>
        <div className="mt-10 grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <h3 className="t-label border-b border-ink pb-3">What the world sees</h3>
            <dl>
              {SEEN.map(([term, def]) => (
                <div key={term} className="grid gap-1 border-b border-line py-4 sm:grid-cols-[15rem_1fr] sm:gap-6">
                  <dt className="font-medium">{term}</dt>
                  <dd className="text-graphite">{def}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div>
            <h3 className="t-label border-b border-ink pb-3">What stays closed</h3>
            <ul>
              {CLOSED.map(([w, item]) => (
                <li key={item} className="flex items-baseline gap-5 border-b border-line py-4">
                  <span className="t-data w-[12ch] shrink-0" aria-hidden="true"><Bar w={w} /></span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 max-w-[46ch] text-graphite">
              None of it is hashed onto the ledger in the clear. Salts keep the commitments from being guessed.
            </p>
          </div>
        </div>
      </section>

      {/* ---------------- HOW IT WORKS ---------------- */}
      <section aria-label="How it works" className="mx-auto mt-28 max-w-[1320px] px-4 sm:px-8">
        <SectionHead code="§ 03" label="Method">
          Four steps. One of them is public.
        </SectionHead>
        <ol className="mt-10 grid border-t border-ink sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(([n, title, body], i) => (
            <li
              key={n}
              className={`border-b border-line py-6 sm:px-6 lg:border-b-0 ${i > 0 ? "lg:border-l" : ""} ${i % 2 === 1 ? "sm:border-l lg:border-l" : ""} sm:first:pl-0 lg:first:pl-0`}
            >
              <p className="font-mono text-[0.8125rem] text-graphite">{n}</p>
              <h3 className="t-label mt-6">{title}</h3>
              <p className="mt-3 max-w-[30ch]">{body}</p>
            </li>
          ))}
        </ol>
        <div className="mt-16 grid gap-6 border-t border-ink pt-6 sm:grid-cols-12">
          <p className="t-h2 sm:col-span-7 max-w-[20ch]">A failed release does not become a proof.</p>
          <p className="text-graphite sm:col-span-5">
            The Compact circuit asserts the release predicate. If a single required check fails, the assertion fails, no
            proof can be produced, and nothing reaches the ledger.{" "}
            <Link href="/protocol#proves" className="text-ink underline underline-offset-4">
              What CLOSED BOOK proves, and what it does not →
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
