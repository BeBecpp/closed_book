import "server-only";
import { deriveEvaluatorKey, fromHex, toHex } from "../commitments";
import { createMidnightLocalAdapter, type MidnightLocalAdapter } from "../attestation/midnight-adapter";
import { DEMO_EVALUATOR_SECRET, DEMO_PREDICATE } from "../demo/fixture";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

/**
 * The local circuit receives private witness data, so it only answers
 * requests addressed to this machine. On a hosted deployment it is off.
 */
export function localCircuitGuard(request: Request): string | null {
  if (process.env.CLOSEDBOOK_LOCAL_CIRCUIT === "off") return "Local circuit disabled by CLOSEDBOOK_LOCAL_CIRCUIT=off.";
  const host = new URL(request.url).hostname;
  const header = (request.headers.get("host") ?? "").replace(/:\d+$/, "");
  if (!LOCAL_HOSTS.has(host) || !LOCAL_HOSTS.has(header)) {
    return "The local circuit only runs on the evaluator's own machine. Private witness data is never sent to a remote server.";
  }
  return null;
}

const globalStore = globalThis as unknown as { __closedBookLocal?: Promise<MidnightLocalAdapter> };

/** One in-memory local contract per server process (the demo evaluator's deployment). */
export function getLocalAdapter(): Promise<MidnightLocalAdapter> {
  globalStore.__closedBookLocal ??= (async () => {
    const evaluatorKey = toHex(await deriveEvaluatorKey(fromHex(DEMO_EVALUATOR_SECRET)));
    return createMidnightLocalAdapter({ deployment: { evaluatorKey, predicate: DEMO_PREDICATE } });
  })();
  return globalStore.__closedBookLocal;
}
