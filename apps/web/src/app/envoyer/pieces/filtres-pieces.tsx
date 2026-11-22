"use client";

import Link from "next/link";

export interface OptionMois {
  valeur: string;
  libelle: string;
}

const LISTE = "h-11 min-w-0 rounded-xl border border-line-strong bg-surface px-2 text-sm text-ink";

// Formulaire GET classique : il fonctionne même si le script n'est pas encore chargé
export function FiltresPieces({
  mois,
  categories,
  choix,
}: {
  mois: OptionMois[];
  categories: string[];
  choix: { mois: string; categorie: string; q: string };
}) {
  const filtreActif = Boolean(choix.mois || choix.categorie || choix.q);
  const soumettre = (evenement: React.ChangeEvent<HTMLSelectElement>) => evenement.currentTarget.form?.requestSubmit();

  return (
    <form method="get" role="search" aria-label="Rechercher une pièce" className="flex flex-col gap-2.5 rounded-2xl border border-line bg-surface p-3">
      <div className="flex gap-2">
        <label htmlFor="q" className="sr-only">Fournisseur ou catégorie</label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={choix.q}
          maxLength={60}
          placeholder="Fournisseur, catégorie…"
          className="h-11 min-w-0 flex-1 rounded-xl border border-line-strong bg-surface px-3 text-base"
        />
        <button type="submit" className="h-11 shrink-0 rounded-xl bg-action px-4 text-sm font-bold text-white hover:bg-action-hover">
          Chercher
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <select name="mois" aria-label="Mois" defaultValue={choix.mois} onChange={soumettre} className={LISTE}>
          <option value="">Tous les mois</option>
          {mois.map((m) => (
            <option key={m.valeur} value={m.valeur}>{m.libelle}</option>
          ))}
        </select>
        <select name="categorie" aria-label="Catégorie" defaultValue={choix.categorie} onChange={soumettre} className={LISTE}>
          <option value="">Toutes les catégories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      {filtreActif && (
        <Link href="/envoyer/pieces" className="self-start py-1 text-sm font-bold text-link underline">
          Effacer la recherche
        </Link>
      )}
    </form>
  );
}