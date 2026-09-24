/** Byte helpers shared by the commitment scheme. No dependencies. */

export type Bytes32 = Uint8Array;

const HEX = /^(0x)?[0-9a-fA-F]*$/;

export function toHex(bytes: Uint8Array, prefix = true): string {
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return prefix ? `0x${out}` : out;
}

export function fromHex(hex: string): Uint8Array {
  if (!HEX.test(hex)) throw new Error("invalid hex string");
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (clean.length % 2 !== 0) throw new Error("hex string has odd length");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export function bytes32FromHex(hex: string): Bytes32 {
  const b = fromHex(hex);
  if (b.length !== 32) throw new Error(`expected 32 bytes, got ${b.length}`);
  return b;
}

export function utf8(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

/**
 * Mirrors Compact's `pad(32, "...")`: UTF-8 bytes, right-padded with zeros.
 */
export function pad32(text: string): Bytes32 {
  const raw = utf8(text);
  if (raw.length > 32) throw new Error("pad32 input longer than 32 bytes");
  const out = new Uint8Array(32);
  out.set(raw);
  return out;
}

export function concat(parts: readonly Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

export function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export function randomBytes32(): Bytes32 {
  const out = new Uint8Array(32);
  globalThis.crypto.getRandomValues(out);
  return out;
}

/** `0x81af1c2e…c904` — first 4 bytes, ellipsis, last 2 bytes. */
export function shortHex(hex: string): string {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (clean.length <= 12) return `0x${clean}`;
  return `0x${clean.slice(0, 8)}…${clean.slice(-4)}`;
}
