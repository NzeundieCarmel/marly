import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { lireProfil, listerDevis } from "@/lib/api";
import { formatJour } from "@/lib/calcul-facture";
import { CadreTelephone } from "@/components/cadre-telephone";
import { IconeRetour } from "@/components/icones";
import { Pastille } from "@/components/pastille";
import { STATUTS_DEVIS } from "./statuts";

type Recherche = Promise<Record<string, string | string[] | undefined>>;

const NOMBRE = new Intl.NumberFormat("fr-FR");

async function ContenuDevis({ recherche }: { recherche: Recherche }) {
  const [profil, devis, p] = await Promise.all([lireProfil(), listerDevis(), recherche]);
  if (!profil.dossier) {
    redirect("/dossiers");
  }
  const enCours = devis.filter((d) => d.statut === "EN_COURS" || d.statut === "ACCEPTE").reduce((s, d) => s + d.totalTtc, 0);

  return (
    <CadreTelephone nomDossier={profil.dossier.raisonSociale} actif="factures">
      <div className="-ml-2 flex items-center gap-1">
        <Link href="/envoyer/factures" aria-label="Retour aux factures" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink hover:bg-survol">
          <IconeRetour width={22} height={22} />
        </Link>
        <h1 className="text-xl font-bold text-heading">Mes devis</h1>
      </div>

      {p.supprime === "1" && (
        <p role="status" className="rounded-xl bg-neutral-bg p-3 text-sm text-neutral-ink">Devis supprimé.</p>
      )}

      <Link href="/envoyer/factures/devis/nouveau" className="flex h-[52px] items-center justify-center rounded-xl bg-action text-base font-bold text-white hover:bg-action-hover">
        Nouveau devis
      </Link>

      {enCours > 0 && (
        <section className="flex flex-col gap-0.5 rounded-2xl border border-line bg-surface p-4">
          <span className="text-sm text-muted">Devis en attente de facturation</span>
          <strong className="text-[22px] leading-7 text-heading tabular-nums">{NOMBRE.format(enCours)} FCFA</strong>
        </section>
      )}

      {devis.length === 0 ? (
        <p className="rounded-2xl border border-line bg-surface p-4 text-sm text-muted">
          Aucun devis pour l&apos;instant. Un devis accepté devient une facture en un geste.
        </p>
      ) : (
        <ul aria-label="Vos devis" className="overflow-hidden rounded-2xl border border-line bg-surface">
          {devis.map((d, i) => {
            const s = STATUTS_DEVIS[d.statut];
            return (
              <li key={d.id} className={i > 0 ? "border-t border-line" : ""}>
                <Link href={`/envoyer/factures/devis/${encodeURIComponent(d.id)}`} className="flex items-center gap-3 px-4 py-3 hover:bg-survol">
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-[15px] font-medium">
                      {d.numero} · {d.client}
                    </span>
                    <span className="text-[13px] text-muted tabular-nums">
                      {formatJour(d.dateDevis)} · {NOMBRE.format(d.totalTtc)} FCFA
                    </span>
                  </span>
                  <Pastille ton={s.ton}>{s.texte}</Pastille>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </CadreTelephone>
  );
}

export default function PageDevis({ searchParams }: { searchParams: Recherche }) {
  return (
    <Suspense fallback={<p className="p-6 text-muted">Chargement…</p>}>
      <ContenuDevis recherche={searchParams} />
    </Suspense>
  );
}