import { relayerJson } from "@/lib/relais";

export async function POST(requete: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return relayerJson(`/demandes/${encodeURIComponent(id)}/annuler`, requete);
}