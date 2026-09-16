const CACHE="weird-chess-v3-5-scrollfix-2";
const CORE=["./","./index.html","./app-base-a.css","./app-base-b.css","./app-extra.css","./game-seed.js","./game-core-1.js","./game-core-2.js","./game-core-3.js","./game-core-4.js","./game-bot.js","./game-v34-a.js","./game-v34-b.js","./game-v35.js","./manifest.json","./icon.svg"];

self.addEventListener("install",e=>e.waitUntil(
  caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())
));

self.addEventListener("activate",e=>e.waitUntil(Promise.all([
  caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))),
  self.clients.claim()
])));

self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET")return;
  const url=new URL(e.request.url);
  const isAppCode=url.pathname.endsWith(".html")||url.pathname.endsWith(".css")||url.pathname.endsWith(".js")||url.pathname.endsWith("/");

  if(isAppCode){
    e.respondWith(
      fetch(e.request).then(resp=>{
        if(resp&&resp.ok){
          const copy=resp.clone();
          caches.open(CACHE).then(c=>c.put(e.request,copy));
        }
        return resp;
      }).catch(()=>caches.match(e.request))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(hit=>hit||fetch(e.request).then(resp=>{
      if(resp&&resp.ok){
        const copy=resp.clone();
        caches.open(CACHE).then(c=>c.put(e.request,copy));
      }
      return resp;
    }))
  );
});

self.addEventListener("message",e=>{if(e.data?.type==="SKIP_WAITING")self.skipWaiting()});
