import type { Metadata } from "next";
import { Receipt } from "@/components/verify/Receipt";

type Params = { params: Promise<{ id: string }> };

function clean(id: string) {
  return decodeURIComponent(id).slice(0, 80);
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  return { title: `Attestation ${clean(id)}`, description: "Public attestation receipt. The evidence stays closed." };
}

export default async function VerifyPage({ params }: Params) {
  const { id } = await params;
  return <Receipt reference={clean(id)} />;
}
