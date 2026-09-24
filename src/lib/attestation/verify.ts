/**
 * Checks a verifier can run with public data only, plus the auditor opening
 * check (which needs the private opening, handed over deliberately).
 */
import {
  bytes32FromHex,
  commitEvidence,
  deriveAttestationId,
  deriveReleaseKey,
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
  /** Release key recomputed from model, suite and predicate matches the record. */
  readonly releaseMatches: boolean;
  /** CB- code is derived from the id. */
  readonly codeMatches: boolean;
  readonly recomputedId: string;
}

/**
 * Recompute the attestation id and release key from the record's public
 * fields. A match means the record is self-consistent — nothing more. Anyone
 * can construct a self-consistent record, so integrity alone never earns a
 * verified verdict; see classifyReceipt in ./receipt.ts. The evaluator key is
 * not part of the id, so only an issuer lookup confirms it.
 */
export async function checkRecordIntegrity(record: PublicAttestation): Promise<IntegrityReport> {
  try {
    const model = bytes32FromHex(record.modelCommitment);
    const suite = bytes32FromHex(record.suiteCommitment);
    const predicateId = pad32(record.predicate.id);
    const id = await deriveAttestationId(model, suite, predicateId, bytes32FromHex(record.evidenceCommitment));
    const release = await deriveReleaseKey(model, suite, predicateId);
    const recomputedId = toHex(id);
    return {
      idMatches: equalBytes(id, bytes32FromHex(record.id)),
      releaseMatches: equalBytes(release, bytes32FromHex(record.releaseKey)),
      codeMatches: attestationCode(record.id) === record.code,
      recomputedId,
    };
  } catch {
    return { idMatches: false, releaseMatches: false, codeMatches: false, recomputedId: "" };
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
 * Leakage scan: count the bytes of the evaluation's configured private
 * plaintext — every test case, check name, id and category, the suite name,
 * notes, salts and the evaluator secret — that appear verbatim in the
 * serialised public payload. A correct record scores 0. Values shorter than
 * four characters (e.g. check ids "PI", "SE") are skipped: they would match
 * by chance inside hex strings.
 *
 * This is NOT the size of the public record, which by design publishes
 * commitments (hashes of private data), the predicate and labels. It detects
 * plaintext leaks; it cannot detect a private value that was transformed
 * before leaking.
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
    if (parsed?.version !== 2 || typeof parsed.id !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}
