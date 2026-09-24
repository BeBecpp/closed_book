/**
 * Small signal on paper fails contrast (3.2:1), so small warnings on paper are
 * set in ink with a signal square. Signal text is reserved for ink panels and
 * large type. See BRAND.md §3.
 */
export function Flag({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-baseline gap-2 ${className}`}>
      <span aria-hidden="true" className="inline-block size-2 shrink-0 translate-y-[-0.05em] bg-signal" />
      {children}
    </span>
  );
}
