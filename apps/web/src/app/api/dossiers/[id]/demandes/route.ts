import { relayerJson } from "@/lib/relais";

export async function POST(requete: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return relayerJson(`/dossiers/${encodeURIComponent(id)}/demandes`, requete);
}