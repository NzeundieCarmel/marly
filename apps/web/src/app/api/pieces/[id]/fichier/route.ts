import { NextResponse } from "next/server";
import { API_URL } from "@/lib/api";
import { lireJeton } from "@/lib/session";

const EXTENSIONS: Record<string, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
};

// Transmet au navigateur la photo ou le PDF de la pièce, en ajoutant le jeton.
// Avec ?telecharger=1, le navigateur enregistre le fichier au lieu de l'afficher.
export async function GET(requete: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const type = reponse.headers.get("Content-Type") ?? "application/octet-stream";
  const entetes: Record<string, string> = {
    "Content-Type": type,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  };

  if (new URL(requete.url).searchParams.has("telecharger")) {
    const reference = id.replace(/[^A-Za-z0-9]/g, "").slice(-8);
    const extension = EXTENSIONS[type.split(";")[0].trim()] ?? "bin";
    entetes["Content-Disposition"] = `attachment; filename="piece-marly-${reference}.${extension}"`;
  }

  return new NextResponse(reponse.body, { status: 200, headers: entetes });
}