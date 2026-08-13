/* Service Worker customizado (estratégia injectManifest do vite-plugin-pwa).
 * Responsável por:
 *  - Precache dos assets (offline-first) via Workbox.
 *  - Exibir notificações do sistema operacional (push do servidor OU locais
 *    enviadas pela própria página via postMessage).
 *  - Tratar o clique na notificação abrindo/focando o app na tela certa.
 */
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'

self.skipWaiting()
clientsClaim()

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST || [])

// ---- Web Push vindo de um servidor (ex.: Supabase Edge Function) ----
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: 'Lanchonete Rodrigues', body: event.data ? event.data.text() : '' }
  }
  const title = data.title || 'Lanchonete Rodrigues'
  const options = {
    body: data.body || '',
    icon: data.icon || '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag,
    data: { url: data.url || '/' },
    vibrate: [80, 40, 80],
    requireInteraction: !!data.requireInteraction,
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

// ---- Notificações locais disparadas pela página (sem servidor) ----
self.addEventListener('message', (event) => {
  const msg = event.data || {}
  if (msg.type === 'SHOW_NOTIFICATION') {
    const { title, ...options } = msg.payload || {}
    self.registration.showNotification(title || 'Lanchonete Rodrigues', {
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [80, 40, 80],
      ...options,
    })
  }
})

// ---- Clique na notificação: foca uma aba aberta ou abre uma nova ----
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = event.notification.data?.url || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.focus()
          if ('navigate' in client && target) client.navigate(target).catch(() => {})
          return
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target)
    }),
  )
})
