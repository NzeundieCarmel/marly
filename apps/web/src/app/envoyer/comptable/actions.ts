"use server";

import { redirect } from "next/navigation";
import { API_URL } from "@/lib/api";
import { lireJeton } from "@/lib/session";

export interface EtatDemande {
  erreur: string | null;
}

async function poster(chemin: string, corps?: unknown): Promise<Response | null> {
  const jeton = await lireJeton();
  if (!jeton) {
    redirect("/connexion");
  }
  try {
    return await fetch(`${API_URL}${chemin}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${jeton}`, "Content-Type": "application/json" },
      body: corps === undefined ? undefined : JSON.stringify(corps),
      cache: "no-store",
    });
  } catch {
    return null;
  }
}

export async function demanderComptable(_etat: EtatDemande, donnees: FormData): Promise<EtatDemande> {
  const reponse = await poster("/rattachements", {
    cabinetId: String(donnees.get("cabinetId") ?? ""),
    message: String(donnees.get("message") ?? "").slice(0, 500),
  });
  if (!reponse) {
    return { erreur: "Le serveur Marly est injoignable. Réessayez dans un instant." };
  }
  if (reponse.status === 401) {
    redirect("/connexion?expiree=1");
  }
  if (!reponse.ok) {
    const corps = (await reponse.json().catch(() => null)) as { message?: string | string[] } | null;
    const message = Array.isArray(corps?.message) ? corps.message[0] : corps?.message;
    return { erreur: message ?? "La demande a échoué. Réessayez." };
  }
  redirect("/envoyer/comptable");
}

export async function annulerDemande(donnees: FormData): Promise<void> {
  const id = String(donnees.get("id") ?? "");
  await poster(`/rattachements/${encodeURIComponent(id)}/annuler`);
  redirect("/envoyer/comptable");
}