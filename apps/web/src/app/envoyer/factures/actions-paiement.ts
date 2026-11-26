"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { API_URL, lireFacture, lirePaiement } from "@/lib/api";
import { formatJour } from "@/lib/calcul-facture";
import { lireJeton } from "@/lib/session";
import { lienWhatsApp } from "@/lib/whatsapp";

export interface EtatPaiementAction {
  erreur: string | null;
}

const NOMBRE = new Intl.NumberFormat("fr-FR");

async function poster(chemin: string, corps?: unknown): Promise<string | null> {
  const jeton = await lireJeton();
  if (!jeton) {
    redirect("/connexion");
  }
  let reponse: Response;
  try {
    reponse = await fetch(`${API_URL}${chemin}`, {
      method: "POST",
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
  return message ?? "L'opération a échoué. Réessayez.";
}

export async function enregistrerReglement(_etat: EtatPaiementAction, donnees: FormData): Promise<EtatPaiementAction> {
  const id = String(donnees.get("factureId") ?? "");
  const erreur = await poster(`/facturation/factures/${encodeURIComponent(id)}/reglements`, {
    date: String(donnees.get("date") ?? ""),
    montant: Number(String(donnees.get("montant") ?? "").replace(/\D/g, "")),
    mode: String(donnees.get("mode") ?? ""),
    reference: String(donnees.get("reference") ?? "").trim() || undefined,
  });
  if (erreur) return { erreur };
  redirect(`/envoyer/factures/${encodeURIComponent(id)}`);
}

export async function supprimerReglement(donnees: FormData): Promise<void> {
  const id = String(donnees.get("factureId") ?? "");
  const reglementId = String(donnees.get("reglementId") ?? "");
  await poster(`/facturation/factures/${encodeURIComponent(id)}/reglements/${encodeURIComponent(reglementId)}/supprimer`);
  redirect(`/envoyer/factures/${encodeURIComponent(id)}`);
}

// Note la relance, puis ouvre WhatsApp avec un rappel poli et prérempli
export async function relancerClient(_etat: EtatPaiementAction, donnees: FormData): Promise<EtatPaiementAction> {
  const id = String(donnees.get("factureId") ?? "");
  const erreur = await poster(`/facturation/factures/${encodeURIComponent(id)}/relance`);
  if (erreur) return { erreur };

  const [facture, paiement] = await Promise.all([lireFacture(id), lirePaiement(id)]);
  const entetes = await headers();
  const origine =
    process.env.MARLY_URL_PUBLIQUE ??
    `${entetes.get("x-forwarded-proto") ?? "http"}://${entetes.get("host") ?? "localhost:3001"}`;
  const lien = facture.jetonPartage ? `${origine}/facture/${facture.jetonPartage}` : null;

  const lignes = [
    `Bonjour ${facture.clientDetail.nom},`,
    "",
    `Petit rappel concernant la facture ${facture.numero} du ${formatJour(facture.dateEmission)}, d'un montant de ${NOMBRE.format(paiement.netAPayer)} FCFA.`,
    paiement.montantRegle > 0 ? `Reste à payer : ${NOMBRE.format(paiement.reste)} FCFA.` : null,
    facture.dateEcheance ? `Échéance : ${formatJour(facture.dateEcheance)}.` : null,
    lien ? `La facture : ${lien}` : null,
    "",
    "Merci d'avance,",
    facture.emetteur?.raisonSociale ?? "",
  ].filter((ligne): ligne is string => ligne !== null);

  redirect(lienWhatsApp(facture.clientDetail.telephone, lignes.join("\n")));
}