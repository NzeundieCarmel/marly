import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { lireProfil, lireProfilEmetteur, listerAchats, listerArticles } from "@/lib/api";
import { CadreTelephone } from "@/components/cadre-telephone";
import { EnTeteCompta } from "@/app/envoyer/compta/en-tete";
import { FormulaireAchat } from "../formulaires";

async function ContenuNouvelAchat() {
  const [profil, emetteur] = await Promise.all([lireProfil(), lireProfilEmetteur()]);
  if (!profil.dossier) {
    redirect("/dossiers");
  }
  const [articles, achats] = await Promise.all([listerArticles(profil.dossier.id), listerAchats(profil.dossier.id)]);
  await connection();
  const aujourdhui = new Date().toLocaleDateString("sv-SE", { timeZone: "Africa/Douala" });
  const fournisseurs = [...new Set(achats.map((a) => a.fournisseur))].slice(0, 50);

  return (
    <CadreTelephone nomDossier={profil.dossier.raisonSociale} actif="stock">
      <EnTeteCompta titre="Nouvel achat" retour="/envoyer/stock/achats" />
      <FormulaireAchat
        dossierId={profil.dossier.id}
        articles={articles
          .filter((a) => a.suiviStock)
          .map((a) => ({ id: a.id, nom: a.nom, unite: a.unite, coutMoyen: a.coutMoyen, quantite: a.quantite }))}
        fournisseurs={fournisseurs}
        regime={emetteur.regime}
        tauxTva={emetteur.tauxTva}
        aujourdhui={aujourdhui}
      />
    </CadreTelephone>
  );
}

export default function PageNouvelAchat() {
  return (
    <Suspense fallback={<p className="p-6 text-muted">Chargement…</p>}>
      <ContenuNouvelAchat />
    </Suspense>
  );
}