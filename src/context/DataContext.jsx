import { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { buildSeed, buildCatalog, buildTeam, CATALOG_VERSION, TEAM_VERSION } from '../lib/seed.js'
import { uid, isSameDay, isSameMonth, monthKey } from '../lib/utils.js'
import { supabaseEnabled, mergeDb, fetchRemote, pushRemote, subscribeRemote } from '../lib/sync.js'

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
  // Aplica o catálogo real de serviços a instalações antigas (uma vez por
  // versão). Não mexe em lançamentos já feitos (eles guardam nome/preço).
  if (db.settings.catalogVersion !== CATALOG_VERSION) {
    const { categories, services } = buildCatalog()
    db.categories = categories
    db.services = services
    db.settings.catalogVersion = CATALOG_VERSION
  }
  // Coleção de pacotes/combos (adicionada depois)
  if (!Array.isArray(db.packages)) db.packages = []
  // Movimentos de caixa (sangria/suprimento)
  if (!Array.isArray(db.cashMovements)) db.cashMovements = []
  // Equipe: aplica o time atual (João Victor + Eduardo) uma vez por versão,
  // preservando o dono se já existir com o mesmo id.
  if (db.settings.teamVersion !== TEAM_VERSION) {
    db.users = buildTeam()
    db.settings.teamVersion = TEAM_VERSION
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
  const [syncStatus, setSyncStatus] = useState(supabaseEnabled ? 'connecting' : 'offline')
  const syncRef = useRef({ ready: false, lastRemote: null })
  const dbRef = useRef(db)

  useEffect(() => {
    dbRef.current = db
    localStorage.setItem(KEY, JSON.stringify(db))
  }, [db])

  // Aplica dados vindos da nuvem, mesclando com o que existe localmente.
  const applyRemote = useCallback((remoteData) => {
    const s = JSON.stringify(remoteData)
    if (s === syncRef.current.lastRemote) return
    syncRef.current.lastRemote = s
    setDb((local) => mergeDb(local, remoteData))
  }, [])

  // ---- Sincronização em nuvem (Supabase) ----
  // O app funciona 100% offline; quando há conexão, os dados são
  // compartilhados entre os aparelhos da barbearia (dono + barbeiros).
  useEffect(() => {
    if (!supabaseEnabled) return
    let cancelled = false
    let unsub = () => {}
    let pollId = null
    ;(async () => {
      try {
        const remote = await fetchRemote()
        if (cancelled) return
        const local = dbRef.current
        const syncedOnce = localStorage.getItem('barber.syncedOnce') === '1'
        if (remote) {
          // Aparelho que nunca sincronizou adota a nuvem (evita subir dados de
          // demonstração locais); os demais mesclam para preservar mudanças.
          const next = syncedOnce ? mergeDb(local, remote) : remote
          syncRef.current.lastRemote = JSON.stringify(remote)
          if (JSON.stringify(next) !== JSON.stringify(local)) setDb(next)
          // Se a mescla trouxe itens locais que a nuvem não tinha, envia.
          if (syncedOnce && JSON.stringify(next) !== JSON.stringify(remote)) {
            await pushRemote(next)
            syncRef.current.lastRemote = JSON.stringify(next)
          }
        } else {
          // Nuvem vazia: este aparelho vira a base — envia o estado atual.
          await pushRemote(local)
          syncRef.current.lastRemote = JSON.stringify(local)
        }
        localStorage.setItem('barber.syncedOnce', '1')
        syncRef.current.ready = true
        setSyncStatus('online')

        // Tempo real
        unsub = subscribeRemote((remoteData) => applyRemote(remoteData))

        // Fallback: verifica a nuvem a cada 12s (caso o tempo real seja
        // bloqueado por alguma rede de celular).
        pollId = setInterval(async () => {
          try {
            const r = await fetchRemote()
            if (r) applyRemote(r)
            setSyncStatus('online')
          } catch {
            setSyncStatus('error')
          }
        }, 12000)
      } catch (e) {
        console.warn('Sincronização indisponível (rodando offline):', e?.message)
        setSyncStatus('error')
      }
    })()
    return () => {
      cancelled = true
      unsub()
      if (pollId) clearInterval(pollId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyRemote])

  // Envia mudanças locais para a nuvem (com debounce), preservando o que outro
  // aparelho tiver enviado nesse meio-tempo.
  useEffect(() => {
    if (!supabaseEnabled || !syncRef.current.ready) return
    const local = JSON.stringify(db)
    if (local === syncRef.current.lastRemote) return
    const t = setTimeout(async () => {
      try {
        const remote = await fetchRemote()
        let toPush = db
        if (remote && JSON.stringify(remote) !== syncRef.current.lastRemote) {
          // A nuvem mudou desde a última vez: mescla (mudança local vence,
          // mas mantém registros novos do outro aparelho).
          toPush = mergeDb(remote, db)
        }
        await pushRemote(toPush)
        syncRef.current.lastRemote = JSON.stringify(toPush)
        setSyncStatus('online')
        if (JSON.stringify(toPush) !== JSON.stringify(db)) setDb(toPush)
      } catch (e) {
        console.warn('Falha ao enviar para a nuvem:', e?.message)
        setSyncStatus('error')
      }
    }, 700)
    return () => clearTimeout(t)
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

  // Comissão do barbeiro = % média ponderada das categorias dos itens,
  // aplicada sobre o valor final (que pode ter sido editado).
  const blendedBarberShare = useCallback(
    (items, finalTotal) => {
      let base = 0
      let weighted = 0
      for (const it of items) {
        const srv = db.services.find((s) => s.id === it.serviceId)
        const cat = srv && db.categories.find((c) => c.id === srv.categoryId)
        const pct = cat?.barberPct ?? 50
        const line = (srv?.price || 0) * (it.qty || 1)
        base += line
        weighted += line * pct
      }
      const pct = base > 0 ? weighted / base : 50
      return { share: +(finalTotal * (pct / 100)).toFixed(2), pct: Math.round(pct) }
    },
    [db.services, db.categories],
  )

  const normPayments = (payments, fallbackTotal) => {
    const list = payments && payments.length ? payments : [{ method: 'pix', amount: fallbackTotal }]
    return list
      .map((p) => ({ method: p.method, amount: +(+p.amount || 0).toFixed(2) }))
      .filter((p) => p.amount > 0)
  }

  // Venda de um ou vários serviços numa transação, com valor final editável e
  // pagamento único ou dividido (split).
  const addSale = useCallback(
    ({ barberId, clientId, items, total, payments, date }) => {
      const norm = (items || [])
        .filter((i) => (i.qty || 1) > 0)
        .map((i) => {
          const srv = db.services.find((s) => s.id === i.serviceId)
          const cat = srv && db.categories.find((c) => c.id === srv.categoryId)
          return {
            serviceId: i.serviceId,
            serviceName: srv?.name,
            qty: i.qty || 1,
            unitPrice: srv?.price || 0,
            categoryId: cat?.id,
            categoryName: cat?.name,
          }
        })
      if (!norm.length) return null
      const base = norm.reduce((s, i) => s + i.unitPrice * i.qty, 0)
      const finalTotal = total != null && total !== '' ? +total : base
      const { share, pct } = blendedBarberShare(norm, finalTotal)
      const single = norm.length === 1
      const pays = normPayments(payments, finalTotal)
      const tx = {
        id: uid('tx'),
        barberId,
        clientId: clientId || null,
        items: norm,
        serviceId: single && norm[0].qty === 1 ? norm[0].serviceId : null,
        serviceName: norm.map((i) => (i.qty > 1 ? `${i.qty}x ${i.serviceName}` : i.serviceName)).join(' + '),
        categoryId: single ? norm[0].categoryId : null,
        categoryName: single ? norm[0].categoryName : 'Combo',
        type: 'service',
        price: finalTotal,
        edited: total != null && total !== '' && +total !== base,
        barberPct: pct,
        barberShare: share,
        shopShare: +(finalTotal - share).toFixed(2),
        payments: pays,
        paymentMethod: pays.length > 1 ? 'misto' : pays[0]?.method || 'pix',
        date: date || new Date().toISOString(),
      }
      update('transactions', (list) => [tx, ...list])
      if (clientId) patch('clients', clientId, { lastVisit: tx.date })
      return tx
    },
    [db.services, db.categories, blendedBarberShare, update, patch],
  )

  // Vende um pacote/combo: cria o pacote com saldos por serviço e registra a
  // transação financeira da venda (valor editável, pagamento único ou dividido).
  const sellPackage = useCallback(
    ({ barberId, clientId, name, items, total, payments, date, mode = 'livre', validDays = 30 }) => {
      const norm = (items || [])
        .filter((i) => (i.qty || 0) > 0)
        .map((i) => {
          const srv = db.services.find((s) => s.id === i.serviceId)
          return {
            serviceId: i.serviceId,
            serviceName: srv?.name,
            qtyTotal: i.qty,
            qtyUsed: 0,
            unitPrice: srv?.price || 0,
            categoryId: srv?.categoryId,
          }
        })
      if (!norm.length || !clientId) return null
      const base = norm.reduce((s, i) => s + i.unitPrice * i.qtyTotal, 0)
      const finalTotal = total != null && total !== '' ? +total : base
      const when = date || new Date().toISOString()
      // Mensal vence em N dias; "livre" não tem prazo (usa quando quiser)
      let expiresAt = null
      if (mode === 'mensal') {
        const d = new Date(when)
        d.setDate(d.getDate() + (validDays || 30))
        expiresAt = d.toISOString()
      }
      const pkg = {
        id: uid('pkg'),
        clientId,
        name: name || 'Pacote',
        items: norm,
        total: finalTotal,
        soldBy: barberId,
        createdAt: when,
        mode,
        expiresAt,
        status: 'ativo',
      }
      update('packages', (list) => [pkg, ...list])
      const { share, pct } = blendedBarberShare(
        norm.map((i) => ({ serviceId: i.serviceId, qty: i.qtyTotal })),
        finalTotal,
      )
      const pays = normPayments(payments, finalTotal)
      const tx = {
        id: uid('tx'),
        barberId,
        clientId,
        packageId: pkg.id,
        serviceName: `Pacote: ${pkg.name}`,
        categoryName: 'Pacote',
        type: 'package',
        price: finalTotal,
        barberPct: pct,
        barberShare: share,
        shopShare: +(finalTotal - share).toFixed(2),
        payments: pays,
        paymentMethod: pays.length > 1 ? 'misto' : pays[0]?.method || 'pix',
        date: when,
      }
      update('transactions', (list) => [tx, ...list])
      patch('clients', clientId, { lastVisit: when })
      return { pkg, tx }
    },
    [db.services, db.categories, blendedBarberShare, update, patch],
  )

  // Abate um serviço de um pacote ativo — sem nova cobrança financeira.
  const redeemFromPackage = useCallback(
    ({ packageId, serviceId, barberId, date }) => {
      const pkg = db.packages.find((p) => p.id === packageId)
      if (!pkg) return null
      const item = pkg.items.find((i) => i.serviceId === serviceId && i.qtyTotal - i.qtyUsed > 0)
      if (!item) return null
      const newItems = pkg.items.map((i) => (i === item ? { ...i, qtyUsed: i.qtyUsed + 1 } : i))
      const allUsed = newItems.every((i) => i.qtyUsed >= i.qtyTotal)
      patch('packages', pkg.id, { items: newItems, status: allUsed ? 'concluido' : 'ativo' })
      const srv = db.services.find((s) => s.id === serviceId)
      const when = date || new Date().toISOString()
      const tx = {
        id: uid('tx'),
        barberId,
        clientId: pkg.clientId,
        packageId: pkg.id,
        serviceId,
        serviceName: srv?.name,
        categoryName: 'Abatido de pacote',
        type: 'redemption',
        price: 0,
        barberShare: 0,
        shopShare: 0,
        payments: [],
        paymentMethod: 'pacote',
        date: when,
      }
      update('transactions', (list) => [tx, ...list])
      patch('clients', pkg.clientId, { lastVisit: when })
      return tx
    },
    [db.packages, db.services, update, patch],
  )

  // Exclui / estorna um lançamento, revertendo efeitos colaterais:
  // - abatimento de pacote: devolve 1 ao saldo
  // - venda de pacote: remove o pacote e seus abatimentos
  const deleteTransaction = useCallback(
    (id) => {
      const tx = db.transactions.find((t) => t.id === id)
      if (!tx) return
      if (tx.type === 'redemption' && tx.packageId && tx.serviceId) {
        const pkg = db.packages.find((p) => p.id === tx.packageId)
        if (pkg) {
          let restored = false
          const items = pkg.items.map((i) => {
            if (!restored && i.serviceId === tx.serviceId && i.qtyUsed > 0) {
              restored = true
              return { ...i, qtyUsed: i.qtyUsed - 1 }
            }
            return i
          })
          patch('packages', pkg.id, { items, status: 'ativo' })
        }
      }
      if (tx.type === 'package' && tx.packageId) {
        update('packages', (list) => list.filter((p) => p.id !== tx.packageId))
        update('transactions', (list) => list.filter((t) => t.id !== id && t.packageId !== tx.packageId))
        return
      }
      update('transactions', (list) => list.filter((t) => t.id !== id))
    },
    [db.transactions, db.packages, update, patch],
  )

  // Edita valor final e/ou pagamento de uma venda de serviço (recalcula comissão)
  const editSaleTransaction = useCallback(
    (id, { total, payments }) => {
      const tx = db.transactions.find((t) => t.id === id)
      if (!tx) return null
      const finalTotal = total != null && total !== '' ? +total : tx.price
      let share
      if (tx.items?.length) {
        share = blendedBarberShare(tx.items.map((i) => ({ serviceId: i.serviceId, qty: i.qty })), finalTotal).share
      } else {
        share = +(finalTotal * ((tx.barberPct ?? 50) / 100)).toFixed(2)
      }
      const pays = normPayments(payments, finalTotal)
      patch('transactions', id, {
        price: finalTotal,
        barberShare: share,
        shopShare: +(finalTotal - share).toFixed(2),
        payments: pays,
        paymentMethod: pays.length > 1 ? 'misto' : pays[0]?.method || tx.paymentMethod,
        edited: true,
      })
      return true
    },
    [db.transactions, blendedBarberShare, patch],
  )

  const value = useMemo(
    () => ({
      db,
      setDb,
      addTo,
      patch,
      remove,
      addTransaction,
      addSale,
      sellPackage,
      redeemFromPackage,
      deleteTransaction,
      editSaleTransaction,
      syncStatus,
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
          packages: [],
          cashMovements: [],
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
      // Pacotes ativos (com saldo restante) de um cliente
      activePackagesForClient: (clientId) =>
        (db.packages || []).filter(
          (p) => p.clientId === clientId && p.items.some((i) => i.qtyTotal - i.qtyUsed > 0),
        ),
    }),
    [db, addTo, patch, remove, addTransaction, addSale, sellPackage, redeemFromPackage, deleteTransaction, editSaleTransaction, syncStatus],
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
