import { notFound, redirect, unstable_rethrow } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { lireArticle, lireProfil, type FicheArticle, type MouvementStock } from "@/lib/api";
import { formatMontant } from "@/lib/format";
import { CadreTelephone } from "@/components/cadre-telephone";
import { EnTeteCompta, formatJourCourt } from "@/app/envoyer/compta/en-tete";
import { PastilleStock, Quantite, prixHorsTaxes } from "../affichage";
import { FormulaireInventaire, FormulaireMouvement, FormulairePrix } from "../formulaires";

type Recherche = Promise<Record<string, string | string[] | undefined>>;

const MESSAGES: Record<string, string> = {
  cree: "Article enregistré.",
  entree: "Entrée de stock enregistrée.",
  sortie: "Sortie de stock enregistrée.",
  inventaire: "Stock corrigé selon votre comptage.",
  modifie: "Modifications enregistrées.",
};
const TYPES: Record<MouvementStock["type"], string> = {
  ENTREE: "Entrée",
  SORTIE: "Sortie",
  INVENTAIRE: "Inventaire",
};
const VOLET = "rounded-2xl border border-line bg-surface";
const RESUME_VOLET = "flex min-h-12 cursor-pointer items-center px-4 text-[15px] font-bold text-heading";

function Ligne({ libelle, children }: { libelle: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2">
      <dt className="text-sm text-muted">{libelle}</dt>
      <dd className="text-[15px] font-medium tabular-nums text-ink">{children}</dd>
    </div>
  );
}

async function ContenuArticle({ parametres, recherche }: { parametres: Promise<{ id: string }>; recherche: Recherche }) {
  const [{ id }, p, profil] = await Promise.all([parametres, recherche, lireProfil()]);
  if (!profil.dossier) {
    redirect("/dossiers");
  }
  const dossierId = profil.dossier.id;
  let article: FicheArticle;
  try {
    article = await lireArticle(dossierId, id);
  } catch (erreur) {
    unstable_rethrow(erreur);
    notFound();
  }
  const message = typeof p.ok === "string" ? MESSAGES[p.ok] : undefined;
  const prixHt = prixHorsTaxes(article.prixVente, article.tauxTva);
  const marge = prixHt - article.coutMoyen;

  return (
    <CadreTelephone nomDossier={profil.dossier.raisonSociale} actif="stock">
      <EnTeteCompta titre={article.nom} retour="/envoyer/stock" />

      {message && (
        <p role="status" className="rounded-xl bg-success-bg p-3 text-sm text-success-ink">
          {message}
        </p>
      )}

      <section aria-label="Article" className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-sm text-muted">
              {article.reference}
              {article.categorie ? ` · ${article.categorie}` : ""}
            </span>
            {article.suiviStock ? (
              <strong className="text-[26px] leading-8 text-heading">
                <Quantite valeur={article.quantite} unite={article.unite} />
              </strong>
            ) : (
              <strong className="text-lg text-heading">Service, sans stock</strong>
            )}
          </div>
          <PastilleStock etat={article.etat} />
        </div>
        <dl className="divide-y divide-line border-t border-line">
          <Ligne libelle="Prix de vente TTC">{formatMontant(article.prixVente)} FCFA</Ligne>
          <Ligne libelle={article.tauxTva ? "Prix hors TVA (19,25 %)" : "Sans TVA"}>{formatMontant(prixHt)} FCFA</Ligne>
          {article.suiviStock && (
            <>
              <Ligne libelle="Coût moyen d'achat">{formatMontant(article.coutMoyen)} FCFA</Ligne>
              <Ligne libelle="Marge par unité">
                <span className={marge < 0 ? "text-danger-ink" : ""}>
                  {marge < 0 ? "− " : ""}
                  {formatMontant(Math.abs(marge))} FCFA
                </span>
              </Ligne>
              <Ligne libelle="Valeur en stock">{formatMontant(article.valeurStock)} FCFA</Ligne>
              <Ligne libelle="Seuil d'alerte">
                <Quantite valeur={article.seuilAlerte} unite={article.unite} />
              </Ligne>
            </>
          )}
        </dl>
      </section>

      {article.suiviStock && (
        <>
          <details className={VOLET} open={p.ok === undefined && article.quantite === 0}>
            <summary className={RESUME_VOLET}>Entrée ou sortie de stock</summary>
            <div className="border-t border-line p-4">
              <FormulaireMouvement dossierId={dossierId} articleId={article.id} unite={article.unite} />
            </div>
          </details>
          <details className={VOLET}>
            <summary className={RESUME_VOLET}>Inventaire : corriger après comptage</summary>
            <div className="border-t border-line p-4">
              <FormulaireInventaire dossierId={dossierId} articleId={article.id} unite={article.unite} />
            </div>
          </details>
        </>
      )}
      <details className={VOLET}>
        <summary className={RESUME_VOLET}>{article.suiviStock ? "Modifier le prix ou le seuil" : "Modifier le prix"}</summary>
        <div className="border-t border-line p-4">
          <FormulairePrix
            dossierId={dossierId}
            articleId={article.id}
            prixVente={article.prixVente}
            seuilAlerte={article.seuilAlerte}
            suiviStock={article.suiviStock}
          />
        </div>
      </details>

      {article.suiviStock && (
        <section aria-labelledby="titre-mouvements" className="flex flex-col gap-2">
          <h2 id="titre-mouvements" className="text-base font-bold text-heading">Derniers mouvements</h2>
          {article.mouvements.length === 0 ? (
            <p className="rounded-2xl border border-line bg-surface p-4 text-sm text-muted">Aucun mouvement pour l&apos;instant.</p>
          ) : (
            <ul className="overflow-hidden rounded-2xl border border-line bg-surface">
              {article.mouvements.map((m, i) => (
                <li key={m.id} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-line" : ""}`}>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[15px] text-ink">{m.motif}</span>
                    <span className="text-[13px] text-muted">
                      {TYPES[m.type]} · {formatJourCourt(m.date)} · reste {formatMontant(m.quantiteApres)}
                    </span>
                  </span>
                  <span className={`shrink-0 text-[15px] font-bold tabular-nums ${m.quantite < 0 ? "text-danger-ink" : "text-success-ink"}`}>
                    {m.quantite < 0 ? "− " : "+ "}
                    {formatMontant(Math.abs(m.quantite))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </CadreTelephone>
  );
}

export default function PageArticle({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Recherche }) {
  return (
    <Suspense fallback={<p className="p-6 text-muted">Chargement…</p>}>
      <ContenuArticle parametres={params} recherche={searchParams} />
    </Suspense>
  );
}