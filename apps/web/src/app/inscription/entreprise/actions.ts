"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { API_URL } from "@/lib/api";
import { COOKIE_SESSION } from "@/lib/session";
import { entetesRelais } from "@/lib/entetes-relais";

export interface EtatInscriptionEntreprise {
  erreur: string | null;
  valeurs?: { raisonSociale: string; regime: string; nomGerant: string; email: string };
}

export async function sInscrireEntreprise(
  _etat: EtatInscriptionEntreprise,
  donnees: FormData,
): Promise<EtatInscriptionEntreprise> {
  const valeurs = {
    raisonSociale: String(donnees.get("raisonSociale") ?? ""),
    regime: String(donnees.get("regime") ?? "IGS"),
    nomGerant: String(donnees.get("nomGerant") ?? ""),
    email: String(donnees.get("email") ?? ""),
  };
  const motDePasse = String(donnees.get("motDePasse") ?? "");
  if (motDePasse !== String(donnees.get("confirmation") ?? "")) {
    return { erreur: "Les deux mots de passe ne correspondent pas.", valeurs };
  }

  const ip = ((await headers()).get("x-forwarded-for") ?? "").split(",")[0].trim();

  let reponse: Response;
  try {
    reponse = await fetch(`${API_URL}/inscription/entreprise`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...entetesRelais(ip) },
      body: JSON.stringify({ ...valeurs, motDePasse, siteWeb: String(donnees.get("siteWeb") ?? "") }),
      cache: "no-store",
    });
  } catch {
    return { erreur: "Le serveur Marly est injoignable. Réessayez dans un instant.", valeurs };
  }

  const corps = (await reponse.json().catch(() => null)) as
    | { jeton?: string; message?: string | string[] }
    | null;
  if (!reponse.ok || !corps?.jeton) {
    const message = Array.isArray(corps?.message) ? corps.message[0] : corps?.message;
    return { erreur: message ?? "L'inscription a échoué. Réessayez.", valeurs };
  }

  (await cookies()).set(COOKIE_SESSION, corps.jeton, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 8 * 60 * 60,
  });
  redirect("/envoyer");
}