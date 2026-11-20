import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import {
  lireAcces,
  lireApercuExport,
  lireProfil,
  listerDemandes,
  listerDossiers,
  listerExports,
  listerPieces,
  type StatutPiece,
} from "@/lib/api";
import { prochaineEcheance, versIsoJour } from "@/lib/echeances";
import { formatMontant, initiales } from "@/lib/format";
import { CadreCabinet } from "@/components/cadre-cabinet";
import { GestionAcces } from "@/components/gestion-acces";
import { Pastille, type Ton } from "@/components/pastille";
import { DemandesDossier } from "./demandes-dossier";
import { ExportSage } from "./export-sage";

const STATUTS: Record<StatutPiece, { ton: Ton; texte: string }> = {
  EN_ATTENTE: { ton: "neutral", texte: "En attente" },
  RECUE: { ton: "info", texte: "À valider" },
  A_COMPLETER: { ton: "warning", texte: "À compléter" },
  TRAITEE: { ton: "success", texte: "Validée" },
  REMPLACEE: { ton: "neutral", texte: "Remplacée" },
};

const BOUTON_SECONDAIRE =
  "inline-flex h-11 items-center rounded-xl border border-line-strong bg-surface px-4 text-[15px] font-medium text-ink hover:bg-survol";
const BOUTON_PRINCIPAL =
  "inline-flex h-11 items-center rounded-xl bg-action px-[18px] text-[15px] font-bold text-white hover:bg-action-hover";

async function ContenuDossier({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [profil, dossiers, pieces, demandes, apercuExport, lotsExport, acces] = await Promise.all([
    lireProfil(),
    listerDossiers(),
    listerPieces(id),
    listerDemandes(id),
    lireApercuExport(id),
    listerExports(id),
    lireAcces(id),
  ]);
  const dossier = dossiers.find((d) => d.id === id);
  if (!dossier) {
    notFound();
  }
  const premiereAValider = pieces.find((p) => p.statut === "RECUE");
  const peutGerer = profil.role === "RESPONSABLE" || profil.role === "COMPTABLE";

  // La date du jour est lue à chaque visite, jamais figée à l'avance
  await connection();
  const echeanceParDefaut = versIsoJour(prochaineEcheance(new Date()));

  return (
    <CadreCabinet actif="dossiers">
      <nav aria-label="Fil d'Ariane" className="flex flex-wrap gap-2 text-sm text-muted">
        <Link href="/dossiers" className="underline">Dossiers clients</Link>
        <span aria-hidden="true">›</span>
        <span>{dossier.raisonSociale}</span>
      </nav>

      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-bold ${
              dossier.regime === "REEL" ? "bg-info-bg text-info-ink" : "bg-neutral-bg text-neutral-ink"
            }`}
          >
            {initiales(dossier.raisonSociale)}
          </span>
          <div className="flex flex-col gap-1">
            <h1 className="text-[28px] font-bold leading-[34px] text-heading">{dossier.raisonSociale}</h1>
            <span className="text-sm text-muted">
              {dossier.regime === "REEL" ? "Régime réel · TVA 19,25 %" : "IGS · sans TVA"} ·{" "}
              {dossier.piecesRecues} pièce{dossier.piecesRecues > 1 ? "s" : ""} · {dossier.aValider} à valider
            </span>
          </div>
        </div>
        {peutGerer && (
          <div className="flex flex-wrap gap-3">
            <Link href={`/dossiers/${dossier.id}/modifier`} className={BOUTON_SECONDAIRE}>
              Modifier
            </Link>
            {premiereAValider && (
              <Link href={`/pieces/${premiereAValider.id}`} className={BOUTON_PRINCIPAL}>
                Valider les pièces ({dossier.aValider})
              </Link>
            )}
          </div>
        )}
      </header>

      <DemandesDossier
        dossierId={dossier.id}
        demandes={demandes}
        echeanceParDefaut={echeanceParDefaut}
        peutGerer={peutGerer}
      />

      <section
        aria-labelledby="titre-pieces"
        className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface"
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-6 py-4">
          <h2 id="titre-pieces" className="text-lg font-bold">Pièces reçues</h2>
          <span className="text-sm text-muted">{pieces.length} au total</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-left text-[15px]">
            <thead>
              <tr className="text-[13px] text-muted">
                <th scope="col" className="px-6 py-3 font-medium">Date</th>
                <th scope="col" className="px-3 py-3 font-medium">Fournisseur</th>
                <th scope="col" className="px-3 py-3 font-medium">Catégorie</th>
                <th scope="col" className="px-3 py-3 text-right font-medium">Montant TTC</th>
                <th scope="col" className="px-3 py-3 font-medium">Statut</th>
                <th scope="col" className="px-6 py-3"><span className="sr-only">Action</span></th>
              </tr>
            </thead>
            <tbody>
              {pieces.map((p) => (
                <tr key={p.id} className="border-t border-line hover:bg-survol">
                  <td className="px-6 py-3.5 tabular-nums">
                    {new Date(p.date).toLocaleDateString("fr-FR", { timeZone: "UTC" })}
                  </td>
                  <td className="px-3 py-3.5 font-medium">{p.fournisseur ?? "Non précisé"}</td>
                  <td className="px-3 py-3.5 text-muted">{p.categorie}</td>
                  <td className="px-3 py-3.5 text-right tabular-nums">{formatMontant(p.montantTtc)} FCFA</td>
                  <td className="px-3 py-3.5">
                    <Pastille ton={STATUTS[p.statut].ton}>{STATUTS[p.statut].texte}</Pastille>
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    {peutGerer && (
                      <Link href={`/pieces/${p.id}`} className="font-bold text-link underline underline-offset-[3px]">
                        {p.statut === "RECUE" ? "Valider" : "Voir"}
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
              {pieces.length === 0 && (
                <tr className="border-t border-line">
                  <td colSpan={6} className="px-6 py-6 text-muted">
                    Aucune pièce pour l&apos;instant. Invite le gérant ci-dessous pour qu&apos;il envoie ses pièces.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {peutGerer && <ExportSage dossierId={dossier.id} apercu={apercuExport} lots={lotsExport} />}

      <GestionAcces
        titre="Accès de l'entreprise"
        role="PME"
        dossierId={dossier.id}
        nomCabinet={profil.cabinet}
        nomDossier={dossier.raisonSociale}
        membres={acces.membres}
        invitations={acces.invitations}
        peutInviter={peutGerer}
      />
    </CadreCabinet>
  );
}

export default function PageDossier({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="p-6 text-muted">Chargement du dossier…</p>}>
      <ContenuDossier params={params} />
    </Suspense>
  );
}