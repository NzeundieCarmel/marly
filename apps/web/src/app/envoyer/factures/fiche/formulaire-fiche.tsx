"use client";

import { useActionState } from "react";
import type { ProfilEmetteur } from "@/lib/api";
import { enregistrerFiche, type EtatFormulaire } from "../actions";
import { Champ, Message, ZoneTexte } from "../champs";

const ETAT_INITIAL: EtatFormulaire = { erreur: null };
const SECTION = "flex flex-col gap-3.5 rounded-2xl border border-line bg-surface p-4";

export function FormulaireFiche({ profil }: { profil: ProfilEmetteur }) {
  const [etat, action, enCours] = useActionState(enregistrerFiche, ETAT_INITIAL);
  const v = etat.valeurs;
  const f = profil.fiche;
  const val = (cle: keyof typeof f) => v?.[cle] ?? f[cle] ?? "";
  const aideFiscal = profil.autonome ? undefined : "Géré par votre cabinet comptable";

  return (
    <form action={action} className="flex flex-col gap-4">
      <Message erreur={etat.erreur} />

      <section aria-labelledby="titre-fiscal" className={SECTION}>
        <h2 id="titre-fiscal" className="text-base font-bold text-heading">Identité fiscale</h2>
        <Champ id="niu" libelle="NIU" required={profil.autonome} disabled={!profil.autonome} maxLength={20} autoCapitalize="characters" placeholder="M012345678901A" defaultValue={v?.niu ?? profil.niu ?? ""} aide={aideFiscal ?? "Obligatoire sur chaque facture. Une lettre, 12 chiffres, une lettre."} />
        <Champ id="rccm" libelle="RCCM" disabled={!profil.autonome} maxLength={40} autoCapitalize="characters" placeholder="RC/DLA/2024/B/1234" defaultValue={v?.rccm ?? profil.rccm ?? ""} aide={aideFiscal} />
        <Champ id="formeJuridique" libelle="Forme juridique" list="formes" maxLength={60} placeholder="SARL, SA, ETS…" defaultValue={val("formeJuridique")} />
        <datalist id="formes">
          <option value="SARL" />
          <option value="SARLU" />
          <option value="SA" />
          <option value="SAS" />
          <option value="ETS" />
          <option value="GIE" />
        </datalist>
        <Champ id="centreImpots" libelle="Centre des impôts de rattachement" maxLength={80} placeholder="Ex. : CDI Douala 1" defaultValue={val("centreImpots")} />
      </section>

      <section aria-labelledby="titre-coord" className={SECTION}>
        <h2 id="titre-coord" className="text-base font-bold text-heading">Coordonnées</h2>
        <Champ id="adresse" libelle="Adresse complète" required maxLength={200} autoComplete="street-address" placeholder="Quartier, ville, boîte postale" defaultValue={val("adresse")} />
        <Champ id="telephone" libelle="Téléphone" required type="tel" maxLength={30} autoComplete="tel" placeholder="+237 6XX XX XX XX" defaultValue={val("telephone")} />
        <Champ id="email" libelle="E-mail affiché sur la facture (facultatif)" type="email" maxLength={254} autoComplete="email" defaultValue={val("email")} />
      </section>

      <section aria-labelledby="titre-paiement" className={SECTION}>
        <h2 id="titre-paiement" className="text-base font-bold text-heading">Paiement</h2>
        <Champ id="banque" libelle="Banque (facultatif)" maxLength={80} defaultValue={val("banque")} />
        <Champ id="compte" libelle="Numéro de compte ou IBAN (facultatif)" maxLength={60} defaultValue={val("compte")} />
        <ZoneTexte id="conditionsPaiement" libelle="Conditions de paiement" maxLength={300} placeholder="Ex. : à 30 jours, par virement ou Mobile Money" defaultValue={val("conditionsPaiement")} />
        <ZoneTexte id="penalitesRetard" libelle="Pénalités de retard" maxLength={300} placeholder="Conditions appliquées en cas de retard de paiement" defaultValue={val("penalitesRetard")} />
      </section>

      <button type="submit" disabled={enCours} className="h-[52px] rounded-xl bg-action text-base font-bold text-white hover:bg-action-hover disabled:opacity-60">
        {enCours ? "Enregistrement…" : "Enregistrer ma fiche"}
      </button>
    </form>
  );
}