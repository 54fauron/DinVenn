// Network-first navigation: updates arrive on reload; account/API data is never cached.
const CACHE = "dinvenn-shell-v1";
self.addEventListener("install", (event) => {
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys())
        if (key.startsWith("dinvenn-shell-") && key !== CACHE)
          await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});
self.addEventListener("fetch", (event) => {
  if (
    event.request.mode !== "navigate" ||
    new URL(event.request.url).origin !== self.location.origin
  )
    return;
  event.respondWith(
    fetch(event.request).catch(
      () =>
        new Response(
          "<!doctype html><html lang='nb'><meta name='viewport' content='width=device-width'><title>DinVenn</title><body><h1>Du er frakoblet</h1><p>Koble til internett og prøv igjen for å åpne DinVenn.</p><button onclick='location.reload()'>Prøv igjen</button></body></html>",
          { headers: { "Content-Type": "text/html; charset=utf-8" } },
        ),
    ),
  );
});
