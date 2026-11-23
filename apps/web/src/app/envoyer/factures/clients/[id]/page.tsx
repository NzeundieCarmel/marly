import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { lireClientFacture, lireProfil } from "@/lib/api";
import { CadreTelephone } from "@/components/cadre-telephone";
import { IconeRetour } from "@/components/icones";
import { archiverClient } from "../../actions";
import { FormulaireClient } from "../formulaire-client";

async function ContenuClient({ parametres }: { parametres: Promise<{ id: string }> }) {
  const { id } = await parametres;
  const [profil, client] = await Promise.all([lireProfil(), lireClientFacture(id)]);
  if (!profil.dossier) {
    redirect("/dossiers");
  }

  return (
    <CadreTelephone nomDossier={profil.dossier.raisonSociale} actif="factures">
      <div className="-ml-2 flex items-center gap-1">
        <Link href="/envoyer/factures/clients" aria-label="Retour à mes clients" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink hover:bg-survol">
          <IconeRetour width={22} height={22} />
        </Link>
        <h1 className="min-w-0 truncate text-xl font-bold text-heading">{client.nom}</h1>
      </div>

      <FormulaireClient client={client} />

      <form action={archiverClient} className="mt-2 flex flex-col gap-2 border-t border-line pt-4">
        <input type="hidden" name="id" value={client.id} />
        <p className="text-[13px] text-muted">
          Le client disparaît de votre carnet. Les factures déjà émises pour lui restent intactes.
        </p>
        <button type="submit" className="h-11 rounded-xl border border-line-strong bg-surface text-[15px] font-medium text-ink hover:bg-survol">
          Retirer de mes clients
        </button>
      </form>
    </CadreTelephone>
  );
}

export default function PageClient({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="p-6 text-muted">Chargement…</p>}>
      <ContenuClient parametres={params} />
    </Suspense>
  );
}