import { getLocalAdapter, localCircuitGuard } from "@/src/lib/midnight/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const blocked = localCircuitGuard(request);
  if (blocked) return Response.json({ error: blocked }, { status: 403 });
  const { id } = await params;
  // Absence is an ordinary answer ("no attestation exists"), not an error.
  const record = await (await getLocalAdapter()).lookup(id);
  return Response.json({ record });
}
