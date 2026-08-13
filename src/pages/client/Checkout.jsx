import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../../context/DataContext.jsx'
import { useCart } from '../../context/CartContext.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { PageHeader, Field } from '../../components/ui.jsx'
import Icon from '../../components/Icons.jsx'
import { PAYMENT_META } from '../../lib/orders.js'
import { brl } from '../../lib/utils.js'

export default function Checkout() {
  const { db, placeOrder } = useData()
  const { lines, subtotal, clear } = useCart()
  const { customer, identifyCustomer, updateCustomer } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const zones = db.settings?.delivery?.zones || []
  const pickupAllowed = db.settings?.delivery?.pickup !== false

  // Login de baixa fricção
  const [name, setName] = useState(customer?.name || '')
  const [phone, setPhone] = useState(customer?.phone || '')

  const [type, setType] = useState('delivery') // delivery | pickup
  const [zoneId, setZoneId] = useState(customer?.addresses?.[0]?.zoneId || zones[0]?.id || '')
  const [street, setStreet] = useState(customer?.addresses?.[0]?.street || '')
  const [ref, setRef] = useState(customer?.addresses?.[0]?.ref || '')
  const [method, setMethod] = useState('pix')
  const [changeFor, setChangeFor] = useState('')

  const zone = zones.find((z) => z.id === zoneId)
  const deliveryFee = type === 'pickup' ? 0 : (zone?.fee || 0)
  const etaMin = type === 'pickup' ? 15 : (zone?.etaMin || db.settings?.delivery?.etaDefaultMin || 40)
  const total = +(subtotal + deliveryFee).toFixed(2)

  if (!lines.length) {
    navigate('/')
    return null
  }

  const submit = () => {
    if (!name.trim() || !phone.trim()) return toast.error('Informe seu nome e telefone.')
    if (type === 'delivery' && !street.trim()) return toast.error('Informe o endereço de entrega.')
    if (method === 'dinheiro' && changeFor && Number(changeFor) < total) return toast.error('O valor para troco é menor que o total.')

    // Identifica/atualiza o cliente
    const cus = customer || identifyCustomer({ name, phone })
    if (customer) updateCustomer({ name, phone })
    // Salva endereço se novo
    if (type === 'delivery' && cus) {
      const addrs = cus.addresses || []
      const exists = addrs.some((a) => a.street === street)
      if (!exists) updateCustomer({ addresses: [...addrs, { id: 'ad_' + Date.now(), label: 'Endereço', zoneId, street, ref }] })
    }

    const order = placeOrder({
      items: lines,
      customerId: cus?.id,
      customerName: name,
      phone,
      type,
      zoneId: type === 'delivery' ? zoneId : null,
      address: type === 'delivery' ? { street, ref, zoneId } : null,
      deliveryFee,
      etaMin,
      payment: { method, changeFor: method === 'dinheiro' && changeFor ? Number(changeFor) : null },
    })
    clear()
    toast.success('Pedido enviado! 🎉')
    navigate(`/pedido/${order.id}`)
  }

  return (
    <div>
      <PageHeader title="Finalizar pedido" subtitle="Só falta confirmar os detalhes" />

      {/* Identificação */}
      <div className="card mb-3">
        <p className="mb-2 flex items-center gap-2 font-bold"><Icon.user size={18} /> Seus dados</p>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Nome"><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" /></Field>
          <Field label="Telefone"><input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(34) 9...." inputMode="tel" /></Field>
        </div>
      </div>

      {/* Entrega ou retirada */}
      <div className="card mb-3">
        <div className="mb-3 grid grid-cols-2 gap-2">
          <TypeBtn active={type === 'delivery'} onClick={() => setType('delivery')} icon={<Icon.moto size={18} />} label="Entrega" />
          <TypeBtn active={type === 'pickup'} onClick={() => setType('pickup')} icon={<Icon.store size={18} />} label="Retirar no local" disabled={!pickupAllowed} sub="Sem taxa" />
        </div>

        {type === 'delivery' ? (
          <div className="space-y-2">
            <Field label="Bairro / região">
              <select className="input" value={zoneId} onChange={(e) => setZoneId(e.target.value)}>
                {zones.map((z) => <option key={z.id} value={z.id}>{z.name} — {brl(z.fee)} · ~{z.etaMin}min</option>)}
              </select>
            </Field>
            <Field label="Endereço"><input className="input" value={street} onChange={(e) => setStreet(e.target.value)} placeholder="Rua, número" /></Field>
            <Field label="Ponto de referência (opcional)"><input className="input" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Ex.: portão azul" /></Field>
          </div>
        ) : (
          <p className="rounded-xl bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
            Retirada no balcão — sem taxa de entrega. Pronto em ~15 min.
          </p>
        )}
      </div>

      {/* Pagamento */}
      <div className="card mb-3">
        <p className="mb-2 flex items-center gap-2 font-bold"><Icon.money size={18} /> Pagamento</p>
        <div className="grid grid-cols-3 gap-2">
          {(db.settings?.payments || ['pix', 'cartao', 'dinheiro']).map((m) => (
            <button key={m} onClick={() => setMethod(m)} className={`rounded-xl border px-2 py-3 text-sm font-semibold transition ${method === m ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300' : 'border-slate-200 dark:border-slate-700'}`}>
              <div className="text-lg">{PAYMENT_META[m]?.emoji}</div>
              {PAYMENT_META[m]?.label}
            </button>
          ))}
        </div>
        {method === 'dinheiro' && (
          <div className="mt-3">
            <Field label="Precisa de troco para quanto?">
              <input className="input" value={changeFor} onChange={(e) => setChangeFor(e.target.value)} placeholder={`Ex.: ${brl(total + 20)}`} inputMode="decimal" />
            </Field>
            {changeFor && Number(changeFor) >= total && (
              <p className="mt-1 text-xs text-slate-500">Troco: {brl(Number(changeFor) - total)}</p>
            )}
          </div>
        )}
      </div>

      {/* Resumo */}
      <div className="card">
        <Row label="Subtotal" value={brl(subtotal)} />
        <Row label={type === 'pickup' ? 'Retirada' : `Entrega${zone ? ` (${zone.name})` : ''}`} value={type === 'pickup' ? 'Grátis' : brl(deliveryFee)} />
        <div className="my-2 border-t border-slate-200 dark:border-slate-800" />
        <Row label="Total" value={brl(total)} big />
        <p className="mt-1 text-xs text-slate-400">Tempo estimado: ~{etaMin} min</p>
        <button onClick={submit} className="btn-primary mt-3 w-full text-base">
          Confirmar pedido · {brl(total)}
        </button>
      </div>
    </div>
  )
}

function TypeBtn({ active, onClick, icon, label, sub, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-sm font-semibold transition disabled:opacity-40 ${active ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300' : 'border-slate-200 dark:border-slate-700'}`}>
      {icon}{label}{sub && <span className="text-[10px] font-medium text-emerald-500">{sub}</span>}
    </button>
  )
}

function Row({ label, value, big }) {
  return (
    <div className="flex items-center justify-between">
      <span className={big ? 'font-bold' : 'text-sm text-slate-500 dark:text-slate-400'}>{label}</span>
      <span className={big ? 'text-lg font-extrabold tabular-nums text-brand-600 dark:text-brand-400' : 'font-semibold tabular-nums'}>{value}</span>
    </div>
  )
}
