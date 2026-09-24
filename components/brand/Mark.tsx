/**
 * The CLOSED BOOK mark: a solid cover (private), a spine (the binding), an
 * outlined cover (public). 16-unit grid; see BRAND.md §2.
 */
export function Mark({ size = 24, className = "", title }: { size?: number; className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      shapeRendering="crispEdges"
    >
      <rect x="1" y="3" width="5" height="10" fill="currentColor" />
      <rect x="7" y="1" width="2" height="14" fill="currentColor" />
      <rect x="10.5" y="3.5" width="4" height="9" fill="none" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}
