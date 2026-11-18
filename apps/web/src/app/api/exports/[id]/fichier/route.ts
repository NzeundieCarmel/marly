import { NextResponse } from "next/server";
import { API_URL } from "@/lib/api";
import { lireJeton } from "@/lib/session";

// Télécharge le fichier CSV d'un lot d'export, en ajoutant le jeton
export async function GET(_requete: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const jeton = await lireJeton();
  if (!jeton) {
    return NextResponse.json({ message: "Connexion requise" }, { status: 401 });
  }

  let reponse: Response;
  try {
    reponse = await fetch(`${API_URL}/exports/${encodeURIComponent(id)}/fichier`, {
      headers: { Authorization: `Bearer ${jeton}` },
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ message: "Le serveur Marly est injoignable" }, { status: 503 });
  }

  if (!reponse.ok) {
    return new NextResponse(await reponse.text(), {
      status: reponse.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new NextResponse(reponse.body, {
    status: 200,
    headers: {
      "Content-Type": reponse.headers.get("Content-Type") ?? "text/csv; charset=utf-8",
      "Content-Disposition":
        reponse.headers.get("Content-Disposition") ?? 'attachment; filename="export-marly.csv"',
      "Cache-Control": "private, no-store",
    },
  });
}