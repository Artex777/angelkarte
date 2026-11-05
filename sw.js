// Service Worker: приложение и данные работают офлайн, просмотренные тайлы карты кэшируются
const APP = "angelkarte-app-v2", TILES = "angelkarte-tiles-v1", MAX_TILES = 4000;
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png",
  "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js", "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css"];
self.addEventListener("install", e => { self.skipWaiting(); e.waitUntil(caches.open(APP).then(c => c.addAll(SHELL))); });
self.addEventListener("activate", e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== APP && k !== TILES).map(k => caches.delete(k)))).then(() => self.clients.claim())));

async function trimTiles() {
  const c = await caches.open(TILES), ks = await c.keys();
  for (let i = 0; i < ks.length - MAX_TILES; i++) await c.delete(ks[i]);
}
self.addEventListener("fetch", e => {
  const r = e.request; if (r.method !== "GET") return;
  const u = new URL(r.url);
  // тайлы подложки: сначала кэш
  if (u.hostname === "services.arcgisonline.com" && u.pathname.includes("/tile/")) {
    e.respondWith(caches.open(TILES).then(async c => {
      const hit = await c.match(r); if (hit) return hit;
      const res = await fetch(r);
      if (res.ok) { c.put(r, res.clone()); if (Math.random() < 0.02) trimTiles(); }
      return res;
    }));
    return;
  }
  // файлы приложения, данные, шрифты, MapLibre: быстро из кэша, в фоне обновляем
  if (u.origin === location.origin || u.hostname === "unpkg.com") {
    e.respondWith(caches.open(APP).then(async c => {
      const hit = await c.match(r);
      const net = fetch(r).then(res => { if (res.ok) c.put(r, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    }));
  }
});
