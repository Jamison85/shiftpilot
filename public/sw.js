const CACHE='shiftpilot-v9-findtrail-calm-video';
const APP_SHELL=['/','/index.html','/findtrail.html','/manifest.webmanifest','/findtrail-manifest.webmanifest','/icon.svg','/findtrail-icon.svg','/calm-poster.svg'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;

  if(event.request.mode==='navigate'){
    const url=new URL(event.request.url);
    const fallback=url.pathname.includes('findtrail')?'/findtrail.html':'/index.html';
    event.respondWith(
      fetch(event.request)
        .then(response=>{
          const copy=response.clone();
          caches.open(CACHE).then(cache=>cache.put(fallback,copy));
          return response;
        })
        .catch(()=>caches.match(fallback))
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response=>{
        const copy=response.clone();
        caches.open(CACHE).then(cache=>cache.put(event.request,copy));
        return response;
      })
      .catch(()=>caches.match(event.request))
  );
});
