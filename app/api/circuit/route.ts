import { CONTRACT_INFO } from "@/src/lib/midnight/local-contract";
import { getLocalAdapter, localCircuitGuard } from "@/src/lib/midnight/server";
import type { AttestRequest } from "@/src/lib/attestation/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const blocked = localCircuitGuard(request);
  if (blocked) return Response.json({ available: false, reason: blocked });
  try {
    await getLocalAdapter();
    return Response.json({ available: true, contract: CONTRACT_INFO });
  } catch (error) {
    return Response.json({ available: false, reason: `Runtime failed to load: ${(error as Error).message}` });
  }
}

export async function POST(request: Request) {
  const blocked = localCircuitGuard(request);
  if (blocked) return Response.json({ error: blocked }, { status: 403 });
  let body: AttestRequest;
  try {
    body = (await request.json()) as AttestRequest;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const adapter = await getLocalAdapter();
  const outcome = await adapter.attest(body);
  return Response.json(outcome);
}
