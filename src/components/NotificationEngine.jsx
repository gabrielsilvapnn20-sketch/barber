import { useEffect, useRef } from 'react'
import { useData } from '../context/DataContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { usePWA } from '../context/PWAContext.jsx'
import { showLocalNotification } from '../lib/notifications.js'
import { fmtDateTime, todayISO, serviceNamesOf } from '../lib/utils.js'

/**
 * Dispara notificações do sistema operacional (não toasts) para eventos reais:
 *  - Barbeiro: novo agendamento atribuído a ele.
 *  - Dono: caixa aberto pendente de fechamento.
 *
 * Deduplicação persistida em localStorage para não repetir avisos.
 * Observação: sem backend, os disparos acontecem no mesmo dispositivo quando o
 * app está aberto/em segundo plano. Para push do servidor com o app fechado ou
 * em outro aparelho, veja o scaffolding em src/lib/notifications.js (Web Push).
 */
export default function NotificationEngine() {
  const { db, serviceById } = useData()
  const { user } = useAuth()
  const { permission, standalone } = usePWA()
  const initedFor = useRef(null)

  const enabled = permission === 'granted'

  // ---- Novo agendamento para o usuário logado ----
  useEffect(() => {
    if (!user) return
    const key = `barber.notif.appts.${user.id}`
    const readSeen = () => {
      try {
        return new Set(JSON.parse(localStorage.getItem(key) || '[]'))
      } catch {
        return new Set()
      }
    }
    const mine = db.appointments.filter((a) => a.barberId === user.id && a.status !== 'cancelado')

    // Primeira montagem para este usuário: registra o estado atual sem notificar
    if (initedFor.current !== user.id) {
      initedFor.current = user.id
      localStorage.setItem(key, JSON.stringify(mine.map((a) => a.id)))
      return
    }

    const seen = readSeen()
    const fresh = mine.filter((a) => !seen.has(a.id))
    if (fresh.length && enabled) {
      for (const a of fresh) {
        const names = serviceNamesOf(a, db.services)
        showLocalNotification('Novo agendamento 📅', {
          body: `${a.clientName} — ${names.join(' + ') || 'serviço'} em ${fmtDateTime(a.datetime)}`,
          tag: `appt-${a.id}`,
          data: { url: '/agenda' },
        })
      }
    }
    // Atualiza o registro de vistos (mesmo sem permissão, para não acumular)
    localStorage.setItem(key, JSON.stringify(mine.map((a) => a.id)))
  }, [db.appointments, user, enabled, db.services])

  // ---- Caixa pendente de fechamento (apenas dono) ----
  useEffect(() => {
    if (!user || user.role !== 'owner' || !enabled) return

    const check = () => {
      const open = db.cashSessions.find((c) => c.status === 'aberto')
      if (!open) return
      const key = 'barber.notif.cash'
      let notified = {}
      try {
        notified = JSON.parse(localStorage.getItem(key) || '{}')
      } catch {
        notified = {}
      }
      const stamp = `${open.id}:${todayISO()}`
      const openedAgoH = (Date.now() - new Date(open.date)) / 3600000
      const hour = new Date().getHours()
      if ((openedAgoH >= 6 || hour >= 20) && !notified[stamp]) {
        showLocalNotification('Caixa pendente 💰', {
          body: 'Você tem um caixa aberto sem fechamento. Toque para revisar e fechar.',
          tag: 'cash-open',
          requireInteraction: true,
          data: { url: '/caixa' },
        })
        notified[stamp] = true
        localStorage.setItem(key, JSON.stringify(notified))
      }
    }

    check()
    const id = setInterval(check, 10 * 60 * 1000) // revalida a cada 10 min
    return () => clearInterval(id)
  }, [db.cashSessions, user, enabled, standalone])

  return null
}
