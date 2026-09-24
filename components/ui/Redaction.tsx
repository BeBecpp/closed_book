/**
 * Redaction bars. Lengths are fixed in markup (never random) and there is no
 * text underneath: the bar is the content. Screen readers hear "redacted".
 */
export function Bar({ w, className = "" }: { w: number; className?: string }) {
  return <span className={`redact ${className}`} style={{ width: `${w}ch` }} aria-hidden="true" />;
}

export function RedactedLines({
  lines,
  label = "Redacted",
  className = "",
}: {
  lines: number[][];
  label?: string;
  className?: string;
}) {
  return (
    <div className={className} role="img" aria-label={label}>
      {lines.map((segments, i) => (
        <div key={i} className="flex gap-[0.6ch] py-[0.28em]">
          {segments.map((w, j) => (
            <Bar key={j} w={w} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** The canonical three-line suite redaction from COPY.md. */
export const SUITE_REDACTION = [[20], [10, 9], [20]];
