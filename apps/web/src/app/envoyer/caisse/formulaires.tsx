"use client";

import { useActionState, useMemo, useState } from "react";
import type { ModeCaisse } from "@/lib/api";
import { formatMontant } from "@/lib/format";
import { encaisser, fermerCaisse, ouvrirCaisse, type EtatCaisse } from "./actions";

const INITIAL: EtatCaisse = { erreur: null };
const CHAMP = "h-12 w-full rounded-xl border border-line-strong bg-surface px-3 text-[16px] text-ink";
const ETIQUETTE = "flex flex-col gap-1.5 text-[13px] font-medium text-muted";
const BOUTON =
  "flex h-[52px] w-full items-center justify-center rounded-xl bg-action text-base font-bold text-white hover:bg-action-hover disabled:opacity-60";
const CHOIX =
  "flex h-12 cursor-pointer items-center justify-center rounded-xl border border-line-strong bg-surface px-1 text-center text-sm leading-4 has-[:checked]:border-action has-[:checked]:bg-action has-[:checked]:font-bold has-[:checked]:text-white";
const PETIT =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line-strong bg-surface text-lg font-bold text-ink hover:bg-survol";
const MODES: { valeur: ModeCaisse; libelle: string }[] = [
  { valeur: "ESPECES", libelle: "Espèces" },
  { valeur: "MTN_MOMO", libelle: "MTN MoMo" },
  { valeur: "ORANGE_MONEY", libelle: "Orange Money" },
];

function Erreur({ texte }: { texte: string | null }) {
  if (!texte) return null;
  return (
    <p role="alert" className="rounded-xl bg-danger-bg p-3 text-sm text-danger-ink">
      {texte}
    </p>
  );
}

export interface ArticleCaisse {
  id: string;
  nom: string;
  reference: string;
  categorie: string | null;
  prixVente: number;
  suiviStock: boolean;
  quantite: number;
  unite: string;
}

export function OuvrirCaisse({ dossierId }: { dossierId: string }) {
  const [etat, action, enCours] = useActionState(ouvrirCaisse, INITIAL);
  return (
    <form action={action} className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
      <input type="hidden" name="dossierId" value={dossierId} />
      <h2 className="text-base font-bold text-heading">Ouvrir la caisse</h2>
      <label className={ETIQUETTE}>
        Fond de caisse (espèces dans le tiroir, en FCFA)
        <input name="fondInitial" inputMode="numeric" required placeholder="0" className={`${CHAMP} tabular-nums`} />
      </label>
      <Erreur texte={etat.erreur} />
      <button type="submit" disabled={enCours} className={BOUTON}>
        {enCours ? "Ouverture…" : "Ouvrir la caisse"}
      </button>
    </form>
  );
}

export function FermerCaisse({ dossierId, attendu }: { dossierId: string; attendu: number }) {
  const [etat, action, enCours] = useActionState(fermerCaisse, INITIAL);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="dossierId" value={dossierId} />
      <label className={ETIQUETTE}>
        Espèces comptées dans le tiroir (FCFA)
        <input name="especesComptees" inputMode="numeric" required placeholder={formatMontant(attendu)} className={`${CHAMP} tabular-nums`} />
      </label>
      <Erreur texte={etat.erreur} />
      <button type="submit" disabled={enCours} className={BOUTON}>
        {enCours ? "Clôture…" : "Clôturer la caisse"}
      </button>
    </form>
  );
}

