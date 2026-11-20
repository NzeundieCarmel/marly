"use client";

import { useState } from "react";

const BOUTON =
  "flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-survol disabled:opacity-40";

export function Visionneuse({ src, nom }: { src: string | null; nom: string }) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  // Une image qui ne se charge pas est un PDF : on bascule sur l'afficheur du navigateur
  const [pdf, setPdf] = useState(false);

  return (
    <section
      aria-label="Pièce reçue"
      className="flex w-full flex-col overflow-hidden rounded-2xl border border-line bg-surface lg:max-w-[440px] lg:flex-[1_1_340px]"
    >
      <div className="flex items-center justify-between border-b border-line py-2.5 pl-4 pr-3">
        <span className="truncate text-sm font-medium">{nom}</span>
        <div className="flex gap-1">
          <button
            type="button"
            aria-label="Zoom arrière"
            disabled={!src || pdf || zoom <= 0.5}
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
            className={BOUTON}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M8 11h6M20 20l-4-4" /></svg>
          </button>
          <button
            type="button"
            aria-label="Zoom avant"
            disabled={!src || pdf || zoom >= 3}
            onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
            className={BOUTON}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M8 11h6M11 8v6M20 20l-4-4" /></svg>
          </button>
          <button
            type="button"
            aria-label="Pivoter d'un quart de tour"
            disabled={!src || pdf}
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className={BOUTON}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.3 5.7" /><path d="M20 4v7h-7" /></svg>
          </button>
        </div>
      </div>
      <div className="flex h-[520px] items-center justify-center overflow-auto bg-sunken p-6">
        {!src ? (
          <p className="text-muted">Aucun fichier joint à cette pièce.</p>
        ) : pdf ? (
          <iframe src={src} title={`Pièce : ${nom}`} className="h-full w-full rounded-lg bg-white" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={`Pièce envoyée : ${nom}`}
            onError={() => setPdf(true)}
            className="max-h-full max-w-full rounded shadow-[0_8px_24px_rgba(16,41,74,0.15)] transition-transform duration-200"
            style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
          />
        )}
      </div>
    </section>
  );
}