import { useEffect, useMemo, useState } from 'react'
import { useData } from '../context/DataContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { PageHeader, Avatar, Modal, Field, EmptyState } from '../components/ui.jsx'
import Icon from '../components/Icons.jsx'
import { brl, fmtTime, isSameDay, todayISO } from '../lib/utils.js'

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

  // Ao concluir, lança automaticamente o serviço no financeiro (integra
  // agenda + "Lançar"), para o valor aparecer na dashboard.
  const concludeAppointment = (a) => {
    if (a.txId) {
      patch('appointments', a.id, { status: 'concluido' })
      return
    }
    if (a.serviceId) {
      const tx = addTransaction({ barberId: a.barberId, clientId: a.clientId, serviceId: a.serviceId })
      patch('appointments', a.id, { status: 'concluido', txId: tx?.id })
      toast.success(`Concluído! ${brl(tx?.price || 0)} lançado no financeiro.`)
    } else {
      patch('appointments', a.id, { status: 'concluido' })
      toast.info('Concluído. Sem serviço vinculado — nada foi lançado.')
    }
  }

  return (
    <div>
      <PageHeader
        title="Agenda"
        subtitle="Agendamentos por barbeiro"
        action={
          <button className="btn-primary" onClick={() => setModal(true)}>
            <Icon.plus size={18} /> Agendar
          </button>
        }
      />

      {/* Date nav */}
      <div className="card mb-4 flex items-center justify-between">
        <button className="btn-ghost !px-3" onClick={() => shiftDay(-1)}>‹</button>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input !w-auto"
          />
          <button className="btn-ghost !py-2 !text-xs" onClick={() => setDate(todayISO())}>Hoje</button>
        </div>
        <button className="btn-ghost !px-3" onClick={() => shiftDay(1)}>›</button>
      </div>

      {/* Columns by barber — rolagem horizontal no mobile, grade no desktop */}
      <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 lg:mx-0 lg:grid lg:snap-none lg:overflow-visible lg:px-0 lg:pb-0 lg:[grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
        {barbers.map((b) => {
          const list = dayAppointments.filter((a) => a.barberId === b.id)
          return (
            <div key={b.id} className="card w-[82vw] max-w-[320px] shrink-0 snap-start lg:w-auto lg:max-w-none">
              <div className="mb-3 flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
                <Avatar name={b.name} color={b.color} size={34} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{b.name.split(' ')[0]}</p>
                  <p className="truncate text-xs text-slate-400">{list.length} agendamento(s)</p>
                </div>
              </div>
              {list.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-400">Livre neste dia</p>
              ) : (
                <div className="space-y-2">
                  {list.map((a) => {
                    const srv = db.services.find((s) => s.id === a.serviceId)
                    return (
                      <div key={a.id} className="rounded-xl border border-slate-100 p-2.5 dark:border-slate-800">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-brand-500">{fmtTime(a.datetime)}</span>
                          <span className={`badge ${statusStyle[a.status]}`}>{a.status}</span>
                        </div>
                        <p className="mt-1 text-sm font-semibold">{a.clientName}</p>
                        <p className="text-xs text-slate-400">{srv?.name}</p>
                        {a.notes && <p className="mt-1 text-xs italic text-slate-400">{a.notes}</p>}
                        <div className="mt-2 flex gap-1.5">
                          {a.status === 'agendado' && (
                            <>
                              <button onClick={() => concludeAppointment(a)} className="flex-1 rounded-lg bg-emerald-500/10 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                Concluir
                              </button>
                              <button onClick={() => setStatus(a.id, 'cancelado')} className="flex-1 rounded-lg bg-red-500/10 py-1 text-xs font-semibold text-red-600 dark:text-red-400">
                                Cancelar
                              </button>
                            </>
                          )}
                          <button onClick={() => { remove('appointments', a.id); toast.info('Agendamento removido.') }} className="rounded-lg bg-slate-100 px-2 py-1 text-slate-500 dark:bg-slate-800">
                            <Icon.trash size={14} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

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

function AppointmentModal({ open, onClose, onSave, barbers, defaultBarber, db, date }) {
  const blank = () => ({
    clientName: '',
    clientId: '',
    barberId: defaultBarber,
    serviceId: '',
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

  const submit = () => {
    if (!form.clientName.trim()) return
    const datetime = new Date(`${form.date}T${form.time}`).toISOString()
    onSave({
      clientName: form.clientName.trim(),
      clientId: form.clientId || null,
      barberId: form.barberId,
      serviceId: form.serviceId,
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
              const match = db.clients.find((c) => c.name === e.target.value)
              set('clientName', e.target.value)
              set('clientId', match?.id || '')
            }}
            placeholder="Nome do cliente"
          />
          <datalist id="clients-list">
            {db.clients.map((c) => (
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
        <Field label="Serviço">
          <select className="input" value={form.serviceId} onChange={(e) => set('serviceId', e.target.value)}>
            <option value="">Selecione</option>
            {db.services.filter((s) => s.active).map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Observações">
          <input className="input" value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Opcional" />
        </Field>
      </div>
    </Modal>
  )
}
