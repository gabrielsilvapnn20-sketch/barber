import { useMemo, useState } from 'react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts'
import { useData, ownerMetrics, txInPeriod } from '../context/DataContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import { PageHeader, Segmented, StatCard } from '../components/ui.jsx'
import Icon from '../components/Icons.jsx'
import { brl, fmtDate, fmtTime } from '../lib/utils.js'
import { exportCSV, exportPDF } from '../lib/reports.js'

const COLORS = ['#0ea5e9', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#14b8a6', '#f97316']
const payLabel = { pix: 'PIX', dinheiro: 'Dinheiro', debito: 'Débito', credito: 'Crédito' }

export default function Financeiro() {
  const { db } = useData()
  const { theme } = useTheme()
  const [period, setPeriod] = useState('month')

  const txs = useMemo(() => txInPeriod(db.transactions, period), [db.transactions, period])
  const m = useMemo(() => ownerMetrics(db, period), [db, period])

  const byCategory = useMemo(() => {
    const map = {}
    for (const t of txs) {
      map[t.categoryName] = (map[t.categoryName] || 0) + t.price
    }
    return Object.entries(map).map(([name, value]) => ({ name, value }))
  }, [txs])

  const byPayment = useMemo(() => {
    const map = {}
    for (const t of txs) {
      const k = payLabel[t.paymentMethod] || t.paymentMethod
      map[k] = (map[k] || 0) + t.price
    }
    return Object.entries(map).map(([name, value]) => ({ name, value }))
  }, [txs])

  const byBarber = useMemo(() => {
    const map = {}
    for (const t of txs) {
      const u = db.users.find((x) => x.id === t.barberId)
      const name = u?.name?.split(' ')[0] || '—'
      map[name] = map[name] || { name, Barbearia: 0, Barbeiro: 0 }
      map[name].Barbearia += t.shopShare
      map[name].Barbeiro += t.barberShare
    }
    return Object.values(map).map((r) => ({
      ...r,
      Barbearia: +r.Barbearia.toFixed(2),
      Barbeiro: +r.Barbeiro.toFixed(2),
    }))
  }, [txs, db.users])

  const grid = theme === 'dark' ? '#1e293b' : '#e2e8f0'
  const axis = theme === 'dark' ? '#64748b' : '#94a3b8'
  const periodLabel = { day: 'Hoje', week: 'Últimos 7 dias', month: 'Este mês' }[period]

  const buildRows = () =>
    txs
      .slice()
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .map((t) => ({
        Data: `${fmtDate(t.date)} ${fmtTime(t.date)}`,
        Barbeiro: db.users.find((u) => u.id === t.barberId)?.name || '',
        Serviço: t.serviceName,
        Categoria: t.categoryName,
        Cliente: db.clients.find((c) => c.id === t.clientId)?.name || 'Avulso',
        Pagamento: payLabel[t.paymentMethod] || t.paymentMethod,
        Valor: brl(t.price),
        'Comissão barbeiro': brl(t.barberShare),
        Barbearia: brl(t.shopShare),
      }))

  const doCSV = () => exportCSV(`faturamento-${period}.csv`, buildRows())
  const doPDF = () =>
    exportPDF({
      title: 'Relatório de Faturamento',
      shopName: db.settings?.shopName || 'Barbearia',
      period: periodLabel,
      summary: [
        { label: 'Faturamento', value: brl(m.total) },
        { label: 'Repasse barbeiros', value: brl(m.barbersRepasse) },
        { label: 'Produtos', value: brl(m.productSales) },
        { label: 'Lançamentos', value: m.count },
      ],
      rows: buildRows(),
    })

  return (
    <div>
      <PageHeader
        title="Financeiro"
        subtitle="Faturamento, categorias e formas de pagamento"
        action={
          <Segmented
            value={period}
            onChange={setPeriod}
            options={[
              { value: 'day', label: 'Dia' },
              { value: 'week', label: 'Semana' },
              { value: 'month', label: 'Mês' },
            ]}
          />
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <button className="btn-ghost" onClick={doPDF}><Icon.download size={16} /> Exportar PDF</button>
        <button className="btn-ghost" onClick={doCSV}><Icon.download size={16} /> Exportar Excel (CSV)</button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={<Icon.money />} label="Faturamento" value={brl(m.total)} tone="brand" />
        <StatCard icon={<Icon.users />} label="Repasse barbeiros" value={brl(m.barbersRepasse)} tone="violet" />
        <StatCard icon={<Icon.wallet />} label="Total barbearia" value={brl(m.shopTotal)} tone="green" />
        <StatCard icon={<Icon.tag />} label="Produtos" value={brl(m.productSales)} tone="amber" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h3 className="mb-3 font-bold">Por categoria</h3>
          {byCategory.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-400">Sem dados no período.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={byCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={2}>
                  {byCategory.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => brl(v)} contentStyle={{ borderRadius: 12, border: 'none', background: theme === 'dark' ? '#0f172a' : '#fff', fontSize: 13 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <h3 className="mb-3 font-bold">Formas de pagamento</h3>
          {byPayment.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-400">Sem dados no período.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={byPayment} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}>
                  {byPayment.map((_, i) => (
                    <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => brl(v)} contentStyle={{ borderRadius: 12, border: 'none', background: theme === 'dark' ? '#0f172a' : '#fff', fontSize: 13 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="mt-4 card">
        <h3 className="mb-3 font-bold">Divisão por barbeiro</h3>
        {byBarber.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-400">Sem dados no período.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={byBarber} margin={{ left: -12, right: 6 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
              <XAxis dataKey="name" stroke={axis} fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke={axis} fontSize={11} tickLine={false} axisLine={false}
                tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} />
              <Tooltip formatter={(v) => brl(v)} contentStyle={{ borderRadius: 12, border: 'none', background: theme === 'dark' ? '#0f172a' : '#fff', fontSize: 13 }} cursor={{ fill: theme === 'dark' ? '#1e293b55' : '#e2e8f055' }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Barbeiro" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} barSize={40} />
              <Bar dataKey="Barbearia" stackId="a" fill="#0ea5e9" radius={[8, 8, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-4 card">
        <h3 className="mb-3 font-bold">Lançamentos ({txs.length})</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-slate-400">
                <th className="pb-2 pr-4">Data</th>
                <th className="pb-2 pr-4">Barbeiro</th>
                <th className="pb-2 pr-4">Serviço</th>
                <th className="pb-2 pr-4">Cliente</th>
                <th className="pb-2 pr-4 text-right">Valor</th>
                <th className="pb-2 text-right">Barbeiro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {txs.slice().sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 40).map((t) => (
                <tr key={t.id}>
                  <td className="py-2 pr-4 text-slate-400">{fmtDate(t.date).slice(0, 5)} {fmtTime(t.date)}</td>
                  <td className="py-2 pr-4">{db.users.find((u) => u.id === t.barberId)?.name?.split(' ')[0]}</td>
                  <td className="py-2 pr-4 font-medium">{t.serviceName}</td>
                  <td className="py-2 pr-4 text-slate-400">{db.clients.find((c) => c.id === t.clientId)?.name || 'Avulso'}</td>
                  <td className="py-2 pr-4 text-right font-semibold">{brl(t.price)}</td>
                  <td className="py-2 text-right text-emerald-500">{brl(t.barberShare)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {txs.length === 0 && <p className="py-8 text-center text-sm text-slate-400">Nenhum lançamento no período.</p>}
        </div>
      </div>
    </div>
  )
}
