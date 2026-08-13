import { useMemo, useState } from 'react'
import { useData, financeMetrics } from '../../context/DataContext.jsx'
import { PageHeader, StatCard, Segmented } from '../../components/ui.jsx'
import Icon from '../../components/Icons.jsx'
import { brl, fmtDateTime } from '../../lib/utils.js'
import { PAYMENT_META } from '../../lib/orders.js'
import { exportCSV, exportPDF } from '../../lib/reports.js'

export default function Finance() {
  const { db } = useData()
  const [period, setPeriod] = useState('day')

  const fin = useMemo(() => financeMetrics(db, period), [db, period])
  const sangrias = useMemo(() => {
    return db.cashMovements.filter((m) => m.type === 'sangria').reduce((s, m) => s + m.amount, 0)
  }, [db.cashMovements])

  const periodLabel = { day: 'Hoje', week: 'Semana', month: 'Mês', all: 'Tudo' }[period]

  const rows = fin.orders.map((o) => ({
    Pedido: o.code,
    Data: fmtDateTime(o.createdAt),
    Cliente: o.customerName,
    Origem: o.source === 'local' ? 'Local' : 'App',
    Pagamento: PAYMENT_META[o.payment?.method]?.label || o.payment?.method,
    Total: brl(o.total),
  }))

  const doExport = (kind) => {
    if (!fin.orders.length) return
    if (kind === 'csv') exportCSV(`faturamento-${period}.csv`, rows)
    else exportPDF({
      title: 'Relatório de faturamento', shopName: db.settings?.shopName || 'Lanchonete Rodrigues', period: periodLabel,
      summary: [
        { label: 'Faturamento', value: brl(fin.revenue) },
        { label: 'Pedidos', value: fin.count },
        { label: 'Ticket médio', value: brl(fin.ticket) },
        { label: 'PIX / Cartão / Dinheiro', value: `${brl(fin.byMethod.pix)} / ${brl(fin.byMethod.cartao)} / ${brl(fin.byMethod.dinheiro)}` },
      ],
      rows,
    })
  }

  return (
    <div>
      <PageHeader title="Financeiro" subtitle="Faturamento do delivery e presencial"
        action={<Segmented value={period} onChange={setPeriod} options={[{ value: 'day', label: 'Dia' }, { value: 'week', label: 'Semana' }, { value: 'month', label: 'Mês' }, { value: 'all', label: 'Tudo' }]} />} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={<Icon.money size={20} />} label="Faturamento" value={brl(fin.revenue)} hint={periodLabel} tone="green" />
        <StatCard icon={<Icon.receipt size={20} />} label="Pedidos" value={fin.count} tone="brand" />
        <StatCard icon={<Icon.tag size={20} />} label="Ticket médio" value={brl(fin.ticket)} tone="amber" />
        <StatCard icon={<Icon.cash size={20} />} label="Sangrias (total)" value={brl(sangrias)} tone="red" />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div className="card">
          <p className="mb-3 font-bold">Por forma de pagamento</p>
          {Object.entries(fin.byMethod).map(([m, v]) => (
            <div key={m} className="mb-2 flex items-center gap-3">
              <span className="w-24 text-sm">{PAYMENT_META[m]?.emoji} {PAYMENT_META[m]?.label}</span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div className="h-full rounded-full bg-brand-500" style={{ width: `${fin.revenue ? (v / fin.revenue) * 100 : 0}%` }} />
              </div>
              <span className="w-20 text-right text-sm font-bold tabular-nums">{brl(v)}</span>
            </div>
          ))}
        </div>
        <div className="card">
          <p className="mb-3 font-bold">Origem do faturamento</p>
          <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
            <div><p className="text-xs text-slate-400">📱 App / Delivery</p><p className="text-lg font-extrabold">{brl(fin.appRevenue)}</p></div>
            <div className="text-right"><p className="text-xs text-slate-400">🏪 Consumo local</p><p className="text-lg font-extrabold">{brl(fin.localRevenue)}</p></div>
          </div>
          <p className="mt-2 text-xs text-slate-400">O total do dia junta app e presencial num único lugar.</p>
        </div>
      </div>

      <div className="card mt-3">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-bold">Pedidos do período</p>
          <div className="flex gap-2">
            <button onClick={() => doExport('csv')} className="btn-ghost !px-3 !py-1.5 text-xs"><Icon.download size={15} /> CSV</button>
            <button onClick={() => doExport('pdf')} className="btn-ghost !px-3 !py-1.5 text-xs"><Icon.download size={15} /> PDF</button>
          </div>
        </div>
        {fin.orders.length ? (
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-slate-400">
                  <th className="px-2 py-1.5">Pedido</th><th className="px-2 py-1.5">Cliente</th><th className="px-2 py-1.5">Origem</th><th className="px-2 py-1.5">Pgto</th><th className="px-2 py-1.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {fin.orders.map((o) => (
                  <tr key={o.id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-2 py-2 font-semibold">{o.code}</td>
                    <td className="px-2 py-2">{o.customerName}</td>
                    <td className="px-2 py-2">{o.source === 'local' ? 'Local' : 'App'}</td>
                    <td className="px-2 py-2">{PAYMENT_META[o.payment?.method]?.label}</td>
                    <td className="px-2 py-2 text-right font-bold tabular-nums">{brl(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="text-sm text-slate-400">Sem pedidos no período.</p>}
      </div>
    </div>
  )
}
