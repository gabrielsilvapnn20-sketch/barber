import { useMemo, useState } from 'react'
import { useData } from '../../context/DataContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { PageHeader, StatCard, Modal, Field } from '../../components/ui.jsx'
import { QtyStepper } from '../../components/FoodUI.jsx'
import Icon from '../../components/Icons.jsx'
import { brl, fmtTime, isSameDay, uid } from '../../lib/utils.js'
import { PAYMENT_META } from '../../lib/orders.js'

export default function CashBox() {
  const { db, addSangria, addLocalSale } = useData()
  const toast = useToast()
  const [sangriaOpen, setSangriaOpen] = useState(false)
  const [localOpen, setLocalOpen] = useState(false)

  const todayOrders = db.orders.filter((o) => isSameDay(o.createdAt, new Date()) && o.status !== 'cancelado')
  const cashIn = todayOrders.filter((o) => o.payment?.method === 'dinheiro').reduce((s, o) => s + o.total, 0)
  const sangriasToday = db.cashMovements.filter((m) => m.type === 'sangria' && isSameDay(m.at, new Date()))
  const sangriaSum = sangriasToday.reduce((s, m) => s + m.amount, 0)
  const expected = cashIn - sangriaSum

  return (
    <div>
      <PageHeader title="Caixa" subtitle="Sangria e consumo no local" />

      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={<Icon.money size={20} />} label="Dinheiro (hoje)" value={brl(cashIn)} tone="green" />
        <StatCard icon={<Icon.wallet size={20} />} label="Sangrias" value={brl(sangriaSum)} tone="red" />
        <StatCard icon={<Icon.cash size={20} />} label="Esperado no caixa" value={brl(expected)} tone="brand" />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button onClick={() => setSangriaOpen(true)} className="btn-danger"><Icon.wallet size={18} /> Registrar sangria</button>
        <button onClick={() => setLocalOpen(true)} className="btn-sun"><Icon.store size={18} /> Consumo local</button>
      </div>

      {/* Movimentações de sangria de hoje */}
      <div className="card mt-4">
        <p className="mb-3 font-bold">Sangrias de hoje</p>
        {sangriasToday.length ? (
          <div className="space-y-2">
            {sangriasToday.map((m) => (
              <div key={m.id} className="flex items-center justify-between border-b border-slate-100 pb-2 text-sm last:border-0 dark:border-slate-800">
                <div><p className="font-semibold">{brl(m.amount)}</p><p className="text-xs text-slate-400">{m.reason || 'Sem motivo'}</p></div>
                <span className="text-xs text-slate-400">{fmtTime(m.at)}</span>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-slate-400">Nenhuma retirada registrada hoje.</p>}
      </div>

      {/* Consumo local de hoje */}
      <div className="card mt-3">
        <p className="mb-3 font-bold">Consumo local de hoje</p>
        {todayOrders.filter((o) => o.source === 'local').length ? (
          <div className="space-y-2">
            {todayOrders.filter((o) => o.source === 'local').map((o) => (
              <div key={o.id} className="flex items-center justify-between text-sm">
                <span className="min-w-0 truncate">{o.items.map((li) => `${li.qty}× ${li.name}`).join(', ')}</span>
                <span className="shrink-0 font-bold tabular-nums">{brl(o.total)}</span>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-slate-400">Nada lançado ainda.</p>}
      </div>

      <SangriaModal open={sangriaOpen} onClose={() => setSangriaOpen(false)} onSave={(v) => { addSangria(v); toast.success('Sangria registrada'); setSangriaOpen(false) }} />
      <LocalSaleModal open={localOpen} onClose={() => setLocalOpen(false)} items={db.items} onSave={(payload) => { addLocalSale(payload); toast.success('Consumo local lançado'); setLocalOpen(false) }} />
    </div>
  )
}

function SangriaModal({ open, onClose, onSave }) {
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('Troco')
  return (
    <Modal open={open} onClose={onClose} title="Registrar sangria"
      footer={<><button className="btn-ghost" onClick={onClose}>Cancelar</button><button className="btn-danger" onClick={() => amount && onSave({ amount, reason })}>Registrar</button></>}>
      <Field label="Valor retirado"><input className="input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="R$ 0,00" autoFocus /></Field>
      <div className="mt-3">
        <Field label="Motivo">
          <select className="input" value={reason} onChange={(e) => setReason(e.target.value)}>
            {['Troco', 'Pagamento a fornecedor', 'Retirada pessoal', 'Despesa do dia', 'Outro'].map((r) => <option key={r}>{r}</option>)}
          </select>
        </Field>
      </div>
    </Modal>
  )
}

function LocalSaleModal({ open, onClose, items, onSave }) {
  const [lines, setLines] = useState({}) // itemId -> qty
  const [method, setMethod] = useState('dinheiro')

  const available = items.filter((i) => i.available)
  const draft = useMemo(() =>
    Object.entries(lines).filter(([, q]) => q > 0).map(([id, qty]) => {
      const it = items.find((i) => i.id === id)
      return { uid: uid('li'), itemId: id, name: it.name, emoji: it.emoji, unitPrice: it.price, qty, lineTotal: +(it.price * qty).toFixed(2), selections: null, summary: '' }
    }), [lines, items])
  const total = draft.reduce((s, l) => s + l.lineTotal, 0)

  const setQty = (id, q) => setLines((prev) => ({ ...prev, [id]: Math.max(0, q) }))

  return (
    <Modal open={open} onClose={onClose} title="Lançar consumo local" wide
      footer={<><button className="btn-ghost" onClick={onClose}>Cancelar</button><button className="btn-primary" disabled={!draft.length} onClick={() => onSave({ items: draft, payment: { method, changeFor: null }, customerName: 'Consumo no local' })}>Lançar · {brl(total)}</button></>}>
      <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">Pedidos de quem comeu no local (fora do app). Entram no faturamento do dia.</p>
      <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
        {available.map((it) => (
          <div key={it.id} className="flex items-center gap-2 rounded-xl border border-slate-100 p-2 dark:border-slate-800">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sun-300 to-sun-500 text-lg">{it.emoji}</span>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">{it.name}</span>
            <span className="text-xs text-slate-400">{brl(it.price)}</span>
            <QtyStepper qty={lines[it.id] || 0} onInc={() => setQty(it.id, (lines[it.id] || 0) + 1)} onDec={() => setQty(it.id, (lines[it.id] || 0) - 1)} size="sm" />
          </div>
        ))}
      </div>
      <div className="mt-3">
        <p className="label">Pagamento</p>
        <div className="grid grid-cols-3 gap-2">
          {['pix', 'cartao', 'dinheiro'].map((m) => (
            <button key={m} onClick={() => setMethod(m)} className={`rounded-xl border px-2 py-2 text-sm font-semibold ${method === m ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300' : 'border-slate-200 dark:border-slate-700'}`}>
              {PAYMENT_META[m].emoji} {PAYMENT_META[m].label}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  )
}
