"use server";

import { redirect } from "next/navigation";
import { API_URL } from "@/lib/api";
import { lireJeton } from "@/lib/session";

export interface EtatFormulaire {
  erreur: string | null;
  valeurs?: Record<string, string>;
}

const CHAMPS_FICHE = [
  "niu",
  "rccm",
  "formeJuridique",
  "adresse",
  "telephone",
  "email",
  "centreImpots",
  "banque",
  "compte",
  "conditionsPaiement",
  "penalitesRetard",
];
const CHAMPS_CLIENT = ["nom", "niu", "adresse", "telephone", "email"];

// Seuls les champs présents sont envoyés : un champ désactivé (NIU géré par le cabinet) ne part pas
function lireChamps(donnees: FormData, champs: string[]): Record<string, string> {
  const valeurs: Record<string, string> = {};
  for (const champ of champs) {
    if (donnees.has(champ)) valeurs[champ] = String(donnees.get(champ) ?? "");
  }
  return valeurs;
}

// Renvoie le message d'erreur, ou null si tout s'est bien passé
async function appeler(methode: "POST" | "PUT", chemin: string, corps?: unknown): Promise<string | null> {
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
    return "Le serveur Marly est injoignable. Réessayez dans un instant.";
  }
  if (reponse.status === 401) {
    redirect("/connexion?expiree=1");
  }
  if (reponse.ok) return null;
  const contenu = (await reponse.json().catch(() => null)) as { message?: string | string[] } | null;
  const message = Array.isArray(contenu?.message) ? contenu.message[0] : contenu?.message;
  return message ?? "L'enregistrement a échoué. Réessayez.";
}

export async function enregistrerFiche(_etat: EtatFormulaire, donnees: FormData): Promise<EtatFormulaire> {
  const valeurs = lireChamps(donnees, CHAMPS_FICHE);
  const erreur = await appeler("PUT", "/facturation/profil", valeurs);
  if (erreur) return { erreur, valeurs };
  redirect("/envoyer/factures?fiche=1");
}

export async function enregistrerClient(_etat: EtatFormulaire, donnees: FormData): Promise<EtatFormulaire> {
  const id = String(donnees.get("id") ?? "");
  const valeurs = lireChamps(donnees, CHAMPS_CLIENT);
  const erreur = id
    ? await appeler("PUT", `/facturation/clients/${encodeURIComponent(id)}`, valeurs)
    : await appeler("POST", "/facturation/clients", valeurs);
  if (erreur) return { erreur, valeurs };
  redirect("/envoyer/factures/clients?enregistre=1");
}

export async function archiverClient(donnees: FormData): Promise<void> {
  const id = String(donnees.get("id") ?? "");
  await appeler("POST", `/facturation/clients/${encodeURIComponent(id)}/archiver`);
  redirect("/envoyer/factures/clients?retire=1");
}