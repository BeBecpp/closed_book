import { shortHex } from "@/src/lib/commitments/bytes";

/** Truncated hash with the full value available to assistive tech and on hover. */
export function Hash({ value, full = false, className = "" }: { value: string; full?: boolean; className?: string }) {
  if (!value) return <span className={`t-data text-graphite ${className}`}>—</span>;
  return (
    <span className={`t-data break-all ${className}`} title={value}>
      {full ? value : <><span aria-hidden="true">{shortHex(value)}</span><span className="sr-only">{value}</span></>}
    </span>
  );
}
