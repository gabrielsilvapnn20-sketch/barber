import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { useData, barberMetrics } from '../context/DataContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import { StatCard, PageHeader, Segmented, Avatar } from '../components/ui.jsx'
import Icon from '../components/Icons.jsx'
import { brl, isSameDay, lastNDays, fmtTime, fmtDate } from '../lib/utils.js'

export default function BarberDashboard() {
  const { db } = useData()
  const { user } = useAuth()
  const { theme } = useTheme()
  const [period, setPeriod] = useState('day')

  const m = useMemo(() => barberMetrics(db, user.id, period), [db, user.id, period])
  const grid = theme === 'dark' ? '#1e293b' : '#e2e8f0'
  const axis = theme === 'dark' ? '#64748b' : '#94a3b8'

  const series = useMemo(() => {
    return lastNDays(7).map((d) => {
      const dayTx = db.transactions.filter((t) => t.barberId === user.id && isSameDay(t.date, d))
      return {
        label: d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
        Ganhos: +dayTx.reduce((s, t) => s + t.barberShare, 0).toFixed(2),
      }
    })
  }, [db.transactions, user.id])

  const myClients = useMemo(() => {
    const list = db.clients.filter((c) => c.barberId === user.id)
    return list.sort((a, b) => new Date(b.lastVisit || 0) - new Date(a.lastVisit || 0))
  }, [db.clients, user.id])

  const myAppointments = db.appointments
    .filter((a) => a.barberId === user.id && new Date(a.datetime) >= new Date(Date.now() - 86400000) && a.status !== 'cancelado')
    .sort((a, b) => new Date(a.datetime) - new Date(b.datetime))
    .slice(0, 5)

  const recentTx = m.txs.slice(0, 6)

  return (
    <div>
      <PageHeader
        title={`Olá, ${user.name.split(' ')[0]} ✂️`}
        subtitle="Seu desempenho e agenda"
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

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={<Icon.wallet />} label="Meus ganhos" value={brl(m.earnings)} hint="Já com split" tone="green" />
        <StatCard icon={<Icon.money />} label="Faturamento gerado" value={brl(m.gross)} hint="Total dos serviços" tone="brand" />
        <StatCard icon={<Icon.scissors />} label="Atendimentos" value={m.count} hint="No período" tone="violet" />
        <StatCard
          icon={<Icon.users />}
          label="Clientes"
          value={myClients.length}
          hint="Na sua carteira"
          tone="amber"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <h3 className="mb-3 font-bold">Ganhos — últimos 7 dias</h3>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={series} margin={{ left: -16, right: 6, top: 6 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
              <XAxis dataKey="label" stroke={axis} fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke={axis} fontSize={11} tickLine={false} axisLine={false} width={50}
                tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} />
              <Tooltip
                cursor={{ fill: theme === 'dark' ? '#1e293b55' : '#e2e8f055' }}
                contentStyle={{ borderRadius: 12, border: 'none', fontSize: 13, background: theme === 'dark' ? '#0f172a' : '#fff' }}
                formatter={(v) => [brl(v), 'Ganhos']}
              />
              <Bar dataKey="Ganhos" fill="#10b981" radius={[8, 8, 0, 0]} barSize={30} />
            </BarChart>
          </ResponsiveContainer>
          <Link to="/lancar" className="btn-primary mt-3 w-full">
            <Icon.plus size={18} /> Lançar atendimento
          </Link>
        </div>

        {/* Upcoming appointments */}
        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-bold">Minha agenda</h3>
            <Link to="/agenda" className="text-xs font-semibold text-brand-500">Ver tudo</Link>
          </div>
          {myAppointments.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Sem agendamentos próximos.</p>
          ) : (
            <div className="space-y-2">
              {myAppointments.map((a) => {
                const srv = db.services.find((s) => s.id === a.serviceId)
                return (
                  <div key={a.id} className="flex items-center gap-3 rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/50">
                    <div className="rounded-lg bg-brand-500/10 px-2.5 py-1 text-center text-brand-600 dark:text-brand-400">
                      <p className="text-[10px] font-semibold">{fmtDate(a.datetime).slice(0, 5)}</p>
                      <p className="text-sm font-bold">{fmtTime(a.datetime)}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{a.clientName}</p>
                      <p className="truncate text-xs text-slate-400">{srv?.name}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* Recent history */}
        <div className="card">
          <h3 className="mb-3 font-bold">Histórico recente</h3>
          {recentTx.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Nenhum atendimento no período.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentTx.map((t) => {
                const client = db.clients.find((c) => c.id === t.clientId)
                return (
                  <div key={t.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="text-sm font-semibold">{t.serviceName}</p>
                      <p className="text-xs text-slate-400">
                        {client?.name || 'Cliente avulso'} · {fmtDate(t.date)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-emerald-500">{brl(t.barberShare)}</p>
                      <p className="text-[11px] text-slate-400">de {brl(t.price)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Recurring clients (CRM) */}
        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-bold">Clientes recorrentes</h3>
            <Link to="/clientes" className="text-xs font-semibold text-brand-500">Ver CRM</Link>
          </div>
          {myClients.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Nenhum cliente ainda.</p>
          ) : (
            <div className="space-y-2">
              {myClients.slice(0, 5).map((c) => (
                <div key={c.id} className="flex items-center gap-3">
                  <Avatar name={c.name} size={34} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{c.name}</p>
                    <p className="truncate text-xs text-slate-400">{c.phone}</p>
                  </div>
                  <p className="text-xs text-slate-400">
                    {c.lastVisit ? fmtDate(c.lastVisit) : '—'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
