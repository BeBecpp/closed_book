import Link from "next/link";
import { Mark } from "@/components/brand/Mark";
import { SITE } from "@/src/lib/site/config";

export function Footer() {
  return (
    <footer className="no-print mt-24 bg-ink text-paper">
      <div className="mx-auto max-w-[1320px] px-4 py-16 sm:px-8">
        <p className="t-h1 max-w-[16ch]">
          The proof is public.
          <br />
          <span className="text-graphite">The evidence isn&rsquo;t.</span>
        </p>
        <div className="mt-16 grid gap-8 border-t border-graphite pt-6 sm:grid-cols-12">
          <div className="flex items-center gap-3 sm:col-span-4">
            <Mark size={20} />
            <span className="text-[0.8125rem] font-semibold tracking-[0.14em]">CLOSED BOOK</span>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-8 gap-y-3 sm:col-span-5">
            <Link className="t-label hover:underline underline-offset-4" href="/evaluate">Evaluate</Link>
            <Link className="t-label hover:underline underline-offset-4" href="/protocol">Protocol</Link>
            <a className="t-label hover:underline underline-offset-4" href={SITE.repository} rel="noreferrer">Source</a>
          </nav>
          <p className="t-label text-graphite sm:col-span-3 sm:text-right">Built on Midnight · Compact 0.31.1</p>
        </div>
      </div>
    </footer>
  );
}
