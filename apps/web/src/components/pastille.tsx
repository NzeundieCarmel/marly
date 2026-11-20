import type { ReactNode } from "react";

export type Ton = "info" | "warning" | "success" | "neutral" | "danger";

const TONS: Record<Ton, string> = {
  info: "bg-info-bg text-info-ink",
  warning: "bg-warning-bg text-warning-ink",
  success: "bg-success-bg text-success-ink",
  neutral: "bg-neutral-bg text-neutral-ink",
  danger: "bg-danger-bg text-danger-ink",
};

// Le texte porte le sens ; le point et la couleur ne font que le renforcer
export function Pastille({ ton, children }: { ton: Ton; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-[13px] font-medium ${TONS[ton]}`}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}