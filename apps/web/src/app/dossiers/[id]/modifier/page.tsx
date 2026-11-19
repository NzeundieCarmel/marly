import Link from "next/link";
import { Suspense } from "react";
import { lireDossier } from "@/lib/api";
import { modifierDossier } from "../../actions";
import { FormulaireDossier } from "../../formulaire-dossier";

async function ContenuModifier({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dossier = await lireDossier(id);

  return (
    <>
      <nav aria-label="Fil d'Ariane" className="mb-4 text-sm text-marly-gris">
        <Link href={`/dossiers/${dossier.id}`} className="underline">
          ← {dossier.raisonSociale}
        </Link>
      </nav>
      <h1 className="mb-6 text-3xl font-bold text-marly-bleu">Modifier le dossier</h1>
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
      <p className="mt-4 text-sm text-marly-gris">
        Changer de régime ne modifie pas les écritures déjà validées : seules les prochaines
        propositions en tiennent compte.
      </p>
    </>
  );
}

export default function PageModifierDossier({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className="mx-auto max-w-2xl p-6">
      <Suspense fallback={<p className="text-marly-gris">Chargement du dossier…</p>}>
        <ContenuModifier params={params} />
      </Suspense>
    </main>
  );
}