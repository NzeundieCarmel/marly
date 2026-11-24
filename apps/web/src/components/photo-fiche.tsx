"use client";

import { useState } from "react";

export function PhotoFiche({ src, nom }: { src: string; nom: string }) {
  const [pdf, setPdf] = useState(false);

  if (pdf) {
    return (
      <p className="rounded-xl border border-[#E3E7EE] bg-[#F5F7FA] p-4 text-center text-[13px]">
        Le justificatif original est un fichier PDF.{" "}
        <a href={src} target="_blank" rel="noopener" className="font-bold text-[#10294A] underline">
          Ouvrir le PDF original
        </a>
      </p>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={`Justificatif original : ${nom}`}
      onError={() => setPdf(true)}
      className="mx-auto max-h-[560px] max-w-full rounded border border-[#E3E7EE] object-contain print:max-h-[600px]"
    />
  );
}