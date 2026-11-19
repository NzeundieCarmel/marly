"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { API_URL } from "@/lib/api";
import { COOKIE_SESSION } from "@/lib/session";

export interface EtatInscription {
  erreur: string | null;
  valeurs?: { nomCabinet: string; nomResponsable: string; email: string };
}

export async function sInscrire(
  _etat: EtatInscription,
  donnees: FormData,
): Promise<EtatInscription> {
  const valeurs = {
    nomCabinet: String(donnees.get("nomCabinet") ?? ""),
    nomResponsable: String(donnees.get("nomResponsable") ?? ""),
    email: String(donnees.get("email") ?? ""),
  };
  const motDePasse = String(donnees.get("motDePasse") ?? "");
  const confirmation = String(donnees.get("confirmation") ?? "");

  if (motDePasse !== confirmation) {
    return { erreur: "Les deux mots de passe ne correspondent pas.", valeurs };
  }

  // Adresse IP du visiteur, transmise à l'API pour la limite de tentatives
  const entetes = await headers();
  const ip = (entetes.get("x-forwarded-for") ?? "").split(",")[0].trim();

  let reponse: Response;
  try {
    reponse = await fetch(`${API_URL}/inscription`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(ip ? { "X-Marly-Ip": ip } : {}),
      },
      body: JSON.stringify({
        ...valeurs,
        motDePasse,
        siteWeb: String(donnees.get("siteWeb") ?? ""),
      }),
      cache: "no-store",
    });
  } catch {
    return { erreur: "Le serveur Marly est injoignable. Réessaie dans un instant.", valeurs };
  }

  const corps = (await reponse.json().catch(() => null)) as
    | { jeton?: string; message?: string | string[] }
    | null;

  if (!reponse.ok || !corps?.jeton) {
    const message = Array.isArray(corps?.message) ? corps.message[0] : corps?.message;
    return { erreur: message ?? "L'inscription a échoué. Réessaie.", valeurs };
  }

  (await cookies()).set(COOKIE_SESSION, corps.jeton, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 8 * 60 * 60,
  });
  redirect("/dossiers");
}