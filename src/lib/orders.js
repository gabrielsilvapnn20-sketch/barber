// Regras e metadados do domínio de pedidos (compartilhados por cliente e gestor).
import { brl } from './utils.js'

// Fluxo de status do pedido. A ordem importa (usada na fila e na linha do tempo).
export const ORDER_FLOW = ['novo', 'preparo', 'entrega', 'entregue']

export const STATUS_META = {
  novo: { label: 'Pedido recebido', short: 'Novo', emoji: '🧾', tone: 'azure', clientLabel: 'Pedido recebido' },
  preparo: { label: 'Em preparo', short: 'Preparo', emoji: '🔥', tone: 'sun', clientLabel: 'Em preparo' },
  entrega: { label: 'Saiu para entrega', short: 'Saiu', emoji: '🛵', tone: 'brand', clientLabel: 'Saiu para entrega' },
  entregue: { label: 'Entregue', short: 'Entregue', emoji: '✅', tone: 'green', clientLabel: 'Entregue' },
  cancelado: { label: 'Cancelado', short: 'Cancelado', emoji: '✖️', tone: 'slate', clientLabel: 'Cancelado' },
}

// Para pedidos de retirada (pickup) não há etapa de "saiu para entrega".
export function flowFor(order) {
  if (order?.type === 'pickup') return ['novo', 'preparo', 'entregue']
  return ORDER_FLOW
}

export function nextStatus(order) {
  const flow = flowFor(order)
  const i = flow.indexOf(order.status)
  if (i < 0 || i >= flow.length - 1) return null
  return flow[i + 1]
}

export const PAYMENT_META = {
  pix: { label: 'PIX', emoji: '⚡' },
  cartao: { label: 'Cartão', emoji: '💳' },
  dinheiro: { label: 'Dinheiro', emoji: '💵' },
}

// Está aberto agora? (com base em settings.hours). Aceita override de "now".
export function isOpenNow(settings, now = new Date()) {
  const h = settings?.hours
  if (!h) return true
  const day = now.getDay()
  if (Array.isArray(h.days) && !h.days.includes(day)) return false
  const cur = now.getHours() * 60 + now.getMinutes()
  const [oh, om] = (h.open || '00:00').split(':').map(Number)
  const [ch, cm] = (h.close || '23:59').split(':').map(Number)
  let open = oh * 60 + om
  let close = ch * 60 + cm
  if (close <= open) {
    // fecha depois da meia-noite
    return cur >= open || cur <= close
  }
  return cur >= open && cur <= close
}

// Um pedido está atrasado quando passou do tempo estimado sem chegar a entregue.
export function minutesLate(order, now = new Date()) {
  if (!order || order.status === 'entregue' || order.status === 'cancelado') return 0
  const created = new Date(order.createdAt)
  const due = created.getTime() + (order.etaMin || 40) * 60000
  const diff = Math.floor((now.getTime() - due) / 60000)
  return diff > 0 ? diff : 0
}

// Texto de resumo das escolhas de um item já montado (para carrinho/pedido).
export function summarize(item, selections) {
  if (!selections) return ''
  if (item.build === 'assembly') {
    const parts = []
    for (const step of item.steps || []) {
      const chosen = selections[step.id]
      const opt = step.options.find((o) => o.id === chosen)
      if (opt) parts.push(opt.label)
    }
    return parts.join(' · ')
  }
  if (item.build === 'soup') {
    const flavors = (selections.flavors || []).map((fid) => item.flavors.find((f) => f.id === fid)?.label).filter(Boolean)
    const addons = (selections.addons || []).map((aid) => item.addons.find((a) => a.id === aid)?.label).filter(Boolean)
    let s = flavors.join(' + ')
    if (addons.length) s += ` · ${addons.join(', ')}`
    return s
  }
  return ''
}

// Preço unitário de um item já montado (inclui adicionais pagos, se houver).
export function unitPriceOf(item, selections) {
  let price = item.price
  if (item.build === 'soup' && selections?.addons) {
    for (const aid of selections.addons) {
      const a = item.addons.find((x) => x.id === aid)
      if (a) price += a.price || 0
    }
  }
  if (item.build === 'assembly' && selections) {
    for (const step of item.steps || []) {
      const opt = step.options.find((o) => o.id === selections[step.id])
      if (opt?.priceDelta) price += opt.priceDelta
    }
  }
  return +price.toFixed(2)
}

export { brl }
