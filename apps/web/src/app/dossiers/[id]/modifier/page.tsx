import Link from "next/link";
import { Suspense } from "react";
import { lireDossier } from "@/lib/api";
import { CadreCabinet } from "@/components/cadre-cabinet";
import { modifierDossier } from "../../actions";
import { FormulaireDossier } from "../../formulaire-dossier";

async function ContenuModifier({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dossier = await lireDossier(id);

  return (
    <CadreCabinet actif="dossiers">
      <nav aria-label="Fil d'Ariane" className="flex flex-wrap gap-2 text-sm text-muted">
        <Link href="/dossiers" className="underline">Dossiers clients</Link>
        <span aria-hidden="true">›</span>
        <Link href={`/dossiers/${dossier.id}`} className="underline">{dossier.raisonSociale}</Link>
        <span aria-hidden="true">›</span>
        <span>Modifier</span>
      </nav>
      <h1 className="text-[28px] font-bold leading-[34px] text-heading">Modifier le dossier</h1>
      <div className="flex max-w-2xl flex-col gap-4">
        <FormulaireDossier
          action={modifierDossier.bind(null, dossier.id)}
          initial={{
            raisonSociale: dossier.raisonSociale,
            regime: dossier.regime,
            niu: dossier.niu ?? "",
            rccm: dossier.rccm ?? "",
          }}
          libelleBouton="Enregistrer les modifications"
          annulerVers={`/dossiers/${dossier.id}`}
        />
        <p className="text-sm text-muted">
          Changer de régime ne modifie pas les écritures déjà validées : seules les prochaines
          propositions en tiennent compte.
        </p>
      </div>
    </CadreCabinet>
  );
}

export default function PageModifierDossier({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="p-6 text-muted">Chargement du dossier…</p>}>
      <ContenuModifier params={params} />
    </Suspense>
  );
}