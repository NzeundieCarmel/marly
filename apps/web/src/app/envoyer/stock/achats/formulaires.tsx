"use client";

import { useActionState, useState } from "react";
import type { Regime } from "@/lib/api";
import { formatMontant } from "@/lib/format";
import { annulerAchat, enregistrerAchat, type EtatAchat } from "./actions";
import { PAIEMENTS } from "./libelles";

const INITIAL: EtatAchat = { erreur: null };
const CHAMP = "h-12 w-full rounded-xl border border-line-strong bg-surface px-3 text-[16px] text-ink";
const ETIQUETTE = "flex flex-col gap-1.5 text-[13px] font-medium text-muted";
const BOUTON =
  "flex h-[52px] w-full items-center justify-center rounded-xl bg-action text-base font-bold text-white hover:bg-action-hover disabled:opacity-60";
const SECONDAIRE =
  "flex h-12 w-full items-center justify-center rounded-xl border border-line-strong bg-surface text-[15px] font-medium text-ink hover:bg-survol";

function Erreur({ texte }: { texte: string | null }) {
  if (!texte) return null;
  return (
    <p role="alert" className="rounded-xl bg-danger-bg p-3 text-sm text-danger-ink">
      {texte}
    </p>
  );
}

export interface ArticleAchat {
  id: string;
  nom: string;
  unite: string;
  coutMoyen: number;
  quantite: number;
}

interface LigneSaisie {
  cle: number;
  articleId: string;
  quantite: string;
  cout: string;
}

function entier(texte: string): number {
  const t = texte.replace(/[\s  ]/g, "");
  return /^\d+$/.test(t) ? Number(t) : Number.NaN;
}

