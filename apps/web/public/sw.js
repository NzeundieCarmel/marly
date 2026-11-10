// Service worker de Marly : permet d'ouvrir l'écran d'envoi même sans réseau

const CACHE_PAGES = "marly-pages-v1";
const CACHE_STATIQUE = "marly-statique-v1";
const PAGE_HORS_LIGNE = "/hors-ligne.html";
const PAGES_A_GARDER = ["/envoyer"];

// Installation : on met de côté la page "Pas de connexion" et les icônes
self.addEventListener("install", (evenement) => {
  evenement.waitUntil(
    caches
      .open(CACHE_STATIQUE)
      .then((cache) => cache.addAll([PAGE_HORS_LIGNE, "/icone-192.png", "/icone-512.png"]))
      .then(() => self.skipWaiting()),
  );
});

// Activation : on supprime les caches des anciennes versions
self.addEventListener("activate", (evenement) => {
  const cachesValides = [CACHE_PAGES, CACHE_STATIQUE];
  evenement.waitUntil(
    caches
      .keys()
      .then((cles) =>
        Promise.all(cles.filter((c) => !cachesValides.includes(c)).map((c) => caches.delete(c))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (evenement) => {
  const requete = evenement.request;
  if (requete.method !== "GET") return;

  const url = new URL(requete.url);
  if (url.origin !== self.location.origin) return;

  // Fichiers de l'application (nom unique à chaque version) : le cache d'abord
  if (url.pathname.startsWith("/_next/static/")) {
    evenement.respondWith(
      caches.match(requete).then(
        (enCache) =>
          enCache ||
          fetch(requete).then((reponse) => {
            if (reponse.ok) {
              const copie = reponse.clone();
              caches.open(CACHE_STATIQUE).then((cache) => cache.put(requete, copie));
            }
            return reponse;
          }),
      ),
    );
    return;
  }

  // Pages : le réseau d'abord ; on garde une copie de /envoyer pour le hors ligne
  if (requete.mode === "navigate") {
    evenement.respondWith(
      fetch(requete)
        .then((reponse) => {
          if (reponse.ok && !reponse.redirected && PAGES_A_GARDER.includes(url.pathname)) {
            const copie = reponse.clone();
            caches.open(CACHE_PAGES).then((cache) => cache.put(url.pathname, copie));
          }
          return reponse;
        })
        .catch(() =>
          caches
            .match(url.pathname, { cacheName: CACHE_PAGES })
            .then((enCache) => enCache || caches.match(PAGE_HORS_LIGNE)),
        ),
    );
  }
});