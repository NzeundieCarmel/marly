"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { API_URL } from "@/lib/api";
import { COOKIE_SESSION } from "@/lib/session";

export interface EtatAcceptation {
  erreur: string | null;
  email?: string;
}

export async function accepterInvitation(
  jeton: string,
  _etat: EtatAcceptation,
  donnees: FormData,
): Promise<EtatAcceptation> {
  const email = String(donnees.get("email") ?? "");
  const motDePasse = String(donnees.get("motDePasse") ?? "");
  const confirmation = String(donnees.get("confirmation") ?? "");

  if (motDePasse !== confirmation) {
    return { erreur: "Les deux mots de passe ne correspondent pas.", email };
  }

  let reponse: Response;
  try {
    reponse = await fetch(
      `${API_URL}/invitations/lien/${encodeURIComponent(jeton)}/accepter`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, motDePasse }),
        cache: "no-store",
      },
    );
  } catch {
    return { erreur: "Le serveur Marly est injoignable. Réessayez dans un instant.", email };
  }

  const corps = (await reponse.json().catch(() => null)) as
    | { jeton?: string; role?: string; message?: string | string[] }
    | null;
  if (!reponse.ok || !corps?.jeton) {
    const message = Array.isArray(corps?.message) ? corps.message[0] : corps?.message;
    return { erreur: message ?? "La création de l'accès a échoué.", email };
  }

  (await cookies()).set(COOKIE_SESSION, corps.jeton, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 8 * 60 * 60,
  });
  redirect(corps.role === "PME" ? "/envoyer" : "/dossiers");
}