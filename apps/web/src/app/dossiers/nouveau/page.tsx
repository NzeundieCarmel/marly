import Link from "next/link";
import { creerDossier } from "../actions";
import { FormulaireDossier } from "../formulaire-dossier";

export default function PageNouveauDossier() {
  return (
    <main className="mx-auto max-w-2xl p-6">
      <nav aria-label="Fil d'Ariane" className="mb-4 text-sm text-muted">
        <Link href="/dossiers" className="underline">← Dossiers du cabinet</Link>
      </nav>
      <h1 className="mb-2 text-3xl font-bold text-heading">Nouveau dossier client</h1>
      <p className="mb-6 text-muted">
        Un dossier par entreprise suivie. Tu pourras ensuite inviter son gérant à envoyer ses
        pièces.
      </p>
      <FormulaireDossier
        action={creerDossier}
        initial={{ raisonSociale: "", regime: "REEL", niu: "", rccm: "" }}
        libelleBouton="Créer le dossier"
        annulerVers="/dossiers"
      />
    </main>
  );
}