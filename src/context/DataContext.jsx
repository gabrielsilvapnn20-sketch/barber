import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { buildSeed } from '../lib/seed.js'
import { uid, isSameDay, isSameMonth, monthKey } from '../lib/utils.js'

const DataContext = createContext(null)
const KEY = 'barber.db.v1'

// Ajustes aplicados a bancos já existentes no dispositivo (migrações leves).
function migrate(db) {
  if (!db.settings) db.settings = {}
  // Atualiza o nome antigo de demonstração para a marca atual, sem sobrescrever
  // um nome personalizado que o usuário já tenha definido.
  if (!db.settings.shopName || db.settings.shopName === 'Barbearia Navalha de Ouro') {
    db.settings.shopName = 'João Victor Barbershop'
  }
  return db
}

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const db = migrate(JSON.parse(raw))
      localStorage.setItem(KEY, JSON.stringify(db))
      return db
    }
  } catch (e) {
    console.warn('Falha ao ler dados locais, recriando.', e)
  }
  const seed = buildSeed()
  localStorage.setItem(KEY, JSON.stringify(seed))
  return seed
}

export function DataProvider({ children }) {
  const [db, setDb] = useState(load)

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(db))
  }, [db])

  // Generic collection updater
  const update = useCallback((collection, fn) => {
    setDb((prev) => ({ ...prev, [collection]: fn(prev[collection]) }))
  }, [])

  // ---- CRUD helpers ----
  const addTo = useCallback((collection, item) => {
    const withId = { id: item.id || uid(collection.slice(0, 3)), ...item }
    update(collection, (list) => [withId, ...list])
    return withId
  }, [update])

  const patch = useCallback((collection, id, changes) => {
    update(collection, (list) => list.map((x) => (x.id === id ? { ...x, ...changes } : x)))
  }, [update])

  const remove = useCallback((collection, id) => {
    update(collection, (list) => list.filter((x) => x.id !== id))
  }, [update])

  // ---- Domain-specific ----

  // Register a rendered service / product sale, snapshotting commission split
  const addTransaction = useCallback(
    ({ barberId, serviceId, clientId, paymentMethod = 'pix', date }) => {
      const srv = db.services.find((s) => s.id === serviceId)
      if (!srv) return null
      const cat = db.categories.find((c) => c.id === srv.categoryId)
      const price = srv.price
      const barberPct = cat?.barberPct ?? 50
      const barberShare = +(price * (barberPct / 100)).toFixed(2)
      const tx = {
        id: uid('tx'),
        barberId,
        serviceId,
        serviceName: srv.name,
        categoryId: cat?.id,
        categoryName: cat?.name,
        type: cat?.type || 'service',
        clientId: clientId || null,
        price,
        barberPct,
        barberShare,
        shopShare: +(price - barberShare).toFixed(2),
        paymentMethod,
        date: date || new Date().toISOString(),
      }
      update('transactions', (list) => [tx, ...list])
      // touch client's last visit
      if (clientId) patch('clients', clientId, { lastVisit: tx.date })
      return tx
    },
    [db.services, db.categories, update, patch],
  )

  const value = useMemo(
    () => ({
      db,
      setDb,
      addTo,
      patch,
      remove,
      addTransaction,
      resetData: () => {
        const seed = buildSeed()
        setDb(seed)
      },
      // Zera os dados operacionais para uso real, mantendo login (users),
      // serviços/categorias (comissões) e configurações da barbearia.
      startFresh: () => {
        setDb((prev) => ({
          ...prev,
          transactions: [],
          appointments: [],
          queue: [],
          expenses: [],
          goals: [],
          cashSessions: [],
          daysOff: [],
          gallery: [],
          clients: [],
          users: prev.users.map((u) => ({ ...u, lastVisit: undefined })),
        }))
        // limpa o histórico de notificações já enviadas
        Object.keys(localStorage)
          .filter((k) => k.startsWith('barber.notif'))
          .forEach((k) => localStorage.removeItem(k))
      },
      // selectors
      barbers: db.users.filter((u) => u.role === 'barber' || u.role === 'owner'),
      onlyBarbers: db.users.filter((u) => u.role === 'barber'),
      owner: db.users.find((u) => u.role === 'owner'),
      userById: (id) => db.users.find((u) => u.id === id),
      serviceById: (id) => db.services.find((s) => s.id === id),
      categoryById: (id) => db.categories.find((c) => c.id === id),
      clientById: (id) => db.clients.find((c) => c.id === id),
    }),
    [db, addTo, patch, remove, addTransaction],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export const useData = () => useContext(DataContext)

// ---- Derived metric helpers (pure, exported for reuse) ----

// period pode ser 'day' | 'week' | 'month' | 'custom'.
// Para 'custom', passe range = { from: 'YYYY-MM-DD', to: 'YYYY-MM-DD' }.
export function txInPeriod(transactions, period, ref = new Date(), range = null) {
  if (period === 'custom' && range?.from && range?.to) {
    const from = new Date(range.from + 'T00:00:00')
    const to = new Date(range.to + 'T23:59:59')
    return transactions.filter((t) => {
      const d = new Date(t.date)
      return d >= from && d <= to
    })
  }
  return transactions.filter((t) => {
    if (period === 'day') return isSameDay(t.date, ref)
    if (period === 'month') return isSameMonth(t.date, ref)
    if (period === 'week') {
      const d = new Date(t.date)
      const diff = (new Date(ref) - d) / (1000 * 60 * 60 * 24)
      return diff >= 0 && diff < 7
    }
    return true
  })
}

export function ownerMetrics(db, period = 'month', range = null) {
  const txs = txInPeriod(db.transactions, period, new Date(), range)
  const ownerId = db.users.find((u) => u.role === 'owner')?.id
  const total = txs.reduce((s, t) => s + t.price, 0)
  const ownerPersonal = txs
    .filter((t) => t.barberId === ownerId && t.type === 'service')
    .reduce((s, t) => s + t.barberShare, 0)
  const barbersRepasse = txs
    .filter((t) => t.barberId !== ownerId)
    .reduce((s, t) => s + t.shopShare, 0)
  const productSales = txs.filter((t) => t.type === 'product').reduce((s, t) => s + t.price, 0)
  const shopTotal = txs.reduce((s, t) => s + t.shopShare, 0)
  return { total, ownerPersonal, barbersRepasse, productSales, shopTotal, count: txs.length }
}

export function barberMetrics(db, barberId, period = 'month') {
  const txs = txInPeriod(db.transactions, period).filter((t) => t.barberId === barberId)
  const earnings = txs.reduce((s, t) => s + t.barberShare, 0)
  const gross = txs.reduce((s, t) => s + t.price, 0)
  return { earnings, gross, count: txs.length, txs }
}

export function rankingThisMonth(db) {
  const txs = txInPeriod(db.transactions, 'month')
  const map = {}
  for (const t of txs) {
    map[t.barberId] = map[t.barberId] || { barberId: t.barberId, gross: 0, earnings: 0, count: 0 }
    map[t.barberId].gross += t.price
    map[t.barberId].earnings += t.barberShare
    map[t.barberId].count += 1
  }
  return Object.values(map)
    .map((r) => ({ ...r, user: db.users.find((u) => u.id === r.barberId) }))
    .sort((a, b) => b.gross - a.gross)
}

export { monthKey }
