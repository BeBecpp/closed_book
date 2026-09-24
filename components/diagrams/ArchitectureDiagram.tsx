/**
 * Architecture diagram, drawn in SVG with the brand tokens. Two layouts:
 * horizontal (md and up) and vertical (phones), so text never shrinks below
 * a readable size.
 */

const MONO = { fontFamily: "var(--font-mono)" } as const;
const SANS = { fontFamily: "var(--font-sans)" } as const;

const PRIVATE_ITEMS = ["private tests", "private outputs", "private results", "evaluator notes", "salts · secret key"];
const ASSERTS = ["evaluator key", "model binding", "suite binding", "passes ≥ threshold", "release not yet attested"];
const PUBLIC_ITEMS = ["model commitment", "suite commitment", "predicate", "evidence commitment", "evaluator key", "verdict  PASS"];
const BAR_W = [70, 92, 80, 64, 86];

function Arrow({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  const vertical = x1 === x2;
  const head = vertical
    ? `M${x2 - 5},${y2 - 8} L${x2},${y2} L${x2 + 5},${y2 - 8}`
    : `M${x2 - 8},${y2 - 5} L${x2},${y2} L${x2 - 8},${y2 + 5}`;
  return (
    <g stroke="var(--ink)" strokeWidth="1.5" fill="none">
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
      <path d={head} />
    </g>
  );
}

function PrivateBox({ x, y, w }: { x: number; y: number; w: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={300} fill="var(--ink)" />
      <text x={x + 20} y={y + 34} fill="var(--paper)" fontSize="12" letterSpacing="1.4" style={MONO}>
        CONFIDENTIAL EVALUATOR
      </text>
      <line x1={x + 20} x2={x + w - 20} y1={y + 52} y2={y + 52} stroke="var(--graphite)" />
      {PRIVATE_ITEMS.map((t, i) => (
        <g key={t}>
          <rect x={x + 20} y={y + 74 + i * 42} width={BAR_W[i]} height={12} fill="var(--graphite)" />
          <text x={x + 20 + BAR_W[i] + 12} y={y + 85 + i * 42} fill="var(--paper)" fontSize="14" style={SANS}>
            {t}
          </text>
        </g>
      ))}
    </g>
  );
}

function CircuitBox({ x, y, w }: { x: number; y: number; w: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={300} fill="var(--paper)" stroke="var(--ink)" strokeWidth="1.5" />
      <rect x={x + 6} y={y + 6} width={w - 12} height={288} fill="none" stroke="var(--line)" />
      <text x={x + 20} y={y + 34} fill="var(--ink)" fontSize="12" letterSpacing="1.4" style={MONO}>
        MIDNIGHT · COMPACT
      </text>
      <text x={x + 20} y={y + 56} fill="var(--graphite)" fontSize="12" style={MONO}>
        circuit attest(model, suite)
      </text>
      {ASSERTS.map((t, i) => (
        <text key={t} x={x + 20} y={y + 96 + i * 30} fill="var(--ink)" fontSize="13" style={MONO}>
          <tspan fill="var(--graphite)">assert </tspan>
          {t}
        </text>
      ))}
      <text x={x + 20} y={y + 272} fill="var(--graphite)" fontSize="11.5" style={MONO}>
        witness stays with the prover
      </text>
    </g>
  );
}

function PublicBox({ x, y, w }: { x: number; y: number; w: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={300} fill="var(--paper)" stroke="var(--ink)" strokeWidth="1.5" />
      <text x={x + 20} y={y + 34} fill="var(--ink)" fontSize="12" letterSpacing="1.4" style={MONO}>
        PUBLIC ATTESTATION
      </text>
      <line x1={x + 20} x2={x + w - 20} y1={y + 52} y2={y + 52} stroke="var(--ink)" />
      {PUBLIC_ITEMS.map((t, i) => (
        <g key={t}>
          <text x={x + 20} y={y + 84 + i * 34} fill="var(--ink)" fontSize="13" style={MONO}>
            {t}
          </text>
          <line x1={x + 20} x2={x + w - 20} y1={y + 96 + i * 34} y2={y + 96 + i * 34} stroke="var(--line)" />
        </g>
      ))}
    </g>
  );
}

export function ArchitectureDiagram() {
  return (
    <figure className="my-10">
      {/* Horizontal */}
      <svg
        viewBox="0 0 1000 420"
        className="hidden h-auto w-full md:block"
        role="img"
        aria-labelledby="arch-title arch-desc"
      >
        <title id="arch-title">CLOSED BOOK architecture</title>
        <desc id="arch-desc">
          The confidential evaluator holds tests, outputs, results, notes and salts. It passes commitments and a private
          witness to the Compact circuit on Midnight, which asserts the evaluator key, model and suite bindings, the
          release predicate and one attestation per release. Only commitments and the verdict are disclosed to the public
          attestation. If an assertion fails, no proof and no record exist.
        </desc>
        <PrivateBox x={0} y={20} w={290} />
        <Arrow x1={290} y1={170} x2={354} y2={170} />
        <text x={296} y={158} fontSize="10.5" fill="var(--graphite)" style={MONO}>witness</text>
        <CircuitBox x={355} y={20} w={290} />
        <Arrow x1={645} y1={170} x2={709} y2={170} />
        <text x={651} y={158} fontSize="10.5" fill="var(--graphite)" style={MONO}>disclose</text>
        <PublicBox x={710} y={20} w={290} />
        <line x1={500} y1={320} x2={500} y2={372} stroke="var(--signal)" strokeWidth="1.5" strokeDasharray="4 4" />
        <text x={500} y={396} textAnchor="middle" fontSize="12.5" fill="var(--ink)" style={MONO}>
          any assert fails → no proof, no transaction, no record
        </text>
      </svg>

      {/* Vertical */}
      <svg viewBox="0 0 330 1110" className="h-auto w-full md:hidden" role="img" aria-labelledby="arch-title-v">
        <title id="arch-title-v">CLOSED BOOK architecture</title>
        <PrivateBox x={0} y={0} w={330} />
        <Arrow x1={165} y1={300} x2={165} y2={364} />
        <text x={175} y={336} fontSize="11" fill="var(--graphite)" style={MONO}>commitments + witness</text>
        <CircuitBox x={0} y={365} w={330} />
        <Arrow x1={165} y1={665} x2={165} y2={729} />
        <text x={175} y={701} fontSize="11" fill="var(--graphite)" style={MONO}>disclose()</text>
        <PublicBox x={0} y={730} w={330} />
        <text x={165} y={1070} textAnchor="middle" fontSize="11.5" fill="var(--ink)" style={MONO}>
          any assert fails → no proof, no record
        </text>
      </svg>
      <figcaption className="t-label mt-4 text-graphite">Fig. 1 — The evidence stays left of the spine.</figcaption>
    </figure>
  );
}
