"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { API_URL } from "@/lib/api";
import { COOKIE_SESSION, lireJeton } from "@/lib/session";

const RETOURS = new Set(["/envoyer/profil", "/equipe"]);

// Révoque toutes les sessions du compte côté API, puis efface celle de ce navigateur
export async function deconnecterPartout(donnees: FormData): Promise<void> {
  const retour = String(donnees.get("retour") ?? "");
  const jeton = await lireJeton();
  let reussi = false;
  if (jeton) {
    try {
      const reponse = await fetch(`${API_URL}/auth/deconnexion-partout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${jeton}` },
        cache: "no-store",
      });
      reussi = reponse.ok;
    } catch {
      reussi = false;
    }
  }
  // Serveur injoignable : on ne fait pas croire que les autres appareils sont déconnectés
  if (!reussi && RETOURS.has(retour)) {
    redirect(retour);
  }
  (await cookies()).delete(COOKIE_SESSION);
  redirect("/connexion");
}