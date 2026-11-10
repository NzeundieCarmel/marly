import Link from "next/link";
import { Suspense } from "react";
import { lireProfil, listerDossiers, type ResumeDossier } from "@/lib/api";
import { seDeconnecter } from "../connexion/actions";

function Carte({ titre, valeur }: { titre: string; valeur: number }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-marly-bord bg-white p-5">
      <span className="text-sm text-marly-gris">{titre}</span>
      <strong className="text-3xl text-marly-bleu">{valeur}</strong>
    </div>
  );
}

function Statut({ dossier }: { dossier: ResumeDossier }) {
  if (dossier.aCompleter > 0) {
    return (
      <span className="rounded-full bg-[#FFF2DB] px-3 py-1 text-sm font-medium text-[#7A4A00]">
        À relancer
      </span>
    );
  }
  if (dossier.aValider > 0) {
    return (
      <span className="rounded-full bg-[#E6EEF9] px-3 py-1 text-sm font-medium text-[#1D4F91]">
        En cours
      </span>
    );
  }
  return (
    <span className="rounded-full bg-[#E3F5EC] px-3 py-1 text-sm font-medium text-[#11734B]">
      À jour
    </span>
  );
}

function Chargement() {
  return (
    <div className="rounded-2xl border border-marly-bord bg-white p-6 text-marly-gris">
      Chargement des dossiers…
    </div>
  );
}

// Tout ce qui dépend de l'utilisateur connecté est isolé dans <Suspense>
async function ContenuDossiers() {
  const [profil, dossiers] = await Promise.all([lireProfil(), listerDossiers()]);
  const totalAValider = dossiers.reduce((somme, d) => somme + d.aValider, 0);
  const totalACompleter = dossiers.reduce((somme, d) => somme + d.aCompleter, 0);

  return (
    <>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-marly-gris">{profil.cabinet}</span>
          <h1 className="text-3xl font-bold text-marly-bleu">Bonjour, {profil.nom}</h1>
        </div>
        <form action={seDeconnecter}>
          <button
            type="submit"
            className="h-11 rounded-xl border border-marly-bord bg-white px-4 font-medium text-marly-texte"
          >
            Se déconnecter
          </button>
        </form>
      </header>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Carte titre="Dossiers" valeur={dossiers.length} />
        <Carte titre="Pièces à valider" valeur={totalAValider} />
        <Carte titre="Pièces à compléter" valeur={totalACompleter} />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-marly-bord bg-white">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr className="text-sm text-marly-gris">
              <th className="px-5 py-3 font-medium">Dossier</th>
              <th className="px-3 py-3 font-medium">Régime</th>
              <th className="px-3 py-3 text-right font-medium">Reçues</th>
              <th className="px-3 py-3 text-right font-medium">À valider</th>
              <th className="px-3 py-3 text-right font-medium">À compléter</th>
              <th className="px-5 py-3 font-medium">Statut</th>
            </tr>
          </thead>
          <tbody>
            {dossiers.map((d) => (
              <tr key={d.id} className="border-t border-marly-bord">
                <td className="px-5 py-4 font-bold">{d.raisonSociale}</td>
                <td className="px-3 py-4">{d.regime === "REEL" ? "Réel" : "IGS"}</td>
                <td className="px-3 py-4 text-right">{d.piecesRecues}</td>
                <td className="px-3 py-4 text-right">{d.aValider}</td>
                <td className="px-3 py-4 text-right">{d.aCompleter}</td>
                <td className="px-5 py-4">
                  <Statut dossier={d} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function PageDossiers() {
  return (
    <main className="mx-auto max-w-5xl p-6">
      <Suspense fallback={<Chargement />}>
        <ContenuDossiers />
      </Suspense>
      <p className="mt-6 text-sm">
        <Link href="/" className="text-marly-gris underline">
          Accueil
        </Link>
      </p>
    </main>
  );
}