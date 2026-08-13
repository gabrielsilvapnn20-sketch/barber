import { useEffect, useRef } from 'react'
import { useData } from '../context/DataContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { usePWA } from '../context/PWAContext.jsx'
import { showLocalNotification } from '../lib/notifications.js'
import { STATUS_META, minutesLate } from '../lib/orders.js'

/**
 * Dispara notificações do sistema (não toasts) para eventos reais:
 *  - Cliente: mudança de status do SEU pedido (com destaque para "saiu para
 *    entrega") + aviso automático de atraso.
 *  - Gestor: novo pedido recebido pelo app.
 *
 * Sem backend, os disparos acontecem no próprio dispositivo com o app aberto/em
 * segundo plano. Para push com o app fechado, ver scaffolding em
 * src/lib/notifications.js (Web Push).
 */
export default function NotificationEngine() {
  const { db } = useData()
  const { customer, isManager } = useAuth()
  const { permission } = usePWA()
  const enabled = permission === 'granted'

  const lastStatus = useRef({}) // orderId -> status
  const inited = useRef(false)
  const managerSeen = useRef(new Set())
  const managerInited = useRef(false)
  const delayNotified = useRef(new Set())

  // ---- Cliente: mudança de status do próprio pedido ----
  useEffect(() => {
    if (!customer) return
    const mine = db.orders.filter((o) => o.customerId === customer.id)
    if (!inited.current) {
      inited.current = true
      for (const o of mine) lastStatus.current[o.id] = o.status
      return
    }
    for (const o of mine) {
      const prev = lastStatus.current[o.id]
      if (prev && prev !== o.status && enabled) {
        const meta = STATUS_META[o.status]
        const body =
          o.status === 'entrega' ? `${o.code} saiu para entrega! Chega quentinho 🛵`
            : o.status === 'entregue' ? `${o.code} entregue. Bom apetite! 😋`
              : o.status === 'preparo' ? `${o.code} está sendo preparado 🔥`
                : `${o.code}: ${meta?.label}`
        showLocalNotification(`${meta?.emoji || '🔔'} ${meta?.clientLabel || 'Pedido atualizado'}`, {
          body, tag: `order-${o.id}`, data: { url: `/pedido/${o.id}` },
          requireInteraction: o.status === 'entrega',
        })
      }
      lastStatus.current[o.id] = o.status
    }
  }, [db.orders, customer, enabled])

  // ---- Gestor: novo pedido pelo app ----
  useEffect(() => {
    if (!isManager) return
    const appOrders = db.orders.filter((o) => o.source === 'app')
    if (!managerInited.current) {
      managerInited.current = true
      appOrders.forEach((o) => managerSeen.current.add(o.id))
      return
    }
    for (const o of appOrders) {
      if (!managerSeen.current.has(o.id)) {
        managerSeen.current.add(o.id)
        if (enabled) {
          showLocalNotification('🧾 Novo pedido!', {
            body: `${o.code} · ${o.customerName} · ${o.items.reduce((s, i) => s + i.qty, 0)} item(ns)`,
            tag: `neworder-${o.id}`, data: { url: '/gestor/pedidos' }, requireInteraction: true,
          })
        }
      }
    }
  }, [db.orders, isManager, enabled])

  // ---- Aviso automático de atraso (para o cliente do pedido) ----
  useEffect(() => {
    if (!customer) return
    const check = () => {
      const over = db.settings?.delayNotice?.minutesOver ?? 15
      const mine = db.orders.filter((o) => o.customerId === customer.id)
      for (const o of mine) {
        const late = minutesLate(o)
        if (late >= over && !delayNotified.current.has(o.id) && enabled) {
          delayNotified.current.add(o.id)
          showLocalNotification('🙏 Um instante', {
            body: db.settings?.delayNotice?.text || 'Seu pedido está a caminho, agradecemos a paciência!',
            tag: `delay-${o.id}`, data: { url: `/pedido/${o.id}` },
          })
        }
      }
    }
    check()
    const t = setInterval(check, 60000)
    return () => clearInterval(t)
  }, [db.orders, db.settings, customer, enabled])

  return null
}
