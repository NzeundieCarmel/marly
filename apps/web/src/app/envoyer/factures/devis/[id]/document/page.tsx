import Link from "next/link";
import { Suspense } from "react";
import { lireDevis, lireProfilEmetteur } from "@/lib/api";
import { formatJour, formatTaux } from "@/lib/calcul-facture";
import { BoutonImprimer } from "@/components/boutons-document";

const NOMBRE = new Intl.NumberFormat("fr-FR");
const PRINCIPAL = "flex h-12 items-center justify-center rounded-xl bg-action px-4 text-[15px] font-bold text-white hover:bg-action-hover";

async function ContenuDocumentDevis({ parametres }: { parametres: Promise<{ id: string }> }) {
  const { id } = await parametres;
  const [devis, emetteur] = await Promise.all([lireDevis(id), lireProfilEmetteur()]);
  const reel = devis.regime === "REEL";
  const f = emetteur.fiche;
  const c = devis.client;

  return (
    <div className="min-h-dvh bg-page pb-10 pt-4 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-[794px] flex-col gap-3 px-3 print:hidden">
        <Link href={`/envoyer/factures/devis/${encodeURIComponent(devis.id)}`} className="self-start py-2 text-sm font-bold text-link underline">
          Retour au devis
        </Link>
        <BoutonImprimer className={PRINCIPAL} />
      </div>

      <article className="mx-auto flex max-w-[794px] flex-col gap-8 bg-white p-10 text-[13px] leading-5 text-[#1A2230] print:max-w-none print:p-0">
        <header className="flex justify-between gap-6">
          <div className="flex flex-col gap-0.5">
            <strong className="text-lg">{[emetteur.raisonSociale, f.formeJuridique].filter(Boolean).join(" ")}</strong>
            {f.adresse && <span>{f.adresse}</span>}
            {f.telephone && <span>{f.telephone}</span>}
            {f.email && <span>{f.email}</span>}
            {emetteur.niu && <span>NIU {emetteur.niu}</span>}
            {emetteur.rccm && <span>RCCM {emetteur.rccm}</span>}
          </div>
          <div className="flex flex-col items-end gap-0.5 text-right">
            <strong className="text-2xl tracking-wide text-[#10294A]">DEVIS</strong>
            <span className="tabular-nums">{devis.numero}</span>
            <span>Du {formatJour(devis.dateDevis)}</span>
            <span>Valable jusqu&apos;au {formatJour(devis.finValidite)}</span>
          </div>
        </header>

        <section className="flex flex-col gap-0.5 self-end rounded-lg border border-[#E3E7EE] p-4 text-right">
          <span className="text-[12px] text-[#4E5867]">Client</span>
          <strong>{c.nom}</strong>
          {c.adresse && <span>{c.adresse}</span>}
          {c.niu && <span>NIU {c.niu}</span>}
          {c.telephone && <span>{c.telephone}</span>}
        </section>

        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-[#10294A] text-left text-[12px] text-[#4E5867]">
              <th className="py-2 font-medium">Désignation</th>
              <th className="py-2 text-right font-medium">Quantité</th>
              <th className="py-2 text-right font-medium">{reel ? "Prix unitaire HT" : "Prix unitaire"}</th>
              <th className="py-2 text-right font-medium">{reel ? "Total HT" : "Total"}</th>
            </tr>
          </thead>
          <tbody>
            {devis.lignes.map((l, i) => (
              <tr key={i} className="border-b border-[#E3E7EE] align-top">
                <td className="py-2 pr-3">
                  {l.designation}
                  {l.detail && <span className="block text-[12px] text-[#4E5867]">{l.detail}</span>}
                </td>
                <td className="py-2 text-right tabular-nums">{String(l.quantite).replace(".", ",")}</td>
                <td className="py-2 text-right tabular-nums">{NOMBRE.format(l.prixUnitaire)}</td>
                <td className="py-2 text-right tabular-nums">{NOMBRE.format(l.totalHt)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <section className="flex w-64 flex-col gap-1 self-end">
          <div className="flex justify-between">
            <span>{reel ? "Total HT" : "Total"}</span>
            <span className="tabular-nums">{NOMBRE.format(devis.totalHt)} FCFA</span>
          </div>
          {reel ? (
            <div className="flex justify-between">
              <span>TVA {formatTaux(devis.tauxTva)}</span>
              <span className="tabular-nums">{NOMBRE.format(devis.totalTva)} FCFA</span>
            </div>
          ) : (
            <span className="text-[12px] text-[#4E5867]">TVA non applicable (IGS)</span>
          )}
          <div className="flex justify-between border-t-2 border-[#10294A] pt-1 text-[15px] font-bold">
            <span>{reel ? "Total TTC" : "Total"}</span>
            <span className="tabular-nums">{NOMBRE.format(devis.totalTtc)} FCFA</span>
          </div>
        </section>

        {(devis.note || f.conditionsPaiement) && (
          <section className="flex flex-col gap-2 text-[12px] text-[#4E5867]">
            {devis.note && <p className="whitespace-pre-line">{devis.note}</p>}
            {f.conditionsPaiement && <p>Conditions de paiement : {f.conditionsPaiement}</p>}
          </section>
        )}

        <footer className="mt-6 grid grid-cols-2 gap-6 text-[12px] text-[#4E5867]">
          <div className="h-20 border-t border-[#8A94A6] pt-1">Pour {emetteur.raisonSociale}</div>
          <div className="h-20 border-t border-[#8A94A6] pt-1">Bon pour accord, date et signature du client</div>
        </footer>
      </article>
    </div>
  );
}

export default function PageDocumentDevis({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="p-6 text-muted">Chargement du document…</p>}>
      <ContenuDocumentDevis parametres={params} />
    </Suspense>
  );
}