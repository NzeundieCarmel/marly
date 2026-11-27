import { lirePiece, lirePlanComptable, type StatutPiece } from "@/lib/api";
import { formatMontant } from "@/lib/format";
import { BoutonComptabiliserPiece } from "@/app/envoyer/compta/boutons-compta";

// L'écriture d'une pièce, vue par le gérant d'une entreprise autonome
export async function EcriturePiece({ pieceId, dossierId, statut }: { pieceId: string; dossierId: string; statut: StatutPiece }) {
  if (statut !== "RECUE" && statut !== "TRAITEE") {
    return null;
  }
  const [{ ecriture }, plan] = await Promise.all([lirePiece(pieceId), lirePlanComptable(dossierId)]);
  const intitule = (compte: string) => {
    for (let n = compte.length; n >= 2; n--) {
      const trouve = plan.find((c) => c.numero === compte.slice(0, n));
      if (trouve) return trouve.intitule;
    }
    return `Compte ${compte}`;
  };

  return (
    <section aria-labelledby="titre-ecriture" className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="titre-ecriture" className="text-base font-bold text-heading">Écriture comptable</h2>
        <span className="text-[13px] text-muted">Journal {ecriture.journal}</span>
      </div>
      <table className="w-full text-[14px]">
        <thead>
          <tr className="text-left text-[12px] text-muted">
            <th className="pb-1 font-medium">Compte</th>
            <th className="pb-1 text-right font-medium">Débit</th>
            <th className="pb-1 text-right font-medium">Crédit</th>
          </tr>
        </thead>
        <tbody>
          {ecriture.lignes.map((l, i) => (
            <tr key={i} className="border-t border-line">
              <td className="py-2 pr-2">
                <span className="block">{intitule(l.compte)}</span>
                <span className="text-[12px] text-muted tabular-nums">{l.compte}</span>
              </td>
              <td className="py-2 text-right tabular-nums">{l.debit ? formatMontant(l.debit) : ""}</td>
              <td className="py-2 pl-2 text-right tabular-nums">{l.credit ? formatMontant(l.credit) : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {ecriture.proposee ? (
        <>
          <p className="text-[13px] leading-[19px] text-muted">
            Écriture proposée par Marly à partir de la catégorie et du montant de la pièce.
          </p>
          <BoutonComptabiliserPiece pieceId={pieceId} />
        </>
      ) : (
        <p className="rounded-xl bg-success-bg p-3 text-sm text-success-ink">Pièce comptabilisée.</p>
      )}
    </section>
  );
}