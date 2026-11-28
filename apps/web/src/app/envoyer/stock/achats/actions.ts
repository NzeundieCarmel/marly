"use server";

import { redirect } from "next/navigation";
import { API_URL, type Achat } from "@/lib/api";
import { lireJeton } from "@/lib/session";

export interface EtatAchat {
  erreur: string | null;
}

type Reponse = { statut: number; corps: unknown };

// Appel de l'API avec la session ; l'expiration renvoie vers la connexion, hors de tout try
async function appeler(chemin: string, corps?: unknown): Promise<Reponse> {
  const jeton = await lireJeton();
  if (!jeton) {
    redirect("/connexion");
  }
  let reponse: Response | null = null;
  try {
    reponse = await fetch(`${API_URL}${chemin}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${jeton}`, "Content-Type": "application/json" },
      body: corps === undefined ? undefined : JSON.stringify(corps),
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
  if (r.statut === 403) return "Seule l'entreprise peut enregistrer ses achats.";
  const message = (r.corps as { message?: string | string[] } | null)?.message;
  const texte = Array.isArray(message) ? message[0] : message;
  return texte ? `${texte}.`.replace(/\.\.$/, ".") : "L'opération a été refusée.";
}

export async function enregistrerAchat(_etat: EtatAchat, donnees: FormData): Promise<EtatAchat> {
  const dossierId = String(donnees.get("dossierId") ?? "");
  let lignes: { articleId: string; quantite: number; coutUnitaire: number }[] = [];
  try {
    const brut: unknown = JSON.parse(String(donnees.get("lignes") ?? "[]"));
    if (Array.isArray(brut)) {
      lignes = brut.filter(
        (l): l is { articleId: string; quantite: number; coutUnitaire: number } =>
          typeof l?.articleId === "string" && l.articleId !== "" && Number.isInteger(l?.quantite) && Number.isInteger(l?.coutUnitaire),
      );
    }
  } catch {
    lignes = [];
  }
  if (lignes.length === 0) {
    return { erreur: "Ajoutez au moins un article, avec sa quantité et son coût." };
  }
  if (lignes.some((l) => l.quantite <= 0)) {
    return { erreur: "Chaque quantité doit être supérieure à zéro." };
  }
  const r = await appeler(`/dossiers/${encodeURIComponent(dossierId)}/achats`, {
    fournisseur: String(donnees.get("fournisseur") ?? "").trim(),
    referenceFournisseur: String(donnees.get("referenceFournisseur") ?? "").trim() || undefined,
    date: String(donnees.get("date") ?? ""),
    avecTva: donnees.get("avecTva") === "on",
    paiement: String(donnees.get("paiement") ?? "A_CREDIT"),
    lignes,
  });
  if (r.statut !== 201 && r.statut !== 200) {
    return { erreur: messageErreur(r) };
  }
  const { id } = r.corps as Achat;
  redirect(`/envoyer/stock/achats/${encodeURIComponent(id)}?ok=1`);
}

export async function annulerAchat(_etat: EtatAchat, donnees: FormData): Promise<EtatAchat> {
  const dossierId = String(donnees.get("dossierId") ?? "");
  const id = String(donnees.get("id") ?? "");
  const r = await appeler(`/dossiers/${encodeURIComponent(dossierId)}/achats/${encodeURIComponent(id)}/annuler`);
  if (r.statut !== 200) {
    return { erreur: messageErreur(r) };
  }
  redirect(`/envoyer/stock/achats/${encodeURIComponent(id)}?annule=1`);
}
export async function reglerAchat(_etat: EtatAchat, donnees: FormData): Promise<EtatAchat> {
  const dossierId = String(donnees.get("dossierId") ?? "");
  const id = String(donnees.get("id") ?? "");
  const montant = Number(String(donnees.get("montant") ?? "").replace(/[\s  ]/g, ""));
  if (!Number.isInteger(montant) || montant <= 0) {
    return { erreur: "Indiquez le montant payé, en FCFA, sans décimales." };
  }
  const r = await appeler(`/dossiers/${encodeURIComponent(dossierId)}/achats/${encodeURIComponent(id)}/reglements`, {
    date: String(donnees.get("date") ?? ""),
    montant,
    mode: String(donnees.get("mode") ?? ""),
  });
  if (r.statut !== 200) {
    return { erreur: messageErreur(r) };
  }
  redirect(`/envoyer/stock/achats/${encodeURIComponent(id)}?paye=1`);
}