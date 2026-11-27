import { redirect } from "next/navigation";
import { Suspense } from "react";
import { lireProfil } from "@/lib/api";
import { CadreTelephone } from "@/components/cadre-telephone";
import { EnTeteCompta } from "@/app/envoyer/compta/en-tete";
import { FormulaireArticle } from "../formulaires";

async function ContenuNouvelArticle() {
  const profil = await lireProfil();
  if (!profil.dossier) {
    redirect("/dossiers");
  }
  return (
    <CadreTelephone nomDossier={profil.dossier.raisonSociale} actif="stock">
      <EnTeteCompta titre="Nouvel article" retour="/envoyer/stock" />
      <FormulaireArticle dossierId={profil.dossier.id} />
    </CadreTelephone>
  );
}

export default function PageNouvelArticle() {
  return (
    <Suspense fallback={<p className="p-6 text-muted">Chargement…</p>}>
      <ContenuNouvelArticle />
    </Suspense>
  );
}