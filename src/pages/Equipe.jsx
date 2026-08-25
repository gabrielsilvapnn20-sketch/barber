import { useEffect, useMemo, useState } from 'react'
import { useData, barberMetrics, monthKey } from '../context/DataContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { PageHeader, Avatar, Modal, Field } from '../components/ui.jsx'
import Icon from '../components/Icons.jsx'
import { brl, fmtDate, fmtDateTime, uid, colorFrom, PAY_LABEL } from '../lib/utils.js'

export default function Equipe() {
  const { db, addTo, patch, remove, setDb, onlyBarbers, owner, payCommission } = useData()
  const toast = useToast()
  const [modal, setModal] = useState(null) // null | 'new' | user
  const [manageOff, setManageOff] = useState(null) // barber for day-off
  const [settle, setSettle] = useState(null) // barber for commission settlement

  const team = [owner, ...onlyBarbers].filter(Boolean)

  const save = (form) => {
    if (modal === 'new') {
      addTo('users', {
        id: uid('usr'),
        role: 'barber',
        active: true,
        password: form.password || '123456',
        color: colorFrom(form.name),
        ...form,
      })
      toast.success('Barbeiro adicionado!')
    } else {
      patch('users', modal.id, form)
      toast.success('Dados atualizados.')
    }
    setModal(null)
  }

  return (
    <div>
      <PageHeader
        title="Equipe"
        subtitle="Barbeiros, serviços liberados e folgas"
        action={
          <button className="btn-primary" onClick={() => setModal('new')}>
            <Icon.plus size={18} /> Barbeiro
          </button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {team.map((b) => {
          const m = barberMetrics(db, b.id, 'month')
          const allowedCount = db.services.filter(
            (s) => s.allowedBarberIds.length === 0 || s.allowedBarberIds.includes(b.id),
          ).length
          const offs = db.daysOff.filter((o) => o.barberId === b.id)
          return (
            <div key={b.id} className="card">
              <div className="flex items-start gap-3">
                <Avatar name={b.name} color={b.color} size={48} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold">{b.name}</p>
                    <span className={`badge ${b.role === 'owner' ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300' : 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300'}`}>
                      {b.role === 'owner' ? 'Dono' : 'Barbeiro'}
                    </span>
                    {!b.active && <span className="badge bg-slate-200 text-slate-500 dark:bg-slate-700">Inativo</span>}
                  </div>
                  <p className="text-xs text-slate-400">{b.email}</p>
                  <p className="text-xs text-slate-400">{b.phone}</p>
                </div>
                <button onClick={() => setModal(b)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <Icon.edit size={16} />
                </button>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <Stat label="Ganhos/mês" value={brl(m.earnings)} />
                <Stat label="Atendimentos" value={m.count} />
                <Stat label="Serviços" value={allowedCount} />
              </div>

              <AccessInfo user={b} />

              {b.role === 'barber' && (
                <ServiceReleaser barberId={b.id} db={db} setDb={setDb} />
              )}

              <button
                onClick={() => setSettle(b)}
                className="mt-3 flex w-full items-center justify-between rounded-xl bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
              >
                <span className="flex items-center gap-1.5"><Icon.money size={15} /> Acerto de comissão</span>
                <span aria-hidden>›</span>
              </button>

              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                <div className="flex flex-wrap gap-1.5">
                  {offs.length === 0 ? (
                    <span className="text-xs text-slate-400">Sem folgas registradas</span>
                  ) : (
                    offs.slice(0, 3).map((o) => (
                      <span key={o.id} className="chip"><Icon.beach size={12} /> {fmtDate(o.date).slice(0, 5)}</span>
                    ))
                  )}
                </div>
                <button onClick={() => setManageOff(b)} className="text-xs font-semibold text-brand-500">
                  Gerir folgas
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <BarberModal
        open={!!modal}
        user={modal === 'new' ? null : modal}
        onClose={() => setModal(null)}
        onSave={save}
        onToggleActive={
          modal && modal !== 'new' && modal.role !== 'owner'
            ? () => {
                patch('users', modal.id, { active: !modal.active })
                toast.info(modal.active ? 'Barbeiro desativado.' : 'Barbeiro reativado.')
                setModal(null)
              }
            : null
        }
      />

      <DaysOffModal
        barber={manageOff}
        db={db}
        onClose={() => setManageOff(null)}
        onAdd={(date, reason) => {
          addTo('daysOff', { barberId: manageOff.id, date: new Date(date + 'T12:00').toISOString(), reason })
          toast.success('Folga registrada.')
        }}
        onRemove={(id) => {
          remove('daysOff', id)
          toast.info('Folga removida.')
        }}
      />

      <SettlementModal
        barber={settle}
        db={db}
        onClose={() => setSettle(null)}
        onPay={(payload) => {
          payCommission({ barberId: settle.id, ...payload })
          toast.success('Acerto registrado!')
        }}
        onRemove={(id) => {
          remove('commissionPayments', id)
          toast.info('Acerto removido.')
        }}
      />
    </div>
  )
}

// Acerto de comissão: mostra o que o barbeiro ganhou no mês, o que já foi pago
// e o saldo a pagar; permite registrar um repasse e ver o histórico.
function SettlementModal({ barber, db, onClose, onPay, onRemove }) {
  const [month, setMonth] = useState(monthKey(new Date()))
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('pix')
  const [note, setNote] = useState('')

  const stats = useMemo(() => {
    if (!barber) return { earned: 0, paid: 0 }
    const earned = db.transactions
      .filter((t) => t.barberId === barber.id && monthKey(new Date(t.date)) === month)
      .reduce((s, t) => s + (t.barberShare || 0), 0)
    const paid = (db.commissionPayments || [])
      .filter((p) => p.barberId === barber.id && p.period === month)
      .reduce((s, p) => s + (p.amount || 0), 0)
    return { earned: +earned.toFixed(2), paid: +paid.toFixed(2) }
  }, [barber, db.transactions, db.commissionPayments, month])

  const balance = +(stats.earned - stats.paid).toFixed(2)

  const history = useMemo(() => {
    if (!barber) return []
    return (db.commissionPayments || [])
      .filter((p) => p.barberId === barber.id)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [barber, db.commissionPayments])

  useEffect(() => {
    if (barber) {
      setMonth(monthKey(new Date()))
      setAmount('')
      setMethod('pix')
      setNote('')
    }
  }, [barber])

  if (!barber) return null

  const monthLabel = (mk) => {
    const [y, m] = mk.split('-')
    return new Date(+y, +m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  }
  // Últimos 12 meses como opções
  const monthOptions = []
  {
    const d = new Date()
    for (let i = 0; i < 12; i++) {
      monthOptions.push(monthKey(new Date(d.getFullYear(), d.getMonth() - i, 1)))
    }
  }

  const register = () => {
    const val = amount === '' ? balance : +amount
    if (!(val > 0)) return
    onPay({ amount: val, period: month, method, note })
    setAmount('')
    setNote('')
  }

  return (
    <Modal open={!!barber} onClose={onClose} title={`Acerto — ${barber.name.split(' ')[0]}`}>
      <div className="space-y-4">
        <Field label="Mês de referência">
          <select className="input" value={month} onChange={(e) => setMonth(e.target.value)}>
            {monthOptions.map((mk) => (
              <option key={mk} value={mk}>{monthLabel(mk)}</option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-slate-50 py-2.5 dark:bg-slate-800/50">
            <p className="text-sm font-bold">{brl(stats.earned)}</p>
            <p className="text-[10px] uppercase text-slate-400">Comissão</p>
          </div>
          <div className="rounded-xl bg-slate-50 py-2.5 dark:bg-slate-800/50">
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{brl(stats.paid)}</p>
            <p className="text-[10px] uppercase text-slate-400">Já pago</p>
          </div>
          <div className={`rounded-xl py-2.5 ${balance > 0 ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-slate-50 dark:bg-slate-800/50'}`}>
            <p className={`text-sm font-bold ${balance > 0 ? 'text-amber-600 dark:text-amber-400' : ''}`}>{brl(balance)}</p>
            <p className="text-[10px] uppercase text-slate-400">A pagar</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-100 p-3 dark:border-slate-800">
          <p className="mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">Registrar pagamento</p>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Valor">
              <input
                className="input"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(',', '.').replace(/[^\d.]/g, ''))}
                placeholder={balance > 0 ? brl(balance) : '0,00'}
              />
            </Field>
            <Field label="Forma">
              <select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
                {Object.entries(PAY_LABEL)
                  .filter(([k]) => k !== 'pacote' && k !== 'misto')
                  .map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
              </select>
            </Field>
          </div>
          <Field label="Observação (opcional)">
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: adiantamento" />
          </Field>
          <button className="btn-primary mt-2 w-full" onClick={register}>
            <Icon.check size={16} /> Registrar acerto
          </button>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">Histórico de acertos</p>
          {history.length === 0 ? (
            <p className="py-3 text-center text-sm text-slate-400">Nenhum acerto registrado.</p>
          ) : (
            <div className="space-y-1.5">
              {history.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/50">
                  <div className="min-w-0">
                    <p className="font-semibold">{brl(p.amount)} <span className="text-xs font-normal text-slate-400">· {PAY_LABEL[p.method] || p.method}</span></p>
                    <p className="text-xs text-slate-400">
                      {monthLabel(p.period)} · {fmtDateTime(new Date(p.date))}{p.note ? ` · ${p.note}` : ''}
                    </p>
                  </div>
                  <button onClick={() => onRemove(p.id)} className="text-slate-400 hover:text-red-500"><Icon.trash size={15} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

function AccessInfo({ user }) {
  const [show, setShow] = useState(false)
  return (
    <div className="mt-3 rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/50">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <Icon.user size={13} /> Acesso (login)
        </span>
        <button onClick={() => setShow((s) => !s)} className="text-xs font-semibold text-brand-500">
          {show ? 'Ocultar' : 'Mostrar'}
        </button>
      </div>
      {show && (
        <div className="mt-2 space-y-1 text-xs">
          <div className="flex justify-between gap-2">
            <span className="text-slate-400">E-mail</span>
            <span className="truncate font-mono">{user.email}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-slate-400">PIN</span>
            <span className="font-mono font-bold">{user.pin || '—'}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-slate-400">Senha</span>
            <span className="font-mono">{user.password || '—'}</span>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-50 py-2 dark:bg-slate-800/50">
      <p className="text-sm font-bold">{value}</p>
      <p className="text-[10px] uppercase text-slate-400">{label}</p>
    </div>
  )
}

function ServiceReleaser({ barberId, db, setDb }) {
  const [open, setOpen] = useState(false)
  const toggle = (serviceId) => {
    setDb((prev) => ({
      ...prev,
      services: prev.services.map((s) => {
        if (s.id !== serviceId) return s
        const isAll = s.allowedBarberIds.length === 0
        // Expand "all" into explicit list minus this barber, or toggle within list
        let allowed
        if (isAll) {
          const others = db.users.filter((u) => u.role !== 'owner').map((u) => u.id)
          allowed = others.filter((id) => id !== barberId)
        } else if (s.allowedBarberIds.includes(barberId)) {
          allowed = s.allowedBarberIds.filter((id) => id !== barberId)
        } else {
          allowed = [...s.allowedBarberIds, barberId]
        }
        return { ...s, allowedBarberIds: allowed }
      }),
    }))
  }
  const isReleased = (s) => s.allowedBarberIds.length === 0 || s.allowedBarberIds.includes(barberId)

  return (
    <div className="mt-3">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500 dark:bg-slate-800/50">
        Serviços liberados
        <span>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="mt-2 space-y-1">
          {db.services.map((s) => (
            <label key={s.id} className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <span>{s.name}</span>
              <input type="checkbox" checked={isReleased(s)} onChange={() => toggle(s.id)} className="accent-brand-500" />
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

function BarberModal({ open, user, onClose, onSave, onToggleActive }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', pin: '', password: '' })
  useEffect(() => {
    if (!open) return
    if (user) setForm({ name: user.name, email: user.email, phone: user.phone || '', pin: user.pin || '', password: '' })
    else setForm({ name: '', email: '', phone: '', pin: '', password: '' })
  }, [user, open])
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={user ? 'Editar barbeiro' : 'Novo barbeiro'}
      footer={
        <>
          {onToggleActive && (
            <button className="btn-ghost mr-auto" onClick={onToggleActive}>
              {user?.active ? 'Desativar' : 'Reativar'}
            </button>
          )}
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={() => form.name && form.email && onSave(cleanForm(form))}>Salvar</button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Nome"><input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label="E-mail"><input type="email" className="input" value={form.email} onChange={(e) => set('email', e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Telefone"><input className="input" value={form.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
          <Field label="PIN (4 díg.)"><input className="input" maxLength={4} value={form.pin} onChange={(e) => set('pin', e.target.value.replace(/\D/g, ''))} /></Field>
        </div>
        <Field label={user ? 'Nova senha (opcional)' : 'Senha'}>
          <input type="password" className="input" value={form.password} onChange={(e) => set('password', e.target.value)} placeholder={user ? 'Deixe em branco para manter' : '123456'} />
        </Field>
      </div>
    </Modal>
  )
}

function cleanForm(form) {
  const out = { ...form }
  if (!out.password) delete out.password
  return out
}

function DaysOffModal({ barber, db, onClose, onAdd, onRemove }) {
  const [date, setDate] = useState('')
  const [reason, setReason] = useState('')
  if (!barber) return null
  const offs = db.daysOff.filter((o) => o.barberId === barber.id).sort((a, b) => new Date(b.date) - new Date(a.date))

  return (
    <Modal open={!!barber} onClose={onClose} title={`Folgas — ${barber.name.split(' ')[0]}`}>
      <div className="space-y-3">
        <div className="flex gap-2">
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          <input className="input" placeholder="Motivo" value={reason} onChange={(e) => setReason(e.target.value)} />
          <button className="btn-primary !px-3" onClick={() => { if (date) { onAdd(date, reason); setDate(''); setReason('') } }}>
            <Icon.plus size={16} />
          </button>
        </div>
        <div className="space-y-1.5">
          {offs.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-400">Nenhuma folga registrada.</p>
          ) : (
            offs.map((o) => (
              <div key={o.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/50">
                <span><Icon.beach size={14} className="mr-1 inline" /> {fmtDate(o.date)} {o.reason && <span className="text-slate-400">· {o.reason}</span>}</span>
                <button onClick={() => onRemove(o.id)} className="text-slate-400 hover:text-red-500"><Icon.trash size={15} /></button>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  )
}
