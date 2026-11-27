// Opérations courantes saisies sans parler de débit ni de crédit

export const TRESORERIES: Record<string, { compte: string; journal: string; libelle: string }> = {
  caisse: { compte: "571", journal: "CA", libelle: "Caisse" },
  banque: { compte: "521", journal: "BQ", libelle: "Banque" },
  momo: { compte: "552", journal: "MM", libelle: "Mobile Money" },
};

export const OPERATIONS = [
  { valeur: "depense", libelle: "Dépense payée", avecTresorerie: true },
  { valeur: "apport", libelle: "Apport d'argent dans l'entreprise", avecTresorerie: true },
  { valeur: "prelevement", libelle: "Retrait d'argent par le gérant", avecTresorerie: true },
  { valeur: "depot-banque", libelle: "Dépôt de la caisse en banque", avecTresorerie: false },
  { valeur: "retrait-banque", libelle: "Retrait de la banque vers la caisse", avecTresorerie: false },
  { valeur: "depot-momo", libelle: "Dépôt de la caisse sur Mobile Money", avecTresorerie: false },
  { valeur: "retrait-momo", libelle: "Retrait Mobile Money vers la caisse", avecTresorerie: false },
] as const;

export const CHARGES = [
  { compte: "601", libelle: "Achats de marchandises" },
  { compte: "6052", libelle: "Électricité" },
  { compte: "6051", libelle: "Eau" },
  { compte: "6053", libelle: "Carburant et autres énergies" },
  { compte: "6055", libelle: "Fournitures de bureau" },
  { compte: "6056", libelle: "Petit matériel et outillage" },
  { compte: "618", libelle: "Transport" },
  { compte: "6222", libelle: "Loyer" },
  { compte: "624", libelle: "Entretien et réparations" },
  { compte: "625", libelle: "Assurance" },
  { compte: "627", libelle: "Publicité" },
  { compte: "628", libelle: "Téléphone et internet" },
  { compte: "631", libelle: "Frais bancaires et Mobile Money" },
  { compte: "6324", libelle: "Honoraires" },
  { compte: "641", libelle: "Impôts et taxes" },
  { compte: "658", libelle: "Autres dépenses" },
];

export const APPORTS = [
  { compte: "104", libelle: "Entreprise individuelle : apport de l'exploitant" },
  { compte: "101", libelle: "Société : apport en capital" },
];