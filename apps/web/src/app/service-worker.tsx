"use client";

import { useEffect } from "react";

export function EnregistrerServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Sans service worker, l'application fonctionne quand même en ligne
      });
    } else {
      // En développement, on retire un éventuel service worker laissé par la production
      navigator.serviceWorker
        .getRegistrations()
        .then((liste) => liste.forEach((enregistrement) => enregistrement.unregister()));
    }
  }, []);

  return null;
}