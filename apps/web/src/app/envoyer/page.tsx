import Link from "next/link";
import { Suspense } from "react";
import { lireProfil, listerDemandes, listerPieces, type StatutPiece } from "@/lib/api";
import { seDeconnecter } from "../connexion/actions";
import { FormulaireEnvoi } from "./formulaire-envoi";

const LIBELLES: Record<StatutPiece, { texte: string; classes: string }> = {
  EN_ATTENTE: { texte: "En attente", classes: "bg-neutral-bg text-muted" },
  RECUE: { texte: "Reçue", classes: "bg-info-bg text-info-ink" },
  A_COMPLETER: { texte: "À compléter", classes: "bg-warning-bg text-warning-ink" },
  TRAITEE: { texte: "Traitée", classes: "bg-success-bg text-success-ink" },
  REMPLACEE: { texte: "Remplacée", classes: "bg-neutral-bg text-muted" },
};

const formatMontant = new Intl.NumberFormat("fr-FR");

async function ContenuEnvoyer() {
  const profil = await lireProfil();

  if (!profil.dossier) {
    return (
      <div className="flex flex-col gap-3 p-6">
        <p>Cet écran est réservé aux entreprises clientes.</p>
        <Link href="/dossiers" className="font-bold text-heading underline">
          Aller aux dossiers du cabinet
        </Link>
      </div>
    );
  }

  const [pieces, demandes] = await Promise.all([
    listerPieces(profil.dossier.id),
    listerDemandes(profil.dossier.id),
  ]);
  const demandesOuvertes = demandes
    .filter((d) => d.statut === "OUVERTE")
    .map((d) => ({ id: d.id, description: d.description, echeance: d.echeance }));

  return (
    <>
      <header className="flex items-center justify-between gap-3 border-b border-line bg-surface px-5 py-4">
        <div className="flex items-center gap-3">
          <svg width="36" height="36" viewBox="0 0 64 64" aria-hidden="true">
            <rect width="64" height="64" rx="16" fill="#10294A" />
            <path d="M16 46V31a8 8 0 0 1 16 0v15M32 31a8 8 0 0 1 16 0v15" fill="none" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="50" cy="15" r="5" fill="#2BB673" />
          </svg>
          <div className="flex flex-col">
            <span className="font-bold text-heading">Marly</span>
            <span className="text-xs text-muted">{profil.dossier.raisonSociale}</span>
          </div>
        </div>
        <form action={seDeconnecter}>
          <button type="submit" className="h-10 rounded-lg px-3 text-sm text-muted underline">
            Déconnexion
          </button>
        </form>
      </header>

      <section className="flex flex-col gap-4 p-5">
        <h1 className="text-2xl font-bold text-heading">Nouvelle pièce</h1>
            <FormulaireEnvoi dossierId={profil.dossier.id} demandes={demandesOuvertes} />
      </section>

      <section className="flex flex-col gap-3 p-5 pt-0">
        <h2 className="text-lg font-bold">Mes dernières pièces</h2>
        <ul className="flex flex-col rounded-2xl border border-line bg-surface">
          {pieces.slice(0, 5).map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 border-t border-line p-4 first:border-t-0">
              <div className="flex min-w-0 flex-col">
                <span className="truncate font-medium">{p.fournisseur ?? p.categorie}</span>
                <span className="text-sm text-muted">
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
      <Suspense fallback={<p className="p-6 text-muted">Chargement…</p>}>
        <ContenuEnvoyer />
      </Suspense>
    </main>
  );
}