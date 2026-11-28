import { redirect } from "next/navigation";
import { Suspense } from "react";
import { lireProfil, lireSessionCaisse } from "@/lib/api";
import { formatMontant } from "@/lib/format";
import { CadreTelephone } from "@/components/cadre-telephone";
import { EnTeteCompta } from "@/app/envoyer/compta/en-tete";
import { FermerCaisse } from "../formulaires";

async function ContenuCloture() {
  const profil = await lireProfil();
  if (!profil.dossier) {
    redirect("/dossiers");
  }
  const { session } = await lireSessionCaisse(profil.dossier.id);
  if (!session) {
    redirect("/envoyer/caisse");
  }

  return (
    <CadreTelephone nomDossier={profil.dossier.raisonSociale} actif="caisse">
      <EnTeteCompta titre="Clôturer la caisse" retour="/envoyer/caisse" />
      <section className="flex flex-col gap-1 rounded-2xl border border-line bg-surface p-4">
        <dl className="flex flex-col divide-y divide-line text-[15px]">
          <div className="flex justify-between py-2">
            <dt className="text-muted">Fond de caisse</dt>
            <dd className="tabular-nums">{formatMontant(session.fondInitial)} FCFA</dd>
          </div>
          <div className="flex justify-between py-2">
            <dt className="text-muted">Ventes en espèces</dt>
            <dd className="tabular-nums">{formatMontant(session.parMode.ESPECES)} FCFA</dd>
          </div>
          <div className="flex justify-between py-2 font-bold text-heading">
            <dt>Espèces attendues</dt>
            <dd className="tabular-nums">{formatMontant(session.especesAttendues)} FCFA</dd>
          </div>
        </dl>
        <p className="text-[13px] leading-[19px] text-muted">
          Comptez les billets et les pièces du tiroir, puis indiquez le total. Marly calcule l&apos;écart.
        </p>
      </section>
      <FermerCaisse dossierId={profil.dossier.id} attendu={session.especesAttendues} />
    </CadreTelephone>
  );
}

export default function PageCloture() {
  return (
    <Suspense fallback={<p className="p-6 text-muted">Chargement…</p>}>
      <ContenuCloture />
    </Suspense>
  );
}