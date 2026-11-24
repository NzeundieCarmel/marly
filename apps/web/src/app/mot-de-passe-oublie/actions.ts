"use server";

import { headers } from "next/headers";
import { API_URL } from "@/lib/api";
import { entetesRelais } from "@/lib/entetes-relais";

export interface EtatMotDePasse {
  etape: "demande" | "code" | "termine";
  email: string;
  erreur: string | null;
}

async function poster(chemin: string, corps: unknown): Promise<string | null> {
  const ip = ((await headers()).get("x-forwarded-for") ?? "").split(",")[0].trim();
  let reponse: Response;
  try {
    reponse = await fetch(`${API_URL}${chemin}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...entetesRelais(ip) },
      body: JSON.stringify(corps),
      cache: "no-store",
    });
  } catch {
    return "Le serveur Marly est injoignable. Réessayez dans un instant.";
  }
  if (reponse.ok) return null;
  const contenu = (await reponse.json().catch(() => null)) as { message?: string | string[] } | null;
  const message = Array.isArray(contenu?.message) ? contenu.message[0] : contenu?.message;
  return message ?? "L'opération a échoué. Réessayez.";
}

async function demanderCode(donnees: FormData): Promise<EtatMotDePasse> {
  const email = String(donnees.get("email") ?? "").trim().toLowerCase();
  const erreur = await poster("/auth/mot-de-passe/demande", { email });
  return erreur ? { etape: "demande", email, erreur } : { etape: "code", email, erreur: null };
}

async function changerMotDePasse(donnees: FormData): Promise<EtatMotDePasse> {
  const email = String(donnees.get("email") ?? "");
  const motDePasse = String(donnees.get("motDePasse") ?? "");
  if (motDePasse !== String(donnees.get("confirmation") ?? "")) {
    return { etape: "code", email, erreur: "Les deux mots de passe ne correspondent pas." };
  }
  const erreur = await poster("/auth/mot-de-passe/reinitialiser", {
    email,
    code: String(donnees.get("code") ?? ""),
    motDePasse,
  });
  return erreur ? { etape: "code", email, erreur } : { etape: "termine", email, erreur: null };
}

// Une seule action pour les deux étapes : le champ caché « etape » dit laquelle
export async function traiter(_etat: EtatMotDePasse, donnees: FormData): Promise<EtatMotDePasse> {
  return donnees.get("etape") === "code" ? changerMotDePasse(donnees) : demanderCode(donnees);
}