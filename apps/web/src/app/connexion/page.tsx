import Link from "next/link";
import { Suspense } from "react";
import { CadreAccueil } from "@/components/cadre-accueil";
import { FormulaireConnexion } from "./formulaire";

export default function PageConnexion() {
  return (
    <CadreAccueil titre="Connexion à Marly">
      <p className="text-[15px] leading-[22px] text-muted">
        Les pièces comptables, du téléphone de la PME au cabinet.
      </p>

      <Suspense fallback={null}>
        <FormulaireConnexion />
      </Suspense>

      <p className="text-center text-sm text-muted">
        Nouveau cabinet ?{" "}
        <Link href="/inscription" className="font-bold text-link underline">
          Créer un compte
        </Link>
      </p>

      <p className="mt-auto text-center text-[13px] leading-[19px] text-muted">
        Vous êtes une entreprise ? Votre accès se crée avec le lien d&apos;invitation envoyé par
        votre cabinet comptable.
      </p>
    </CadreAccueil>
  );
}