import { redirect } from "next/navigation";
import { Suspense } from "react";
import { lireProfil, listerPieces, type Piece, type StatutPiece } from "@/lib/api";
import { formatMontant } from "@/lib/format";
import { CadreTelephone } from "@/components/cadre-telephone";
import { Pastille, type Ton } from "@/components/pastille";
import { PiecesEnAttente } from "./en-attente";

const STATUTS: Record<StatutPiece, { ton: Ton; texte: string }> = {
  EN_ATTENTE: { ton: "neutral", texte: "En attente" },
  RECUE: { ton: "info", texte: "Reçue" },
  A_COMPLETER: { ton: "warning", texte: "À compléter" },
  TRAITEE: { ton: "success", texte: "Traitée" },
  REMPLACEE: { ton: "neutral", texte: "Remplacée" },
};

function moisDe(piece: Piece): string {
  const texte = new Date(piece.date).toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}

async function ContenuPieces() {
  const profil = await lireProfil();
  if (!profil.dossier) {
    redirect("/dossiers");
  }
  const pieces = (await listerPieces(profil.dossier.id)).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  const envoyees = pieces.filter((p) => p.statut !== "REMPLACEE").length;
  const traitees = pieces.filter((p) => p.statut === "TRAITEE").length;
  const aReprendre = pieces.filter((p) => p.statut === "A_COMPLETER").length;

  // Regroupement par mois, du plus récent au plus ancien
  const groupes: { mois: string; pieces: Piece[] }[] = [];
  for (const p of pieces) {
    const mois = moisDe(p);
    const groupe = groupes.find((g) => g.mois === mois);
    if (groupe) groupe.pieces.push(p);
    else groupes.push({ mois, pieces: [p] });
  }

  return (
    <CadreTelephone nomDossier={profil.dossier.raisonSociale} actif="pieces">
      <h1 className="text-[26px] font-bold leading-8 text-heading">Mes pièces</h1>

      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col gap-0.5 rounded-[14px] border border-line bg-surface p-3">
          <strong className="text-[22px] text-heading tabular-nums">{envoyees}</strong>
          <span className="text-xs text-muted">envoyées</span>
        </div>
        <div className="flex flex-col gap-0.5 rounded-[14px] border border-line bg-surface p-3">
          <strong className="text-[22px] text-success-ink tabular-nums">{traitees}</strong>
          <span className="text-xs text-muted">traitées</span>
        </div>
        <div className="flex flex-col gap-0.5 rounded-[14px] border border-line bg-surface p-3">
          <strong className="text-[22px] text-warning-ink tabular-nums">{aReprendre}</strong>
          <span className="text-xs text-muted">à reprendre</span>
        </div>
      </div>

      <PiecesEnAttente />

      {groupes.length === 0 ? (
        <p className="rounded-2xl border border-line bg-surface p-5 text-muted">
          Aucune pièce envoyée pour l&apos;instant. Touchez « Envoyer » en bas de l&apos;écran pour commencer.
        </p>
      ) : (
        groupes.map((g) => (
          <section key={g.mois} aria-label={g.mois} className="overflow-hidden rounded-2xl border border-line bg-surface">
            <div className="bg-sunken px-3.5 py-2.5 text-[13px] font-medium text-muted">{g.mois}</div>
            {g.pieces.map((p) => {
              const statut = STATUTS[p.statut];
              return (
                <div key={p.id} className="flex items-center gap-3 border-t border-line px-3.5 py-3">
                  <span className="flex min-w-0 flex-grow flex-col gap-0.5">
                    <span className="truncate text-[15px] font-medium">{p.fournisseur ?? p.categorie}</span>
                    <span className={`text-[13px] tabular-nums ${p.statut === "A_COMPLETER" ? "text-warning-ink" : "text-muted"}`}>
                      {p.statut === "A_COMPLETER"
                        ? "À reprendre : voir l'accueil"
                        : `${new Date(p.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", timeZone: "UTC" })} · ${formatMontant(p.montantTtc)} FCFA`}
                    </span>
                  </span>
                  <Pastille ton={statut.ton}>{statut.texte}</Pastille>
                </div>
              );
            })}
          </section>
        ))
      )}
    </CadreTelephone>
  );
}

export default function PageMesPieces() {
  return (
    <Suspense fallback={<p className="p-6 text-muted">Chargement…</p>}>
      <ContenuPieces />
    </Suspense>
  );
}