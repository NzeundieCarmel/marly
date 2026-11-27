import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { lireProfil, lireProfilEmetteur, listerArticles, listerClientsFacture } from "@/lib/api";
import { jourDouala } from "@/lib/calcul-facture";
import { CadreTelephone } from "@/components/cadre-telephone";
import { IconeRetour } from "@/components/icones";
import { EditeurFacture } from "../editeur-facture";

async function ContenuNouvelle() {
  const [profil, emetteur, clients] = await Promise.all([lireProfil(), lireProfilEmetteur(), listerClientsFacture()]);
  if (!profil.dossier) {
    redirect("/dossiers");
  }
  const articles = await listerArticles(profil.dossier.id);
  await connection();
  const aujourdhui = jourDouala(new Date());

  return (
    <CadreTelephone nomDossier={profil.dossier.raisonSociale} actif="factures">
      <div className="-ml-2 flex items-center gap-1">
        <Link href="/envoyer/factures" aria-label="Retour aux factures" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink hover:bg-survol">
          <IconeRetour width={22} height={22} />
        </Link>
        <h1 className="text-xl font-bold text-heading">Nouvelle facture</h1>
      </div>
      <EditeurFacture
        clients={clients}
        regime={emetteur.regime}
        tauxTva={emetteur.tauxTva}
        aujourdhui={aujourdhui}
        articles={articles.map((a) => ({
          id: a.id,
          nom: a.nom,
          prixVente: a.prixVente,
          tauxTva: a.tauxTva,
          suiviStock: a.suiviStock,
          quantite: a.quantite,
          unite: a.unite,
        }))}
      />
    </CadreTelephone>
  );
}

export default function PageNouvelleFacture() {
  return (
    <Suspense fallback={<p className="p-6 text-muted">Chargement…</p>}>
      <ContenuNouvelle />
    </Suspense>
  );
}