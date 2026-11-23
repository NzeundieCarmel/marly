import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { lireProfil, lireProfilEmetteur } from "@/lib/api";
import { CadreTelephone } from "@/components/cadre-telephone";
import { IconeRetour } from "@/components/icones";
import { FormulaireFiche } from "./formulaire-fiche";

async function ContenuFiche() {
  const [profil, emetteur] = await Promise.all([lireProfil(), lireProfilEmetteur()]);
  if (!profil.dossier) {
    redirect("/dossiers");
  }

  return (
    <CadreTelephone nomDossier={profil.dossier.raisonSociale} actif="factures">
      <div className="-ml-2 flex items-center gap-1">
        <Link href="/envoyer/factures" aria-label="Retour aux factures" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink hover:bg-survol">
          <IconeRetour width={22} height={22} />
        </Link>
        <h1 className="text-xl font-bold text-heading">Ma fiche de facturation</h1>
      </div>

      <p className="text-sm leading-5 text-muted">
        Ces informations figurent en tête de chacune de vos factures.{" "}
        <strong className="text-ink">{emetteur.raisonSociale}</strong> ·{" "}
        {emetteur.regime === "REEL" ? "Régime du réel" : "IGS"}
      </p>

      <FormulaireFiche profil={emetteur} />
    </CadreTelephone>
  );
}

export default function PageFicheFacturation() {
  return (
    <Suspense fallback={<p className="p-6 text-muted">Chargement…</p>}>
      <ContenuFiche />
    </Suspense>
  );
}