import Link from "next/link";
import { Suspense } from "react";
import { lireFactureDePiece, lirePiece, listerPieces, type StatutPiece } from "@/lib/api";
import { formatMontant } from "@/lib/format";
import { CadreCabinet } from "@/components/cadre-cabinet";
import { Pastille, type Ton } from "@/components/pastille";
import { EditeurEcriture } from "./editeur-ecriture";
import { RenvoyerPiece } from "./renvoyer-piece";
import { ApercuFacture } from "./apercu-facture";
import { Visionneuse } from "./visionneuse";

const STATUTS: Record<StatutPiece, { ton: Ton; texte: string }> = {
  EN_ATTENTE: { ton: "neutral", texte: "En attente" },
  RECUE: { ton: "info", texte: "À valider" },
  A_COMPLETER: { ton: "warning", texte: "À compléter" },
  TRAITEE: { ton: "success", texte: "Validée" },
  REMPLACEE: { ton: "neutral", texte: "Remplacée" },
};

const FLECHE =
  "flex h-10 w-10 items-center justify-center rounded-[10px] border border-line-strong bg-surface text-ink hover:bg-survol";

async function ContenuPiece({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
    const { piece, dossier, ecriture } = await lirePiece(id);
  // Une vente émise avec Marly montre sa facture à la place d'une photo
  const [pieces, documentFacture] = await Promise.all([
    listerPieces(dossier.id),
    piece.factureId ? lireFactureDePiece(piece.id) : Promise.resolve(null),
  ]);
  const vente = documentFacture !== null;

  // Navigation parmi les pièces à valider du dossier
  const aValider = pieces.filter((p) => p.statut === "RECUE");
  const position = aValider.findIndex((p) => p.id === piece.id);
  const precedente = position > 0 ? aValider[position - 1].id : null;
  const suivante = position >= 0 && position < aValider.length - 1 ? aValider[position + 1].id : null;
  // Après validation : la suivante, sinon la première restante
  const suivanteId = suivante ?? aValider.find((p) => p.id !== piece.id)?.id ?? null;
  const modifiable = piece.statut === "RECUE";
  const statut = STATUTS[piece.statut];
  const titre = `${piece.fournisseur ?? "Pièce"} · ${piece.categorie}`;

  return (
    <CadreCabinet actif="valider">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Fil d'Ariane" className="flex flex-wrap gap-2 text-sm text-muted">
          <Link href={`/dossiers/${dossier.id}`} className="underline">{dossier.raisonSociale}</Link>
          <span aria-hidden="true">›</span>
          <span>{modifiable ? "Pièces à valider" : "Pièce"}</span>
        </nav>
        {position >= 0 && (
          <div className="flex items-center gap-2">
            {precedente ? (
              <Link href={`/pieces/${precedente}`} aria-label="Pièce précédente" className={FLECHE}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
              </Link>
            ) : (
              <span className={`${FLECHE} opacity-40`} aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
              </span>
            )}
            <span className="px-1 text-sm font-medium tabular-nums">
              {position + 1} sur {aValider.length}
            </span>
            {suivante ? (
              <Link href={`/pieces/${suivante}`} aria-label="Pièce suivante" className={FLECHE}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>
              </Link>
            ) : (
              <span className={`${FLECHE} opacity-40`} aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
              </span>
            )}
          </div>
        )}
      </div>

      <header className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <h1 className="text-[28px] font-bold leading-[34px] text-heading">{titre}</h1>
        <Pastille ton={statut.ton}>{statut.texte}</Pastille>
        {!vente && (
          <Link href={`/pieces/${piece.id}/fiche`} className="text-sm font-bold text-link underline">
            Fiche de pièce
          </Link>
        )}
        <span className="text-sm text-muted">
          {dossier.regime === "REEL"
            ? `Régime réel · TVA ${String(dossier.tauxTva).replace(".", ",")} %`
            : "IGS · sans TVA"}
        </span>
      </header>

      <div className="flex flex-wrap items-start gap-6">
             {documentFacture ? (
          <ApercuFacture pieceId={piece.id} document={documentFacture} />
        ) : (
          <Visionneuse
            src={piece.aUnFichier ? `/api/pieces/${piece.id}/fichier` : null}
            nom={titre}
          />
        )}

        <div className="flex min-w-0 flex-[999_1_440px] flex-col gap-4">
          <section aria-labelledby="titre-saisie" className="flex flex-col gap-3.5 rounded-2xl border border-line bg-surface px-5 py-4">
            <h2 id="titre-saisie" className="text-base font-bold">
              {vente ? "Facture émise avec Marly" : "Saisi par l'entreprise"}
            </h2>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="flex flex-col gap-0.5">
                <dt className="text-[13px] text-muted">Date</dt>
                <dd className="tabular-nums">{new Date(piece.date).toLocaleDateString("fr-FR", { timeZone: "UTC" })}</dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="text-[13px] text-muted">{vente ? "Client" : "Fournisseur"}</dt>
                <dd>{piece.fournisseur ?? "Non précisé"}</dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="text-[13px] text-muted">Montant TTC</dt>
                <dd className="tabular-nums">{formatMontant(piece.montantTtc)} FCFA</dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="text-[13px] text-muted">Catégorie</dt>
                <dd>{piece.categorie}</dd>
              </div>
            </dl>
            {piece.statut === "TRAITEE" && piece.valideLe ? (
              <p className="flex items-center gap-2.5 rounded-xl bg-success-bg px-3 py-2.5 text-sm text-success-ink">
                Pièce validée le {new Date(piece.valideLe).toLocaleDateString("fr-FR", { timeZone: "Africa/Douala" })}.
              </p>
            ) : (
              piece.aUnFichier && (
                <p className="flex items-center gap-2.5 rounded-xl bg-success-bg px-3 py-2.5 text-sm text-success-ink">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5" /></svg>
                  Fichier unique : aucune autre pièce identique dans ce dossier.
                </p>
              )
            )}
          </section>

          {ecriture.proposee && ecriture.souvenir && (
            <p className="rounded-xl bg-info-bg px-3 py-2.5 text-sm text-info-ink">
              Compte <strong>{ecriture.souvenir.compte}</strong> proposé d&apos;après{" "}
              {ecriture.souvenir.fois} validation{ecriture.souvenir.fois > 1 ? "s" : ""} précédente
              {ecriture.souvenir.fois > 1 ? "s" : ""} pour ce fournisseur
              {ecriture.souvenir.source === "cabinet" ? ", dans un autre dossier du cabinet" : ""}.
            </p>
          )}

          <EditeurEcriture
            key={piece.id}
            pieceId={piece.id}
            dossierId={dossier.id}
            suivanteId={suivanteId}
            journal={ecriture.journal}
            lignesInitiales={ecriture.lignes}
            proposee={ecriture.proposee}
            modifiable={modifiable}
            actionsSecondaires={
              vente ? undefined : (
                <RenvoyerPiece pieceId={piece.id} dossierId={dossier.id} suivanteId={suivanteId} />
              )
            }
          />

          {modifiable && aValider.length > 1 && (
            <p className="text-[13px] text-muted">
              Encore {aValider.length - 1} autre{aValider.length > 2 ? "s" : ""} pièce
              {aValider.length > 2 ? "s" : ""} à valider dans ce dossier.
            </p>
          )}
        </div>
      </div>
    </CadreCabinet>
  );
}

export default function PagePiece({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="p-6 text-muted">Chargement de la pièce…</p>}>
      <ContenuPiece params={params} />
    </Suspense>
  );
}