// Traduit une action technique (« POST /pieces/:id/valider ») en français pour le journal
const LIBELLES: Record<string, string> = {
  "POST /dossiers": "Création d'un dossier",
  "PATCH /dossiers/:id": "Modification d'un dossier",
  "POST /dossiers/:id/pieces": "Envoi d'une pièce",
  "POST /dossiers/:id/demandes": "Demande de pièce",
  "POST /demandes/:id/annuler": "Demande de pièce annulée",
  "POST /dossiers/:id/exports": "Export vers Sage",
  "POST /pieces/:id/valider": "Validation d'une écriture",
  "POST /pieces/:id/a-completer": "Pièce renvoyée à l'entreprise",
  "POST /invitations": "Invitation envoyée",
  "POST /invitations/:id/annuler": "Invitation annulée",
  "POST /invitations/:id/renouveler": "Invitation renouvelée",
  "POST /rattachements": "Demande pour rejoindre un cabinet",
  "POST /rattachements/:id/annuler": "Demande pour rejoindre un cabinet annulée",
  "POST /rattachements/:id/accepter": "Entreprise acceptée dans le cabinet",
  "POST /rattachements/:id/refuser": "Demande d'entreprise refusée",
  "PUT /facturation/profil": "Fiche de facturation modifiée",
  "POST /facturation/clients": "Client ajouté",
  "PUT /facturation/clients/:id": "Client modifié",
  "POST /facturation/clients/:id/archiver": "Client retiré du carnet",
  "POST /facturation/factures": "Brouillon de facture créé",
  "PUT /facturation/factures/:id": "Brouillon de facture modifié",
  "POST /facturation/factures/:id/supprimer": "Brouillon de facture supprimé",
  "POST /facturation/factures/:id/emettre": "Facture émise",
  "POST /facturation/factures/:id/avoir": "Avoir émis",
  "POST /facturation/factures/:id/partage": "Lien de facture créé",
  "POST /facturation/factures/:id/partage/desactiver": "Lien de facture désactivé",
  "POST /facturation/factures/:id/reglements": "Règlement enregistré",
  "POST /facturation/factures/:id/reglements/:reglementId/supprimer": "Règlement retiré",
  "POST /facturation/factures/:id/relance": "Relance WhatsApp",
  "POST /dossiers/:dossierId/comptabilite/ecritures": "Opération saisie en comptabilité",
  "POST /dossiers/:dossierId/comptabilite/comptes": "Compte ajouté au plan comptable",
  "POST /dossiers/:dossierId/comptabilite/comptabiliser": "Pièces comptabilisées",
  "POST /dossiers/:dossierId/stock/articles": "Article créé",
  "POST /dossiers/:dossierId/caisse/session/ouverture": "Caisse ouverte",
  "POST /dossiers/:dossierId/caisse/session/cloture": "Caisse clôturée",
  "POST /dossiers/:dossierId/caisse/ventes": "Vente encaissée",
  "PATCH /dossiers/:dossierId/stock/articles/:id": "Article modifié",
  "POST /dossiers/:dossierId/stock/articles/:id/mouvements": "Mouvement de stock",
  "POST /dossiers/:dossierId/stock/articles/:id/inventaire": "Inventaire d'un article",
  "POST /auth/deconnexion-partout": "Déconnexion de tous les appareils",
};

export function libelleAction(action: string): string {
  return LIBELLES[action] ?? action;
}

export const LIBELLES_ROLES: Record<string, string> = {
  RESPONSABLE: "Responsable",
  COMPTABLE: "Comptable",
  PME: "Entreprise",
  ADMIN: "Équipe Marly",
};