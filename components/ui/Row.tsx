/** A labelled record line: `LABEL ........ value`. Status is a record, not a badge. */
export function Row({
  label,
  children,
  tone = "paper",
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  tone?: "paper" | "ink";
  className?: string;
}) {
  const rule = tone === "ink" ? "border-paper/15" : "border-line";
  const labelColor = tone === "ink" ? "text-paper/60" : "text-graphite";
  return (
    <div className={`grid grid-cols-[minmax(0,11rem)_minmax(0,1fr)] items-baseline gap-4 border-t ${rule} py-3 ${className}`}>
      <dt className={`t-label ${labelColor}`}>{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}
