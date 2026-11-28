"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { ClientFacture, DevisDetail, Regime } from "@/lib/api";
import { calculerFacture, formatTaux } from "@/lib/calcul-facture";
import type { ArticleChoix } from "../editeur-facture";
import { Message } from "../champs";
import { enregistrerDevis, type EtatDevis } from "./actions";

interface LigneEdition {
  cle: number;
  articleId: string;
  designation: string;
  detail: string;
  quantite: string;
  prix: string;
}

const ETAT_INITIAL: EtatDevis = { erreur: null };
const NOMBRE = new Intl.NumberFormat("fr-FR");
const CHAMP = "h-11 w-full rounded-xl border border-line-strong bg-surface px-3 text-base";
const LIBELLE = "text-sm font-medium text-muted";

function enNombre(texte: string): number {
  const valeur = Number(texte.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(valeur) ? valeur : 0;
}

export function EditeurDevis({
  clients,
  regime,
  tauxTva,
  articles,
  devis,
}: {
  clients: ClientFacture[];
  regime: Regime;
  tauxTva: number;
  articles: ArticleChoix[];
  devis?: DevisDetail;
}) {
  const [etat, action, enCours] = useActionState(enregistrerDevis, ETAT_INITIAL);
  const [clientId, setClientId] = useState(devis?.clientId ?? clients[0]?.id ?? "");
  const [validite, setValidite] = useState(String(devis?.validiteJours ?? 30));
  const [note, setNote] = useState(devis?.note ?? "");
  const [compteur, setCompteur] = useState(100);
  const [lignes, setLignes] = useState<LigneEdition[]>(() =>
    devis && devis.lignes.length > 0
      ? devis.lignes.map((l, i) => ({
          cle: i,
          articleId: l.articleId ?? "",
          designation: l.designation,
          detail: l.detail ?? "",
          quantite: String(l.quantite).replace(".", ","),
          prix: String(l.prixUnitaire),
        }))
      : [{ cle: 0, articleId: "", designation: "", detail: "", quantite: "1", prix: "" }],
  );
  const parId = new Map(articles.map((a) => [a.id, a]));

  const saisies = lignes.map((l) => ({ quantite: enNombre(l.quantite), prixUnitaire: Math.round(enNombre(l.prix)) }));
  const calcul = calculerFacture(saisies, regime, tauxTva, 0);
  const envoi = lignes.map((l, i) => ({
    articleId: l.articleId || undefined,
    designation: l.designation.trim(),
    detail: l.detail.trim() || undefined,
    quantite: saisies[i].quantite,
    prixUnitaire: saisies[i].prixUnitaire,
  }));

  function changer(cle: number, champ: keyof Omit<LigneEdition, "cle">, valeur: string) {
    setLignes((liste) => liste.map((l) => (l.cle === cle ? { ...l, [champ]: valeur } : l)));
  }

  function choisirArticle(cle: number, articleId: string) {
    const a = parId.get(articleId);
    setLignes((liste) =>
      liste.map((l) => {
        if (l.cle !== cle) return l;
        if (!a) return { ...l, articleId: "" };
        const prix = regime === "REEL" ? Math.round((a.prixVente * 10000) / (10000 + a.tauxTva)) : a.prixVente;
        return { ...l, articleId: a.id, designation: a.nom, prix: String(prix) };
      }),
    );
  }

  if (clients.length === 0) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
        <p className="text-[15px]">Ajoutez d&apos;abord le client à qui vous proposez ce devis.</p>
        <Link href="/envoyer/factures/clients/nouveau" className="flex h-11 items-center justify-center rounded-xl bg-action font-bold text-white hover:bg-action-hover">
          Ajouter un client
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <Message erreur={etat.erreur} />
      {devis && <input type="hidden" name="id" value={devis.id} />}
      <input type="hidden" name="lignes" value={JSON.stringify(envoi)} />

      <div className="flex flex-col gap-3.5 rounded-2xl border border-line bg-surface p-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="clientId" className={LIBELLE}>Client</label>
          <select id="clientId" name="clientId" value={clientId} onChange={(e) => setClientId(e.target.value)} className={CHAMP}>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}{c.niu ? ` · ${c.niu}` : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="validiteJours" className={LIBELLE}>Valable pendant (jours)</label>
          <input id="validiteJours" name="validiteJours" inputMode="numeric" value={validite} onChange={(e) => setValidite(e.target.value)} className={`${CHAMP} tabular-nums`} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="note" className={LIBELLE}>Note pour le client (facultatif)</label>
          <textarea id="note" name="note" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Délai de livraison, conditions…" className="rounded-xl border border-line-strong bg-surface px-3 py-2.5 text-base" />
        </div>
      </div>

      {lignes.map((l, i) => (
        <fieldset key={l.cle} className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
          <legend className="sr-only">Ligne {i + 1}</legend>
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-bold text-heading">Ligne {i + 1}</span>
            {lignes.length > 1 && (
              <button type="button" onClick={() => setLignes((liste) => liste.filter((x) => x.cle !== l.cle))} className="h-9 rounded-lg px-2.5 text-sm font-medium text-danger-ink underline">
                Retirer
              </button>
            )}
          </div>
          {articles.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`article-${l.cle}`} className={LIBELLE}>Article du stock (facultatif)</label>
              <select id={`article-${l.cle}`} value={l.articleId} onChange={(e) => choisirArticle(l.cle, e.target.value)} className={CHAMP}>
                <option value="">Saisie libre</option>
                {articles.map((a) => (
                  <option key={a.id} value={a.id}>{a.nom}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`designation-${l.cle}`} className={LIBELLE}>Désignation</label>
            <input id={`designation-${l.cle}`} required maxLength={200} value={l.designation} onChange={(e) => changer(l.cle, "designation", e.target.value)} placeholder="Produit ou service" className={CHAMP} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`detail-${l.cle}`} className={LIBELLE}>Précision (facultatif)</label>
            <input id={`detail-${l.cle}`} maxLength={200} value={l.detail} onChange={(e) => changer(l.cle, "detail", e.target.value)} className={CHAMP} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`quantite-${l.cle}`} className={LIBELLE}>Quantité</label>
              <input id={`quantite-${l.cle}`} required inputMode="decimal" value={l.quantite} onChange={(e) => changer(l.cle, "quantite", e.target.value)} className={`${CHAMP} tabular-nums`} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`prix-${l.cle}`} className={LIBELLE}>{regime === "REEL" ? "Prix unitaire HT" : "Prix unitaire"}</label>
              <input id={`prix-${l.cle}`} required inputMode="numeric" value={l.prix} onChange={(e) => changer(l.cle, "prix", e.target.value)} placeholder="FCFA" className={`${CHAMP} tabular-nums`} />
            </div>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted">Total de la ligne</span>
            <strong className="tabular-nums">{NOMBRE.format(calcul.totaux[i])} FCFA</strong>
          </div>
        </fieldset>
      ))}

      <button
        type="button"
        onClick={() => {
          setLignes((liste) => [...liste, { cle: compteur, articleId: "", designation: "", detail: "", quantite: "1", prix: "" }]);
          setCompteur((n) => n + 1);
        }}
        className="h-11 rounded-xl border border-dashed border-line-strong text-[15px] font-medium text-ink hover:bg-survol"
      >
        Ajouter une ligne
      </button>

      <section aria-label="Totaux" className="flex flex-col gap-2 rounded-2xl bg-sunken p-4 text-sm">
        <div className="flex justify-between">
          <span>{regime === "REEL" ? "Total HT" : "Total"}</span>
          <span className="tabular-nums">{NOMBRE.format(calcul.totalHt)} FCFA</span>
        </div>
        {regime === "REEL" && (
          <div className="flex justify-between">
            <span>TVA {formatTaux(tauxTva)}</span>
            <span className="tabular-nums">{NOMBRE.format(calcul.totalTva)} FCFA</span>
          </div>
        )}
        <div className="flex justify-between text-base font-bold text-heading">
          <span>{regime === "REEL" ? "Total TTC" : "Total"}</span>
          <span className="tabular-nums">{NOMBRE.format(calcul.totalTtc)} FCFA</span>
        </div>
      </section>

      <button type="submit" disabled={enCours} className="h-[52px] rounded-xl bg-action text-base font-bold text-white hover:bg-action-hover disabled:opacity-60">
        {enCours ? "Enregistrement…" : "Enregistrer le devis"}
      </button>
    </form>
  );
}