import Link from "next/link";
import { Suspense } from "react";
import { CadreCabinet } from "@/components/cadre-cabinet";
import { creerDossier } from "../actions";
import { FormulaireDossier } from "../formulaire-dossier";

function ContenuNouveau() {
  return (
    <CadreCabinet actif="dossiers">
      <nav aria-label="Fil d'Ariane" className="flex flex-wrap gap-2 text-sm text-muted">
        <Link href="/dossiers" className="underline">Dossiers clients</Link>
        <span aria-hidden="true">›</span>
        <span>Nouveau dossier</span>
      </nav>
      <div className="flex max-w-2xl flex-col gap-2">
        <h1 className="text-[28px] font-bold leading-[34px] text-heading">Nouveau dossier client</h1>
        <p className="text-muted">
          Un dossier par entreprise suivie. Tu pourras ensuite inviter son gérant à envoyer ses pièces.
        </p>
      </div>
      <div className="max-w-2xl">
        <FormulaireDossier
          action={creerDossier}
          initial={{ raisonSociale: "", regime: "REEL", niu: "", rccm: "" }}
          libelleBouton="Créer le dossier"
          annulerVers="/dossiers"
        />
      </div>
    </CadreCabinet>
  );
}

export default function PageNouveauDossier() {
  return (
    <Suspense fallback={<p className="p-6 text-muted">Chargement…</p>}>
      <ContenuNouveau />
    </Suspense>
  );
}