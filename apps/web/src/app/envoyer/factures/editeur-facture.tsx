"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { ClientFacture, FactureDetail, Regime } from "@/lib/api";
import { calculerFacture, formatTaux } from "@/lib/calcul-facture";
import { enregistrerFacture, type EtatAction } from "./actions-facture";
import { Message } from "./champs";

interface LigneEdition {
  cle: number;
  articleId: string;
  designation: string;
  detail: string;
  quantite: string;
  prix: string;
}

// Article du stock proposé sur une ligne de facture
export interface ArticleChoix {
  id: string;
  nom: string;
  prixVente: number;
  tauxTva: number;
  suiviStock: boolean;
  quantite: number;
  unite: string;
}

const ETAT_INITIAL: EtatAction = { erreur: null };
const NOMBRE = new Intl.NumberFormat("fr-FR");
const CHAMP = "h-11 w-full rounded-xl border border-line-strong bg-surface px-3 text-base";
const LIBELLE = "text-sm font-medium text-muted";

function enNombre(texte: string): number {
  const valeur = Number(texte.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(valeur) ? valeur : 0;
}

function Total({ libelle, montant, fort = false }: { libelle: string; montant: string; fort?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${fort ? "text-base font-bold text-heading" : "text-sm"}`}>
      <span>{libelle}</span>
      <span className="tabular-nums">{montant}</span>
    </div>
  );
}

export function EditeurFacture({
  clients,
  regime,
  tauxTva,
  aujourdhui,
  facture,
  articles = [],
}: {
  clients: ClientFacture[];
  regime: Regime;
  tauxTva: number;
  aujourdhui: string;
  facture?: FactureDetail;
  articles?: ArticleChoix[];
}) {
  const [etat, action, enCours] = useActionState(enregistrerFacture, ETAT_INITIAL);
  const [clientId, setClientId] = useState(facture?.clientId ?? clients[0]?.id ?? "");
  const [echeance, setEcheance] = useState(facture?.dateEcheance?.slice(0, 10) ?? "");
  const [retenue, setRetenue] = useState(String(facture?.tauxRetenue ?? 0).replace(".", ","));
  const [compteur, setCompteur] = useState(100);
  const [lignes, setLignes] = useState<LigneEdition[]>(() =>
    facture && facture.lignes.length > 0
      ? facture.lignes.map((l, i) => ({
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
  const calcul = calculerFacture(saisies, regime, tauxTva, enNombre(retenue));
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

  // Choisir un article reprend son nom et son prix ; au réel, le prix affiché TTC est ramené hors taxes
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

  function ajouter() {
    setLignes((liste) => [...liste, { cle: compteur, articleId: "", designation: "", detail: "", quantite: "1", prix: "" }]);
    setCompteur((n) => n + 1);
  }

  if (clients.length === 0) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
        <p className="text-[15px]">Ajoutez d&apos;abord le client à qui vous facturez.</p>
        <Link href="/envoyer/factures/clients/nouveau" className="flex h-11 items-center justify-center rounded-xl bg-action font-bold text-white hover:bg-action-hover">
          Ajouter un client
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <Message erreur={etat.erreur} />
      {facture && <input type="hidden" name="id" value={facture.id} />}
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
          <Link href="/envoyer/factures/clients/nouveau" className="self-start py-1 text-sm font-bold text-link underline">
            Nouveau client
          </Link>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="dateEcheance" className={LIBELLE}>Date d&apos;échéance (facultatif)</label>
          <input id="dateEcheance" name="dateEcheance" type="date" min={aujourdhui} value={echeance} onChange={(e) => setEcheance(e.target.value)} className={CHAMP} />
        </div>
      </div>

      {lignes.map((l, i) => {
        const article = l.articleId ? parId.get(l.articleId) : undefined;
        const quantite = enNombre(l.quantite);
        return (
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
                    <option key={a.id} value={a.id}>
                      {a.nom}
                      {a.suiviStock ? ` · ${NOMBRE.format(a.quantite)} ${a.unite} en stock` : ""}
                    </option>
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
                <input id={`quantite-${l.cle}`} required inputMode={article?.suiviStock ? "numeric" : "decimal"} value={l.quantite} onChange={(e) => changer(l.cle, "quantite", e.target.value)} className={`${CHAMP} tabular-nums`} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor={`prix-${l.cle}`} className={LIBELLE}>{regime === "REEL" ? "Prix unitaire HT" : "Prix unitaire"}</label>
                <input id={`prix-${l.cle}`} required inputMode="numeric" value={l.prix} onChange={(e) => changer(l.cle, "prix", e.target.value)} placeholder="FCFA" className={`${CHAMP} tabular-nums`} />
              </div>
            </div>
            {article?.suiviStock && (
              <p className={`text-[13px] ${quantite > article.quantite ? "text-danger-ink" : "text-muted"}`}>
                {quantite > article.quantite
                  ? `Stock insuffisant : ${NOMBRE.format(article.quantite)} ${article.unite} disponible(s).`
                  : `Sortira du stock à l'émission (${NOMBRE.format(article.quantite)} ${article.unite} disponibles).`}
              </p>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted">Total de la ligne</span>
              <strong className="tabular-nums">{NOMBRE.format(calcul.totaux[i])} FCFA</strong>
            </div>
          </fieldset>
        );
      })}

      <button type="button" onClick={ajouter} className="h-11 rounded-xl border border-dashed border-line-strong text-[15px] font-medium text-ink hover:bg-survol">
        Ajouter une ligne
      </button>

      <div className="flex flex-col gap-1.5 rounded-2xl border border-line bg-surface p-4">
        <label htmlFor="tauxRetenue" className={LIBELLE}>Retenue à la source du client (AIR), en %</label>
        <input id="tauxRetenue" name="tauxRetenue" inputMode="decimal" value={retenue} onChange={(e) => setRetenue(e.target.value)} aria-describedby="aide-retenue" className={`${CHAMP} tabular-nums`} />
        <span id="aide-retenue" className="text-[13px] text-muted">
          0 si votre client ne retient rien. Pour le bon taux, demandez à votre comptable.
        </span>
      </div>

      <section aria-label="Totaux" className="flex flex-col gap-2 rounded-2xl bg-sunken p-4">
        <Total libelle={regime === "REEL" ? "Total HT" : "Total"} montant={`${NOMBRE.format(calcul.totalHt)} FCFA`} />
        {regime === "REEL" ? (
          <Total libelle={`TVA ${formatTaux(tauxTva)}`} montant={`${NOMBRE.format(calcul.totalTva)} FCFA`} />
        ) : (
          <p className="text-[13px] text-muted">TVA non applicable (IGS)</p>
        )}
        <Total libelle={regime === "REEL" ? "Total TTC" : "Total"} montant={`${NOMBRE.format(calcul.totalTtc)} FCFA`} fort />
        {calcul.retenue > 0 && (
          <>
            <Total libelle={`Retenue AIR ${formatTaux(enNombre(retenue))}`} montant={`− ${NOMBRE.format(calcul.retenue)} FCFA`} />
            <Total libelle="Net à payer" montant={`${NOMBRE.format(calcul.netAPayer)} FCFA`} fort />
          </>
        )}
      </section>

      <button type="submit" disabled={enCours} className="h-[52px] rounded-xl border border-line-strong bg-surface text-base font-bold text-ink hover:bg-survol disabled:opacity-60">
        {enCours ? "Enregistrement…" : "Enregistrer le brouillon"}
      </button>
    </form>
  );
}