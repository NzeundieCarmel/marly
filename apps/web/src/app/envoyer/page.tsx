import Link from "next/link";
import { Suspense } from "react";
import { lireProfil, listerPieces, type StatutPiece } from "@/lib/api";
import { seDeconnecter } from "../connexion/actions";
import { FormulaireEnvoi } from "./formulaire-envoi";

const LIBELLES: Record<StatutPiece, { texte: string; classes: string }> = {
  EN_ATTENTE: { texte: "En attente", classes: "bg-[#EEF1F5] text-marly-gris" },
  RECUE: { texte: "Reçue", classes: "bg-[#E6EEF9] text-[#1D4F91]" },
  A_COMPLETER: { texte: "À compléter", classes: "bg-[#FFF2DB] text-[#7A4A00]" },
  TRAITEE: { texte: "Traitée", classes: "bg-[#E3F5EC] text-[#11734B]" },
  REMPLACEE: { texte: "Remplacée", classes: "bg-[#EEF1F5] text-marly-gris" },
};

const formatMontant = new Intl.NumberFormat("fr-FR");

async function ContenuEnvoyer() {
  const profil = await lireProfil();

  if (!profil.dossier) {
    return (
      <div className="flex flex-col gap-3 p-6">
        <p>Cet écran est réservé aux entreprises clientes.</p>
        <Link href="/dossiers" className="font-bold text-marly-bleu underline">
          Aller aux dossiers du cabinet
        </Link>
      </div>
    );
  }

  const pieces = await listerPieces(profil.dossier.id);

  return (
    <>
      <header className="flex items-center justify-between gap-3 border-b border-marly-bord bg-white px-5 py-4">
        <div className="flex items-center gap-3">
          <svg width="36" height="36" viewBox="0 0 64 64" aria-hidden="true">
            <rect width="64" height="64" rx="16" fill="#10294A" />
            <path d="M16 46V31a8 8 0 0 1 16 0v15M32 31a8 8 0 0 1 16 0v15" fill="none" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="50" cy="15" r="5" fill="#2BB673" />
          </svg>
          <div className="flex flex-col">
            <span className="font-bold text-marly-bleu">Marly</span>
            <span className="text-xs text-marly-gris">{profil.dossier.raisonSociale}</span>
          </div>
        </div>
        <form action={seDeconnecter}>
          <button type="submit" className="h-10 rounded-lg px-3 text-sm text-marly-gris underline">
            Déconnexion
          </button>
        </form>
      </header>

      <section className="flex flex-col gap-4 p-5">
        <h1 className="text-2xl font-bold text-marly-bleu">Nouvelle pièce</h1>
        <FormulaireEnvoi dossierId={profil.dossier.id} />
      </section>

      <section className="flex flex-col gap-3 p-5 pt-0">
        <h2 className="text-lg font-bold">Mes dernières pièces</h2>
        <ul className="flex flex-col rounded-2xl border border-marly-bord bg-white">
          {pieces.slice(0, 5).map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 border-t border-marly-bord p-4 first:border-t-0">
              <div className="flex min-w-0 flex-col">
                <span className="truncate font-medium">{p.fournisseur ?? p.categorie}</span>
                <span className="text-sm text-marly-gris">
                  {new Date(p.date).toLocaleDateString("fr-FR", { timeZone: "UTC" })} ·{" "}
                  {formatMontant.format(p.montantTtc)} FCFA
                </span>
              </div>
              <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${LIBELLES[p.statut].classes}`}>
                {LIBELLES[p.statut].texte}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

export default function PageEnvoyer() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col">
      <Suspense fallback={<p className="p-6 text-marly-gris">Chargement…</p>}>
        <ContenuEnvoyer />
      </Suspense>
    </main>
  );
}