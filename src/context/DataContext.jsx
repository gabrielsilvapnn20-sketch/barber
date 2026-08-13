import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { buildSeed, buildCatalog, defaultSettings, CATALOG_VERSION } from '../lib/seed.js'
import { nextStatus, PAYMENT_META } from '../lib/orders.js'
import { uid, isSameDay, isSameMonth } from '../lib/utils.js'

const DataContext = createContext(null)
const KEY = 'lr.db.v1'

// Migrações leves para bancos já existentes no aparelho.
function migrate(db) {
  if (!db.settings) db.settings = defaultSettings()
  // Reaplica o catálogo quando a versão muda (sem apagar pedidos).
  if (db.settings.catalogVersion !== CATALOG_VERSION) {
    const { categories, items } = buildCatalog()
    // Preserva o status de disponibilidade que o gestor já configurou.
    const availMap = Object.fromEntries((db.items || []).map((i) => [i.id, i.available]))
    db.categories = categories
    db.items = items.map((i) => (i.id in availMap ? { ...i, available: availMap[i.id] } : i))
    db.settings.catalogVersion = CATALOG_VERSION
  }
  for (const c of ['customers', 'orders', 'cashMovements', 'messages']) if (!db[c]) db[c] = []
  if (typeof db.seq !== 'number') db.seq = 1000 + db.orders.length
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

  const update = useCallback((collection, fn) => {
    setDb((prev) => ({ ...prev, [collection]: fn(prev[collection]) }))
  }, [])

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

  // ---- Pedidos ----

  // Cria um pedido a partir do carrinho + dados do checkout.
  const placeOrder = useCallback((payload) => {
    let created
    setDb((prev) => {
      const seq = (prev.seq || 1000) + 1
      const code = `R-${seq}`
      const subtotal = payload.items.reduce((s, i) => s + i.lineTotal, 0)
      const deliveryFee = payload.type === 'pickup' ? 0 : (payload.deliveryFee || 0)
      const now = new Date().toISOString()
      const order = {
        id: uid('ord'),
        code,
        customerId: payload.customerId || null,
        customerName: payload.customerName,
        phone: payload.phone || '',
        source: payload.source || 'app',
        type: payload.type || 'delivery',
        address: payload.address || null,
        zoneId: payload.zoneId || null,
        items: payload.items,
        subtotal,
        deliveryFee,
        discount: payload.discount || 0,
        total: +(subtotal + deliveryFee - (payload.discount || 0)).toFixed(2),
        payment: payload.payment || { method: 'pix', changeFor: null },
        status: payload.status || 'novo',
        etaMin: payload.etaMin ?? (prev.settings?.delivery?.etaDefaultMin || 40),
        timeline: [{ status: payload.status || 'novo', at: now }],
        rating: null,
        createdAt: now,
        notes: payload.notes || '',
      }
      created = order
      let customers = prev.customers
      // Fidelidade: conta o pedido (apenas app com cliente identificado).
      if (order.source === 'app' && order.customerId) {
        customers = customers.map((c) =>
          c.id === order.customerId
            ? { ...c, loyaltyCount: (c.loyaltyCount || 0) + 1, points: (c.points || 0) + 1 }
            : c,
        )
      }
      return { ...prev, seq, orders: [order, ...prev.orders], customers }
    })
    return created
  }, [])

  // Avança o pedido para o próximo status do fluxo (ou define um específico).
  const setOrderStatus = useCallback((orderId, status) => {
    let updated = null
    update('orders', (list) =>
      list.map((o) => {
        if (o.id !== orderId) return o
        const next = status || nextStatus(o)
        if (!next) return o
        updated = { ...o, status: next, timeline: [...o.timeline, { status: next, at: new Date().toISOString() }] }
        return updated
      }),
    )
    return updated
  }, [update])

  const cancelOrder = useCallback((orderId) => setOrderStatus(orderId, 'cancelado'), [setOrderStatus])

  const rateOrder = useCallback((orderId, rating) => {
    patch('orders', orderId, { rating })
  }, [patch])

  // ---- Estoque ----
  const toggleItemAvailable = useCallback((itemId) => {
    update('items', (list) => list.map((i) => (i.id === itemId ? { ...i, available: !i.available } : i)))
  }, [update])

  // ---- Caixa ----
  const addSangria = useCallback(({ amount, reason }) => {
    return addTo('cashMovements', { type: 'sangria', amount: +amount, reason: reason || '', at: new Date().toISOString() })
  }, [addTo])

  // Consumo local (presencial) — registra como pedido source 'local', já entregue.
  const addLocalSale = useCallback(({ items, payment, customerName, notes }) => {
    return placeOrder({
      items,
      customerName: customerName || 'Consumo no local',
      source: 'local',
      type: 'pickup',
      status: 'entregue',
      payment: payment || { method: 'dinheiro', changeFor: null },
      etaMin: 0,
      notes,
    })
  }, [placeOrder])

  // ---- Mensagens / suporte ----
  const addMessage = useCallback((msg) => addTo('messages', { from: 'customer', read: false, at: new Date().toISOString(), ...msg }), [addTo])
  const replyMessage = useCallback((customerId, name, text) =>
    addTo('messages', { customerId, name, text, from: 'shop', read: true, at: new Date().toISOString() }), [addTo])
  const markMessagesRead = useCallback((customerId) => {
    update('messages', (list) => list.map((m) => (m.customerId === customerId ? { ...m, read: true } : m)))
  }, [update])

  // ---- Fidelidade ----
  const redeemLoyalty = useCallback((customerId) => {
    update('customers', (list) =>
      list.map((c) => {
        if (c.id !== customerId) return c
        const everyN = db.settings?.loyalty?.everyN || 5
        return { ...c, loyaltyCount: Math.max(0, (c.loyaltyCount || 0) - everyN) }
      }),
    )
  }, [update, db.settings])

  // ---- Configurações ----
  const updateSettings = useCallback((changes) => {
    setDb((prev) => ({ ...prev, settings: { ...prev.settings, ...changes } }))
  }, [])

  const value = useMemo(
    () => ({
      db,
      setDb,
      addTo,
      patch,
      remove,
      placeOrder,
      setOrderStatus,
      cancelOrder,
      rateOrder,
      toggleItemAvailable,
      addSangria,
      addLocalSale,
      addMessage,
      replyMessage,
      markMessagesRead,
      redeemLoyalty,
      updateSettings,
      // reset / uso real
      resetData: () => setDb(buildSeed()),
      startFresh: () =>
        setDb((prev) => ({
          ...prev,
          orders: [],
          cashMovements: [],
          messages: [],
          customers: prev.customers.map((c) => ({ ...c, loyaltyCount: 0, points: 0 })),
          seq: 1000,
        })),
      // selectors
      itemById: (id) => db.items.find((i) => i.id === id),
      categoryById: (id) => db.categories.find((c) => c.id === id),
      customerById: (id) => db.customers.find((c) => c.id === id),
      orderById: (id) => db.orders.find((o) => o.id === id),
      itemsByCategory: (catId) => db.items.filter((i) => i.categoryId === catId),
      activeOrders: db.orders.filter((o) => o.status !== 'entregue' && o.status !== 'cancelado'),
      unreadMessages: db.messages.filter((m) => m.from === 'customer' && !m.read).length,
    }),
    [db, addTo, patch, remove, placeOrder, setOrderStatus, cancelOrder, rateOrder, toggleItemAvailable, addSangria, addLocalSale, addMessage, replyMessage, markMessagesRead, redeemLoyalty, updateSettings],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export const useData = () => useContext(DataContext)

/* ---------------- Métricas (funções puras, reaproveitáveis) --------------- */

export function ordersInPeriod(orders, period, ref = new Date(), range = null) {
  if (period === 'all') return orders
  if (period === 'custom' && range?.from && range?.to) {
    const from = new Date(range.from + 'T00:00:00')
    const to = new Date(range.to + 'T23:59:59')
    return orders.filter((o) => {
      const d = new Date(o.createdAt)
      return d >= from && d <= to
    })
  }
  return orders.filter((o) => {
    if (period === 'day') return isSameDay(o.createdAt, ref)
    if (period === 'month') return isSameMonth(o.createdAt, ref)
    if (period === 'week') {
      const diff = (new Date(ref) - new Date(o.createdAt)) / (1000 * 60 * 60 * 24)
      return diff >= -1 && diff < 7
    }
    return true
  })
}

// Faturamento e indicadores num período. Ignora cancelados.
export function financeMetrics(db, period = 'day', range = null) {
  const paid = ordersInPeriod(db.orders, period, new Date(), range).filter((o) => o.status !== 'cancelado')
  const revenue = paid.reduce((s, o) => s + o.total, 0)
  const byMethod = { pix: 0, cartao: 0, dinheiro: 0 }
  for (const o of paid) byMethod[o.payment?.method] = (byMethod[o.payment?.method] || 0) + o.total
  const appRevenue = paid.filter((o) => o.source === 'app').reduce((s, o) => s + o.total, 0)
  const localRevenue = paid.filter((o) => o.source === 'local').reduce((s, o) => s + o.total, 0)
  const count = paid.length
  const ticket = count ? revenue / count : 0
  return { revenue, byMethod, appRevenue, localRevenue, count, ticket, orders: paid }
}

// Ranking de itens mais vendidos (por quantidade) no período.
export function itemRanking(db, period = 'month', range = null) {
  const paid = ordersInPeriod(db.orders, period, new Date(), range).filter((o) => o.status !== 'cancelado')
  const map = {}
  for (const o of paid) {
    for (const li of o.items) {
      map[li.name] = map[li.name] || { name: li.name, qty: 0, revenue: 0 }
      map[li.name].qty += li.qty
      map[li.name].revenue += li.lineTotal
    }
  }
  return Object.values(map).sort((a, b) => b.qty - a.qty)
}

// Distribuição por hora (horário de pico).
export function peakHours(db, period = 'week', range = null) {
  const paid = ordersInPeriod(db.orders, period, new Date(), range).filter((o) => o.status !== 'cancelado')
  const buckets = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 }))
  for (const o of paid) buckets[new Date(o.createdAt).getHours()].count++
  return buckets.filter((b) => b.hour >= 10) // lanchonete abre à tarde/noite
}

export { isSameDay, PAYMENT_META }
