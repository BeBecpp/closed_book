import type { PublicAttestation } from "./types";

/**
 * Where the demo adapter keeps the public records it has issued — its
 * stand-in for the contract ledger. Like the ledger, it holds at most one
 * attestation per release key.
 */
export interface AttestationRegistry {
  get(idOrCode: string): PublicAttestation | null;
  findByRelease(releaseKey: string): PublicAttestation | null;
  put(record: PublicAttestation): void;
  clear(): void;
}

function normalise(idOrCode: string): string {
  return idOrCode.trim().toLowerCase().replace(/^0x/, "");
}

function matches(record: PublicAttestation, idOrCode: string): boolean {
  const key = normalise(idOrCode);
  return normalise(record.id) === key || record.code.toLowerCase() === key;
}

export class MemoryRegistry implements AttestationRegistry {
  private readonly records = new Map<string, PublicAttestation>();

  get(idOrCode: string): PublicAttestation | null {
    const direct = this.records.get(normalise(idOrCode));
    if (direct) return direct;
    for (const r of this.records.values()) if (matches(r, idOrCode)) return r;
    return null;
  }

  findByRelease(releaseKey: string): PublicAttestation | null {
    const key = normalise(releaseKey);
    for (const r of this.records.values()) if (normalise(r.releaseKey) === key) return r;
    return null;
  }

  put(record: PublicAttestation): void {
    if (this.findByRelease(record.releaseKey)) throw new Error("release already attested");
    this.records.set(normalise(record.id), record);
  }

  clear(): void {
    this.records.clear();
  }
}

const STORAGE_KEY = "closedbook.demo.registry.v2";

function isRecord(r: unknown): r is PublicAttestation {
  return typeof r === "object" && r !== null && (r as PublicAttestation).version === 2;
}

/**
 * Browser registry for the demo adapter. Public records only — private
 * evaluation data is never written here. Storage failures (private mode,
 * blocked storage) degrade to memory.
 */
export class BrowserRegistry implements AttestationRegistry {
  private readonly memory = new MemoryRegistry();

  constructor() {
    for (const r of this.read()) {
      try {
        this.memory.put(r);
      } catch {
        // Duplicate release in storage: keep the first, as the ledger would.
      }
    }
  }

  private read(): PublicAttestation[] {
    try {
      const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter(isRecord) : [];
    } catch {
      return [];
    }
  }

  get(idOrCode: string): PublicAttestation | null {
    return this.memory.get(idOrCode);
  }

  findByRelease(releaseKey: string): PublicAttestation | null {
    return this.memory.findByRelease(releaseKey);
  }

  put(record: PublicAttestation): void {
    this.memory.put(record);
    try {
      const all = this.read().filter((r) => r.id !== record.id);
      all.push(record);
      globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(all.slice(-50)));
    } catch {
      // Storage unavailable: the record lives for this page session only.
    }
  }

  clear(): void {
    this.memory.clear();
    try {
      globalThis.localStorage?.removeItem(STORAGE_KEY);
    } catch {
      // Nothing stored.
    }
  }
}
