"use client";

import { useState } from "react";

const CADRE = "flex h-[240px] items-center justify-center rounded-2xl bg-sunken px-6 text-center text-sm text-muted";

export function ApercuPiece({ src, pdf, nom }: { src: string | null; pdf: boolean; nom: string }) {
  const [erreur, setErreur] = useState(false);

  if (!src) {
    return <div className={CADRE}>Aucun fichier pour cette pièce.</div>;
  }
  if (erreur) {
    return <div role="alert" className={CADRE}>Impossible d&apos;afficher la pièce. Vérifiez votre connexion.</div>;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-sunken">
      {pdf ? (
        <iframe src={src} title={`Pièce d'origine : ${nom}`} className="h-[420px] w-full bg-white" />
      ) : (
        <a href={src} target="_blank" rel="noopener" aria-label="Ouvrir la photo en grand" className="block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={`Pièce d'origine : ${nom}`}
            onError={() => setErreur(true)}
            className="max-h-[420px] w-full object-contain"
          />
        </a>
      )}
    </div>
  );
}