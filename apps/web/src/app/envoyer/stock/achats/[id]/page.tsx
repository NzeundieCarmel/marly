import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { lireAchat, lireProfil } from "@/lib/api";
import { formatMontant } from "@/lib/format";
import { CadreTelephone } from "@/components/cadre-telephone";
import { EnTeteCompta, formatJourCourt } from "@/app/envoyer/compta/en-tete";
import { AnnulerAchat } from "../formulaires";
import { PaiementFournisseur } from "../paiement-fournisseur";
import { libellePaiement } from "../libelles";

type Recherche = Promise<Record<string, string | string[] | undefined>>;

async function ContenuAchat({ parametres, recherche }: { parametres: Promise<{ id: string }>; recherche: Recherche }) {
  const [{ id }, p, profil] = await Promise.all([parametres, recherche, lireProfil()]);
  if (!profil.dossier) {
    redirect("/dossiers");
  }
  const achat = await lireAchat(profil.dossier.id, id);
  await connection();
  const aujourdhui = new Date().toLocaleDateString("sv-SE", { timeZone: "Africa/Douala" });
  const annule = achat.statut === "ANNULE";

  return (
    <CadreTelephone nomDossier={profil.dossier.raisonSociale} actif="stock">
      <EnTeteCompta titre={`Achat n°${achat.numero}`} retour="/envoyer/stock/achats" />

      {p.paye === "1" && (
        <p role="status" className="rounded-xl bg-success-bg p-3 text-sm text-success-ink">Paiement enregistré.</p>
      )}
      {p.ok === "1" && (
        <p role="status" className="rounded-xl bg-success-bg p-3 text-sm text-success-ink">
          Achat enregistré : les articles sont entrés en stock.
        </p>
      )}
      {annule && (
        <p role="status" className="rounded-xl bg-warning-bg p-3 text-sm text-warning-ink">
          Achat annulé{achat.annuleLe ? ` le ${formatJourCourt(achat.annuleLe)}` : ""} : les articles sont ressortis du stock.
        </p>
      )}

      <dl className="grid grid-cols-2 gap-3 rounded-2xl border border-line bg-surface p-4 text-sm">
        <div className="col-span-2 flex flex-col gap-0.5">
          <dt className="text-muted">Fournisseur</dt>
          <dd className="text-[15px] font-medium">{achat.fournisseur}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-muted">Date</dt>
          <dd className="font-medium tabular-nums">{formatJourCourt(achat.date)}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-muted">Sa facture</dt>
          <dd className="font-medium">{achat.referenceFournisseur ?? "Non indiquée"}</dd>
        </div>
        <div className="col-span-2 flex flex-col gap-0.5 border-t border-line pt-3">
          <dt className="text-muted">Paiement</dt>
          <dd className="font-medium">{libellePaiement(achat.paiement)}</dd>
        </div>
      </dl>

      <ul aria-label="Articles reçus" className="overflow-hidden rounded-2xl border border-line bg-surface">
        {achat.lignes.map((l, i) => (
          <li key={l.articleId} className={`flex justify-between gap-3 px-4 py-3 ${i > 0 ? "border-t border-line" : ""}`}>
            <span className="flex min-w-0 flex-col">
              <span className="font-medium">{l.nom}</span>
              <span className="text-[13px] text-muted tabular-nums">
                {formatMontant(l.quantite)} × {formatMontant(l.coutUnitaire)} FCFA
              </span>
            </span>
            <strong className="shrink-0 tabular-nums">{formatMontant(l.totalHt)}</strong>
          </li>
        ))}
      </ul>

      <section aria-label="Totaux" className="flex flex-col gap-2 rounded-2xl bg-sunken p-4 text-sm">
        <div className="flex justify-between">
          <span>{achat.totalTva > 0 ? "Total HT" : "Total"}</span>
          <span className="tabular-nums">{formatMontant(achat.totalHt)} FCFA</span>
        </div>
        {achat.totalTva > 0 && (
          <div className="flex justify-between">
            <span>TVA récupérable</span>
            <span className="tabular-nums">{formatMontant(achat.totalTva)} FCFA</span>
          </div>
        )}
        <div className="flex justify-between text-base font-bold text-heading">
          <span>Total</span>
          <span className="tabular-nums">{formatMontant(achat.totalTtc)} FCFA</span>
        </div>
      </section>

      {!annule && achat.paiement === "A_CREDIT" && (
        <PaiementFournisseur
          dossierId={profil.dossier.id}
          id={achat.id}
          reste={achat.reste}
          montantRegle={achat.montantRegle}
          reglements={achat.reglements}
          dateAchat={achat.date.slice(0, 10)}
          aujourdhui={aujourdhui}
        />
      )}

      {!annule && achat.montantRegle === 0 && <AnnulerAchat dossierId={profil.dossier.id} id={achat.id} />}
    </CadreTelephone>
  );
}

export default function PageAchat({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Recherche }) {
  return (
    <Suspense fallback={<p className="p-6 text-muted">Chargement…</p>}>
      <ContenuAchat parametres={params} recherche={searchParams} />
    </Suspense>
  );
}