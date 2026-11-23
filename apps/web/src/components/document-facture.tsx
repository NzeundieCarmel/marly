import type { FactureDocument } from "@/lib/api";
import { formatJour, formatTaux } from "@/lib/calcul-facture";
import { initiales } from "@/lib/format";
import { nombreEnLettres } from "@/lib/nombre-en-lettres";

const NOMBRE = new Intl.NumberFormat("fr-FR");
const GRIS = "text-[#4E5867]";
const BLEU = "text-[#10294A]";
const ENCADRE = "flex flex-col gap-0.5 rounded-xl border border-[#E3E7EE] bg-[#F5F7FA] px-4 py-3.5";

function Montant({ libelle, valeur, signe = "" }: { libelle: string; valeur: number; signe?: string }) {
  return (
    <div className="flex justify-between gap-3 px-3 py-1.5">
      <span>{libelle}</span>
      <span className="font-medium tabular-nums">{signe}{NOMBRE.format(valeur)} FCFA</span>
    </div>
  );
}

export function DocumentFacture({ document: d }: { document: FactureDocument }) {
  const e = d.emetteur;
  const reel = d.regime === "REEL";
  const avoir = d.type === "AVOIR";
  const brouillon = d.statut === "BROUILLON";
  const nom = e?.raisonSociale ?? "";
  const lettres = nombreEnLettres(d.totalTtc);

  const blocsPaiement: { titre: string; lignes: string[] }[] = [];
  if (e?.conditionsPaiement) blocsPaiement.push({ titre: "Conditions de paiement", lignes: [e.conditionsPaiement] });
  if (e?.banque || e?.compte) {
    blocsPaiement.push({ titre: "Coordonnées bancaires", lignes: [e.banque, e.compte].filter((x): x is string => Boolean(x)) });
  }
  if (e?.penalitesRetard) blocsPaiement.push({ titre: "Pénalités de retard", lignes: [e.penalitesRetard] });

  return (
    <article
      aria-label={`${avoir ? "Avoir" : "Facture"} ${d.numero ?? "brouillon"}`}
      className="mx-auto flex w-full max-w-[794px] flex-col bg-white text-[#1A2230] shadow-[0_8px_24px_rgba(16,41,74,0.12)] print:min-h-[297mm] print:max-w-none print:shadow-none"
    >
      <div className="flex h-2 justify-end bg-[#10294A]">
        <div className="h-2 w-[120px] bg-[#2BB673]" />
      </div>

      <div className="flex flex-1 flex-col gap-6 px-5 py-6 text-[13px] leading-[19px] sm:px-14 sm:py-10 print:px-14 print:py-10">
        {brouillon && (
          <p className="rounded-lg bg-[#FFF2DB] px-3 py-2 text-sm font-bold text-[#7A4A00]">
            Brouillon : ce document n&apos;a pas valeur de facture.
          </p>
        )}

        <header className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex min-w-[260px] flex-1 gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[14px] bg-[#E6EEF9] text-[22px] font-bold text-[#1D4F91]">
              {initiales(nom)}
            </div>
            <div className="flex flex-col gap-0.5">
              <strong className={`text-xl leading-[26px] ${BLEU}`}>{nom}</strong>
              {e?.formeJuridique && <span className={GRIS}>{e.formeJuridique}</span>}
              {e?.adresse && <span>{e.adresse}</span>}
              <span>{[e?.telephone, e?.email].filter(Boolean).join(" · ")}</span>
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs leading-[18px]">
                <dt className={GRIS}>NIU</dt>
                <dd className="font-bold">{e?.niu ?? "—"}</dd>
                {e?.rccm && (
                  <>
                    <dt className={GRIS}>RCCM</dt>
                    <dd className="font-medium">{e.rccm}</dd>
                  </>
                )}
                <dt className={GRIS}>Régime</dt>
                <dd className="font-medium">{reel ? "Régime du réel" : "Impôt général synthétique (IGS)"}</dd>
                {e?.centreImpots && (
                  <>
                    <dt className={GRIS}>Centre des impôts</dt>
                    <dd className="font-medium">{e.centreImpots}</dd>
                  </>
                )}
              </dl>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2.5 text-right">
            <h1 className={`text-[40px] font-bold leading-[44px] tracking-tight ${BLEU}`}>{avoir ? "Avoir" : "Facture"}</h1>
            <strong className="text-[15px] tabular-nums">{d.numero ? `N° ${d.numero}` : "Brouillon, sans numéro"}</strong>
            <dl className="grid grid-cols-[auto_auto] gap-x-3.5 gap-y-0.5">
              <dt className={GRIS}>Date d&apos;émission</dt>
              <dd className="font-medium tabular-nums">{formatJour(d.dateEmission)}</dd>
              {!avoir && (
                <>
                  <dt className={GRIS}>Date d&apos;échéance</dt>
                  <dd className="font-medium tabular-nums">{formatJour(d.dateEcheance)}</dd>
                </>
              )}
            </dl>
            {d.statut === "ANNULEE" && (
              <span className="rounded-full bg-[#EEF1F5] px-2.5 py-1 text-xs font-bold text-[#4E5867]">
                Annulée par l&apos;avoir {d.avoir?.numero}
              </span>
            )}
            {avoir && d.factureOrigine && (
              <span className="rounded-full bg-[#EEF1F5] px-2.5 py-1 text-xs font-bold text-[#4E5867]">
                Sur la facture {d.factureOrigine.numero}
              </span>
            )}
          </div>
        </header>

        <div className="flex flex-wrap gap-4">
          <div className={`${ENCADRE} min-w-[240px] flex-1`}>
            <span className={`text-xs font-bold ${GRIS}`}>Client</span>
            <strong className={`text-base ${BLEU}`}>{d.client.nom}</strong>
            {d.client.adresse && <span>{d.client.adresse}</span>}
            {d.client.telephone && <span>{d.client.telephone}</span>}
          </div>
          <div className={`${ENCADRE} min-w-[200px]`}>
            <span className={`text-xs font-bold ${GRIS}`}>NIU du client</span>
            <strong className="text-[15px]">{d.client.niu ?? "Particulier, non requis"}</strong>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] border-collapse">
              <thead>
                <tr className={`border-b-2 border-[#10294A] bg-[#EEF1F5] ${BLEU}`}>
                  <th scope="col" className="px-3 py-2.5 text-left font-bold">Désignation des biens ou services</th>
                  <th scope="col" className="w-12 px-3 py-2.5 text-right font-bold">Qté</th>
                  <th scope="col" className="w-[118px] px-3 py-2.5 text-right font-bold">{reel ? "Prix unit. HT" : "Prix unitaire"}</th>
                  <th scope="col" className="w-[118px] px-3 py-2.5 text-right font-bold">{reel ? "Total HT" : "Total"}</th>
                </tr>
              </thead>
              <tbody>
                {d.lignes.map((l, i) => (
                  <tr key={i} className="border-b border-[#E3E7EE] align-top">
                    <td className="px-3 py-3">
                      <div className="font-medium">{l.designation}</div>
                      {l.detail && <div className={`text-xs leading-[17px] ${GRIS}`}>{l.detail}</div>}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">{String(l.quantite).replace(".", ",")}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{NOMBRE.format(l.prixUnitaire)}</td>
                    <td className="px-3 py-3 text-right font-bold tabular-nums">{NOMBRE.format(l.totalHt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <span className={`text-right text-xs ${GRIS}`}>Montants en francs CFA (FCFA)</span>
        </div>

        <div className="flex flex-wrap-reverse items-start gap-6">
          <div className="flex min-w-[240px] flex-1 flex-col gap-2.5">
            <p className="rounded-xl border border-[#E3E7EE] bg-[#F5F7FA] px-4 py-3.5 leading-5">
              {avoir ? "Arrêté le présent avoir" : "Arrêtée la présente facture"} à la somme de{" "}
              <strong>{lettres} francs CFA</strong>
              {reel ? " toutes taxes comprises." : "."}
            </p>
            {!reel && <p className={`text-xs leading-[17px] ${GRIS}`}>TVA non applicable : entreprise soumise à l&apos;impôt général synthétique (IGS).</p>}
            {d.retenue > 0 && (
              <p className={`text-xs leading-[17px] ${GRIS}`}>
                * Retenue à la source effectuée par le client désigné par l&apos;administration fiscale. Le net à payer en tient compte.
              </p>
            )}
          </div>

          <div className="flex w-full flex-col tabular-nums sm:w-[300px]">
            <Montant libelle={reel ? "Total HT" : "Total"} valeur={d.totalHt} />
            {reel && <Montant libelle={`TVA ${formatTaux(d.tauxTva)}`} valeur={d.totalTva} />}
            <div className="mt-2 flex justify-between rounded-[10px] bg-[#10294A] px-3 py-2.5 text-[15px] font-bold text-white">
              <span>{reel ? "Total TTC" : "Total"}</span>
              <span>{NOMBRE.format(d.totalTtc)} FCFA</span>
            </div>
            {d.retenue > 0 && (
              <>
                <div className={GRIS}>
                  <Montant libelle={`Retenue AIR ${formatTaux(d.tauxRetenue)}*`} valeur={d.retenue} signe="− " />
                </div>
                <div className={`flex items-baseline justify-between border-t-2 border-[#10294A] px-3 pt-2 font-bold ${BLEU}`}>
                  <span className="text-sm">Net à payer</span>
                  <span className="text-xl leading-[26px]">{NOMBRE.format(d.netAPayer)} FCFA</span>
                </div>
              </>
            )}
          </div>
        </div>

        {blocsPaiement.length > 0 && (
          <div className="grid grid-cols-1 gap-5 border-t border-[#E3E7EE] pt-4 text-xs leading-[18px] sm:grid-cols-3 print:grid-cols-3">
            {blocsPaiement.map((b) => (
              <div key={b.titre} className="flex flex-col gap-0.5">
                <strong className={BLEU}>{b.titre}</strong>
                {b.lignes.map((ligne) => (
                  <span key={ligne} className="whitespace-pre-line">{ligne}</span>
                ))}
              </div>
            ))}
          </div>
        )}

        <footer className={`mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-[#E3E7EE] pt-3.5 text-xs ${GRIS}`}>
          <span>{[nom, e?.niu && `NIU ${e.niu}`, e?.rccm && `RCCM ${e.rccm}`].filter(Boolean).join(" · ")}</span>
          <span className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <rect width="24" height="24" rx="6" fill="#10294A" />
              <path d="M6 17v-6a3 3 0 0 1 6 0v6M12 11a3 3 0 0 1 6 0v6" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
              <circle cx="19" cy="5" r="2" fill="#2BB673" />
            </svg>
            Établie avec Marly
          </span>
        </footer>
      </div>
    </article>
  );
}