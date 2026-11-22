import Link from "next/link";
import type { Metadata } from "next";
import { CadreAccueil } from "@/components/cadre-accueil";
import { FormulaireEntreprise } from "./formulaire";

export const metadata: Metadata = {
  title: "Créer l'espace de votre entreprise · Marly",
};

export default function PageInscriptionEntreprise() {
  return (
    <CadreAccueil titre="Rangez toutes vos pièces au même endroit">
      <p className="text-[15px] leading-[22px] text-muted">
        Prenez vos factures et reçus en photo : Marly les classe par mois et par catégorie, et
        vous les retrouvez en un instant. Le jour où vous travaillez avec un comptable, il
        reprend vos pièces déjà rangées.
      </p>

      <FormulaireEntreprise />

      <p className="rounded-xl bg-sunken p-3 text-[13px] leading-[19px] text-muted">
        Marly range et résume vos pièces. Il ne fait pas vos déclarations fiscales et ne
        remplace pas un comptable.
      </p>

      <p className="text-center text-sm text-muted">
        Déjà un compte ?{" "}
        <Link href="/connexion" className="font-bold text-link underline">Se connecter</Link>
        {" · "}
        Vous êtes un cabinet ?{" "}
        <Link href="/inscription" className="font-bold text-link underline">Compte cabinet</Link>
      </p>
    </CadreAccueil>
  );
}