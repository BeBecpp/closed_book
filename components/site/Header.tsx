"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mark } from "@/components/brand/Mark";
import { SITE } from "@/src/lib/site/config";

const linkClass = "t-label py-2 underline-offset-[6px] decoration-1 hover:underline";

export function Header() {
  const path = usePathname();
  const current = (href: string) => (path === href ? "page" : undefined);

  return (
    <header className="no-print border-b border-ink">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-ink focus:px-3 focus:py-2 focus:text-paper t-label"
      >
        Skip to content
      </a>
      <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-4 px-4 py-3 sm:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="CLOSED BOOK — home">
          <Mark size={24} />
          <span className="font-sans text-[0.8125rem] font-semibold tracking-[0.14em]">CLOSED BOOK</span>
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-5 sm:gap-8">
          <Link href="/protocol" aria-current={current("/protocol")} className={`${linkClass} hidden sm:inline aria-[current=page]:underline`}>
            Protocol
          </Link>
          <a href={SITE.repository} className={`${linkClass} hidden sm:inline`} rel="noreferrer">
            GitHub
          </a>
          <Link
            href="/evaluate"
            aria-current={current("/evaluate")}
            className="t-label bg-ink px-3 py-2 text-paper hover:bg-graphite"
          >
            <span className="hidden sm:inline">Open evaluation →</span>
            <span className="sm:hidden">Evaluate →</span>
          </Link>
        </nav>
      </div>
      <nav aria-label="Secondary" className="flex gap-6 border-t border-line px-4 py-1 sm:hidden">
        <Link href="/protocol" aria-current={current("/protocol")} className={`${linkClass} aria-[current=page]:underline`}>
          Protocol
        </Link>
        <a href={SITE.repository} className={linkClass} rel="noreferrer">
          GitHub
        </a>
      </nav>
    </header>
  );
}
