"use server";

import { redirect } from "next/navigation";
import { API_URL } from "@/lib/api";
import { lireJeton } from "@/lib/session";

export interface EtatAction {
  erreur: string | null;
}

async function appeler(
  methode: "POST" | "PUT",
  chemin: string,
  corps?: unknown,
): Promise<{ erreur: string | null; id: string | null }> {
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
    return { erreur: "Le serveur Marly est injoignable. Réessayez dans un instant.", id: null };
  }
  if (reponse.status === 401) {
    redirect("/connexion?expiree=1");
  }
  const contenu = (await reponse.json().catch(() => null)) as { id?: string; message?: string | string[] } | null;
  if (!reponse.ok) {
    const message = Array.isArray(contenu?.message) ? contenu.message[0] : contenu?.message;
    return { erreur: message ?? "L'opération a échoué. Réessayez.", id: null };
  }
  return { erreur: null, id: contenu?.id ?? null };
}

function nombre(texte: FormDataEntryValue | null): number {
  const valeur = Number(String(texte ?? "0").replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(valeur) ? valeur : 0;
}

export async function enregistrerFacture(_etat: EtatAction, donnees: FormData): Promise<EtatAction> {
  const id = String(donnees.get("id") ?? "");
  let lignes: unknown;
  try {
    lignes = JSON.parse(String(donnees.get("lignes") ?? "[]"));
  } catch {
    return { erreur: "Les lignes sont illisibles. Rechargez la page." };
  }
  const echeance = String(donnees.get("dateEcheance") ?? "");
  const corps = {
    clientId: String(donnees.get("clientId") ?? ""),
    dateEcheance: echeance || undefined,
    tauxRetenue: nombre(donnees.get("tauxRetenue")),
    lignes,
  };
  const resultat = id
    ? await appeler("PUT", `/facturation/factures/${encodeURIComponent(id)}`, corps)
    : await appeler("POST", "/facturation/factures", corps);
  if (resultat.erreur) return { erreur: resultat.erreur };
  redirect(`/envoyer/factures/${encodeURIComponent(id || resultat.id || "")}?enregistree=1`);
}

export async function emettreFacture(_etat: EtatAction, donnees: FormData): Promise<EtatAction> {
  const id = String(donnees.get("id") ?? "");
  const resultat = await appeler("POST", `/facturation/factures/${encodeURIComponent(id)}/emettre`);
  if (resultat.erreur) return { erreur: resultat.erreur };
  redirect(`/envoyer/factures/${encodeURIComponent(id)}?emise=1`);
}

export async function supprimerBrouillon(_etat: EtatAction, donnees: FormData): Promise<EtatAction> {
  const id = String(donnees.get("id") ?? "");
  const resultat = await appeler("POST", `/facturation/factures/${encodeURIComponent(id)}/supprimer`);
  if (resultat.erreur) return { erreur: resultat.erreur };
  redirect("/envoyer/factures?supprimee=1");
}

export async function creerAvoir(_etat: EtatAction, donnees: FormData): Promise<EtatAction> {
  const id = String(donnees.get("id") ?? "");
  const resultat = await appeler("POST", `/facturation/factures/${encodeURIComponent(id)}/avoir`);
  if (resultat.erreur || !resultat.id) return { erreur: resultat.erreur ?? "L'avoir n'a pas pu être créé." };
  redirect(`/envoyer/factures/${encodeURIComponent(resultat.id)}?avoir=1`);
}


export async function activerPartage(donnees: FormData): Promise<void> {
  const id = String(donnees.get("id") ?? "");
  await appeler("POST", `/facturation/factures/${encodeURIComponent(id)}/partage`);
  redirect(`/envoyer/factures/${encodeURIComponent(id)}/document`);
}

export async function desactiverPartage(donnees: FormData): Promise<void> {
  const id = String(donnees.get("id") ?? "");
  await appeler("POST", `/facturation/factures/${encodeURIComponent(id)}/partage/desactiver`);
  redirect(`/envoyer/factures/${encodeURIComponent(id)}/document`);
}