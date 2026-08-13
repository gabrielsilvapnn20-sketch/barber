import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, ResponsiveContainer, Cell, Tooltip } from 'recharts'
import { useData, financeMetrics, itemRanking, peakHours, ordersInPeriod } from '../../context/DataContext.jsx'
import { PageHeader, StatCard, Segmented } from '../../components/ui.jsx'
import { StatusPill } from '../../components/FoodUI.jsx'
import Icon from '../../components/Icons.jsx'
import { brl } from '../../lib/utils.js'
import { PAYMENT_META } from '../../lib/orders.js'

export default function Dashboard() {
  const { db, activeOrders } = useData()
  const navigate = useNavigate()
  const [period, setPeriod] = useState('day')

  const fin = useMemo(() => financeMetrics(db, period), [db, period])
  const ranking = useMemo(() => itemRanking(db, period).slice(0, 5), [db, period])
  const peaks = useMemo(() => peakHours(db, 'week'), [db])

  // Comparativo hoje x ontem
  const yesterday = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() - 1)
    const y = ordersInPeriod(db.orders, 'day', d).filter((o) => o.status !== 'cancelado')
    return y.reduce((s, o) => s + o.total, 0)
  }, [db.orders])
  const todayRev = useMemo(() => ordersInPeriod(db.orders, 'day').filter((o) => o.status !== 'cancelado').reduce((s, o) => s + o.total, 0), [db.orders])
  const delta = yesterday > 0 ? Math.round(((todayRev - yesterday) / yesterday) * 100) : null

  const maxPeak = Math.max(1, ...peaks.map((p) => p.count))

  return (
    <div>
      <PageHeader title="Painel" subtitle="Visão do negócio em tempo real"
        action={<Segmented value={period} onChange={setPeriod} options={[{ value: 'day', label: 'Dia' }, { value: 'week', label: 'Semana' }, { value: 'month', label: 'Mês' }]} />} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={<Icon.money size={20} />} label="Faturamento" value={brl(fin.revenue)} hint={`${fin.count} pedido(s)`} tone="green" />
        <StatCard icon={<Icon.receipt size={20} />} label="Ticket médio" value={brl(fin.ticket)} tone="brand" />
        <StatCard icon={<Icon.flame size={20} />} label="Em andamento" value={activeOrders.length} hint="pedidos abertos" tone="amber" />
        <StatCard icon={<Icon.store size={20} />} label="App x Local" value={`${brl(fin.appRevenue)}`} hint={`Local: ${brl(fin.localRevenue)}`} tone="violet" />
      </div>

      {/* Comparativo */}
      <div className="card mt-3 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Hoje x ontem</p>
          <p className="mt-1 text-lg font-extrabold">{brl(todayRev)} <span className="text-sm font-medium text-slate-400">vs {brl(yesterday)}</span></p>
        </div>
        {delta !== null && (
          <span className={`badge ${delta >= 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'}`}>
            {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}%
          </span>
        )}
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        {/* Ranking */}
        <div className="card">
          <p className="mb-3 flex items-center gap-2 font-bold"><Icon.tag size={18} /> Mais vendidos</p>
          {ranking.length ? (
            <div className="space-y-2">
              {ranking.map((r, i) => (
                <div key={r.name} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">{r.name}</span>
                  <span className="text-sm font-bold tabular-nums">{r.qty}×</span>
                  <span className="w-16 text-right text-xs text-slate-400 tabular-nums">{brl(r.revenue)}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-slate-400">Sem vendas no período.</p>}
        </div>

        {/* Pico */}
        <div className="card">
          <p className="mb-3 flex items-center gap-2 font-bold"><Icon.clock size={18} /> Horário de pico (semana)</p>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={peaks} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <XAxis dataKey="hour" tickFormatter={(h) => `${h}h`} tick={{ fontSize: 10 }} interval={1} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} formatter={(v) => [`${v} pedidos`, '']} labelFormatter={(h) => `${h}h`} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {peaks.map((p) => <Cell key={p.hour} fill={p.count === maxPeak ? '#d1202f' : '#fbbf24'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pagamentos + pedidos ativos */}
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div className="card">
          <p className="mb-3 flex items-center gap-2 font-bold"><Icon.money size={18} /> Por forma de pagamento</p>
          <div className="space-y-2">
            {Object.entries(fin.byMethod).map(([m, v]) => (
              <div key={m} className="flex items-center justify-between text-sm">
                <span>{PAYMENT_META[m]?.emoji} {PAYMENT_META[m]?.label}</span>
                <span className="font-bold tabular-nums">{brl(v)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <p className="flex items-center gap-2 font-bold"><Icon.flame size={18} /> Fila agora</p>
            <button onClick={() => navigate('/gestor/pedidos')} className="text-xs font-semibold text-brand-500">Ver todos</button>
          </div>
          {activeOrders.length ? (
            <div className="space-y-2">
              {activeOrders.slice(0, 4).map((o) => (
                <div key={o.id} className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-sm font-semibold">{o.code} · {o.customerName}</span>
                  <StatusPill status={o.status} />
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-slate-400">Nenhum pedido em andamento.</p>}
        </div>
      </div>
    </div>
  )
}
