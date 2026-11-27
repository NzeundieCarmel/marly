"use server";

import { redirect } from "next/navigation";
import { API_URL, type FicheArticle } from "@/lib/api";
import { lireJeton } from "@/lib/session";

export interface EtatFormulaire {
  erreur: string | null;
}

type Reponse = { statut: number; corps: unknown };

// Appel de l'API avec la session ; l'expiration renvoie vers la connexion, hors de tout try
async function appeler(methode: "POST" | "PATCH", chemin: string, corps: unknown): Promise<Reponse> {
  const jeton = await lireJeton();
  if (!jeton) {
    redirect("/connexion");
  }
  let reponse: Response | null = null;
  try {
    reponse = await fetch(`${API_URL}${chemin}`, {
      method: methode,
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
  if (r.statut === 403) return "Seule l'entreprise peut modifier son stock.";
  if (r.statut === 409) {
    const m = (r.corps as { message?: string } | null)?.message ?? "";
    return m.startsWith("Stock insuffisant") ? m.replace("disponible(s)", "disponible(s) seulement.") : "Cette référence est déjà utilisée par un autre article.";
  }
  const message = (r.corps as { message?: string | string[] } | null)?.message;
  const texte = Array.isArray(message) ? message[0] : message;
  return texte ? `L'opération a été refusée : ${texte}` : "L'opération a été refusée.";
}

// Un nombre entier saisi avec ou sans espaces ; null si vide, NaN si invalide
function entier(valeur: FormDataEntryValue | null): number | null {
  const texte = String(valeur ?? "").replace(/[\s  ]/g, "");
  if (texte === "") return null;
  return /^\d+$/.test(texte) ? Number(texte) : Number.NaN;
}

function chemin(dossierId: string, suite: string): string {
  return `/dossiers/${encodeURIComponent(dossierId)}/stock/${suite}`;
}

export async function creerArticle(_etat: EtatFormulaire, donnees: FormData): Promise<EtatFormulaire> {
  const dossierId = String(donnees.get("dossierId") ?? "");
  const nom = String(donnees.get("nom") ?? "").trim();
  const reference = String(donnees.get("reference") ?? "").trim();
  const prixVente = entier(donnees.get("prixVente"));
  const seuilAlerte = entier(donnees.get("seuilAlerte"));
  const suiviStock = donnees.get("suiviStock") === "on";
  const quantiteInitiale = entier(donnees.get("quantiteInitiale"));
  const coutInitial = entier(donnees.get("coutInitial"));

  if (nom.length < 2) return { erreur: "Indiquez le nom de l'article." };
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,29}$/.test(reference)) {
    return { erreur: "La référence ne peut contenir que des lettres, des chiffres, des points et des tirets." };
  }
  if (prixVente === null || Number.isNaN(prixVente)) return { erreur: "Indiquez le prix de vente en FCFA, sans décimales." };
  if (Number.isNaN(seuilAlerte) || Number.isNaN(quantiteInitiale) || Number.isNaN(coutInitial)) {
    return { erreur: "Les quantités et les coûts s'écrivent en nombres entiers." };
  }
  if (suiviStock && quantiteInitiale && coutInitial === null) {
    return { erreur: "Indiquez le coût d'achat unitaire du stock de départ." };
  }

  const r = await appeler("POST", chemin(dossierId, "articles"), {
    nom,
    reference,
    categorie: String(donnees.get("categorie") ?? "").trim() || undefined,
    unite: String(donnees.get("unite") ?? "unité"),
    prixVente,
    tauxTva: donnees.get("tauxTva") === "0" ? 0 : 1925,
    suiviStock,
    seuilAlerte: seuilAlerte ?? 0,
    quantiteInitiale: suiviStock ? (quantiteInitiale ?? 0) : 0,
    coutInitial: coutInitial ?? undefined,
  });
  if (r.statut !== 201 && r.statut !== 200) {
    return { erreur: messageErreur(r) };
  }
  const { id } = r.corps as FicheArticle;
  redirect(`/envoyer/stock/${encodeURIComponent(id)}?ok=cree`);
}

export async function mouvementStock(_etat: EtatFormulaire, donnees: FormData): Promise<EtatFormulaire> {
  const dossierId = String(donnees.get("dossierId") ?? "");
  const articleId = String(donnees.get("articleId") ?? "");
  const type = donnees.get("type") === "SORTIE" ? "SORTIE" : "ENTREE";
  const quantite = entier(donnees.get("quantite"));
  const coutUnitaire = entier(donnees.get("coutUnitaire"));
  if (!quantite) return { erreur: "Indiquez une quantité supérieure à zéro." };
  if (type === "ENTREE" && (coutUnitaire === null || Number.isNaN(coutUnitaire))) {
    return { erreur: "Indiquez le coût d'achat unitaire, en FCFA." };
  }
  const r = await appeler("POST", chemin(dossierId, `articles/${encodeURIComponent(articleId)}/mouvements`), {
    type,
    quantite,
    coutUnitaire: type === "ENTREE" ? coutUnitaire : undefined,
    motif: String(donnees.get("motif") ?? "").trim().slice(0, 120) || undefined,
  });
  if (r.statut !== 201 && r.statut !== 200) {
    return { erreur: messageErreur(r) };
  }
  redirect(`/envoyer/stock/${encodeURIComponent(articleId)}?ok=${type === "ENTREE" ? "entree" : "sortie"}`);
}

export async function inventaireStock(_etat: EtatFormulaire, donnees: FormData): Promise<EtatFormulaire> {
  const dossierId = String(donnees.get("dossierId") ?? "");
  const articleId = String(donnees.get("articleId") ?? "");
  const quantiteReelle = entier(donnees.get("quantiteReelle"));
  if (quantiteReelle === null || Number.isNaN(quantiteReelle)) {
    return { erreur: "Indiquez la quantité comptée dans la boutique." };
  }
  const r = await appeler("POST", chemin(dossierId, `articles/${encodeURIComponent(articleId)}/inventaire`), {
    quantiteReelle,
  });
  if (r.statut !== 200) {
    return { erreur: messageErreur(r) };
  }
  redirect(`/envoyer/stock/${encodeURIComponent(articleId)}?ok=inventaire`);
}

export async function modifierArticle(_etat: EtatFormulaire, donnees: FormData): Promise<EtatFormulaire> {
  const dossierId = String(donnees.get("dossierId") ?? "");
  const articleId = String(donnees.get("articleId") ?? "");
  const prixVente = entier(donnees.get("prixVente"));
  const seuilAlerte = entier(donnees.get("seuilAlerte"));
  if (prixVente === null || Number.isNaN(prixVente)) return { erreur: "Indiquez le prix de vente en FCFA." };
  if (Number.isNaN(seuilAlerte)) return { erreur: "Le seuil d'alerte s'écrit en nombre entier." };
  const r = await appeler("PATCH", chemin(dossierId, `articles/${encodeURIComponent(articleId)}`), {
    prixVente,
    seuilAlerte: seuilAlerte ?? 0,
  });
  if (r.statut !== 200) {
    return { erreur: messageErreur(r) };
  }
  redirect(`/envoyer/stock/${encodeURIComponent(articleId)}?ok=modifie`);
}