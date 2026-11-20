import Link from "next/link";
import type { Metadata } from "next";
import { CadreAccueil } from "@/components/cadre-accueil";
import { FormulaireInscription } from "./formulaire";

export const metadata: Metadata = {
  title: "Créer un compte cabinet · Marly",
};

export default function PageInscription() {
  return (
    <CadreAccueil titre="Créer le compte de ton cabinet">
      <p className="text-[15px] leading-[22px] text-muted">
        Tu pourras ensuite créer tes dossiers clients et inviter les entreprises à envoyer leurs
        pièces depuis leur téléphone.
      </p>

      <FormulaireInscription />

      <p className="text-center text-sm text-muted">
        Déjà un compte ?{" "}
        <Link href="/connexion" className="font-bold text-link underline">
          Se connecter
        </Link>
      </p>
    </CadreAccueil>
  );
}