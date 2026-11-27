"use client";

import { useActionState, useState } from "react";
import {
  creerArticle,
  inventaireStock,
  modifierArticle,
  mouvementStock,
  type EtatFormulaire,
} from "./actions";
import { UNITES } from "./affichage";

const INITIAL: EtatFormulaire = { erreur: null };
const CHAMP = "h-12 w-full rounded-xl border border-line-strong bg-surface px-3 text-[15px] text-ink";
const ETIQUETTE = "flex flex-col gap-1.5 text-[13px] font-medium text-muted";
const BOUTON =
  "flex h-12 w-full items-center justify-center rounded-xl bg-action text-[15px] font-bold text-white hover:bg-action-hover disabled:opacity-60";
const CHOIX =
  "flex h-12 cursor-pointer items-center justify-center rounded-xl border border-line-strong bg-surface text-sm has-[:checked]:border-action has-[:checked]:bg-action has-[:checked]:font-bold has-[:checked]:text-white";

function Erreur({ texte }: { texte: string | null }) {
  if (!texte) return null;
  return (
    <p role="alert" className="rounded-xl bg-danger-bg p-3 text-sm text-danger-ink">
      {texte}
    </p>
  );
}

export function FormulaireArticle({ dossierId }: { dossierId: string }) {
  const [etat, action, enCours] = useActionState(creerArticle, INITIAL);
  const [suivi, setSuivi] = useState(true);
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="dossierId" value={dossierId} />
      <label className={ETIQUETTE}>
        Nom de l&apos;article
        <input name="nom" required minLength={2} maxLength={80} placeholder="Par exemple : Ciment 50 kg" className={CHAMP} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className={ETIQUETTE}>
          Référence
          <input name="reference" required maxLength={30} placeholder="CIM-50" autoCapitalize="characters" className={`${CHAMP} uppercase`} />
        </label>
        <label className={ETIQUETTE}>
          Vendu à l&apos;unité de
          <select name="unite" defaultValue="unité" className={CHAMP}>
            {UNITES.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </label>
      </div>
      <label className={ETIQUETTE}>
        Catégorie (facultatif)
        <input name="categorie" maxLength={40} placeholder="Par exemple : Maçonnerie" className={CHAMP} />
      </label>
      <label className={ETIQUETTE}>
        Prix de vente TTC (FCFA)
        <input name="prixVente" inputMode="numeric" required placeholder="0" className={`${CHAMP} tabular-nums`} />
      </label>
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-[13px] font-medium text-muted">TVA sur la vente</legend>
        <div className="grid grid-cols-2 gap-2">
          <label className={CHOIX}>
            <input type="radio" name="tauxTva" value="1925" defaultChecked className="sr-only" />
            19,25 %
          </label>
          <label className={CHOIX}>
            <input type="radio" name="tauxTva" value="0" className="sr-only" />
            Sans TVA
          </label>
        </div>
      </fieldset>

      <label className="flex min-h-12 items-center gap-3 rounded-xl border border-line bg-surface px-3 text-[15px] text-ink">
        <input type="checkbox" name="suiviStock" checked={suivi} onChange={(e) => setSuivi(e.target.checked)} className="h-5 w-5 accent-[var(--color-action)]" />
        Suivre le stock de cet article
      </label>

      {suivi ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <label className={ETIQUETTE}>
              Stock de départ
              <input name="quantiteInitiale" inputMode="numeric" placeholder="0" className={`${CHAMP} tabular-nums`} />
            </label>
            <label className={ETIQUETTE}>
              Coût d&apos;achat unitaire HT
              <input name="coutInitial" inputMode="numeric" placeholder="FCFA" className={`${CHAMP} tabular-nums`} />
            </label>
          </div>
          <label className={ETIQUETTE}>
            Me prévenir quand il reste au plus
            <input name="seuilAlerte" inputMode="numeric" placeholder="0" className={`${CHAMP} tabular-nums`} />
          </label>
        </>
      ) : (
        <p className="text-[13px] leading-[19px] text-muted">
          Pour un service (livraison, pose, réparation) : Marly ne compte pas de stock.
        </p>
      )}

      <Erreur texte={etat.erreur} />
      <button type="submit" disabled={enCours} className={BOUTON}>
        {enCours ? "Enregistrement…" : "Enregistrer l'article"}
      </button>
    </form>
  );
}

