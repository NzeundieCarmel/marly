import { NextResponse } from "next/server";
import { API_URL } from "@/lib/api";
import { lireJeton } from "@/lib/session";

// Reçoit la pièce du téléphone et la transmet à l'API NestJS avec le jeton
export async function POST(requete: Request) {
  const jeton = await lireJeton();
  if (!jeton) {
    return NextResponse.json({ message: "Connexion requise" }, { status: 401 });
  }

  const donnees = await requete.formData();
  const dossierId = String(donnees.get("dossierId") ?? "");
  donnees.delete("dossierId");

  let reponse: Response;
  try {
    reponse = await fetch(
      `${API_URL}/dossiers/${encodeURIComponent(dossierId)}/pieces`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${jeton}` },
        body: donnees,
        cache: "no-store",
      },
    );
  } catch {
    return NextResponse.json(
      { message: "Le serveur Marly est injoignable" },
      { status: 503 },
    );
  }

  // On renvoie au téléphone exactement la réponse de l'API (201, 400, 409…)
  return new NextResponse(await reponse.text(), {
    status: reponse.status,
    headers: {
      "Content-Type": reponse.headers.get("Content-Type") ?? "application/json",
    },
  });
}