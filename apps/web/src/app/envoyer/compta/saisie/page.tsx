import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { lireProfil } from "@/lib/api";
import { CadreTelephone } from "@/components/cadre-telephone";
import { EnTeteCompta } from "../en-tete";
import { FormulaireOperation } from "./formulaire-operation";

async function ContenuSaisie() {
  const profil = await lireProfil();
  if (!profil.dossier) {
    redirect("/dossiers");
  }
  // La comptabilité d'une entreprise suivie par un cabinet est tenue par le cabinet
  if (!profil.autonome) {
    redirect("/envoyer/compta");
  }
  await connection();
  const aujourdhui = new Date().toLocaleDateString("sv-SE", { timeZone: "Africa/Douala" });

  return (
    <CadreTelephone nomDossier={profil.dossier.raisonSociale} actif="compta">
      <EnTeteCompta titre="Saisir une opération" />
      <FormulaireOperation dossierId={profil.dossier.id} aujourdhui={aujourdhui} />
    </CadreTelephone>
  );
}

export default function PageSaisie() {
  return (
    <Suspense fallback={<p className="p-6 text-muted">Chargement…</p>}>
      <ContenuSaisie />
    </Suspense>
  );
}