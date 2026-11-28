import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { lireProfil, lireProfilEmetteur, listerArticles, listerClientsFacture } from "@/lib/api";
import { CadreTelephone } from "@/components/cadre-telephone";
import { IconeRetour } from "@/components/icones";
import { EditeurDevis } from "../editeur-devis";

async function ContenuNouveauDevis() {
  const [profil, emetteur, clients] = await Promise.all([lireProfil(), lireProfilEmetteur(), listerClientsFacture()]);
  if (!profil.dossier) {
    redirect("/dossiers");
  }
  const articles = await listerArticles(profil.dossier.id);

  return (
    <CadreTelephone nomDossier={profil.dossier.raisonSociale} actif="factures">
      <div className="-ml-2 flex items-center gap-1">
        <Link href="/envoyer/factures/devis" aria-label="Retour aux devis" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink hover:bg-survol">
          <IconeRetour width={22} height={22} />
        </Link>
        <h1 className="text-xl font-bold text-heading">Nouveau devis</h1>
      </div>
      <EditeurDevis
        clients={clients}
        regime={emetteur.regime}
        tauxTva={emetteur.tauxTva}
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

export default function PageNouveauDevis() {
  return (
    <Suspense fallback={<p className="p-6 text-muted">Chargement…</p>}>
      <ContenuNouveauDevis />
    </Suspense>
  );
}