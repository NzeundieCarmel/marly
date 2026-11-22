"use client";

import { useSyncExternalStore } from "react";
import { IconeLune, IconeSoleil } from "./icones";

type Theme = "light" | "dark";

const CLE = "marly-theme";
const EVENEMENT = "marly-theme";
const MEDIA_SOMBRE = "(prefers-color-scheme: dark)";

// Le thème affiché : celui choisi, sinon celui de l'appareil
function lireTheme(): Theme {
  const choisi = document.documentElement.dataset.theme;
  if (choisi === "light" || choisi === "dark") return choisi;
  return window.matchMedia(MEDIA_SOMBRE).matches ? "dark" : "light";
}

function abonner(rappel: () => void) {
  const media = window.matchMedia(MEDIA_SOMBRE);
  media.addEventListener("change", rappel);
  window.addEventListener(EVENEMENT, rappel);
  return () => {
    media.removeEventListener("change", rappel);
    window.removeEventListener(EVENEMENT, rappel);
  };
}

const STYLES = {
  nav: "text-nav-ink hover:bg-nav-active hover:text-white",
  surface: "text-muted hover:bg-survol",
  bandeau: "text-white hover:bg-white/15",
} as const;

export function BoutonTheme({ variante = "surface" }: { variante?: keyof typeof STYLES }) {
  const theme = useSyncExternalStore<Theme>(abonner, lireTheme, () => "light");
  const suivant: Theme = theme === "dark" ? "light" : "dark";
  const libelle = suivant === "dark" ? "Passer en mode sombre" : "Passer en mode clair";

  function basculer() {
    document.documentElement.dataset.theme = suivant;
    try {
      localStorage.setItem(CLE, suivant);
    } catch {
      // Stockage indisponible (navigation privée) : le choix vaut pour cette visite
    }
    window.dispatchEvent(new Event(EVENEMENT));
  }

  return (
    <button
      type="button"
      onClick={basculer}
      aria-label={libelle}
      title={libelle}
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${STYLES[variante]}`}
    >
      {theme === "dark" ? <IconeSoleil /> : <IconeLune />}
    </button>
  );
}