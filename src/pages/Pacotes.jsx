import { useMemo, useState } from 'react'
import { useData } from '../context/DataContext.jsx'
import { PageHeader, Avatar, Progress, EmptyState } from '../components/ui.jsx'
import Icon from '../components/Icons.jsx'
import { brl, fmtDate, pkgIsExpired, pkgRemaining, pkgTotalQty } from '../lib/utils.js'

const FILTERS = [
  { id: 'ativos', label: 'Ativos' },
  { id: 'expirando', label: 'Expirando' },
  { id: 'concluidos', label: 'Concluídos/expirados' },
  { id: 'todos', label: 'Todos' },
]

// Dias restantes até expirar (null se não tem prazo)
function daysLeft(pkg) {
  if (!pkg?.expiresAt) return null
  return Math.ceil((new Date(pkg.expiresAt) - new Date()) / (1000 * 60 * 60 * 24))
}

export default function Pacotes() {
  const { db, userById, clientById } = useData()
  const [filter, setFilter] = useState('ativos')
  const [q, setQ] = useState('')

  const packages = db.packages || []

  const list = useMemo(() => {
    const term = q.trim().toLowerCase()
    return packages
      .filter((p) => {
        const remaining = pkgRemaining(p)
        const expired = pkgIsExpired(p)
        const dl = daysLeft(p)
        if (filter === 'ativos') return remaining > 0 && !expired
        if (filter === 'expirando') return remaining > 0 && !expired && dl != null && dl <= 7
        if (filter === 'concluidos') return remaining <= 0 || expired
        return true
      })
      .filter((p) => {
        if (!term) return true
        const client = clientById(p.clientId)
        return (
          (client?.name || '').toLowerCase().includes(term) ||
          (p.name || '').toLowerCase().includes(term)
        )
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }, [packages, filter, q, clientById])

  // Resumo geral
  const stats = useMemo(() => {
    const ativos = packages.filter((p) => pkgRemaining(p) > 0 && !pkgIsExpired(p))
    const expirando = ativos.filter((p) => {
      const dl = daysLeft(p)
      return dl != null && dl <= 7
    })
    const receita = packages.reduce((s, p) => s + (p.total || 0), 0)
    const servicosRestantes = ativos.reduce((s, p) => s + pkgRemaining(p), 0)
    return { ativos: ativos.length, expirando: expirando.length, receita, servicosRestantes }
  }, [packages])

  return (
    <div>
      <PageHeader title="Pacotes & Combos" subtitle="Controle dos pacotes vendidos e saldos dos clientes" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MiniStat label="Pacotes ativos" value={stats.ativos} tone="brand" />
        <MiniStat label="Expirando (7 dias)" value={stats.expirando} tone="amber" />
        <MiniStat label="Serviços a usar" value={stats.servicosRestantes} tone="violet" />
        <MiniStat label="Receita em pacotes" value={brl(stats.receita)} tone="green" />
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                filter === f.id
                  ? 'bg-brand-500 text-white'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative sm:w-64">
          <Icon.search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input !pl-9"
            placeholder="Buscar cliente ou pacote…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {list.length === 0 ? (
          <div className="lg:col-span-2">
            <EmptyState icon={<Icon.tag size={40} />} title="Nenhum pacote" subtitle="Os pacotes vendidos aparecerão aqui." />
          </div>
        ) : (
          list.map((p) => {
            const client = clientById(p.clientId)
            const seller = userById(p.soldBy)
            const total = pkgTotalQty(p)
            const remaining = pkgRemaining(p)
            const used = total - remaining
            const expired = pkgIsExpired(p)
            const dl = daysLeft(p)
            const done = remaining <= 0
            return (
              <div key={p.id} className="card">
                <div className="flex items-start gap-3">
                  <Avatar name={client?.name || 'Cliente'} color={client?.color} size={42} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-bold">{client?.name || 'Cliente'}</p>
                      {done ? (
                        <span className="badge bg-slate-200 text-slate-500 dark:bg-slate-700">Concluído</span>
                      ) : expired ? (
                        <span className="badge bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">Expirado</span>
                      ) : dl != null && dl <= 7 ? (
                        <span className="badge bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                          {dl <= 0 ? 'Vence hoje' : `Vence em ${dl}d`}
                        </span>
                      ) : (
                        <span className="badge bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">Ativo</span>
                      )}
                    </div>
                    <p className="truncate text-sm text-slate-500 dark:text-slate-400">{p.name}</p>
                    <p className="text-xs text-slate-400">
                      {brl(p.total)} · {p.mode === 'mensal' ? 'Mensal' : 'Livre'} · vendido {fmtDate(p.createdAt)}
                      {seller ? ` por ${seller.name.split(' ')[0]}` : ''}
                    </p>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
                    <span>{used}/{total} usados</span>
                    <span className="font-semibold text-slate-600 dark:text-slate-300">Restam {remaining}</span>
                  </div>
                  <Progress value={used} max={total} />
                </div>

                <div className="mt-3 space-y-1">
                  {p.items.map((it) => {
                    const r = it.qtyTotal - it.qtyUsed
                    return (
                      <div key={it.serviceId} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5 text-sm dark:bg-slate-800/50">
                        <span>{it.serviceName}</span>
                        <span className={`font-semibold ${r > 0 ? '' : 'text-slate-400'}`}>{r} de {it.qtyTotal}</span>
                      </div>
                    )
                  })}
                </div>

                {p.expiresAt && (
                  <p className="mt-2 text-xs text-slate-400">
                    <Icon.clock size={12} className="mr-1 inline" />
                    Validade: {fmtDate(p.expiresAt)}
                  </p>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

function MiniStat({ label, value, tone }) {
  const tones = {
    brand: 'text-brand-600 dark:text-brand-300',
    amber: 'text-amber-600 dark:text-amber-400',
    violet: 'text-violet-600 dark:text-violet-400',
    green: 'text-emerald-600 dark:text-emerald-400',
  }
  return (
    <div className="card !p-3 text-center">
      <p className={`text-lg font-extrabold ${tones[tone] || ''}`}>{value}</p>
      <p className="text-[10px] uppercase text-slate-400">{label}</p>
    </div>
  )
}
