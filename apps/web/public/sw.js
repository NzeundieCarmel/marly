// Service worker de Marly : garde les écrans du gérant pour le mode hors ligne.
// Le nom marly-pages-v1 est vidé par la page de connexion (déconnexion, session expirée).

const CACHE_PAGES = "marly-pages-v1";
const CACHE_STATIQUE = "marly-statique-v1";
const PAGE_SECOURS = "/hors-ligne.html";
const PAGES_HORS_LIGNE = ["/envoyer", "/envoyer/pieces", "/envoyer/profil"];

self.addEventListener("install", (evenement) => {
  evenement.waitUntil(
    caches
      .open(CACHE_STATIQUE)
      .then((cache) => cache.add(PAGE_SECOURS))
      .then(() => self.skipWaiting()),
  );
});

// Supprime les anciens caches de Marly, garde les deux en service
self.addEventListener("activate", (evenement) => {
  evenement.waitUntil(
    caches
      .keys()
      .then((noms) =>
        Promise.all(
          noms
            .filter((nom) => nom.startsWith("marly-") && nom !== CACHE_PAGES && nom !== CACHE_STATIQUE)
            .map((nom) => caches.delete(nom)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// Pages : le réseau d'abord ; sans réseau, la dernière version gardée
async function navigation(requete) {
  const chemin = new URL(requete.url).pathname;
  const aGarder = PAGES_HORS_LIGNE.includes(chemin);
  try {
    const reponse = await fetch(requete);
    // Jamais une redirection (vers la connexion) ni une erreur à la place d'un écran
    if (aGarder && reponse.ok && !reponse.redirected) {
      const cache = await caches.open(CACHE_PAGES);
      await cache.put(chemin, reponse.clone());
    }
    return reponse;
  } catch {
    if (aGarder) {
      const gardee = await caches.match(chemin, { cacheName: CACHE_PAGES });
      if (gardee) return gardee;
    }
    const secours = await caches.match(PAGE_SECOURS, { cacheName: CACHE_STATIQUE });
    return secours ?? Response.error();
  }
}

// Fichiers de l'application (JavaScript, CSS) : ils ne changent jamais de contenu
async function statique(requete) {
  const gardee = await caches.match(requete, { cacheName: CACHE_STATIQUE });
  if (gardee) return gardee;
  const reponse = await fetch(requete);
  if (reponse.ok) {
    const cache = await caches.open(CACHE_STATIQUE);
    await cache.put(requete, reponse.clone());
  }
  return reponse;
}

self.addEventListener("fetch", (evenement) => {
  const requete = evenement.request;
  if (requete.method !== "GET") return;
  const url = new URL(requete.url);
  if (url.origin !== self.location.origin) return;

  if (requete.mode === "navigate") {
    evenement.respondWith(navigation(requete));
    return;
  }
  if (url.pathname.startsWith("/_next/static/")) {
    evenement.respondWith(statique(requete));
  }
  // Tout le reste, dont l'API, passe directement par le réseau
});