export function PointDeVente({ dossierId, articles }: { dossierId: string; articles: ArticleCaisse[] }) {
  const [etat, action, enCours] = useActionState(encaisser, INITIAL);
  const [panier, setPanier] = useState<Record<string, number>>({});
  const [recherche, setRecherche] = useState("");
  const [categorie, setCategorie] = useState<string | null>(null);
  const [mode, setMode] = useState<ModeCaisse>("ESPECES");
  const [recu, setRecu] = useState("");

  const categories = useMemo(
    () => [...new Set(articles.map((a) => a.categorie).filter((c): c is string => Boolean(c)))].sort(),
    [articles],
  );
  const q = recherche.trim().toLowerCase();
  const visibles = articles.filter(
    (a) =>
      (!categorie || a.categorie === categorie) &&
      (!q || a.nom.toLowerCase().includes(q) || a.reference.toLowerCase().includes(q)),
  );
  const lignes = articles
    .filter((a) => (panier[a.id] ?? 0) > 0)
    .map((a) => ({ article: a, quantite: panier[a.id] }));
  const total = lignes.reduce((s, l) => s + l.article.prixVente * l.quantite, 0);
  const recuNombre = Number(recu.replace(/[\s  ]/g, ""));
  const monnaie = mode === "ESPECES" && recu !== "" && Number.isFinite(recuNombre) ? recuNombre - total : null;

  const changer = (a: ArticleCaisse, delta: number) => {
    setPanier((p) => {
      const actuel = p[a.id] ?? 0;
      const voulu = Math.max(0, actuel + delta);
      const borne = a.suiviStock ? Math.min(voulu, a.quantite) : voulu;
      return { ...p, [a.id]: borne };
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className="sr-only" htmlFor="recherche-caisse">Rechercher un article</label>
        <input
          id="recherche-caisse"
          type="search"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher un article"
          className={CHAMP}
        />
        {categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Catégories">
            {[null, ...categories].map((c) => (
              <button
                key={c ?? "tout"}
                type="button"
                aria-pressed={categorie === c}
                onClick={() => setCategorie(c)}
                className={`h-10 shrink-0 rounded-full border px-4 text-sm ${categorie === c ? "border-action bg-action font-bold text-white" : "border-line-strong bg-surface text-ink"}`}
              >
                {c ?? "Tout"}
              </button>
            ))}
          </div>
        )}
      </div>

      {articles.length === 0 ? (
        <p className="rounded-2xl border border-line bg-surface p-4 text-sm text-muted">
          Aucun article. Ajoutez d&apos;abord vos articles dans l&apos;onglet Stock.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {visibles.map((a) => {
            const epuise = a.suiviStock && a.quantite - (panier[a.id] ?? 0) <= 0;
            return (
              <button
                key={a.id}
                type="button"
                disabled={epuise}
                onClick={() => changer(a, 1)}
                className="flex min-h-[96px] flex-col items-start gap-1 rounded-2xl border border-line bg-surface p-3 text-left hover:bg-survol disabled:opacity-50"
              >
                <span className="text-[14px] font-medium leading-5 text-ink">{a.nom}</span>
                <span className="text-[16px] font-bold tabular-nums text-heading">{formatMontant(a.prixVente)} FCFA</span>
                {a.suiviStock && (
                  <span className={`text-[12px] tabular-nums ${a.quantite <= 0 ? "text-danger-ink" : "text-muted"}`}>
                    {a.quantite <= 0 ? "Rupture" : `${formatMontant(a.quantite)} ${a.unite} en stock`}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <form action={action} className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
        <input type="hidden" name="dossierId" value={dossierId} />
        <input type="hidden" name="lignes" value={JSON.stringify(lignes.map((l) => ({ articleId: l.article.id, quantite: l.quantite })))} />
        <div className="flex items-baseline justify-between">
          <h2 className="text-base font-bold text-heading">Ticket</h2>
          {lignes.length > 0 && (
            <button type="button" onClick={() => setPanier({})} className="h-11 px-2 text-sm font-bold text-action">
              Vider
            </button>
          )}
        </div>
        {lignes.length === 0 ? (
          <p className="text-sm text-muted">Touchez un article pour l&apos;ajouter.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {lignes.map(({ article: a, quantite }) => (
              <li key={a.id} className="flex items-center gap-2 py-2">
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[14px] text-ink">{a.nom}</span>
                  <span className="text-[12px] tabular-nums text-muted">{formatMontant(a.prixVente * quantite)} FCFA</span>
                </span>
                <button type="button" aria-label={`Retirer un ${a.nom}`} onClick={() => changer(a, -1)} className={PETIT}>
                  −
                </button>
                <span className="w-7 text-center font-bold tabular-nums">{quantite}</span>
                <button
                  type="button"
                  aria-label={`Ajouter un ${a.nom}`}
                  disabled={a.suiviStock && quantite >= a.quantite}
                  onClick={() => changer(a, 1)}
                  className={`${PETIT} disabled:opacity-50`}
                >
                  +
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-baseline justify-between border-t border-line pt-3">
          <span className="text-base font-bold text-heading">Total TTC</span>
          <span className="text-[22px] font-bold tabular-nums text-heading">{formatMontant(total)} FCFA</span>
        </div>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-[13px] font-medium text-muted">Paiement</legend>
          <div className="grid grid-cols-3 gap-2">
            {MODES.map((m) => (
              <label key={m.valeur} className={CHOIX}>
                <input type="radio" name="mode" value={m.valeur} checked={mode === m.valeur} onChange={() => setMode(m.valeur)} className="sr-only" />
                {m.libelle}
              </label>
            ))}
          </div>
        </fieldset>

        {mode === "ESPECES" && (
          <div className="grid grid-cols-2 items-end gap-3">
            <label className={ETIQUETTE}>
              Montant reçu (facultatif)
              <input name="montantRecu" inputMode="numeric" value={recu} onChange={(e) => setRecu(e.target.value)} placeholder="FCFA" className={`${CHAMP} tabular-nums`} />
            </label>
            <p className="pb-3 text-sm text-muted" aria-live="polite">
              {monnaie === null ? "" : monnaie < 0 ? <span className="text-danger-ink">Il manque {formatMontant(-monnaie)} FCFA</span> : <>Monnaie : <strong className="tabular-nums text-ink">{formatMontant(monnaie)} FCFA</strong></>}
            </p>
          </div>
        )}

        <Erreur texte={etat.erreur} />
        <button type="submit" disabled={enCours || total <= 0 || (monnaie !== null && monnaie < 0)} className={BOUTON}>
          {enCours ? "Encaissement…" : `Encaisser ${formatMontant(total)} FCFA`}
        </button>
      </form>
    </div>
  );
}