/**
 * Checks a verifier can run with public data only, plus the auditor opening
 * check (which needs the private opening, handed over deliberately).
 */
import {
  bytes32FromHex,
  commitEvidence,
  deriveAttestationId,
  equalBytes,
  pad32,
  packResults,
  toHex,
  utf8,
} from "../commitments";
import { attestationCode } from "./evaluation";
import type { PrivateEvaluation, PublicAttestation } from "./types";

export interface IntegrityReport {
  /** Attestation id recomputed from the public fields matches the record. */
  readonly idMatches: boolean;
  /** CB- code is derived from the id. */
  readonly codeMatches: boolean;
  readonly recomputedId: string;
}

/**
 * Recompute the attestation id from the record's public fields. This proves
 * the record was not edited after issue. It does NOT prove the predicate was
 * satisfied — that is the job of the proof (source MIDNIGHT) or, in the demo,
 * of the adapter that issued the record.
 */
export async function checkRecordIntegrity(record: PublicAttestation): Promise<IntegrityReport> {
  try {
    const id = await deriveAttestationId(
      bytes32FromHex(record.modelCommitment),
      bytes32FromHex(record.suiteCommitment),
      pad32(record.predicate.id),
      bytes32FromHex(record.evidenceCommitment),
    );
    const recomputedId = toHex(id);
    return {
      idMatches: equalBytes(id, bytes32FromHex(record.id)),
      codeMatches: attestationCode(record.id) === record.code,
      recomputedId,
    };
  } catch {
    return { idMatches: false, codeMatches: false, recomputedId: "" };
  }
}

export interface EvidenceOpening {
  readonly results: readonly boolean[];
  readonly evidenceSalt: string;
}

/**
 * Auditor check: given a private opening (results + salt), does it match the
 * evidence commitment in the public record? A tampered result set fails.
 */
export async function openEvidence(record: PublicAttestation, opening: EvidenceOpening): Promise<boolean> {
  try {
    const evidence = await commitEvidence(
      bytes32FromHex(record.modelCommitment),
      bytes32FromHex(record.suiteCommitment),
      pad32(record.predicate.id),
      packResults(opening.results),
      bytes32FromHex(opening.evidenceSalt),
    );
    return equalBytes(evidence, bytes32FromHex(record.evidenceCommitment));
  } catch {
    return false;
  }
}

/**
 * Count the bytes of private plaintext that appear verbatim in a serialised
 * public record: every test case, check name, note, salt and secret. A
 * correct record scores 0.
 */
export function measureDisclosure(publicPayload: unknown, evaluation: PrivateEvaluation): number {
  const haystack = JSON.stringify(publicPayload ?? null).toLowerCase();
  const strip = (h: string) => h.toLowerCase().replace(/^0x/, "");
  const secrets: string[] = [
    ...evaluation.suite.checks.flatMap((c) => [...c.cases, c.name, c.category, c.id]),
    evaluation.notes,
    strip(evaluation.suiteSalt),
    strip(evaluation.evidenceSalt),
    strip(evaluation.evaluatorSecret),
    evaluation.suite.name,
  ].filter((s) => s.trim().length >= 4);
  let leaked = 0;
  for (const s of secrets) {
    if (haystack.includes(s.toLowerCase())) leaked += utf8(s).length;
  }
  return leaked;
}

/** Serialise a public record for a self-contained share link (#r=...). */
export function encodeRecord(record: PublicAttestation): string {
  let binary = "";
  for (const b of utf8(JSON.stringify(record))) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeRecord(encoded: string): PublicAttestation | null {
  try {
    const binary = atob(encoded.replace(/-/g, "+").replace(/_/g, "/"));
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as PublicAttestation;
    if (parsed?.version !== 1 || typeof parsed.id !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}
