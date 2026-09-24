import Link from "next/link";

/**
 * Shown when a release (model, suite, predicate) already has an attestation.
 * The existing attestation is public, so naming it discloses nothing.
 */
export function AlreadyAttested({
  existing,
  onReset,
}: {
  existing: { id: string; code: string };
  /** Demo only: clear this browser's demo ledger. A real ledger has no reset. */
  onReset?: () => void;
}) {
  return (
    <div className="mt-5 border-t border-line pt-4 text-[0.875rem]">
      <p>
        One attestation per release. This one already has{" "}
        <Link href={`/verify/${existing.code}`} className="font-mono underline underline-offset-4">
          {existing.code}
        </Link>
        . A fresh evidence salt does not create a second.
      </p>
      {onReset && (
        <button type="button" onClick={onReset} className="t-label mt-3 underline underline-offset-4">
          Reset the demo ledger in this browser
        </button>
      )}
    </div>
  );
}
