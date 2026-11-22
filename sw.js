// Offline assets plus network-first code so graphics updates arrive reliably.
const CACHE = 'pfotenreich-v1.2.0-fantasy';
const FILES = ['./', 'index.html', 'style.css', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png',
  'js/util.js', 'js/data.js', 'js/cats.js', 'js/world.js', 'js/events.js', 'js/events_content.js', 'js/sim.js', 'js/save.js',
  'js/art.js', 'js/media.js', 'js/render.js', 'js/audio.js', 'js/ui.js', 'js/main.js',
  'assets/portraits.webp', 'assets/cats.webp', 'assets/buildings.webp', 'assets/scenes.webp', 'assets/terrain.webp', 'assets/props.webp'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate', e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE&&k.startsWith('pfotenreich-')).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch', e=>{
  if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin)return;
  const code=e.request.mode==='navigate'||/\.(js|css|html)$/.test(new URL(e.request.url).pathname);
  e.respondWith((async()=>{
    const cache=await caches.open(CACHE),hit=await cache.match(e.request,{ignoreSearch:true});
    if(hit&&!code)return hit;
    try{const res=await fetch(e.request);if(res.ok){await cache.put(e.request,res.clone());return res;}return hit||res;}
    catch{return hit||Response.error();}
  })());
});
