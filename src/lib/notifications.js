/* Camada de notificações do sistema (OS-level), não os toasts internos.
 *
 * Dois modos:
 *  1) LOCAIS (funcionam sem servidor): a página pede ao Service Worker para
 *     exibir uma notificação via postMessage. Usado hoje para "novo
 *     agendamento" e "caixa pendente".
 *  2) WEB PUSH (requer servidor): assina o navegador num serviço de push com
 *     a chave VAPID. O envio real, com o app fechado/em outro aparelho, exige
 *     um backend (ex.: Supabase Edge Function) usando a chave privada VAPID.
 *
 * Importante (iOS/iPadOS): notificações só funcionam com o app INSTALADO na
 * tela inicial (PWA em modo standalone), a partir do iOS 16.4.
 */

// Chave pública VAPID. Em produção, gere a sua com `node scripts/gen-vapid.mjs`
// e substitua aqui; guarde a privada no servidor (variável de ambiente).
export const VAPID_PUBLIC_KEY =
  'BH4tg9Z2lgWfQ8-tOuwgrBvGCvZLE7Yj-MeTfl5jCacknXSZ-v0Cfzoxb4S8cBxbbhtpnBUI1uS7Q_4XiuO2VLQ'

export function isStandalone() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.matchMedia?.('(display-mode: minimal-ui)').matches ||
    window.navigator.standalone === true // iOS Safari
  )
}

export function getPlatform() {
  const ua = navigator.userAgent || ''
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const isAndroid = /Android/.test(ua)
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua)
  return { isIOS, isAndroid, isSafari, isMobile: isIOS || isAndroid }
}

export function notificationsSupported() {
  return 'Notification' in window && 'serviceWorker' in navigator
}

export function permissionState() {
  return notificationsSupported() ? Notification.permission : 'unsupported'
}

export async function requestNotificationPermission() {
  if (!notificationsSupported()) return 'unsupported'
  try {
    return await Notification.requestPermission()
  } catch {
    return 'denied'
  }
}

// Mostra uma notificação do SO via Service Worker (preferido) ou fallback.
export async function showLocalNotification(title, options = {}) {
  if (permissionState() !== 'granted') return false
  try {
    const reg = await navigator.serviceWorker?.ready
    if (reg) {
      // Envia ao SW (permite notificações mesmo com a aba em segundo plano)
      if (reg.active) {
        reg.active.postMessage({ type: 'SHOW_NOTIFICATION', payload: { title, ...options } })
        return true
      }
      await reg.showNotification(title, options)
      return true
    }
    // Fallback direto (desktop)
    new Notification(title, options)
    return true
  } catch (e) {
    console.warn('Falha ao exibir notificação', e)
    return false
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

// Assina o Web Push (scaffolding). Retorna a PushSubscription para você enviar
// ao seu backend e armazenar. Sem backend, a assinatura existe mas nada é enviado.
export async function subscribeToPush() {
  if (!('PushManager' in window)) throw new Error('Push não suportado neste navegador.')
  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
  }
  return sub
}
