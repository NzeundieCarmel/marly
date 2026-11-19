"use server";

import { redirect } from "next/navigation";
import { API_URL } from "@/lib/api";
import { lireJeton } from "@/lib/session";

export interface ValeursDossier {
  raisonSociale: string;
  regime: string;
  niu: string;
  rccm: string;
}

export interface EtatDossier {
  erreur: string | null;
  valeurs?: ValeursDossier;
}

function lireValeurs(donnees: FormData): ValeursDossier {
  return {
    raisonSociale: String(donnees.get("raisonSociale") ?? ""),
    regime: String(donnees.get("regime") ?? ""),
    niu: String(donnees.get("niu") ?? ""),
    rccm: String(donnees.get("rccm") ?? ""),
  };
}

async function enregistrer(
  methode: "POST" | "PATCH",
  chemin: string,
  donnees: FormData,
): Promise<EtatDossier> {
  const valeurs = lireValeurs(donnees);
  const jeton = await lireJeton();
  if (!jeton) {
    redirect("/connexion");
  }

  let reponse: Response;
  try {
    reponse = await fetch(`${API_URL}${chemin}`, {
      method: methode,
      headers: { Authorization: `Bearer ${jeton}`, "Content-Type": "application/json" },
      body: JSON.stringify(valeurs),
      cache: "no-store",
    });
  } catch {
    return { erreur: "Le serveur Marly est injoignable. Réessaie dans un instant.", valeurs };
  }

  if (reponse.status === 401) {
    redirect("/connexion?expiree=1");
  }

  const corps = (await reponse.json().catch(() => null)) as
    | { id?: string; message?: string | string[] }
    | null;
  if (!reponse.ok || !corps?.id) {
    const message = Array.isArray(corps?.message) ? corps.message[0] : corps?.message;
    return { erreur: message ?? "L'enregistrement a échoué. Réessaie.", valeurs };
  }

  redirect(`/dossiers/${corps.id}`);
}

export async function creerDossier(_etat: EtatDossier, donnees: FormData): Promise<EtatDossier> {
  return enregistrer("POST", "/dossiers", donnees);
}

export async function modifierDossier(
  dossierId: string,
  _etat: EtatDossier,
  donnees: FormData,
): Promise<EtatDossier> {
  return enregistrer("PATCH", `/dossiers/${encodeURIComponent(dossierId)}`, donnees);
}