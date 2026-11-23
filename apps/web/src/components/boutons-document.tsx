"use client";

import { useState } from "react";

export function BoutonImprimer({ className }: { className: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={className}>
      Imprimer ou enregistrer en PDF
    </button>
  );
}

export function BoutonCopier({ texte, className }: { texte: string; className: string }) {
  const [copie, setCopie] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(texte).then(() => setCopie(true));
      }}
      className={className}
    >
      {copie ? "Lien copié" : "Copier le lien"}
    </button>
  );
}