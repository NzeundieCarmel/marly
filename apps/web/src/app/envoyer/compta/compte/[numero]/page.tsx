import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { lireGrandLivre, lireProfil } from "@/lib/api";
import { formatMontant } from "@/lib/format";
import { CadreTelephone } from "@/components/cadre-telephone";
import { EnTeteCompta, formatJourCourt } from "../../en-tete";

async function ContenuCompte({ parametres }: { parametres: Promise<{ numero: string }> }) {
  const { numero } = await parametres;
  if (!/^[1-8]\d{0,9}$/.test(numero)) {
    notFound();
  }
  const profil = await lireProfil();
  if (!profil.dossier) {
    redirect("/dossiers");
  }
  const gl = await lireGrandLivre(profil.dossier.id, numero);
  const lignes = [...gl.lignes].reverse();

  return (
    <CadreTelephone nomDossier={profil.dossier.raisonSociale} actif="compta">
      <EnTeteCompta titre={gl.intitule} />

      <section className="flex flex-col gap-1 rounded-2xl border border-line bg-surface p-4">
        <span className="text-sm text-muted">Compte {gl.compte} · solde</span>
        <strong className={`text-[26px] leading-8 tabular-nums ${gl.soldeFinal < 0 ? "text-danger-ink" : "text-heading"}`}>
          {gl.soldeFinal < 0 ? "− " : ""}
          {formatMontant(Math.abs(gl.soldeFinal))} FCFA
        </strong>
        <span className="text-[13px] text-muted tabular-nums">
          Entrées (débit) {formatMontant(gl.totalDebit)} · Sorties (crédit) {formatMontant(gl.totalCredit)}
        </span>
      </section>

      {lignes.length === 0 ? (
        <p className="rounded-2xl border border-line bg-surface p-4 text-sm text-muted">Aucun mouvement sur ce compte.</p>
      ) : (
        <ul aria-label="Mouvements" className="overflow-hidden rounded-2xl border border-line bg-surface">
          {lignes.map((l, i) => (
            <li key={i} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-line" : ""}`}>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[15px]">{l.libelle}</span>
                <span className="text-[13px] text-muted tabular-nums">
                  {formatJourCourt(l.date)} · {l.journal} n°{l.numero}
                </span>
              </span>
              <span className="text-right tabular-nums">
                <span className={`block text-[15px] font-medium ${l.credit ? "text-danger-ink" : "text-success-ink"}`}>
                  {l.credit ? `− ${formatMontant(l.credit)}` : `+ ${formatMontant(l.debit)}`}
                </span>
                <span className="text-[12px] text-muted">solde {formatMontant(l.solde)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </CadreTelephone>
  );
}

export default function PageCompte({ params }: { params: Promise<{ numero: string }> }) {
  return (
    <Suspense fallback={<p className="p-6 text-muted">Chargement…</p>}>
      <ContenuCompte parametres={params} />
    </Suspense>
  );
}