import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { lireProfil, lireResumeStock, listerArticles } from "@/lib/api";
import { formatMontant } from "@/lib/format";
import { CadreTelephone } from "@/components/cadre-telephone";
import { IconeCaisse, IconeStock } from "@/components/icones";
import { PastilleStock, Quantite } from "./affichage";

type Recherche = Promise<Record<string, string | string[] | undefined>>;

const FILTRE = "flex h-10 shrink-0 items-center rounded-full border px-4 text-sm";

async function ContenuStock({ recherche }: { recherche: Recherche }) {
  const [profil, parametres] = await Promise.all([lireProfil(), recherche]);
  if (!profil.dossier) {
    redirect("/dossiers");
  }
  const dossier = profil.dossier;
  const q = typeof parametres.q === "string" ? parametres.q.trim().slice(0, 60) : "";
  const alerte = parametres.filtre === "alerte";
  const [articles, resume] = await Promise.all([
    listerArticles(dossier.id, q || undefined, alerte),
    lireResumeStock(dossier.id),
  ]);
  const lienFiltre = (a: boolean) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (a) p.set("filtre", "alerte");
    const s = p.toString();
    return `/envoyer/stock${s ? `?${s}` : ""}`;
  };

  return (
    <CadreTelephone nomDossier={dossier.raisonSociale} actif="stock">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[26px] font-bold leading-8 text-heading">Stock</h1>
        <Link
          href="/envoyer/stock/nouveau"
          className="flex h-11 items-center justify-center rounded-xl bg-action px-4 text-[15px] font-bold text-white hover:bg-action-hover"
        >
          Nouvel article
        </Link>
      </div>

      <Link
        href="/envoyer/caisse"
        className="flex h-12 items-center justify-center gap-2 rounded-xl border border-line-strong bg-surface text-[15px] font-bold text-ink hover:bg-survol"
      >
        <IconeCaisse width={20} height={20} />
        Caisse : vendre au comptoir
      </Link>

      <section aria-label="Résumé du stock" className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm text-muted">Valeur du stock (coût moyen pondéré)</span>
          <strong className="text-[26px] leading-8 text-heading tabular-nums">{formatMontant(resume.valeur)} FCFA</strong>
        </div>
        <div className="grid grid-cols-3 gap-2 border-t border-line pt-3 text-center">
          <div className="flex flex-col">
            <span className="text-lg font-bold tabular-nums text-heading">{resume.articles}</span>
            <span className="text-[13px] text-muted">articles</span>
          </div>
          <div className="flex flex-col">
            <span className={`text-lg font-bold tabular-nums ${resume.ruptures > 0 ? "text-danger-ink" : "text-heading"}`}>{resume.ruptures}</span>
            <span className="text-[13px] text-muted">en rupture</span>
          </div>
          <div className="flex flex-col">
            <span className={`text-lg font-bold tabular-nums ${resume.stockBas > 0 ? "text-warning-ink" : "text-heading"}`}>{resume.stockBas}</span>
            <span className="text-[13px] text-muted">stock bas</span>
          </div>
        </div>
      </section>

      <form role="search" action="/envoyer/stock" className="flex gap-2">
        {alerte && <input type="hidden" name="filtre" value="alerte" />}
        <label className="sr-only" htmlFor="recherche-stock">Rechercher un article</label>
        <input
          id="recherche-stock"
          type="search"
          name="q"
          defaultValue={q}
          maxLength={60}
          placeholder="Nom, référence ou catégorie"
          className="h-12 min-w-0 flex-1 rounded-xl border border-line-strong bg-surface px-3 text-[16px] text-ink"
        />
        <button type="submit" className="h-12 shrink-0 rounded-xl border border-line-strong bg-surface px-4 text-[15px] font-bold text-ink hover:bg-survol">
          Chercher
        </button>
      </form>

      <nav aria-label="Filtrer les articles" className="flex gap-2 overflow-x-auto">
        <Link
          href={lienFiltre(false)}
          aria-current={!alerte ? "page" : undefined}
          className={`${FILTRE} ${!alerte ? "border-action bg-action font-bold text-white" : "border-line-strong bg-surface text-ink"}`}
        >
          Tous
        </Link>
        <Link
          href={lienFiltre(true)}
          aria-current={alerte ? "page" : undefined}
          className={`${FILTRE} ${alerte ? "border-action bg-action font-bold text-white" : "border-line-strong bg-surface text-ink"}`}
        >
          À réapprovisionner
        </Link>
      </nav>

      {articles.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-surface p-6 text-center">
          <IconeStock width={28} height={28} className="text-muted" />
          <p className="text-sm text-muted">
            {q || alerte ? "Aucun article ne correspond." : "Ajoutez vos articles pour suivre votre stock et vendre à la caisse."}
          </p>
        </div>
      ) : (
        <ul aria-label="Articles" className="overflow-hidden rounded-2xl border border-line bg-surface">
          {articles.map((a, i) => (
            <li key={a.id} className={i > 0 ? "border-t border-line" : ""}>
              <Link href={`/envoyer/stock/${encodeURIComponent(a.id)}`} className="flex items-center gap-3 px-4 py-3 hover:bg-survol">
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[15px] font-medium text-ink">{a.nom}</span>
                  <span className="truncate text-[13px] text-muted">
                    {a.reference} · {formatMontant(a.prixVente)} FCFA
                  </span>
                </span>
                <span className="flex flex-col items-end gap-1">
                  {a.suiviStock && (
                    <span className="text-[15px] font-bold text-heading">
                      <Quantite valeur={a.quantite} unite={a.unite} />
                    </span>
                  )}
                  <PastilleStock etat={a.etat} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </CadreTelephone>
  );
}

export default function PageStock({ searchParams }: { searchParams: Recherche }) {
  return (
    <Suspense fallback={<p className="p-6 text-muted">Chargement…</p>}>
      <ContenuStock recherche={searchParams} />
    </Suspense>
  );
}