import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

const BASE = "rounded-xl border border-line-strong bg-surface px-3 text-base disabled:bg-sunken disabled:text-muted";

export function Champ({
  id,
  libelle,
  aide,
  ...attributs
}: { id: string; libelle: string; aide?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-muted">{libelle}</label>
      <input id={id} name={id} aria-describedby={aide ? `aide-${id}` : undefined} className={`h-12 ${BASE}`} {...attributs} />
      {aide && <span id={`aide-${id}`} className="text-[13px] text-muted">{aide}</span>}
    </div>
  );
}

export function ZoneTexte({
  id,
  libelle,
  ...attributs
}: { id: string; libelle: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-muted">{libelle}</label>
      <textarea id={id} name={id} rows={2} className={`py-2.5 ${BASE}`} {...attributs} />
    </div>
  );
}

export function Message({ erreur }: { erreur: string | null }) {
  if (!erreur) return null;
  return (
    <p role="alert" className="rounded-xl bg-danger-bg p-3 text-sm text-danger-ink">
      {erreur}
    </p>
  );
}