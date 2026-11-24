import type { LigneEcriture, Regime } from "@/lib/api";
import { initiales } from "@/lib/format";
import { PhotoFiche } from "./photo-fiche";

const NOMBRE = new Intl.NumberFormat("fr-FR");
const GRIS = "text-[#4E5867]";
const BLEU = "text-[#10294A]";

export interface DonneesFiche {
  entreprise: { nom: string; niu: string | null; regime: Regime };
  piece: {
    id: string;
    date: string;
    montantTtc: number;
    fournisseur: string | null;
    categorie: string;
    statut: string;
    recueLe: string;
    empreinte: string | null;
  };
  srcFichier: string | null;
  ecriture: { journal: string; lignes: LigneEcriture[] } | null;
}

function Info({ terme, valeur }: { terme: string; valeur: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className={`text-xs ${GRIS}`}>{terme}</dt>
      <dd className="font-medium">{valeur}</dd>
    </div>
  );
}

// Référence identique à celle de l'export Sage : on passe de l'une à l'autre en un instant
export function referencePiece(id: string): string {
  return id.slice(-10).toUpperCase();
}

export function FichePiece({ donnees }: { donnees: DonneesFiche }) {
  const { entreprise: e, piece: p, ecriture } = donnees;
  const reference = referencePiece(p.id);
  const date = new Date(p.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const recue = new Date(p.recueLe).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Africa/Douala" });

  return (
    <article
      aria-label={`Fiche de pièce ${reference}`}
      className="mx-auto flex w-full max-w-[794px] flex-col bg-white text-[#1A2230] shadow-[0_8px_24px_rgba(16,41,74,0.12)] print:min-h-[297mm] print:max-w-none print:shadow-none"
    >
      <div className="flex h-2 justify-end bg-[#10294A]">
        <div className="h-2 w-[120px] bg-[#2BB673]" />
      </div>

      <div className="flex flex-1 flex-col gap-5 px-5 py-6 text-[13px] leading-[19px] sm:px-14 sm:py-10 print:px-14 print:py-8">
        <header className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex min-w-[240px] flex-1 gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[14px] bg-[#E6EEF9] text-xl font-bold text-[#1D4F91]">
              {initiales(e.nom)}
            </div>
            <div className="flex flex-col gap-0.5">
              <strong className={`text-lg leading-6 ${BLEU}`}>{e.nom}</strong>
              <span>NIU : <strong>{e.niu ?? "non renseigné"}</strong></span>
              <span className={GRIS}>{e.regime === "REEL" ? "Régime du réel" : "Impôt général synthétique (IGS)"}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 text-right">
            <h1 className={`text-[32px] font-bold leading-9 tracking-tight ${BLEU}`}>Fiche de pièce</h1>
            <strong className="text-[15px] tabular-nums">Réf. {reference}</strong>
            <span className="rounded-full bg-[#EEF1F5] px-2.5 py-1 text-xs font-bold text-[#4E5867]">{p.statut}</span>
          </div>
        </header>

        <dl className="grid grid-cols-2 gap-4 rounded-xl border border-[#E3E7EE] bg-[#F5F7FA] px-5 py-4 sm:grid-cols-4 print:grid-cols-4">
          <Info terme="Date de la pièce" valeur={date} />
          <Info terme="Fournisseur" valeur={p.fournisseur ?? "Non précisé"} />
          <Info terme="Montant TTC" valeur={`${NOMBRE.format(p.montantTtc)} FCFA`} />
          <Info terme="Catégorie" valeur={p.categorie} />
          <div className="col-span-2 flex flex-col gap-0.5 sm:col-span-4 print:col-span-4">
            <dt className={`text-xs ${GRIS}`}>Reçue dans Marly le</dt>
            <dd className="font-medium">{recue}</dd>
          </div>
          {p.empreinte && (
            <div className="col-span-2 flex flex-col gap-0.5 sm:col-span-4 print:col-span-4">
              <dt className={`text-xs ${GRIS}`}>Empreinte du fichier (SHA-256), preuve qu&apos;il n&apos;a pas été modifié</dt>
              <dd className="break-all font-mono text-xs">{p.empreinte}</dd>
            </div>
          )}
        </dl>

        {ecriture && (
          <section aria-label="Écriture validée" className="flex flex-col gap-1.5">
            <h2 className={`text-sm font-bold ${BLEU}`}>Écriture validée par le cabinet · journal {ecriture.journal}</h2>
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className={`border-b-2 border-[#10294A] bg-[#EEF1F5] ${BLEU}`}>
                  <th scope="col" className="px-2 py-1.5 text-left">Compte</th>
                  <th scope="col" className="px-2 py-1.5 text-left">Libellé</th>
                  <th scope="col" className="px-2 py-1.5 text-right">Débit</th>
                  <th scope="col" className="px-2 py-1.5 text-right">Crédit</th>
                </tr>
              </thead>
              <tbody>
                {ecriture.lignes.map((l, i) => (
                  <tr key={i} className="border-b border-[#E3E7EE]">
                    <td className="px-2 py-1.5 font-bold tabular-nums">{l.compte}</td>
                    <td className="px-2 py-1.5">{l.libelle}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{l.debit ? NOMBRE.format(l.debit) : ""}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{l.credit ? NOMBRE.format(l.credit) : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        <p className="rounded-lg bg-[#E6EEF9] px-3 py-2 text-xs text-[#1D4F91]">
          Cette fiche résume une pièce enregistrée dans Marly. Elle ne remplace pas le justificatif original, reproduit
          ci-dessous.
        </p>

        <section aria-label="Justificatif original" className="flex flex-col gap-2 print:break-inside-avoid">
          <h2 className={`text-sm font-bold ${BLEU}`}>Justificatif original</h2>
          {donnees.srcFichier ? (
            <PhotoFiche src={donnees.srcFichier} nom={p.fournisseur ?? p.categorie} />
          ) : (
            <p className={`rounded-xl border border-[#E3E7EE] p-4 text-center ${GRIS}`}>Aucun fichier joint à cette pièce.</p>
          )}
        </section>

        <footer className={`mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-[#E3E7EE] pt-3 text-xs ${GRIS}`}>
          <span>Référence dans l&apos;export comptable : {reference}</span>
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