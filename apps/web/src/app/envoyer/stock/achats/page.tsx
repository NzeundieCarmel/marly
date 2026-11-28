import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { lireProfil, listerAchats } from "@/lib/api";
import { formatMontant } from "@/lib/format";
import { CadreTelephone } from "@/components/cadre-telephone";
import { EnTeteCompta, formatJourCourt } from "@/app/envoyer/compta/en-tete";
import { libellePaiement } from "./libelles";

async function ContenuAchats() {
  const profil = await lireProfil();
  if (!profil.dossier) {
    redirect("/dossiers");
  }
  const achats = await listerAchats(profil.dossier.id);
  const aPayer = achats
    .filter((a) => a.statut === "VALIDE" && a.paiement === "A_CREDIT")
    .reduce((s, a) => s + a.totalTtc - a.montantRegle, 0);

  return (
    <CadreTelephone nomDossier={profil.dossier.raisonSociale} actif="stock">
      <EnTeteCompta titre="Achats" retour="/envoyer/stock" />
      <Link
        href="/envoyer/stock/achats/nouveau"
        className="flex h-[52px] items-center justify-center rounded-xl bg-action text-base font-bold text-white hover:bg-action-hover"
      >
        Nouvel achat
      </Link>

      {aPayer > 0 && (
        <section className="flex flex-col gap-0.5 rounded-2xl border border-line bg-surface p-4">
          <span className="text-sm text-muted">Reste à payer aux fournisseurs</span>
          <strong className="text-[22px] leading-7 text-heading tabular-nums">{formatMontant(aPayer)} FCFA</strong>
        </section>
      )}

      {achats.length === 0 ? (
        <p className="rounded-2xl border border-line bg-surface p-4 text-sm text-muted">
          Aucun achat pour l&apos;instant. Enregistrez chaque livraison : le stock et la comptabilité se mettent à jour d&apos;un coup.
        </p>
      ) : (
        <ul aria-label="Vos achats" className="overflow-hidden rounded-2xl border border-line bg-surface">
          {achats.map((a, i) => (
            <li key={a.id} className={i > 0 ? "border-t border-line" : ""}>
              <Link href={`/envoyer/stock/achats/${encodeURIComponent(a.id)}`} className="flex items-center gap-3 px-4 py-3 hover:bg-survol">
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[15px] font-medium text-ink">
                    n°{a.numero} · {a.fournisseur}
                  </span>
                  <span className="truncate text-[13px] text-muted">
                    {formatJourCourt(a.date)} · {libellePaiement(a.paiement)}
                  </span>
                </span>
                <span className="flex flex-col items-end gap-1">
                  <span className={`text-[15px] font-bold tabular-nums ${a.statut === "ANNULE" ? "text-muted line-through" : "text-heading"}`}>
                    {formatMontant(a.totalTtc)}
                  </span>
                  {a.statut === "ANNULE" && (
                    <span className="rounded-full border border-line px-2 py-0.5 text-[12px] text-muted">Annulé</span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </CadreTelephone>
  );
}

export default function PageAchats() {
  return (
    <Suspense fallback={<p className="p-6 text-muted">Chargement…</p>}>
      <ContenuAchats />
    </Suspense>
  );
}