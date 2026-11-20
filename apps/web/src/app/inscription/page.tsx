import Link from "next/link";
import type { Metadata } from "next";
import { FormulaireInscription } from "./formulaire";

export const metadata: Metadata = {
  title: "Créer un compte cabinet · Marly",
};

export default function PageInscription() {
  return (
    <main className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-heading">Créer le compte de ton cabinet</h1>
        <p className="text-muted">
          Tu pourras ensuite ajouter tes dossiers clients et inviter les entreprises à envoyer
          leurs pièces depuis leur téléphone.
        </p>
      </div>

      <FormulaireInscription />

      <p className="text-center text-sm text-muted">
        Déjà un compte ?{" "}
        <Link href="/connexion" className="font-bold text-heading underline">
          Se connecter
        </Link>
      </p>
    </main>
  );
}