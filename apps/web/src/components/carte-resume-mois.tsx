import { formatMontant } from "@/lib/format";
import type { ResumeMois } from "@/lib/resume-mois";

export function CarteResumeMois({ resume }: { resume: ResumeMois }) {
  const principale = resume.categories[0];

  return (
    <section aria-labelledby="titre-mois" className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="titre-mois" className="text-sm font-medium text-muted">
          Ce mois-ci · {resume.libelle}
        </h2>
        <span className="text-[13px] text-muted tabular-nums">
          {resume.nombre} pièce{resume.nombre > 1 ? "s" : ""}
        </span>
      </div>

      {resume.nombre === 0 ? (
        <p className="text-[15px] text-muted">
          Aucune dépense enregistrée ce mois-ci. Prenez votre première pièce en photo.
        </p>
      ) : (
        <>
          <p className="flex flex-col gap-0.5">
            <span className="text-[13px] text-muted">Vous avez dépensé</span>
            <strong className="text-[28px] leading-9 text-heading tabular-nums">
              {formatMontant(resume.total)} FCFA
            </strong>
            {principale && resume.categories.length > 1 && (
              <span className="text-sm text-muted">
                dont {formatMontant(principale.total)} en {principale.categorie.toLowerCase()}
              </span>
            )}
          </p>

          <ul className="flex flex-col gap-2.5">
            {resume.categories.map((c) => {
              const part = resume.total > 0 ? Math.max(2, Math.round((c.total * 100) / resume.total)) : 0;
              return (
                <li key={c.categorie} className="flex flex-col gap-1">
                  <span className="flex justify-between gap-2 text-[13px]">
                    <span>{c.categorie}</span>
                    <span className="text-muted tabular-nums">{formatMontant(c.total)} FCFA</span>
                  </span>
                  <span aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-sunken">
                    <span className="block h-full rounded-full bg-action" style={{ width: `${part}%` }} />
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {resume.ventes !== 0 && (
        <p className="border-t border-line pt-2.5 text-[13px] text-muted">
          Facturé avec Marly ce mois-ci :{" "}
          <span className="font-bold text-ink tabular-nums">{formatMontant(resume.ventes)} FCFA</span>
        </p>
      )}

      {resume.totalPrecedent > 0 && (
        <p className="border-t border-line pt-2.5 text-[13px] text-muted">
          Le mois dernier : <span className="tabular-nums">{formatMontant(resume.totalPrecedent)} FCFA</span>
        </p>
      )}
    </section>
  );
}