import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { lireFacture, lireProfil, lireProfilEmetteur, listerArticles, listerClientsFacture, type FactureDetail } from "@/lib/api";
import { jourDouala } from "@/lib/calcul-facture";
import { CadreTelephone } from "@/components/cadre-telephone";
import { IconeRetour } from "@/components/icones";
import { Pastille, type Ton } from "@/components/pastille";
import { ActionAvoir, ActionsBrouillon } from "../boutons-facture";
import { EditeurFacture } from "../editeur-facture";
import { PanneauPaiement } from "../panneau-paiement";
import { RecapFacture } from "../recap-facture";

type Recherche = Promise<Record<string, string | string[] | undefined>>;

function statut(f: FactureDetail): { ton: Ton; texte: string } {
  if (f.type === "AVOIR") return { ton: "neutral", texte: "Avoir" };
  if (f.statut === "BROUILLON") return { ton: "neutral", texte: "Brouillon" };
  if (f.statut === "ANNULEE") return { ton: "neutral", texte: "Annulée" };
  return { ton: "info", texte: "Émise" };
}

async function ContenuFacture({ parametres, recherche }: { parametres: Promise<{ id: string }>; recherche: Recherche }) {
  const [{ id }, drapeaux] = await Promise.all([parametres, recherche]);
  const [profil, emetteur, facture, clients] = await Promise.all([
    lireProfil(),
    lireProfilEmetteur(),
    lireFacture(id),
    listerClientsFacture(),
  ]);
  if (!profil.dossier) {
    redirect("/dossiers");
  }
  const articles = facture.statut === "BROUILLON" ? await listerArticles(profil.dossier.id) : [];
  await connection();
  const s = statut(facture);
  const titre = facture.numero ?? "Brouillon de facture";

  return (
    <CadreTelephone nomDossier={profil.dossier.raisonSociale} actif="factures">
      <div className="-ml-2 flex items-center gap-1">
        <Link href="/envoyer/factures" aria-label="Retour aux factures" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink hover:bg-survol">
          <IconeRetour width={22} height={22} />
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-xl font-bold text-heading tabular-nums">{titre}</h1>
        <Pastille ton={s.ton}>{s.texte}</Pastille>
      </div>

      {drapeaux.depuisPhoto === "1" && facture.statut === "BROUILLON" && (
        <p role="status" className="rounded-xl bg-success-bg p-3 text-sm text-success-ink">
          Brouillon créé à partir de la photo. Vérifiez le client et les lignes, puis émettez la facture.
        </p>
      )}
      {drapeaux.depuisDevis === "1" && facture.statut === "BROUILLON" && (
        <p role="status" className="rounded-xl bg-success-bg p-3 text-sm text-success-ink">
          Brouillon créé à partir du devis. Vérifiez-le, puis émettez la facture.
        </p>
      )}
      {drapeaux.enregistree === "1" && facture.statut === "BROUILLON" && (
        <p role="status" className="rounded-xl bg-success-bg p-3 text-sm text-success-ink">Brouillon enregistré.</p>
      )}
      {drapeaux.emise === "1" && (
        <p role="status" className="rounded-xl bg-success-bg p-3 text-sm text-success-ink">
          Facture émise sous le numéro <strong>{facture.numero}</strong>.
          {emetteur.autonome ? " Elle est rangée dans vos pièces." : " Elle a été transmise à votre cabinet comptable."}
        </p>
      )}
      {drapeaux.avoir === "1" && (
        <p role="status" className="rounded-xl bg-success-bg p-3 text-sm text-success-ink">
          Avoir <strong>{facture.numero}</strong> émis. La facture d&apos;origine est annulée.
        </p>
      )}

      {facture.factureOrigine && (
        <p className="text-sm text-muted">
          Avoir sur la facture{" "}
          <Link href={`/envoyer/factures/${facture.factureOrigine.id}`} className="font-bold text-link underline">
            {facture.factureOrigine.numero}
          </Link>
        </p>
      )}
      {facture.avoir && (
        <p className="rounded-xl bg-neutral-bg p-3 text-sm text-neutral-ink">
          Annulée par l&apos;avoir{" "}
          <Link href={`/envoyer/factures/${facture.avoir.id}`} className="font-bold underline">
            {facture.avoir.numero}
          </Link>
        </p>
      )}

        <Link
        href={`/envoyer/factures/${facture.id}/document`}
        className="flex h-12 items-center justify-center rounded-xl border border-line-strong bg-surface text-[15px] font-bold text-ink hover:bg-survol"
      >
        {facture.statut === "BROUILLON" ? "Aperçu du document" : "Voir, imprimer ou envoyer"}
      </Link>

      {facture.statut === "BROUILLON" ? (
        <>
          <EditeurFacture
            clients={clients}
            regime={emetteur.regime}
            tauxTva={emetteur.tauxTva}
            aujourdhui={jourDouala(new Date())}
            facture={facture}
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
          <ActionsBrouillon id={facture.id} manquants={emetteur.manquants} />
        </>
      ) : (
        <>
          <RecapFacture facture={facture} />
          {facture.type === "FACTURE" && facture.statut === "EMISE" && (
            <PanneauPaiement facture={facture} aujourdhui={jourDouala(new Date())} />
          )}
          {facture.type === "FACTURE" && facture.statut === "EMISE" && <ActionAvoir id={facture.id} />}
        </>
      )}
    </CadreTelephone>
  );
}

export default function PageFacture({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Recherche }) {
  return (
    <Suspense fallback={<p className="p-6 text-muted">Chargement…</p>}>
      <ContenuFacture parametres={params} recherche={searchParams} />
    </Suspense>
  );
}