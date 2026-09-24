import Link from "next/link";
import { Bar } from "@/components/ui/Redaction";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-[1320px] px-4 pb-8 pt-16 sm:px-8 sm:pt-24">
      <p className="t-label text-graphite">404</p>
      <h1 className="t-h1 mt-3 max-w-[16ch]">This page is not in the book.</h1>
      <div className="t-data mt-10 space-y-2" aria-hidden="true">
        <p className="flex gap-[0.6ch]"><Bar w={16} /><Bar w={9} /></p>
        <p className="flex gap-[0.6ch]"><Bar w={24} /></p>
      </div>
      <p className="mt-10 flex flex-wrap gap-8">
        <Link href="/" className="t-label underline underline-offset-4">Home</Link>
        <Link href="/evaluate" className="t-label underline underline-offset-4">Evaluator console</Link>
        <Link href="/protocol" className="t-label underline underline-offset-4">Protocol</Link>
      </p>
    </div>
  );
}
