import type { PublicAttestation } from "./types";

/** Where an adapter keeps the public records it has produced. */
export interface AttestationRegistry {
  has(id: string): boolean;
  get(idOrCode: string): PublicAttestation | null;
  put(record: PublicAttestation): void;
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

  has(id: string): boolean {
    return this.records.has(normalise(id));
  }

  get(idOrCode: string): PublicAttestation | null {
    const direct = this.records.get(normalise(idOrCode));
    if (direct) return direct;
    for (const r of this.records.values()) if (matches(r, idOrCode)) return r;
    return null;
  }

  put(record: PublicAttestation): void {
    this.records.set(normalise(record.id), record);
  }
}

const STORAGE_KEY = "closedbook.demo.registry.v1";

/**
 * Browser registry for the demo adapter. Public records only — private
 * evaluation data is never written here. Storage failures (private mode,
 * blocked storage) degrade to memory.
 */
export class BrowserRegistry implements AttestationRegistry {
  private readonly memory = new MemoryRegistry();

  constructor() {
    for (const r of this.read()) this.memory.put(r);
  }

  private read(): PublicAttestation[] {
    try {
      const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? (parsed as PublicAttestation[]) : [];
    } catch {
      return [];
    }
  }

  has(id: string): boolean {
    return this.memory.has(id);
  }

  get(idOrCode: string): PublicAttestation | null {
    return this.memory.get(idOrCode);
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
}
