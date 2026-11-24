import Link from "next/link";
import type { FactureDocument } from "@/lib/api";
import { DocumentFacture } from "@/components/document-facture";

// Même cadre que la visionneuse photo : la facture A4 réduite de moitié, que l'on fait défiler
export function ApercuFacture({ pieceId, document }: { pieceId: string; document: FactureDocument }) {
  const titre = `${document.type === "AVOIR" ? "Avoir" : "Facture"} ${document.numero ?? ""}`.trim();

  return (
    <section
      aria-label={`${titre}, émise avec Marly`}
      className="flex w-full flex-col overflow-hidden rounded-2xl border border-line bg-surface lg:max-w-[440px] lg:flex-[1_1_340px]"
    >
      <div className="flex items-center justify-between gap-2 border-b border-line py-2.5 pl-4 pr-3">
        <span className="truncate text-sm font-medium tabular-nums">{titre}</span>
        <Link
          href={`/pieces/${pieceId}/facture`}
          className="flex h-9 shrink-0 items-center rounded-lg px-2.5 text-sm font-bold text-link underline hover:bg-survol"
        >
          Ouvrir en grand
        </Link>
      </div>
      <div className="h-[520px] overflow-auto bg-sunken p-3">
        <div className="w-[794px]" style={{ zoom: 0.5 }}>
          <DocumentFacture document={document} />
        </div>
      </div>
    </section>
  );
}