export function FormulaireAchat({
  dossierId,
  articles,
  fournisseurs,
  regime,
  tauxTva,
  aujourdhui,
}: {
  dossierId: string;
  articles: ArticleAchat[];
  fournisseurs: string[];
  regime: Regime;
  tauxTva: number;
  aujourdhui: string;
}) {
  const [etat, action, enCours] = useActionState(enregistrerAchat, INITIAL);
  const [avecTva, setAvecTva] = useState(regime === "REEL");
  const [compteur, setCompteur] = useState(1);
  const [lignes, setLignes] = useState<LigneSaisie[]>([{ cle: 0, articleId: "", quantite: "", cout: "" }]);
  const parId = new Map(articles.map((a) => [a.id, a]));

  const envoi = lignes
    .filter((l) => l.articleId)
    .map((l) => ({ articleId: l.articleId, quantite: entier(l.quantite), coutUnitaire: entier(l.cout) }));
  const totalHt = envoi.reduce((s, l) => s + (Number.isFinite(l.quantite * l.coutUnitaire) ? l.quantite * l.coutUnitaire : 0), 0);
  const tva = regime === "REEL" && avecTva ? Math.round((totalHt * tauxTva) / 100) : 0;
  const choisis = new Set(lignes.map((l) => l.articleId));

  function changer(cle: number, champ: "articleId" | "quantite" | "cout", valeur: string) {
    setLignes((liste) =>
      liste.map((l) => {
        if (l.cle !== cle) return l;
        if (champ === "articleId") {
          const a = parId.get(valeur);
          return { ...l, articleId: valeur, cout: l.cout || (a && a.coutMoyen > 0 ? String(a.coutMoyen) : "") };
        }
        return { ...l, [champ]: valeur };
      }),
    );
  }

  if (articles.length === 0) {
    return (
      <p className="rounded-2xl border border-line bg-surface p-4 text-sm text-muted">
        Créez d&apos;abord vos articles dans l&apos;onglet Stock : un achat fait entrer des articles existants.
      </p>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="dossierId" value={dossierId} />
      <input type="hidden" name="lignes" value={JSON.stringify(envoi)} />

      <section className="flex flex-col gap-3.5 rounded-2xl border border-line bg-surface p-4">
        <label className={ETIQUETTE}>
          Fournisseur
          <input name="fournisseur" required minLength={2} maxLength={120} list="fournisseurs" placeholder="Par exemple : CIMENCO" className={CHAMP} />
          <datalist id="fournisseurs">
            {fournisseurs.map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className={ETIQUETTE}>
            Date de l&apos;achat
            <input type="date" name="date" required defaultValue={aujourdhui} max={aujourdhui} className={CHAMP} />
          </label>
          <label className={ETIQUETTE}>
            N° de sa facture (facultatif)
            <input name="referenceFournisseur" maxLength={60} placeholder="F-118" className={CHAMP} />
          </label>
        </div>
        <label className={ETIQUETTE}>
          Paiement
          <select name="paiement" defaultValue="A_CREDIT" className={CHAMP}>
            {PAIEMENTS.map((p) => (
              <option key={p.valeur} value={p.valeur}>{p.libelle}</option>
            ))}
          </select>
        </label>
        {regime === "REEL" && (
          <label className="flex min-h-12 items-center gap-3 rounded-xl border border-line px-3 text-[15px] text-ink">
            <input type="checkbox" name="avecTva" checked={avecTva} onChange={(e) => setAvecTva(e.target.checked)} className="h-5 w-5" />
            La facture du fournisseur porte de la TVA
          </label>
        )}
      </section>

      {lignes.map((l, i) => {
        const a = parId.get(l.articleId);
        const q = entier(l.quantite);
        const c = entier(l.cout);
        return (
          <fieldset key={l.cle} className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
            <legend className="sr-only">Article {i + 1}</legend>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-heading">Article {i + 1}</span>
              {lignes.length > 1 && (
                <button type="button" onClick={() => setLignes((liste) => liste.filter((x) => x.cle !== l.cle))} className="h-10 px-2 text-sm font-medium text-danger-ink underline">
                  Retirer
                </button>
              )}
            </div>
            <label className={ETIQUETTE}>
              Article reçu
              <select value={l.articleId} onChange={(e) => changer(l.cle, "articleId", e.target.value)} className={CHAMP}>
                <option value="">Choisir…</option>
                {articles.map((x) => (
                  <option key={x.id} value={x.id} disabled={x.id !== l.articleId && choisis.has(x.id)}>
                    {x.nom} · {formatMontant(x.quantite)} {x.unite} en stock
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className={ETIQUETTE}>
                Quantité{a ? ` (${a.unite})` : ""}
                <input inputMode="numeric" value={l.quantite} onChange={(e) => changer(l.cle, "quantite", e.target.value)} placeholder="0" className={`${CHAMP} tabular-nums`} />
              </label>
              <label className={ETIQUETTE}>
                {regime === "REEL" && avecTva ? "Coût unitaire HT" : "Coût unitaire"}
                <input inputMode="numeric" value={l.cout} onChange={(e) => changer(l.cle, "cout", e.target.value)} placeholder="FCFA" className={`${CHAMP} tabular-nums`} />
              </label>
            </div>
            {Number.isFinite(q * c) && q > 0 && (
              <p className="flex justify-between text-sm">
                <span className="text-muted">Total</span>
                <strong className="tabular-nums">{formatMontant(q * c)} FCFA</strong>
              </p>
            )}
          </fieldset>
        );
      })}

      {lignes.length < articles.length && (
        <button
          type="button"
          onClick={() => {
            setLignes((liste) => [...liste, { cle: compteur, articleId: "", quantite: "", cout: "" }]);
            setCompteur((n) => n + 1);
          }}
          className="h-11 rounded-xl border border-dashed border-line-strong text-[15px] font-medium text-ink hover:bg-survol"
        >
          Ajouter un article
        </button>
      )}

      <section aria-label="Totaux" className="flex flex-col gap-2 rounded-2xl bg-sunken p-4 text-sm">
        <div className="flex justify-between">
          <span>{tva > 0 ? "Total HT" : "Total"}</span>
          <span className="tabular-nums">{formatMontant(totalHt)} FCFA</span>
        </div>
        {tva > 0 && (
          <div className="flex justify-between">
            <span>TVA récupérable</span>
            <span className="tabular-nums">{formatMontant(tva)} FCFA</span>
          </div>
        )}
        <div className="flex justify-between text-base font-bold text-heading">
          <span>Total à payer</span>
          <span className="tabular-nums">{formatMontant(totalHt + tva)} FCFA</span>
        </div>
      </section>

      <Erreur texte={etat.erreur} />
      <button type="submit" disabled={enCours || envoi.length === 0} className={BOUTON}>
        {enCours ? "Enregistrement…" : "Enregistrer l'achat et entrer en stock"}
      </button>
    </form>
  );
}

export function AnnulerAchat({ dossierId, id }: { dossierId: string; id: string }) {
  const [confirmer, setConfirmer] = useState(false);
  const [etat, action, enCours] = useActionState(annulerAchat, INITIAL);
  return (
    <section aria-label="Annuler l'achat" className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
      <Erreur texte={etat.erreur} />
      {!confirmer ? (
        <button type="button" onClick={() => setConfirmer(true)} className={SECONDAIRE}>
          Annuler cet achat
        </button>
      ) : (
        <div className="flex flex-col gap-3 rounded-xl bg-warning-bg p-3 text-warning-ink">
          <p className="text-sm leading-5">
            Les articles de cet achat ressortiront du stock et l&apos;écriture sera contre-passée. Cette opération est définitive.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setConfirmer(false)} className={SECONDAIRE}>Revenir</button>
            <form action={action}>
              <input type="hidden" name="dossierId" value={dossierId} />
              <input type="hidden" name="id" value={id} />
              <button type="submit" disabled={enCours} className={BOUTON}>
                {enCours ? "Annulation…" : "Confirmer"}
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}