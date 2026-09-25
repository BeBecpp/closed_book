import { NETWORKS } from "@/src/lib/midnight/network";
import { loadDeployment, loadNetworkAttestations } from "@/src/lib/midnight/network-view";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public: whether this site verifies against a deployed CLOSED BOOK contract. */
export async function GET() {
  let deployment;
  try {
    deployment = loadDeployment();
  } catch (e) {
    return Response.json({ configured: false, reason: `Deployment record invalid: ${(e as Error).message}` });
  }
  if (!deployment) return Response.json({ configured: false, reason: "No deployment record is committed." });
  const attestations = loadNetworkAttestations(deployment.network).map((e) => ({
    code: e.record.code,
    id: e.record.id,
    txId: e.record.network?.txId ?? null,
    submittedAt: e.submittedAt,
  }));
  return Response.json({ configured: true, label: NETWORKS[deployment.network].label, deployment, attestations });
}
