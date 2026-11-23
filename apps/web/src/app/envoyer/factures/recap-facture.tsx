import type { FactureDetail } from "@/lib/api";
import { formatJour, formatTaux } from "@/lib/calcul-facture";

const NOMBRE = new Intl.NumberFormat("fr-FR");

function Ligne({ libelle, montant, fort = false }: { libelle: string; montant: number; fort?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${fort ? "text-base font-bold text-heading" : "text-sm"}`}>
      <span>{libelle}</span>
      <span className="tabular-nums">{NOMBRE.format(montant)} FCFA</span>
    </div>
  );
}

export function RecapFacture({ facture }: { facture: FactureDetail }) {
  const reel = facture.regime === "REEL";
  const c = facture.clientDetail;

  return (
    <>
      <dl className="grid grid-cols-2 gap-3 rounded-2xl border border-line bg-surface p-4 text-sm">
        <div className="flex flex-col gap-0.5">
          <dt className="text-muted">Émise le</dt>
          <dd className="font-medium tabular-nums">{formatJour(facture.dateEmission)}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-muted">Échéance</dt>
          <dd className="font-medium tabular-nums">{formatJour(facture.dateEcheance)}</dd>
        </div>
        <div className="col-span-2 flex flex-col gap-0.5 border-t border-line pt-3">
          <dt className="text-muted">Client</dt>
          <dd className="font-medium">{c.nom}</dd>
          <dd className="text-muted">{[c.niu ? `NIU ${c.niu}` : "Particulier", c.telephone].filter(Boolean).join(" · ")}</dd>
        </div>
      </dl>

      <ul className="overflow-hidden rounded-2xl border border-line bg-surface">
        {facture.lignes.map((l, i) => (
          <li key={i} className={`flex justify-between gap-3 px-4 py-3 ${i > 0 ? "border-t border-line" : ""}`}>
            <span className="flex min-w-0 flex-col">
              <span className="font-medium">{l.designation}</span>
              {l.detail && <span className="text-[13px] text-muted">{l.detail}</span>}
              <span className="text-[13px] text-muted tabular-nums">
                {String(l.quantite).replace(".", ",")} × {NOMBRE.format(l.prixUnitaire)}
              </span>
            </span>
            <strong className="shrink-0 tabular-nums">{NOMBRE.format(l.totalHt)}</strong>
          </li>
        ))}
      </ul>

      <section aria-label="Totaux" className="flex flex-col gap-2 rounded-2xl bg-sunken p-4">
        <Ligne libelle={reel ? "Total HT" : "Total"} montant={facture.totalHt} />
        {reel ? (
          <Ligne libelle={`TVA ${formatTaux(facture.tauxTva)}`} montant={facture.totalTva} />
        ) : (
          <p className="text-[13px] text-muted">TVA non applicable (IGS)</p>
        )}
        <Ligne libelle={reel ? "Total TTC" : "Total"} montant={facture.totalTtc} fort />
        {facture.retenue > 0 && (
          <>
            <Ligne libelle={`Retenue AIR ${formatTaux(facture.tauxRetenue)}`} montant={-facture.retenue} />
            <Ligne libelle="Net à payer" montant={facture.netAPayer} fort />
          </>
        )}
      </section>
    </>
  );
}