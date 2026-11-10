"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { API_URL } from "@/lib/api";
import { COOKIE_SESSION } from "@/lib/session";

export interface EtatConnexion {
  erreur: string | null;
}

export async function seConnecter(
  _etatPrecedent: EtatConnexion,
  formData: FormData,
): Promise<EtatConnexion> {
  const email = String(formData.get("email") ?? "");
  const motDePasse = String(formData.get("motDePasse") ?? "");

  let reponse: Response;
  try {
    reponse = await fetch(`${API_URL}/auth/connexion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, motDePasse }),
      cache: "no-store",
    });
  } catch {
    return { erreur: "Le serveur Marly est injoignable. Réessaie dans un instant." };
  }

  if (reponse.status === 400 || reponse.status === 401) {
    return { erreur: "E-mail ou mot de passe incorrect." };
  }
  if (!reponse.ok) {
    return { erreur: "Une erreur est survenue. Réessaie." };
  }

  const { jeton, utilisateur } = (await reponse.json()) as {
    jeton: string;
    utilisateur: { role: string };
  };

  (await cookies()).set(COOKIE_SESSION, jeton, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  // Une PME arrive sur l'envoi de pièces, le cabinet sur ses dossiers
  redirect(utilisateur.role === "PME" ? "/envoyer" : "/dossiers");
}

export async function seDeconnecter(): Promise<void> {
  (await cookies()).delete(COOKIE_SESSION);
  redirect("/connexion");
}