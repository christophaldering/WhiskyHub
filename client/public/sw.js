const SHELL_CACHE = 'casksense-shell-v2';
const OFFLINE_QUEUE = 'casksense-offline-queue';
const SHELL_URLS = ['/', '/labs', '/labs-v2', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== SHELL_CACHE && k !== OFFLINE_QUEUE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if ((request.method === 'POST' || request.method === 'PATCH') && (
    url.pathname === '/api/ratings' ||
    url.pathname.match(/^\/api\/journal\/[^/]+$/) ||
    url.pathname.match(/^\/api\/journal\/[^/]+\/[^/]+$/) ||
    url.pathname.match(/^\/api\/tastings\/[^/]+\/ratings$/)
  )) {
    event.respondWith(handleRatingPost(request));
    return;
  }

  if (request.method === 'GET' && url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstWithCache(request));
    return;
  }

  if (request.method === 'GET') {
    event.respondWith(cacheFirstWithNetwork(request));
    return;
  }
});

async function handleRatingPost(request) {
  try {
    const response = await fetch(request.clone());
    return response;
  } catch (_e) {
    const body = await request.clone().text();
    const participantId = request.headers.get('x-participant-id') || '';
    const cache = await caches.open(OFFLINE_QUEUE);
    const queueKey = new Request('/_offline-queue/' + Date.now() + '-' + Math.random().toString(36).slice(2));
    await cache.put(queueKey, new Response(body, {
      headers: {
        'Content-Type': 'application/json',
        'X-Original-URL': request.url,
        'X-Original-Method': request.method,
        'X-Participant-Id': participantId,
        'X-Queued-At': new Date().toISOString(),
      },
    }));

    const count = await getQueueLength();
    notifyClients({ type: 'QUEUE_UPDATED', count: count });

    if (self.registration.sync) {
      try {
        await self.registration.sync.register('casksense-rating-sync');
      } catch (_syncErr) {}
    }

    return new Response(JSON.stringify({ queued: true }), {
      status: 202,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function getQueueLength() {
  const cache = await caches.open(OFFLINE_QUEUE);
  const keys = await cache.keys();
  return keys.length;
}

async function flushQueue() {
  const cache = await caches.open(OFFLINE_QUEUE);
  const keys = await cache.keys();
  if (keys.length === 0) return;

  let flushed = 0;
  for (const key of keys) {
    const cached = await cache.match(key);
    if (!cached) continue;
    const body = await cached.text();
    const originalURL = cached.headers.get('X-Original-URL') || '/api/ratings';
    const originalMethod = cached.headers.get('X-Original-Method') || 'POST';
    const participantId = cached.headers.get('X-Participant-Id') || '';
    const headers = { 'Content-Type': 'application/json' };
    if (participantId) {
      headers['x-participant-id'] = participantId;
    }
    try {
      const res = await fetch(originalURL, {
        method: originalMethod,
        headers,
        body,
      });
      if (res.ok || res.status === 201) {
        await cache.delete(key);
        flushed++;
      }
    } catch (_e) {
      break;
    }
  }

  const remaining = await getQueueLength();
  notifyClients({ type: 'QUEUE_FLUSHED', remaining: remaining, flushed: flushed });
}

async function networkFirstWithCache(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(SHELL_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (_e) {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function cacheFirstWithNetwork(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(SHELL_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (_e) {
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

function notifyClients(msg) {
  self.clients.matchAll({ type: 'window' }).then((clients) => {
    clients.forEach((client) => client.postMessage(msg));
  });
}

self.addEventListener('sync', (event) => {
  if (event.tag === 'casksense-rating-sync') {
    event.waitUntil(flushQueue());
  }
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FLUSH_QUEUE') {
    event.waitUntil(flushQueue());
  }
  if (event.data && event.data.type === 'GET_QUEUE_LENGTH') {
    getQueueLength().then((count) => {
      if (event.source) {
        event.source.postMessage({ type: 'QUEUE_LENGTH', count: count });
      }
    });
  }
});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'CaskSense', {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-96.png',
    })
  );
});
