import { NextResponse } from "next/server";
import { API_URL } from "./api";
import { lireJeton } from "./session";

// Transmet une demande JSON du navigateur à l'API, en ajoutant le jeton
export async function relayerJson(chemin: string, requete: Request): Promise<NextResponse> {
  const jeton = await lireJeton();
  if (!jeton) {
    return NextResponse.json({ message: "Connexion requise" }, { status: 401 });
  }

  let reponse: Response;
  try {
    reponse = await fetch(`${API_URL}${chemin}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jeton}`,
        "Content-Type": "application/json",
      },
      body: (await requete.text()) || "{}",
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ message: "Le serveur Marly est injoignable" }, { status: 503 });
  }

  return new NextResponse(await reponse.text(), {
    status: reponse.status,
    headers: {
      "Content-Type": reponse.headers.get("Content-Type") ?? "application/json",
    },
  });
}