export function FormulaireMouvement({ dossierId, articleId, unite }: { dossierId: string; articleId: string; unite: string }) {
  const [etat, action, enCours] = useActionState(mouvementStock, INITIAL);
  const [type, setType] = useState<"ENTREE" | "SORTIE">("ENTREE");
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="dossierId" value={dossierId} />
      <input type="hidden" name="articleId" value={articleId} />
      <fieldset className="grid grid-cols-2 gap-2">
        <legend className="sr-only">Sens du mouvement</legend>
        <label className={CHOIX}>
          <input type="radio" name="type" value="ENTREE" checked={type === "ENTREE"} onChange={() => setType("ENTREE")} className="sr-only" />
          Entrée
        </label>
        <label className={CHOIX}>
          <input type="radio" name="type" value="SORTIE" checked={type === "SORTIE"} onChange={() => setType("SORTIE")} className="sr-only" />
          Sortie
        </label>
      </fieldset>
      <div className="grid grid-cols-2 gap-3">
        <label className={ETIQUETTE}>
          Quantité ({unite})
          <input name="quantite" inputMode="numeric" required placeholder="0" className={`${CHAMP} tabular-nums`} />
        </label>
        {type === "ENTREE" && (
          <label className={ETIQUETTE}>
            Coût unitaire HT
            <input name="coutUnitaire" inputMode="numeric" required placeholder="FCFA" className={`${CHAMP} tabular-nums`} />
          </label>
        )}
      </div>
      <label className={ETIQUETTE}>
        Motif (facultatif)
        <input
          name="motif"
          maxLength={120}
          placeholder={type === "ENTREE" ? "Par exemple : achat chez CIMENCO" : "Par exemple : sacs abîmés"}
          className={CHAMP}
        />
      </label>
      <Erreur texte={etat.erreur} />
      <button type="submit" disabled={enCours} className={BOUTON}>
        {enCours ? "Enregistrement…" : type === "ENTREE" ? "Enregistrer l'entrée" : "Enregistrer la sortie"}
      </button>
    </form>
  );
}

export function FormulaireInventaire({ dossierId, articleId, unite }: { dossierId: string; articleId: string; unite: string }) {
  const [etat, action, enCours] = useActionState(inventaireStock, INITIAL);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="dossierId" value={dossierId} />
      <input type="hidden" name="articleId" value={articleId} />
      <label className={ETIQUETTE}>
        Quantité comptée ({unite})
        <input name="quantiteReelle" inputMode="numeric" required placeholder="0" className={`${CHAMP} tabular-nums`} />
      </label>
      <Erreur texte={etat.erreur} />
      <button type="submit" disabled={enCours} className={BOUTON}>
        {enCours ? "Enregistrement…" : "Corriger le stock"}
      </button>
    </form>
  );
}

export function FormulairePrix({
  dossierId,
  articleId,
  prixVente,
  seuilAlerte,
  suiviStock,
}: {
  dossierId: string;
  articleId: string;
  prixVente: number;
  seuilAlerte: number;
  suiviStock: boolean;
}) {
  const [etat, action, enCours] = useActionState(modifierArticle, INITIAL);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="dossierId" value={dossierId} />
      <input type="hidden" name="articleId" value={articleId} />
      <div className={suiviStock ? "grid grid-cols-2 gap-3" : "grid gap-3"}>
        <label className={ETIQUETTE}>
          Prix de vente TTC
          <input name="prixVente" inputMode="numeric" required defaultValue={prixVente} className={`${CHAMP} tabular-nums`} />
        </label>
        {suiviStock && (
          <label className={ETIQUETTE}>
            Seuil d&apos;alerte
            <input name="seuilAlerte" inputMode="numeric" defaultValue={seuilAlerte} className={`${CHAMP} tabular-nums`} />
          </label>
        )}
      </div>
      <Erreur texte={etat.erreur} />
      <button type="submit" disabled={enCours} className={BOUTON}>
        {enCours ? "Enregistrement…" : "Enregistrer"}
      </button>
    </form>
  );
}