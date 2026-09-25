import { attestationCode } from "@/src/lib/attestation/evaluation";
import { loadDeployment, loadNetworkAttestations, networkView } from "@/src/lib/midnight/network-view";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public, read-only: what the configured CLOSED BOOK contract holds for one
 * attestation id (or CB- code of a known network attestation). Reads public
 * contract state from the Midnight indexer. Never receives private data.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const deployment = loadDeployment();
  if (!deployment) return Response.json({ configured: false });
  const { id: raw } = await params;
  const ref = decodeURIComponent(raw).trim().toLowerCase();

  // Known network attestations carry transaction metadata the ledger does not store.
  const known = loadNetworkAttestations(deployment.network).find(
    (e) => e.record.id.toLowerCase() === (ref.startsWith("0x") ? ref : `0x${ref}`) || e.record.code.toLowerCase() === ref,
  );
  const id = known?.record.id ?? (/^(0x)?[0-9a-f]{64}$/.test(ref) ? (ref.startsWith("0x") ? ref : `0x${ref}`) : null);
  if (!id) return Response.json({ configured: true, deployment, record: null, view: null });

  const view = await networkView(deployment, id);
  const record = known?.record ?? null;
  if (record && attestationCode(record.id) !== record.code) return Response.json({ configured: true, deployment, record: null, view });
  return Response.json({ configured: true, deployment, record, view });
}
