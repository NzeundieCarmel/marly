import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { lireMonRattachement, lireProfil, listerComptables } from "@/lib/api";
import { CadreTelephone } from "@/components/cadre-telephone";
import { IconeRetour } from "@/components/icones";
import { annulerDemande } from "./actions";
import { FormulaireDemande } from "./formulaire-demande";

function dateDe(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "Africa/Douala" });
}

async function ContenuComptable() {
  const profil = await lireProfil();
  if (!profil.dossier) {
    redirect("/dossiers");
  }

  const entete = (
    <div className="-ml-2 flex items-center gap-1">
      <Link
        href="/envoyer/profil"
        aria-label="Retour au profil"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink hover:bg-survol"
      >
        <IconeRetour width={22} height={22} />
      </Link>
      <h1 className="text-xl font-bold text-heading">Trouver un comptable</h1>
    </div>
  );

  // Entreprise déjà suivie par un cabinet
  if (!profil.autonome) {
    return (
      <CadreTelephone nomDossier={profil.dossier.raisonSociale} actif="profil">
        {entete}
        <p className="rounded-2xl bg-success-bg p-4 text-[15px] text-success-ink">
          Votre entreprise est suivie par <strong>{profil.cabinet}</strong>. Vos pièces lui sont envoyées
          automatiquement.
        </p>
      </CadreTelephone>
    );
  }

  const [demande, comptables] = await Promise.all([lireMonRattachement(), listerComptables()]);

  return (
    <CadreTelephone nomDossier={profil.dossier.raisonSociale} actif="profil">
      {entete}

      {demande?.statut === "EN_ATTENTE" ? (
        <section aria-labelledby="titre-demande" className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
          <h2 id="titre-demande" className="text-base font-bold text-heading">Demande envoyée</h2>
          <p className="text-[15px] leading-[22px]">
            Vous avez écrit à <strong>{demande.cabinet}</strong> le {dateDe(demande.creeLe)}. Le cabinet vous
            contactera par e-mail. En attendant, continuez à ranger vos pièces comme d&apos;habitude.
          </p>
          <form action={annulerDemande}>
            <input type="hidden" name="id" value={demande.id} />
            <button
              type="submit"
              className="h-11 w-full rounded-xl border border-line-strong bg-surface text-[15px] font-medium text-ink hover:bg-survol"
            >
              Annuler la demande
            </button>
          </form>
        </section>
      ) : (
        <>
          {demande?.statut === "REFUSEE" && (
            <p role="status" className="rounded-xl bg-warning-bg p-3 text-sm text-warning-ink">
              {demande.cabinet} n&apos;a pas pu accepter votre demande. Vous pouvez en choisir un autre.
            </p>
          )}

          <section className="flex flex-col gap-2 rounded-2xl bg-sunken p-4 text-sm leading-5 text-muted">
            <h2 className="text-base font-bold text-ink">Comment ça se passe</h2>
            <p>1. Vous choisissez un cabinet partenaire de Marly.</p>
            <p>
              2. Le cabinet voit le nom de votre entreprise, votre nom, votre e-mail et le nombre de pièces
              rangées. Il ne voit pas vos pièces.
            </p>
            <p>
              3. S&apos;il accepte, il reprend vos pièces déjà rangées. Vous continuez à les envoyer comme
              aujourd&apos;hui.
            </p>
          </section>

          {comptables.length === 0 ? (
            <p className="rounded-2xl border border-line bg-surface p-5 text-muted">
              Aucun cabinet partenaire n&apos;est disponible pour l&apos;instant. Revenez bientôt.
            </p>
          ) : (
            <FormulaireDemande comptables={comptables} />
          )}
        </>
      )}
    </CadreTelephone>
  );
}

export default function PageTrouverComptable() {
  return (
    <Suspense fallback={<p className="p-6 text-muted">Chargement…</p>}>
      <ContenuComptable />
    </Suspense>
  );
}