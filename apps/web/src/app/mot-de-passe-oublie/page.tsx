import Link from "next/link";
import type { Metadata } from "next";
import { CadreAccueil } from "@/components/cadre-accueil";
import { FormulaireMotDePasse } from "./formulaire";

export const metadata: Metadata = {
  title: "Mot de passe oublié · Marly",
};

export default function PageMotDePasseOublie() {
  return (
    <CadreAccueil titre="Choisir un nouveau mot de passe">
      <p className="text-[15px] leading-[22px] text-muted">
        Indiquez l&apos;adresse e-mail de votre compte. Nous vous envoyons un code à 6 chiffres pour choisir un
        nouveau mot de passe.
      </p>
      <FormulaireMotDePasse />
      <p className="text-center text-sm text-muted">
        <Link href="/connexion" className="font-bold text-link underline">Retour à la connexion</Link>
      </p>
    </CadreAccueil>
  );
}