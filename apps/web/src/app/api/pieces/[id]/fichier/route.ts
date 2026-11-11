import { NextResponse } from "next/server";
import { API_URL } from "@/lib/api";
import { lireJeton } from "@/lib/session";

// Transmet au navigateur la photo ou le PDF de la pièce, en ajoutant le jeton
export async function GET(
  _requete: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const jeton = await lireJeton();
  if (!jeton) {
    return new NextResponse("Connexion requise", { status: 401 });
  }

  let reponse: Response;
  try {
    reponse = await fetch(`${API_URL}/pieces/${encodeURIComponent(id)}/fichier`, {
      headers: { Authorization: `Bearer ${jeton}` },
      cache: "no-store",
    });
  } catch {
    return new NextResponse("Serveur injoignable", { status: 503 });
  }

  if (!reponse.ok || !reponse.body) {
    return new NextResponse("Fichier indisponible", { status: reponse.status });
  }

  return new NextResponse(reponse.body, {
    status: 200,
    headers: {
      "Content-Type": reponse.headers.get("Content-Type") ?? "application/octet-stream",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}