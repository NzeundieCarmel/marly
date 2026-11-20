"use client";

import { useEffect, useState } from "react";
import { listerEnAttente, type PieceEnAttente } from "@/lib/file-attente";
import { Pastille } from "@/components/pastille";

const NOMBRE = new Intl.NumberFormat("fr-FR");

// Les pièces gardées sur le téléphone faute de réseau
export function PiecesEnAttente() {
  const [pieces, setPieces] = useState<PieceEnAttente[]>([]);

  useEffect(() => {
    let actif = true;
    void listerEnAttente().then((liste) => {
      if (actif) setPieces(liste);
    });
    return () => {
      actif = false;
    };
  }, []);

  if (pieces.length === 0) return null;

  return (
    <section aria-label="Pièces en attente d'envoi" className="overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="bg-sunken px-3.5 py-2.5 text-[13px] font-medium text-muted">Sur ce téléphone</div>
      {pieces.map((p) => (
        <div key={p.id} className="flex items-center gap-3 border-t border-line px-3.5 py-3">
          <span className="flex min-w-0 flex-grow flex-col gap-0.5">
            <span className="truncate text-[15px] font-medium">{p.fournisseur || p.categorie}</span>
            <span className="text-[13px] text-muted tabular-nums">
              {p.date.split("-").reverse().slice(0, 2).join("/")} · {NOMBRE.format(Number(p.montantTtc) || 0)} FCFA
            </span>
          </span>
          <Pastille ton="neutral">En attente d&apos;envoi</Pastille>
        </div>
      ))}
    </section>
  );
}