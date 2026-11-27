"use server";

import { redirect } from "next/navigation";
import { API_URL, type TicketCaisse } from "@/lib/api";
import { lireJeton } from "@/lib/session";

export interface EtatCaisse {
  erreur: string | null;
}

type Reponse = { statut: number; corps: unknown };

// Appel de l'API avec la session ; l'expiration renvoie vers la connexion, hors de tout try
async function appeler(chemin: string, corps: unknown): Promise<Reponse> {
  const jeton = await lireJeton();
  if (!jeton) {
    redirect("/connexion");
  }
  let reponse: Response | null = null;
  try {
    reponse = await fetch(`${API_URL}${chemin}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${jeton}`, "Content-Type": "application/json" },
      body: JSON.stringify(corps),
      cache: "no-store",
    });
  } catch {
    reponse = null;
  }
  if (reponse?.status === 401) {
    redirect("/connexion?expiree=1");
  }
  if (!reponse) {
    return { statut: 0, corps: null };
  }
  return { statut: reponse.status, corps: await reponse.json().catch(() => null) };
}

function messageErreur(r: Reponse): string {
  if (r.statut === 0) return "Marly est injoignable pour le moment. Réessayez dans un instant.";
  if (r.statut === 403) return "Seule l'entreprise peut utiliser sa caisse.";
  const message = (r.corps as { message?: string | string[] } | null)?.message;
  const texte = Array.isArray(message) ? message[0] : message;
  if (r.statut === 409 && texte) return `${texte}.`;
  return texte ? `L'opération a été refusée : ${texte}` : "L'opération a été refusée.";
}

function entier(valeur: FormDataEntryValue | null): number | null {
  const texte = String(valeur ?? "").replace(/[\s  ]/g, "");
  if (texte === "") return null;
  return /^\d+$/.test(texte) ? Number(texte) : Number.NaN;
}

function chemin(dossierId: string, suite: string): string {
  return `/dossiers/${encodeURIComponent(dossierId)}/caisse/${suite}`;
}

export async function ouvrirCaisse(_etat: EtatCaisse, donnees: FormData): Promise<EtatCaisse> {
  const dossierId = String(donnees.get("dossierId") ?? "");
  const fondInitial = entier(donnees.get("fondInitial"));
  if (fondInitial === null || Number.isNaN(fondInitial)) {
    return { erreur: "Indiquez le fond de caisse en FCFA (0 s'il n'y en a pas)." };
  }
  const r = await appeler(chemin(dossierId, "session/ouverture"), { fondInitial });
  if (r.statut !== 201 && r.statut !== 200) {
    return { erreur: messageErreur(r) };
  }
  redirect("/envoyer/caisse");
}

export async function fermerCaisse(_etat: EtatCaisse, donnees: FormData): Promise<EtatCaisse> {
  const dossierId = String(donnees.get("dossierId") ?? "");
  const especesComptees = entier(donnees.get("especesComptees"));
  if (especesComptees === null || Number.isNaN(especesComptees)) {
    return { erreur: "Indiquez les espèces comptées dans le tiroir, en FCFA." };
  }
  const r = await appeler(chemin(dossierId, "session/cloture"), { especesComptees });
  if (r.statut !== 200) {
    return { erreur: messageErreur(r) };
  }
  const { especesAttendues, ecart } = r.corps as { especesAttendues: number; ecart: number };
  redirect(`/envoyer/caisse?cloture=1&attendu=${especesAttendues}&compte=${especesComptees}&ecart=${ecart}`);
}

export async function encaisser(_etat: EtatCaisse, donnees: FormData): Promise<EtatCaisse> {
  const dossierId = String(donnees.get("dossierId") ?? "");
  const mode = String(donnees.get("mode") ?? "");
  if (mode !== "ESPECES" && mode !== "MTN_MOMO" && mode !== "ORANGE_MONEY") {
    return { erreur: "Choisissez le mode de paiement." };
  }
  let lignes: { articleId: string; quantite: number }[] = [];
  try {
    const brut: unknown = JSON.parse(String(donnees.get("lignes") ?? "[]"));
    if (Array.isArray(brut)) {
      lignes = brut
        .filter((l): l is { articleId: string; quantite: number } => typeof l?.articleId === "string" && Number.isInteger(l?.quantite) && l.quantite > 0)
        .map((l) => ({ articleId: l.articleId, quantite: l.quantite }));
    }
  } catch {
    lignes = [];
  }
  if (lignes.length === 0) {
    return { erreur: "Ajoutez au moins un article au ticket." };
  }
  const montantRecu = mode === "ESPECES" ? entier(donnees.get("montantRecu")) : null;
  if (Number.isNaN(montantRecu)) {
    return { erreur: "Le montant reçu s'écrit en FCFA, sans décimales." };
  }
  const r = await appeler(chemin(dossierId, "ventes"), { mode, lignes, montantRecu: montantRecu ?? undefined });
  if (r.statut !== 201 && r.statut !== 200) {
    return { erreur: messageErreur(r) };
  }
  const { id } = r.corps as TicketCaisse;
  redirect(`/envoyer/caisse?ticket=${encodeURIComponent(id)}`);
}