"use server";

import { redirect } from "next/navigation";
import { API_URL } from "@/lib/api";
import { lireJeton } from "@/lib/session";

export interface EtatDevis {
  erreur: string | null;
}

async function appeler(
  methode: "POST" | "PUT",
  chemin: string,
  corps?: unknown,
): Promise<{ erreur: string | null; contenu: Record<string, unknown> | null }> {
  const jeton = await lireJeton();
  if (!jeton) {
    redirect("/connexion");
  }
  let reponse: Response;
  try {
    reponse = await fetch(`${API_URL}${chemin}`, {
      method: methode,
      headers: { Authorization: `Bearer ${jeton}`, "Content-Type": "application/json" },
      body: corps === undefined ? undefined : JSON.stringify(corps),
      cache: "no-store",
    });
  } catch {
    return { erreur: "Le serveur Marly est injoignable. Réessayez dans un instant.", contenu: null };
  }
  if (reponse.status === 401) {
    redirect("/connexion?expiree=1");
  }
  const contenu = (await reponse.json().catch(() => null)) as (Record<string, unknown> & { message?: string | string[] }) | null;
  if (!reponse.ok) {
    const message = Array.isArray(contenu?.message) ? contenu.message[0] : contenu?.message;
    return { erreur: message ?? "L'opération a échoué. Réessayez.", contenu: null };
  }
  return { erreur: null, contenu };
}

export async function enregistrerDevis(_etat: EtatDevis, donnees: FormData): Promise<EtatDevis> {
  const id = String(donnees.get("id") ?? "");
  let lignes: unknown;
  try {
    lignes = JSON.parse(String(donnees.get("lignes") ?? "[]"));
  } catch {
    return { erreur: "Les lignes sont illisibles. Rechargez la page." };
  }
  const validite = Number(String(donnees.get("validiteJours") ?? "30"));
  const corps = {
    clientId: String(donnees.get("clientId") ?? ""),
    validiteJours: Number.isInteger(validite) ? validite : 30,
    note: String(donnees.get("note") ?? "").trim() || undefined,
    lignes,
  };
  const r = id
    ? await appeler("PUT", `/facturation/devis/${encodeURIComponent(id)}`, corps)
    : await appeler("POST", "/facturation/devis", corps);
  if (r.erreur) return { erreur: r.erreur };
  const nouvelId = id || String(r.contenu?.id ?? "");
  redirect(`/envoyer/factures/devis/${encodeURIComponent(nouvelId)}?enregistre=1`);
}

export async function changerStatutDevis(_etat: EtatDevis, donnees: FormData): Promise<EtatDevis> {
  const id = String(donnees.get("id") ?? "");
  const r = await appeler("POST", `/facturation/devis/${encodeURIComponent(id)}/statut`, {
    statut: String(donnees.get("statut") ?? ""),
  });
  if (r.erreur) return { erreur: r.erreur };
  redirect(`/envoyer/factures/devis/${encodeURIComponent(id)}`);
}

export async function transformerDevis(_etat: EtatDevis, donnees: FormData): Promise<EtatDevis> {
  const id = String(donnees.get("id") ?? "");
  const r = await appeler("POST", `/facturation/devis/${encodeURIComponent(id)}/facture`);
  if (r.erreur) return { erreur: r.erreur };
  redirect(`/envoyer/factures/${encodeURIComponent(String(r.contenu?.factureId ?? ""))}?depuisDevis=1`);
}

export async function supprimerDevis(_etat: EtatDevis, donnees: FormData): Promise<EtatDevis> {
  const id = String(donnees.get("id") ?? "");
  const r = await appeler("POST", `/facturation/devis/${encodeURIComponent(id)}/supprimer`);
  if (r.erreur) return { erreur: r.erreur };
  redirect("/envoyer/factures/devis?supprime=1");
}