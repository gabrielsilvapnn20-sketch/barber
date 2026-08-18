import { useEffect, useMemo, useState } from 'react'
import { useData } from '../context/DataContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { PageHeader, Avatar, Modal, Field, EmptyState } from '../components/ui.jsx'
import Icon from '../components/Icons.jsx'
import { brl, fmtTime, isSameDay, todayISO, serviceIdsOf, serviceNamesOf } from '../lib/utils.js'

const statusStyle = {
  agendado: 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300',
  concluido: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  cancelado: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

export default function Agenda() {
  const { db, addTo, patch, remove, addTransaction, serviceById, onlyBarbers, owner } = useData()
  const { user, isOwner } = useAuth()
  const toast = useToast()
  const [date, setDate] = useState(todayISO())
  const [modal, setModal] = useState(false)
  const [barberFilter, setBarberFilter] = useState('all')

  const barbers = isOwner ? [owner, ...onlyBarbers] : [user]

  const dayAppointments = useMemo(
    () =>
      db.appointments
        .filter((a) => isSameDay(a.datetime, new Date(date + 'T12:00')) && (isOwner || a.barberId === user.id))
        .sort((a, b) => new Date(a.datetime) - new Date(b.datetime)),
    [db.appointments, date, isOwner, user.id],
  )

  const shiftDay = (delta) => {
    const d = new Date(date + 'T12:00')
    d.setDate(d.getDate() + delta)
    setDate(d.toISOString().slice(0, 10))
  }

  const setStatus = (id, status) => {
    patch('appointments', id, { status })
    toast.success('Agendamento atualizado.')
  }

  // Ao concluir, lança automaticamente cada serviço no financeiro (integra
  // agenda + "Lançar"), para os valores aparecerem na dashboard.
  const concludeAppointment = (a) => {
    if (a.txIds?.length || a.txId) {
      patch('appointments', a.id, { status: 'concluido' })
      return
    }
    const ids = serviceIdsOf(a)
    if (ids.length) {
      let total = 0
      const txIds = []
      for (const serviceId of ids) {
        const tx = addTransaction({ barberId: a.barberId, clientId: a.clientId, serviceId })
        if (tx) {
          total += tx.price
          txIds.push(tx.id)
        }
      }
      patch('appointments', a.id, { status: 'concluido', txIds })
      toast.success(`Concluído! ${ids.length} serviço(s), ${brl(total)} lançado no financeiro.`)
    } else {
      patch('appointments', a.id, { status: 'concluido' })
      toast.info('Concluído. Sem serviço vinculado — nada foi lançado.')
    }
  }

  // ---- semana do dia selecionado (strip de navegação) ----
  const selDate = new Date(date + 'T12:00')
  const weekStart = new Date(selDate)
  weekStart.setDate(selDate.getDate() - selDate.getDay())
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    return d
  })
  const dayCount = (d) =>
    db.appointments.filter(
      (a) => isSameDay(a.datetime, d) && (isOwner || a.barberId === user.id) && a.status !== 'cancelado',
    ).length
  const wd = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

  const filtered = dayAppointments.filter((a) => barberFilter === 'all' || a.barberId === barberFilter)
  const longDate = selDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })

  return (
    <div>
      <PageHeader
        title="Agenda"
        subtitle={longDate.charAt(0).toUpperCase() + longDate.slice(1)}
        action={
          <button className="btn-primary" onClick={() => setModal(true)}>
            <Icon.plus size={18} /> Agendar
          </button>
        }
      />

      {/* Navegação por semana */}
      <div className="card mb-4">
        <div className="mb-2 flex items-center justify-between">
          <button className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => shiftDay(-7)}>‹</button>
          <span className="text-sm font-semibold capitalize">
            {weekStart.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </span>
          <button className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => shiftDay(7)}>›</button>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((d) => {
            const iso = d.toISOString().slice(0, 10)
            const active = iso === date
            const today = isSameDay(d, new Date())
            const count = dayCount(d)
            return (
              <button
                key={iso}
                onClick={() => setDate(iso)}
                className={`flex flex-col items-center rounded-xl py-1.5 transition ${
                  active ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/30' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span className={`text-[10px] font-semibold uppercase ${active ? 'text-white/80' : 'text-slate-400'}`}>{wd[d.getDay()]}</span>
                <span className={`text-sm font-bold ${!active && today ? 'text-brand-500' : ''}`}>{d.getDate()}</span>
                <span className={`mt-0.5 h-1.5 w-1.5 rounded-full ${count ? (active ? 'bg-white' : 'bg-brand-500') : 'bg-transparent'}`} />
              </button>
            )
          })}
        </div>
        {date !== todayISO() && (
          <div className="mt-2 text-center">
            <button className="text-xs font-semibold text-brand-500" onClick={() => setDate(todayISO())}>Voltar para hoje</button>
          </div>
        )}
      </div>

      {/* Filtro por barbeiro (dono) */}
      {isOwner && barbers.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          <FilterChip active={barberFilter === 'all'} onClick={() => setBarberFilter('all')}>Todos</FilterChip>
          {barbers.map((b) => (
            <FilterChip key={b.id} active={barberFilter === b.id} onClick={() => setBarberFilter(b.id)}>
              <Avatar name={b.name} color={b.color} size={18} /> {b.name.split(' ')[0]}
            </FilterChip>
          ))}
        </div>
      )}

      {/* Lista de agendamentos do dia (ordenada por horário) */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Icon.calendar size={40} />}
          title="Nenhum agendamento"
          subtitle="Este dia está livre. Toque em Agendar para marcar um horário."
          action={<button className="btn-primary" onClick={() => setModal(true)}><Icon.plus size={16} /> Agendar</button>}
        />
      ) : (
        <div className="space-y-2.5">
          {filtered.map((a) => {
            const svcNames = serviceNamesOf(a, db.services)
            const barber = db.users.find((u) => u.id === a.barberId)
            const done = a.status !== 'agendado'
            return (
              <div key={a.id} className={`card !p-0 overflow-hidden ${done ? 'opacity-70' : ''}`}>
                <div className="flex">
                  {/* faixa de horário */}
                  <div className="flex w-16 shrink-0 flex-col items-center justify-center bg-brand-500/10 py-3 text-brand-600 dark:text-brand-300">
                    <span className="text-base font-extrabold leading-none">{fmtTime(a.datetime)}</span>
                  </div>
                  <div className="min-w-0 flex-1 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-bold">{a.clientName}</p>
                        <p className="truncate text-xs text-slate-400">{svcNames.length ? svcNames.join(' + ') : 'Sem serviço'}</p>
                      </div>
                      <span className={`badge shrink-0 ${statusStyle[a.status]}`}>{a.status}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      {isOwner && (
                        <span className="flex items-center gap-1.5 text-xs text-slate-400">
                          <Avatar name={barber?.name} color={barber?.color} size={18} /> {barber?.name?.split(' ')[0]}
                        </span>
                      )}
                      <div className="ml-auto flex items-center gap-1.5">
                        {a.status === 'agendado' && (
                          <>
                            <button onClick={() => concludeAppointment(a)} className="rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                              Concluir
                            </button>
                            <button onClick={() => setStatus(a.id, 'cancelado')} className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400">
                              Cancelar
                            </button>
                          </>
                        )}
                        <button onClick={() => { remove('appointments', a.id); toast.info('Agendamento removido.') }} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                          <Icon.trash size={15} />
                        </button>
                      </div>
                    </div>
                    {a.notes && <p className="mt-1.5 text-xs italic text-slate-400">{a.notes}</p>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <AppointmentModal
        open={modal}
        onClose={() => setModal(false)}
        onSave={(data) => {
          addTo('appointments', { ...data, status: 'agendado' })
          toast.success('Agendamento criado!')
          setModal(false)
        }}
        barbers={barbers}
        defaultBarber={user.id}
        db={db}
        date={date}
      />
    </div>
  )
}

function FilterChip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
        active
          ? 'border-brand-500 bg-brand-500/10 text-brand-600 dark:text-brand-300'
          : 'border-slate-200 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800'
      }`}
    >
      {children}
    </button>
  )
}

function AppointmentModal({ open, onClose, onSave, barbers, defaultBarber, db, date }) {
  const blank = () => ({
    clientName: '',
    clientId: '',
    barberId: defaultBarber,
    serviceIds: [],
    date: date,
    time: '10:00',
    notes: '',
  })
  const [form, setForm] = useState(blank)

  // Reinicia o formulário sempre que o modal abre (usa o dia selecionado).
  useEffect(() => {
    if (open) setForm(blank())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const toggleService = (id) =>
    setForm((f) => ({
      ...f,
      serviceIds: f.serviceIds.includes(id)
        ? f.serviceIds.filter((x) => x !== id)
        : [...f.serviceIds, id],
    }))

  // Sugere apenas clientes da cartela do barbeiro selecionado
  const barberClients = db.clients.filter((c) => c.barberId === form.barberId)

  // Só serviços (produtos não entram em agendamento)
  const bookableServices = db.services.filter(
    (s) => s.active && db.categories.find((c) => c.id === s.categoryId)?.type === 'service',
  )
  const total = form.serviceIds.reduce(
    (sum, id) => sum + (db.services.find((s) => s.id === id)?.price || 0),
    0,
  )

  const submit = () => {
    if (!form.clientName.trim()) return
    const datetime = new Date(`${form.date}T${form.time}`).toISOString()
    onSave({
      clientName: form.clientName.trim(),
      clientId: form.clientId || null,
      barberId: form.barberId,
      serviceIds: form.serviceIds,
      datetime,
      notes: form.notes,
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Novo agendamento"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={submit}>Agendar</button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Cliente">
          <input
            className="input"
            list="clients-list"
            value={form.clientName}
            onChange={(e) => {
              const match = barberClients.find((c) => c.name === e.target.value)
              set('clientName', e.target.value)
              set('clientId', match?.id || '')
            }}
            placeholder="Nome do cliente"
          />
          {/* Só sugere clientes da cartela do barbeiro selecionado */}
          <datalist id="clients-list">
            {barberClients.map((c) => (
              <option key={c.id} value={c.name} />
            ))}
          </datalist>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Dia">
            <input type="date" className="input" value={form.date} onChange={(e) => set('date', e.target.value)} />
          </Field>
          <Field label="Horário">
            <input type="time" className="input" value={form.time} onChange={(e) => set('time', e.target.value)} />
          </Field>
        </div>
        <Field label="Barbeiro">
          <select className="input" value={form.barberId} onChange={(e) => set('barberId', e.target.value)}>
            {barbers.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </Field>
        <Field label={`Serviços${form.serviceIds.length ? ` (${form.serviceIds.length})` : ''}`}>
          <div className="max-h-52 space-y-1.5 overflow-y-auto rounded-xl border border-slate-200 p-2 dark:border-slate-700">
            {bookableServices.map((s) => {
              const on = form.serviceIds.includes(s.id)
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleService(s.id)}
                  className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm transition ${
                    on
                      ? 'border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-300'
                      : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <span className="flex items-center gap-2 font-medium">
                    <span className={`flex h-4 w-4 items-center justify-center rounded border ${on ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-300 dark:border-slate-600'}`}>
                      {on && <Icon.check size={12} />}
                    </span>
                    {s.name}
                  </span>
                  <span className="text-slate-400">{brl(s.price)}</span>
                </button>
              )
            })}
            {bookableServices.length === 0 && (
              <p className="py-3 text-center text-xs text-slate-400">Nenhum serviço cadastrado.</p>
            )}
          </div>
          {form.serviceIds.length > 0 && (
            <p className="mt-1.5 text-right text-xs font-semibold text-slate-500 dark:text-slate-400">
              Total previsto: <span className="text-brand-500">{brl(total)}</span>
            </p>
          )}
        </Field>
        <Field label="Observações">
          <input className="input" value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Opcional" />
        </Field>
      </div>
    </Modal>
  )
}
