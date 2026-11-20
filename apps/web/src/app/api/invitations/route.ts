import { relayerJson } from "@/lib/relais";

export async function POST(requete: Request) {
  return relayerJson("/invitations", requete);
}