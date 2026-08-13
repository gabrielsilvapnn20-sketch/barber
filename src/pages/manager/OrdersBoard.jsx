import { useMemo, useState } from 'react'
import { useData } from '../../context/DataContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { PageHeader, EmptyState, Segmented } from '../../components/ui.jsx'
import { StatusPill } from '../../components/FoodUI.jsx'
import Icon from '../../components/Icons.jsx'
import { nextStatus, STATUS_META, PAYMENT_META, minutesLate } from '../../lib/orders.js'
import { brl, fmtTime, isSameDay } from '../../lib/utils.js'

const ADVANCE_LABEL = {
  preparo: 'Iniciar preparo',
  entrega: 'Confirmar saída p/ entrega',
  entregue: 'Marcar como entregue',
}

export default function OrdersBoard() {
  const { db, setOrderStatus, cancelOrder } = useData()
  const toast = useToast()
  const [view, setView] = useState('ativos')

  const active = useMemo(() => db.orders.filter((o) => o.status !== 'entregue' && o.status !== 'cancelado'), [db.orders])
  const doneToday = useMemo(() => db.orders.filter((o) => o.status === 'entregue' && isSameDay(o.createdAt, new Date())), [db.orders])

  const groups = ['novo', 'preparo', 'entrega']

  const advance = (o) => {
    const next = nextStatus(o)
    setOrderStatus(o.id, next)
    if (next === 'entrega') toast.success(`${o.code}: cliente avisado que saiu para entrega 🛵`)
    else toast.success(`${o.code}: ${STATUS_META[next].label}`)
  }

  return (
    <div>
      <PageHeader title="Pedidos" subtitle="Fila em tempo real"
        action={<Segmented value={view} onChange={setView} options={[{ value: 'ativos', label: 'Ativos' }, { value: 'entregues', label: 'Entregues' }]} />} />

      {view === 'ativos' ? (
        active.length === 0 ? (
          <EmptyState icon={<Icon.receipt size={40} />} title="Nenhum pedido em andamento" subtitle="Novos pedidos aparecem aqui automaticamente." />
        ) : (
          <div className="space-y-5">
            {groups.map((status) => {
              const list = active.filter((o) => o.status === status)
              if (!list.length) return null
              return (
                <div key={status}>
                  <div className="mb-2 flex items-center gap-2">
                    <StatusPill status={status} />
                    <span className="text-xs text-slate-400">{list.length}</span>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    {list.map((o) => <OrderCard key={o.id} order={o} onAdvance={() => advance(o)} onCancel={() => { cancelOrder(o.id); toast.info(`${o.code} cancelado`) }} />)}
                  </div>
                </div>
              )
            })}
          </div>
        )
      ) : (
        doneToday.length === 0 ? (
          <EmptyState icon={<Icon.check size={40} />} title="Nenhuma entrega concluída hoje" />
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {doneToday.map((o) => <OrderCard key={o.id} order={o} done />)}
          </div>
        )
      )}
    </div>
  )
}

function OrderCard({ order, onAdvance, onCancel, done }) {
  const late = minutesLate(order)
  const next = nextStatus(order)
  return (
    <div className={`card ${late > 0 && !done ? 'ring-2 ring-red-400/60' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold">{order.code} · {order.customerName}</p>
          <p className="text-xs text-slate-400">{fmtTime(order.createdAt)} · {order.type === 'pickup' ? 'Retirada' : order.address?.street || 'Entrega'}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {order.source === 'local' && <span className="badge bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">Local</span>}
          {late > 0 && !done && <span className="badge bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">Atrasado {late}min</span>}
        </div>
      </div>

      <div className="my-2 space-y-1 rounded-xl bg-slate-50 p-2.5 text-sm dark:bg-slate-800/60">
        {order.items.map((li) => (
          <div key={li.uid} className="leading-snug">
            <b>{li.qty}×</b> {li.name}{li.summary ? <span className="text-slate-400"> — {li.summary}</span> : ''}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-500">{PAYMENT_META[order.payment?.method]?.emoji} {PAYMENT_META[order.payment?.method]?.label}{order.payment?.changeFor ? ` (troco ${brl(order.payment.changeFor)})` : ''}</span>
        <span className="price">{brl(order.total)}</span>
      </div>

      {!done && next && (
        <div className="mt-3 flex gap-2">
          <button onClick={onAdvance} className={`flex-1 ${next === 'entrega' ? 'btn-primary' : 'btn-sun'} !py-2 text-xs`}>
            {next === 'entrega' && <Icon.moto size={15} />} {ADVANCE_LABEL[next]}
          </button>
          <button onClick={onCancel} className="btn-ghost !px-3 !py-2 text-xs" title="Cancelar"><Icon.close size={15} /></button>
        </div>
      )}
    </div>
  )
}
