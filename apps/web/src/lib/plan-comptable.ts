// Intitulés courts des comptes SYSCOHADA proposés par Marly, pour l'affichage
const INTITULES: Record<string, string> = {
  "401": "Fournisseurs",
  "4452": "TVA récupérable sur achats",
  "521": "Banques",
  "571": "Caisse",
  "601": "Achats de marchandises",
  "6051": "Eau",
  "6052": "Électricité",
  "6055": "Fournitures de bureau",
  "618": "Autres frais de transport",
  "628": "Frais de télécommunications",
  "658": "Charges diverses",
};

export function intitule(compte: string): string {
  return INTITULES[compte.trim()] ?? "";
}