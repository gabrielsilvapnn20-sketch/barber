import { useMemo } from 'react'
import { useData } from '../context/DataContext.jsx'
import { PageHeader, Avatar, EmptyState } from '../components/ui.jsx'
import Icon from '../components/Icons.jsx'
import { fmtDate, fmtDateTime, serviceNamesOf } from '../lib/utils.js'

export default function Lembretes() {
  const { db } = useData()

  const now = new Date()
  const month = now.getMonth()

  // Birthdays this month
  const birthdays = useMemo(
    () =>
      db.clients
        .filter((c) => c.birthday && new Date(c.birthday).getMonth() === month)
        .sort((a, b) => new Date(a.birthday).getDate() - new Date(b.birthday).getDate()),
    [db.clients, month],
  )

  // Upcoming appointments (returns) in the next 7 days
  const upcoming = useMemo(
    () =>
      db.appointments
        .filter((a) => {
          const d = new Date(a.datetime)
          const diff = (d - now) / 86400000
          return diff >= -0.05 && diff <= 7 && a.status === 'agendado'
        })
        .sort((a, b) => new Date(a.datetime) - new Date(b.datetime)),
    [db.appointments],
  )

  // Clients who haven't visited in 30+ days (win-back)
  const inactive = useMemo(
    () =>
      db.clients
        .filter((c) => c.lastVisit && (now - new Date(c.lastVisit)) / 86400000 > 30)
        .sort((a, b) => new Date(a.lastVisit) - new Date(b.lastVisit))
        .slice(0, 10),
    [db.clients],
  )

  const wa = (phone, msg) => `https://wa.me/55${(phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`

  const isToday = (bday) => {
    const d = new Date(bday)
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth()
  }

  return (
    <div>
      <PageHeader title="Lembretes" subtitle="Aniversários, retornos e reativação de clientes" />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Birthdays */}
        <div className="card">
          <div className="mb-3 flex items-center gap-2">
            <div className="rounded-lg bg-pink-500/10 p-2 text-pink-500"><Icon.gift size={18} /></div>
            <h3 className="font-bold">Aniversários do mês</h3>
          </div>
          {birthdays.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">Nenhum aniversário este mês.</p>
          ) : (
            <div className="space-y-2">
              {birthdays.map((c) => (
                <div key={c.id} className={`flex items-center gap-3 rounded-xl p-2.5 ${isToday(c.birthday) ? 'bg-pink-500/10' : 'bg-slate-50 dark:bg-slate-800/50'}`}>
                  <Avatar name={c.name} size={34} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{c.name}</p>
                    <p className="text-xs text-slate-400">{fmtDate(c.birthday).slice(0, 5)} {isToday(c.birthday) && '🎉 hoje!'}</p>
                  </div>
                  <a href={wa(c.phone, `Olá ${c.name.split(' ')[0]}! 🎉 Feliz aniversário! Passe na barbearia para comemorar com um corte especial.`)} target="_blank" rel="noreferrer" className="rounded-lg bg-emerald-500/10 p-1.5 text-emerald-500">
                    <Icon.phone size={15} />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming returns */}
        <div className="card">
          <div className="mb-3 flex items-center gap-2">
            <div className="rounded-lg bg-brand-500/10 p-2 text-brand-500"><Icon.calendar size={18} /></div>
            <h3 className="font-bold">Retornos agendados</h3>
          </div>
          {upcoming.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">Nenhum retorno nos próximos 7 dias.</p>
          ) : (
            <div className="space-y-2">
              {upcoming.map((a) => {
                const barber = db.users.find((u) => u.id === a.barberId)
                const svcNames = serviceNamesOf(a, db.services)
                const client = db.clients.find((c) => c.id === a.clientId)
                return (
                  <div key={a.id} className="flex items-center gap-3 rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/50">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{a.clientName}</p>
                      <p className="text-xs text-slate-400">{fmtDateTime(a.datetime)}{svcNames.length ? ` · ${svcNames.join(' + ')}` : ''}</p>
                    </div>
                    <Avatar name={barber?.name} color={barber?.color} size={28} />
                    {client?.phone && (
                      <a href={wa(client.phone, `Olá ${a.clientName.split(' ')[0]}! Passando para confirmar seu horário em ${fmtDateTime(a.datetime)}. Até logo!`)} target="_blank" rel="noreferrer" className="rounded-lg bg-emerald-500/10 p-1.5 text-emerald-500">
                        <Icon.phone size={15} />
                      </a>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Win-back */}
        <div className="card">
          <div className="mb-3 flex items-center gap-2">
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-500"><Icon.bell size={18} /></div>
            <h3 className="font-bold">Reativar clientes</h3>
          </div>
          {inactive.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">Todos os clientes estão em dia. 👏</p>
          ) : (
            <div className="space-y-2">
              {inactive.map((c) => {
                const days = Math.floor((now - new Date(c.lastVisit)) / 86400000)
                return (
                  <div key={c.id} className="flex items-center gap-3 rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/50">
                    <Avatar name={c.name} size={34} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{c.name}</p>
                      <p className="text-xs text-slate-400">Sem visita há {days} dias</p>
                    </div>
                    <a href={wa(c.phone, `Olá ${c.name.split(' ')[0]}! Sentimos sua falta na barbearia. Que tal marcar um horário? 💈`)} target="_blank" rel="noreferrer" className="rounded-lg bg-emerald-500/10 p-1.5 text-emerald-500">
                      <Icon.phone size={15} />
                    </a>
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
