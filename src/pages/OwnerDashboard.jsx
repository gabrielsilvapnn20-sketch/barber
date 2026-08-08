import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
} from 'recharts'
import { useData, ownerMetrics, rankingThisMonth, txInPeriod } from '../context/DataContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import { StatCard, PageHeader, Segmented, Avatar, Progress } from '../components/ui.jsx'
import Icon from '../components/Icons.jsx'
import { brl, isSameDay, lastNDays, fmtTime, monthKey, weekdayName } from '../lib/utils.js'

export default function OwnerDashboard() {
  const { db, owner } = useData()
  const { theme } = useTheme()
  const [period, setPeriod] = useState('month')

  const m = useMemo(() => ownerMetrics(db, period), [db, period])
  const ranking = useMemo(() => rankingThisMonth(db), [db])

  const grid = theme === 'dark' ? '#1e293b' : '#e2e8f0'
  const axis = theme === 'dark' ? '#64748b' : '#94a3b8'

  // Revenue over last 14 days
  const revenueSeries = useMemo(() => {
    return lastNDays(14).map((d) => {
      const dayTx = db.transactions.filter((t) => isSameDay(t.date, d))
      return {
        label: `${d.getDate()}/${d.getMonth() + 1}`,
        Faturamento: dayTx.reduce((s, t) => s + t.price, 0),
      }
    })
  }, [db.transactions])

  // Today agenda by barber
  const todayAppointments = db.appointments
    .filter((a) => isSameDay(a.datetime, new Date()) && a.status !== 'cancelado')
    .sort((a, b) => new Date(a.datetime) - new Date(b.datetime))

  const goal = db.goals.find((g) => g.monthKey === monthKey())
  const monthRevenue = ownerMetrics(db, 'month').total
  const monthExpenses = db.expenses
    .filter((e) => new Date(e.date).getMonth() === new Date().getMonth())
    .reduce((s, e) => s + e.amount, 0)

  const rankColors = ['#0ea5e9', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444']

  return (
    <div>
      <PageHeader
        title={`Olá, ${owner?.name?.split(' ')[0]} 👋`}
        subtitle="Visão geral da sua barbearia"
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

      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={<Icon.money />}
          label="Faturamento total"
          value={brl(m.total)}
          hint={`${m.count} lançamentos`}
          tone="brand"
        />
        <StatCard
          icon={<Icon.scissors />}
          label="Seus ganhos"
          value={brl(m.ownerPersonal)}
          hint="Cortes que você fez"
          tone="green"
        />
        <StatCard
          icon={<Icon.users />}
          label="Repasse barbeiros"
          value={brl(m.barbersRepasse)}
          hint="Parte da barbearia"
          tone="violet"
        />
        <StatCard
          icon={<Icon.tag />}
          label="Vendas de produtos"
          value={brl(m.productSales)}
          hint="No período"
          tone="amber"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {/* Revenue chart */}
        <div className="card lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-bold">Faturamento — últimos 14 dias</h3>
            <Icon.chart size={18} />
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={revenueSeries} margin={{ left: -18, right: 6, top: 6 }}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
              <XAxis dataKey="label" stroke={axis} fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke={axis} fontSize={11} tickLine={false} axisLine={false} width={54}
                tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: 'none',
                  background: theme === 'dark' ? '#0f172a' : '#fff',
                  boxShadow: '0 8px 24px rgba(0,0,0,.12)',
                  fontSize: 13,
                }}
                formatter={(v) => [brl(v), 'Faturamento']}
              />
              <Area type="monotone" dataKey="Faturamento" stroke="#0ea5e9" strokeWidth={2.5} fill="url(#rev)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly goal */}
        <div className="card flex flex-col">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-bold">Meta do mês</h3>
            <Link to="/metas" className="text-xs font-semibold text-brand-500">
              Editar
            </Link>
          </div>
          {goal ? (
            <div className="flex flex-1 flex-col justify-center gap-3">
              <div className="text-center">
                <p className="text-3xl font-extrabold">{brl(monthRevenue)}</p>
                <p className="text-sm text-slate-400">de {brl(goal.target)}</p>
              </div>
              <Progress value={monthRevenue} max={goal.target} />
              <p className="text-center text-sm font-semibold text-brand-500">
                {Math.round((monthRevenue / goal.target) * 100)}% da meta
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-center text-xs">
                <div className="rounded-xl bg-slate-100 p-2 dark:bg-slate-800">
                  <p className="text-slate-400">Despesas</p>
                  <p className="font-bold text-red-500">{brl(monthExpenses)}</p>
                </div>
                <div className="rounded-xl bg-slate-100 p-2 dark:bg-slate-800">
                  <p className="text-slate-400">Lucro estim.</p>
                  <p className="font-bold text-emerald-500">{brl(m.shopTotal - monthExpenses)}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
              <Link to="/metas" className="btn-primary">
                <Icon.plus size={16} /> Definir meta
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* Ranking */}
        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-bold">Ranking do mês</h3>
            <Link to="/equipe" className="text-xs font-semibold text-brand-500">
              Ver equipe
            </Link>
          </div>
          {ranking.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Sem lançamentos neste mês.</p>
          ) : (
            <div className="space-y-3">
              <ResponsiveContainer width="100%" height={Math.max(120, ranking.length * 46)}>
                <BarChart data={ranking.map((r) => ({ name: r.user?.name?.split(' ')[0], v: r.gross }))} layout="vertical" margin={{ left: 0, right: 16 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={70} tickLine={false} axisLine={false}
                    stroke={axis} fontSize={12} />
                  <Tooltip
                    cursor={{ fill: theme === 'dark' ? '#1e293b55' : '#e2e8f055' }}
                    contentStyle={{ borderRadius: 12, border: 'none', fontSize: 13, background: theme === 'dark' ? '#0f172a' : '#fff' }}
                    formatter={(v) => [brl(v), 'Faturou']}
                  />
                  <Bar dataKey="v" radius={[0, 8, 8, 0]} barSize={22}>
                    {ranking.map((_, i) => (
                      <Cell key={i} fill={rankColors[i % rankColors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {ranking.map((r, i) => (
                  <div key={r.barberId} className="flex items-center gap-3">
                    <span className="w-5 text-center text-sm font-bold text-slate-400">{i + 1}º</span>
                    <Avatar name={r.user?.name} color={r.user?.color} size={34} />
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{r.user?.name}</p>
                      <p className="text-xs text-slate-400">{r.count} atendimentos</p>
                    </div>
                    <p className="text-sm font-bold">{brl(r.gross)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Today agenda */}
        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-bold">Agenda de hoje</h3>
            <Link to="/agenda" className="text-xs font-semibold text-brand-500">
              Ver agenda
            </Link>
          </div>
          {todayAppointments.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Nenhum agendamento para hoje.</p>
          ) : (
            <div className="space-y-2">
              {todayAppointments.map((a) => {
                const barber = db.users.find((u) => u.id === a.barberId)
                const srv = db.services.find((s) => s.id === a.serviceId)
                return (
                  <div key={a.id} className="flex items-center gap-3 rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/50">
                    <div className="flex flex-col items-center rounded-lg bg-brand-500/10 px-2.5 py-1 text-brand-600 dark:text-brand-400">
                      <span className="text-sm font-bold">{fmtTime(a.datetime)}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{a.clientName}</p>
                      <p className="truncate text-xs text-slate-400">{srv?.name}</p>
                    </div>
                    <Avatar name={barber?.name} color={barber?.color} size={30} />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
