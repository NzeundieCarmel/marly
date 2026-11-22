import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { lireProfil, listerPieces, type Piece, type StatutPiece } from "@/lib/api";
import { formatMontant } from "@/lib/format";
import { resumerMois } from "@/lib/resume-mois";
import { CadreTelephone } from "@/components/cadre-telephone";
import { Pastille, type Ton } from "@/components/pastille";
import { PiecesEnAttente } from "./en-attente";

type Statuts = Record<StatutPiece, { ton: Ton; texte: string }>;

const STATUTS_CABINET: Statuts = {
  EN_ATTENTE: { ton: "neutral", texte: "En attente" },
  RECUE: { ton: "info", texte: "Reçue" },
  A_COMPLETER: { ton: "warning", texte: "À compléter" },
  TRAITEE: { ton: "success", texte: "Traitée" },
  REMPLACEE: { ton: "neutral", texte: "Remplacée" },
};

const STATUTS_AUTONOME: Statuts = {
  EN_ATTENTE: { ton: "neutral", texte: "En attente" },
  RECUE: { ton: "success", texte: "Rangée" },
  A_COMPLETER: { ton: "warning", texte: "À reprendre" },
  TRAITEE: { ton: "success", texte: "Rangée" },
  REMPLACEE: { ton: "neutral", texte: "Remplacée" },
};

function moisDe(piece: Piece): string {
  const texte = new Date(piece.date).toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}

function Chiffre({ valeur, libelle, ton }: { valeur: number; libelle: string; ton: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-[14px] border border-line bg-surface p-3">
      <strong className={`text-[22px] tabular-nums ${ton}`}>{valeur}</strong>
      <span className="text-xs text-muted">{libelle}</span>
    </div>
  );
}

async function ContenuPieces() {
  const profil = await lireProfil();
  if (!profil.dossier) {
    redirect("/dossiers");
  }
  const autonome = profil.autonome;
  const statuts = autonome ? STATUTS_AUTONOME : STATUTS_CABINET;
  const pieces = (await listerPieces(profil.dossier.id)).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  await connection();
  const ceMois = resumerMois(pieces, new Date());

  const envoyees = pieces.filter((p) => p.statut !== "REMPLACEE").length;
  const traitees = pieces.filter((p) => p.statut === "TRAITEE").length;
  const aReprendre = pieces.filter((p) => p.statut === "A_COMPLETER").length;

  // Regroupement par mois, du plus récent au plus ancien, avec le total du mois
  const groupes: { mois: string; total: number; pieces: Piece[] }[] = [];
  for (const p of pieces) {
    const mois = moisDe(p);
    let groupe = groupes.find((g) => g.mois === mois);
    if (!groupe) {
      groupe = { mois, total: 0, pieces: [] };
      groupes.push(groupe);
    }
    groupe.pieces.push(p);
    if (p.statut !== "REMPLACEE") groupe.total += p.montantTtc;
  }

  return (
    <CadreTelephone nomDossier={profil.dossier.raisonSociale} actif="pieces">
      <h1 className="text-[26px] font-bold leading-8 text-heading">Mes pièces</h1>

      {autonome ? (
        <div className="grid grid-cols-2 gap-2">
          <Chiffre valeur={envoyees} libelle="pièces rangées" ton="text-heading" />
          <Chiffre valeur={ceMois.nombre} libelle={`en ${ceMois.libelle}`} ton="text-heading" />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <Chiffre valeur={envoyees} libelle="envoyées" ton="text-heading" />
          <Chiffre valeur={traitees} libelle="traitées" ton="text-success-ink" />
          <Chiffre valeur={aReprendre} libelle="à reprendre" ton="text-warning-ink" />
        </div>
      )}

      <PiecesEnAttente />

      {groupes.length === 0 ? (
        <p className="rounded-2xl border border-line bg-surface p-5 text-muted">
          Aucune pièce pour l&apos;instant. Touchez « Envoyer » en bas de l&apos;écran pour commencer.
        </p>
      ) : (
        groupes.map((g) => (
          <section key={g.mois} aria-label={g.mois} className="overflow-hidden rounded-2xl border border-line bg-surface">
            <div className="flex items-center justify-between gap-2 bg-sunken px-3.5 py-2.5 text-[13px] font-medium text-muted">
              <span>{g.mois}</span>
              <span className="tabular-nums">{formatMontant(g.total)} FCFA</span>
            </div>
            {g.pieces.map((p) => {
              const statut = statuts[p.statut];
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