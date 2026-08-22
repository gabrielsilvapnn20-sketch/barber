import { useEffect, useMemo, useState } from 'react'
import { useData } from '../context/DataContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { PageHeader, Avatar, Modal, Field, EmptyState } from '../components/ui.jsx'
import Icon from '../components/Icons.jsx'
import { fmtDate, brl, pkgIsExpired } from '../lib/utils.js'

export default function Clientes() {
  const { db, addTo, patch, remove, activePackagesForClient, onlyBarbers, owner } = useData()
  const { user, isOwner } = useAuth()
  const toast = useToast()
  const [q, setQ] = useState('')
  const [modal, setModal] = useState(null) // null | 'new' | client

  const barbers = [owner, ...onlyBarbers].filter(Boolean)

  const clients = useMemo(() => {
    let list = db.clients
    if (!isOwner) list = list.filter((c) => c.barberId === user.id)
    if (q.trim()) {
      const s = q.toLowerCase()
      list = list.filter((c) => c.name.toLowerCase().includes(s) || c.phone?.includes(s))
    }
    return list.sort((a, b) => new Date(b.lastVisit || 0) - new Date(a.lastVisit || 0))
  }, [db.clients, q, isOwner, user.id])

  const save = (form) => {
    if (modal === 'new') {
      addTo('clients', { ...form, barberId: form.barberId || user.id, lastVisit: null })
      toast.success('Cliente cadastrado!')
    } else {
      patch('clients', modal.id, form)
      toast.success('Cliente atualizado.')
    }
    setModal(null)
  }

  const visitsCount = (id) => db.transactions.filter((t) => t.clientId === id).length
  const totalSpent = (id) => db.transactions.filter((t) => t.clientId === id).reduce((s, t) => s + t.price, 0)

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle="CRM — histórico e contatos"
        action={
          <button className="btn-primary" onClick={() => setModal('new')}>
            <Icon.plus size={18} /> Novo
          </button>
        }
      />

      <div className="card mb-4 flex items-center gap-2">
        <Icon.search size={18} />
        <input
          className="w-full bg-transparent text-sm outline-none"
          placeholder="Buscar por nome ou telefone..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {clients.length === 0 ? (
        <EmptyState
          icon={<Icon.users size={40} />}
          title="Nenhum cliente encontrado"
          subtitle="Cadastre seus clientes para acompanhar visitas e aniversários."
          action={<button className="btn-primary" onClick={() => setModal('new')}><Icon.plus size={16} /> Cadastrar</button>}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((c) => {
            const barber = db.users.find((u) => u.id === c.barberId)
            return (
              <div key={c.id} className="card">
                <div className="flex items-start gap-3">
                  <Avatar name={c.name} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{c.name}</p>
                    <a href={`https://wa.me/55${(c.phone || '').replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-brand-500">
                      <Icon.phone size={12} /> {c.phone || '—'}
                    </a>
                  </div>
                  <button onClick={() => setModal(c)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                    <Icon.edit size={16} />
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <Mini label="Visitas" value={visitsCount(c.id)} />
                  <Mini label="Gasto" value={brl(totalSpent(c.id)).replace('R$', '').trim()} />
                  <Mini label="Última" value={c.lastVisit ? fmtDate(c.lastVisit).slice(0, 5) : '—'} />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  {c.birthday && (
                    <span className="chip"><Icon.gift size={12} /> {fmtDate(c.birthday).slice(0, 5)}</span>
                  )}
                  {isOwner && barber && (
                    <span className="chip"><Avatar name={barber.name} color={barber.color} size={14} /> {barber.name.split(' ')[0]}</span>
                  )}
                </div>
                {c.preferences && (
                  <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-brand-500/10 p-2 text-xs text-brand-700 dark:text-brand-300">
                    <Icon.scissors size={13} className="mt-0.5 shrink-0" />
                    <span>{c.preferences}</span>
                  </p>
                )}
                {activePackagesForClient(c.id).map((pkg) => {
                  const expired = pkgIsExpired(pkg)
                  return (
                    <div key={pkg.id} className={`mt-2 rounded-lg p-2 text-xs ${expired ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300' : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'}`}>
                      <div className="mb-1 flex items-center justify-between gap-2 font-semibold">
                        <span className="flex items-center gap-1"><Icon.tag size={12} /> {pkg.name}</span>
                        <span className="text-[10px] font-medium opacity-80">
                          {pkg.mode === 'mensal' ? (expired ? `vencido ${fmtDate(pkg.expiresAt)}` : `vence ${fmtDate(pkg.expiresAt)}`) : 'sem prazo'}
                        </span>
                      </div>
                      {pkg.items.map((i) => (
                        <div key={i.serviceId} className="flex justify-between">
                          <span>{i.serviceName}</span>
                          <span>{i.qtyUsed}/{i.qtyTotal} · restam {i.qtyTotal - i.qtyUsed}</span>
                        </div>
                      ))}
                    </div>
                  )
                })}
                {c.notes && <p className="mt-2 text-xs italic text-slate-400">"{c.notes}"</p>}
              </div>
            )
          })}
        </div>
      )}

      <ClientModal
        open={!!modal}
        client={modal === 'new' ? null : modal}
        barbers={barbers}
        isOwner={isOwner}
        onClose={() => setModal(null)}
        onSave={save}
        onDelete={
          modal && modal !== 'new'
            ? () => {
                remove('clients', modal.id)
                toast.info('Cliente removido.')
                setModal(null)
              }
            : null
        }
      />
    </div>
  )
}

function Mini({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-50 py-1.5 dark:bg-slate-800/50">
      <p className="text-sm font-bold">{value}</p>
      <p className="text-[10px] uppercase text-slate-400">{label}</p>
    </div>
  )
}

function ClientModal({ open, client, onClose, onSave, onDelete, barbers, isOwner }) {
  const [form, setForm] = useState({ name: '', phone: '', birthday: '', notes: '', preferences: '', barberId: '' })
  useEffect(() => {
    if (!open) return
    if (client) setForm({ name: client.name, phone: client.phone || '', birthday: client.birthday || '', notes: client.notes || '', preferences: client.preferences || '', barberId: client.barberId || '' })
    else setForm({ name: '', phone: '', birthday: '', notes: '', preferences: '', barberId: '' })
  }, [client, open])
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={client ? 'Editar cliente' : 'Novo cliente'}
      footer={
        <>
          {onDelete && <button className="btn-danger mr-auto" onClick={onDelete}><Icon.trash size={16} /></button>}
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={() => form.name && onSave(form)}>Salvar</button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Nome"><input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Telefone"><input className="input" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="(11) 90000-0000" /></Field>
          <Field label="Aniversário"><input type="date" className="input" value={form.birthday} onChange={(e) => set('birthday', e.target.value)} /></Field>
        </div>
        {isOwner && (
          <Field label="Barbeiro responsável">
            <select className="input" value={form.barberId} onChange={(e) => set('barberId', e.target.value)}>
              <option value="">Selecione</option>
              {barbers.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </Field>
        )}
        <Field label="Preferências de corte / estilo">
          <textarea className="input" rows={2} value={form.preferences} onChange={(e) => set('preferences', e.target.value)} placeholder="Ex: máquina 2 nas laterais, tesoura em cima, risco à direita, barba na navalha" />
        </Field>
        <Field label="Observações"><textarea className="input" rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Alergias, forma de pagamento preferida, etc." /></Field>
      </div>
    </Modal>
  )
}
