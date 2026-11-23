"use client";

import { useActionState } from "react";
import type { ClientFacture } from "@/lib/api";
import { enregistrerClient, type EtatFormulaire } from "../actions";
import { Champ, Message } from "../champs";

const ETAT_INITIAL: EtatFormulaire = { erreur: null };

export function FormulaireClient({ client }: { client?: ClientFacture }) {
  const [etat, action, enCours] = useActionState(enregistrerClient, ETAT_INITIAL);
  const v = etat.valeurs;
  const val = (cle: "nom" | "niu" | "adresse" | "telephone" | "email") => v?.[cle] ?? client?.[cle] ?? "";

  return (
    <form action={action} className="flex flex-col gap-3.5">
      <Message erreur={etat.erreur} />
      {client && <input type="hidden" name="id" value={client.id} />}
      <Champ id="nom" libelle="Nom ou raison sociale" required minLength={2} maxLength={120} autoComplete="organization" defaultValue={val("nom")} />
      <Champ id="niu" libelle="NIU du client" maxLength={20} autoCapitalize="characters" placeholder="M098765432109B" defaultValue={val("niu")} aide="Obligatoire si le client est une entreprise. Laissez vide pour un particulier." />
      <Champ id="adresse" libelle="Adresse (facultatif)" maxLength={200} defaultValue={val("adresse")} />
      <Champ id="telephone" libelle="Téléphone (facultatif)" type="tel" maxLength={30} placeholder="+237 6XX XX XX XX" defaultValue={val("telephone")} />
      <Champ id="email" libelle="E-mail (facultatif)" type="email" maxLength={254} defaultValue={val("email")} />
      <button type="submit" disabled={enCours} className="mt-1 h-[52px] rounded-xl bg-action text-base font-bold text-white hover:bg-action-hover disabled:opacity-60">
        {enCours ? "Enregistrement…" : "Enregistrer le client"}
      </button>
    </form>
  );
}