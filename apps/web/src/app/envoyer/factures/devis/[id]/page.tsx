import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { lireDevis, lireProfil, lireProfilEmetteur, listerArticles, listerClientsFacture } from "@/lib/api";
import { formatJour, formatTaux } from "@/lib/calcul-facture";
import { CadreTelephone } from "@/components/cadre-telephone";
import { IconeRetour } from "@/components/icones";
import { Pastille } from "@/components/pastille";
import { ActionsDevis } from "../boutons-devis";
import { EditeurDevis } from "../editeur-devis";
import { STATUTS_DEVIS } from "../statuts";

type Recherche = Promise<Record<string, string | string[] | undefined>>;

const NOMBRE = new Intl.NumberFormat("fr-FR");

async function ContenuUnDevis({ parametres, recherche }: { parametres: Promise<{ id: string }>; recherche: Recherche }) {
  const [{ id }, p] = await Promise.all([parametres, recherche]);
  const [profil, emetteur, devis, clients] = await Promise.all([
    lireProfil(),
    lireProfilEmetteur(),
    lireDevis(id),
    listerClientsFacture(),
  ]);
  if (!profil.dossier) {
    redirect("/dossiers");
  }
  const modifiable = devis.statut === "EN_COURS";
  const articles = modifiable ? await listerArticles(profil.dossier.id) : [];
  const s = STATUTS_DEVIS[devis.statut];
  const reel = devis.regime === "REEL";

  return (
    <CadreTelephone nomDossier={profil.dossier.raisonSociale} actif="factures">
      <div className="-ml-2 flex items-center gap-1">
        <Link href="/envoyer/factures/devis" aria-label="Retour aux devis" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink hover:bg-survol">
          <IconeRetour width={22} height={22} />
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-xl font-bold text-heading tabular-nums">{devis.numero}</h1>
        <Pastille ton={s.ton}>{s.texte}</Pastille>
      </div>

      {p.enregistre === "1" && (
        <p role="status" className="rounded-xl bg-success-bg p-3 text-sm text-success-ink">Devis enregistré.</p>
      )}
      {devis.factureId && (
        <p className="rounded-xl bg-info-bg p-3 text-sm text-info-ink">
          Ce devis a été transformé en{" "}
          <Link href={`/envoyer/factures/${encodeURIComponent(devis.factureId)}`} className="font-bold underline">
            facture
          </Link>
          .
        </p>
      )}

      <Link
        href={`/envoyer/factures/devis/${encodeURIComponent(devis.id)}/document`}
        className="flex h-12 items-center justify-center rounded-xl border border-line-strong bg-surface text-[15px] font-bold text-ink hover:bg-survol"
      >
        Voir ou imprimer le devis
      </Link>

      {modifiable ? (
        <EditeurDevis
          clients={clients}
          regime={emetteur.regime}
          tauxTva={emetteur.tauxTva}
          devis={devis}
          articles={articles.map((a) => ({
            id: a.id,
            nom: a.nom,
            prixVente: a.prixVente,
            tauxTva: a.tauxTva,
            suiviStock: a.suiviStock,
            quantite: a.quantite,
            unite: a.unite,
          }))}
        />
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3 rounded-2xl border border-line bg-surface p-4 text-sm">
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted">Date</dt>
              <dd className="font-medium tabular-nums">{formatJour(devis.dateDevis)}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted">Valable jusqu&apos;au</dt>
              <dd className="font-medium tabular-nums">{formatJour(devis.finValidite)}</dd>
            </div>
            <div className="col-span-2 flex flex-col gap-0.5 border-t border-line pt-3">
              <dt className="text-muted">Client</dt>
              <dd className="font-medium">{devis.client.nom}</dd>
            </div>
          </dl>
          <ul className="overflow-hidden rounded-2xl border border-line bg-surface">
            {devis.lignes.map((l, i) => (
              <li key={i} className={`flex justify-between gap-3 px-4 py-3 ${i > 0 ? "border-t border-line" : ""}`}>
                <span className="flex min-w-0 flex-col">
                  <span className="font-medium">{l.designation}</span>
                  <span className="text-[13px] text-muted tabular-nums">
                    {String(l.quantite).replace(".", ",")} × {NOMBRE.format(l.prixUnitaire)}
                  </span>
                </span>
                <strong className="shrink-0 tabular-nums">{NOMBRE.format(l.totalHt)}</strong>
              </li>
            ))}
          </ul>
          <section aria-label="Totaux" className="flex flex-col gap-2 rounded-2xl bg-sunken p-4 text-sm">
            <div className="flex justify-between">
              <span>{reel ? "Total HT" : "Total"}</span>
              <span className="tabular-nums">{NOMBRE.format(devis.totalHt)} FCFA</span>
            </div>
            {reel && (
              <div className="flex justify-between">
                <span>TVA {formatTaux(devis.tauxTva)}</span>
                <span className="tabular-nums">{NOMBRE.format(devis.totalTva)} FCFA</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-heading">
              <span>{reel ? "Total TTC" : "Total"}</span>
              <span className="tabular-nums">{NOMBRE.format(devis.totalTtc)} FCFA</span>
            </div>
          </section>
        </>
      )}

      {devis.statut !== "TRANSFORME" && <ActionsDevis id={devis.id} statut={devis.statut} />}
    </CadreTelephone>
  );
}

export default function PageUnDevis({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Recherche }) {
  return (
    <Suspense fallback={<p className="p-6 text-muted">Chargement…</p>}>
      <ContenuUnDevis parametres={params} recherche={searchParams} />
    </Suspense>
  );
}