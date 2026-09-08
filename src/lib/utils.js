// General helpers

export const uid = (prefix = 'id') =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`

// Um agendamento pode ter vários serviços (serviceIds). Mantém compatibilidade
// com agendamentos antigos que tinham um único serviceId.
export const serviceIdsOf = (appointment = {}) => {
  if (Array.isArray(appointment.serviceIds) && appointment.serviceIds.length) return appointment.serviceIds
  return appointment.serviceId ? [appointment.serviceId] : []
}

// Nomes dos serviços de um agendamento, dado o catálogo de serviços.
export const serviceNamesOf = (appointment, services = []) =>
  serviceIdsOf(appointment)
    .map((id) => services.find((s) => s.id === id)?.name)
    .filter(Boolean)

// ---- Pacotes / combos ----
export const pkgIsExpired = (pkg) => !!pkg?.expiresAt && new Date(pkg.expiresAt) < new Date()
export const pkgRemaining = (pkg) =>
  (pkg?.items || []).reduce((s, i) => s + (i.qtyTotal - i.qtyUsed), 0)
export const pkgTotalQty = (pkg) => (pkg?.items || []).reduce((s, i) => s + i.qtyTotal, 0)

// Rótulo de forma de pagamento
export const PAY_LABEL = {
  pix: 'PIX',
  dinheiro: 'Dinheiro',
  debito: 'Débito',
  credito: 'Crédito',
  pacote: 'Pacote',
  convenio: 'Convênio',
  misto: 'Misto',
}
export const paymentLabelOf = (t) => {
  if (t?.payments?.length > 1) return 'Misto'
  const m = t?.payments?.[0]?.method || t?.paymentMethod
  return PAY_LABEL[m] || m || '—'
}

export const brl = (v) =>
  (Number(v) || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })

export const pct = (v) => `${Number(v) || 0}%`

// Date helpers (kept dependency-light besides date-fns where useful)
export const todayISO = () => new Date().toISOString().slice(0, 10)

export const startOfDay = (d = new Date()) => {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export const isSameDay = (a, b) => {
  const da = new Date(a)
  const db = new Date(b)
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  )
}

export const isSameMonth = (a, b = new Date()) => {
  const da = new Date(a)
  const db = new Date(b)
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth()
}

export const monthKey = (d = new Date()) => {
  const x = new Date(d)
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`
}

// Mês anterior a uma referência, no formato 'YYYY-MM'
export const prevMonthKey = (d = new Date()) => {
  const x = new Date(d)
  return monthKey(new Date(x.getFullYear(), x.getMonth() - 1, 1))
}

// Rótulo legível de um 'YYYY-MM' (ex.: "setembro de 2026")
export const monthKeyLabel = (mk) => {
  const [y, m] = String(mk).split('-')
  return new Date(+y, +m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

// ---- CPF ----
export const maskCpf = (v) => {
  const d = String(v || '').replace(/\D/g, '').slice(0, 11)
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}
// Validação real de CPF (dígitos verificadores)
export const isValidCpf = (v) => {
  const c = String(v || '').replace(/\D/g, '')
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false
  let sum = 0
  for (let i = 0; i < 9; i++) sum += +c[i] * (10 - i)
  let d1 = (sum * 10) % 11
  if (d1 === 10) d1 = 0
  if (d1 !== +c[9]) return false
  sum = 0
  for (let i = 0; i < 10; i++) sum += +c[i] * (11 - i)
  let d2 = (sum * 10) % 11
  if (d2 === 10) d2 = 0
  return d2 === +c[10]
}

export const fmtDate = (d) =>
  new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

export const fmtDateTime = (d) =>
  new Date(d).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

export const fmtTime = (d) =>
  new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

export const weekdayName = (d) =>
  new Date(d).toLocaleDateString('pt-BR', { weekday: 'short' })

// Return the last N days as [{date, label}]
export const lastNDays = (n) => {
  const out = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    out.push(d)
  }
  return out
}

export const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('')

// deterministic color from a string (for avatars)
export const colorFrom = (str = '') => {
  const palette = [
    '#0ea5e9', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
    '#ef4444', '#14b8a6', '#6366f1', '#f97316', '#22c55e',
  ]
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0
  return palette[h % palette.length]
}
