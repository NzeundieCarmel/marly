import { redirect } from "next/navigation";
import { Suspense } from "react";
import { lireProfil } from "@/lib/api";
import { CadreTelephone } from "@/components/cadre-telephone";
import { seDeconnecter } from "@/app/connexion/actions";

async function ContenuProfil() {
  const profil = await lireProfil();
  if (!profil.dossier) {
    redirect("/dossiers");
  }

  return (
    <CadreTelephone nomDossier={profil.dossier.raisonSociale} actif="profil">
      <h1 className="text-[26px] font-bold leading-8 text-heading">Profil</h1>

      <dl className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="flex flex-col gap-0.5 px-4 py-3">
          <dt className="text-[13px] text-muted">Nom</dt>
          <dd className="text-[15px] font-medium">{profil.nom}</dd>
        </div>
        <div className="flex flex-col gap-0.5 border-t border-line px-4 py-3">
          <dt className="text-[13px] text-muted">E-mail de connexion</dt>
          <dd className="text-[15px]">{profil.email ?? "Non renseigné"}</dd>
        </div>
        <div className="flex flex-col gap-0.5 border-t border-line px-4 py-3">
          <dt className="text-[13px] text-muted">Entreprise</dt>
          <dd className="text-[15px]">{profil.dossier.raisonSociale}</dd>
        </div>
        <div className="flex flex-col gap-0.5 border-t border-line px-4 py-3">
          {profil.autonome ? (
            <>
              <dt className="text-[13px] text-muted">Comptable</dt>
              <dd className="text-[15px]">Aucun pour l&apos;instant</dd>
            </>
          ) : (
            <>
              <dt className="text-[13px] text-muted">Cabinet comptable</dt>
              <dd className="text-[15px]">{profil.cabinet}</dd>
            </>
          )}
        </div>
      </dl>

      <section aria-labelledby="titre-donnees" className="flex flex-col gap-2 rounded-2xl bg-sunken p-4">
        <h2 id="titre-donnees" className="text-base font-bold">Vos données</h2>
        <p className="text-sm leading-5 text-muted">
          {profil.autonome ? (
            <>
              Vos pièces ne sont visibles que par vous. L&apos;équipe Marly ne les consulte que pour
              vous dépanner, à votre demande. Marly range et résume vos pièces, mais ne transmet rien
              aux impôts et ne fait pas vos déclarations.
            </>
          ) : (
            <>
              Vos pièces ne sont visibles que par vous et par votre cabinet comptable. L&apos;équipe
              Marly ne les consulte que pour vous dépanner, à votre demande. Marly ne transmet rien
              aux impôts : votre comptable fait vos déclarations comme d&apos;habitude.
            </>
          )}
        </p>
      </section>

      <form action={seDeconnecter} className="mt-auto">
        <button
          type="submit"
          className="h-12 w-full rounded-xl border border-line-strong bg-surface text-[15px] font-medium text-ink"
        >
          Se déconnecter
        </button>
      </form>
    </CadreTelephone>
  );
}

export default function PageProfil() {
  return (
    <Suspense fallback={<p className="p-6 text-muted">Chargement…</p>}>
      <ContenuProfil />
    </Suspense>
  );
}