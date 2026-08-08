import { useState } from 'react'
import { useData } from '../context/DataContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { PageHeader, Avatar, EmptyState } from '../components/ui.jsx'
import Icon from '../components/Icons.jsx'
import { fmtTime } from '../lib/utils.js'

const statusMeta = {
  aguardando: { label: 'Aguardando', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  atendendo: { label: 'Em atendimento', cls: 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300' },
  concluido: { label: 'Concluído', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
}

export default function Fila() {
  const { db, addTo, patch, remove, onlyBarbers, owner } = useData()
  const { user, isOwner } = useAuth()
  const toast = useToast()
  const [name, setName] = useState('')
  const [barberId, setBarberId] = useState('')

  const barbers = isOwner ? [owner, ...onlyBarbers] : [user]

  const queue = db.queue
    .filter((q) => q.status !== 'concluido')
    .filter((q) => (isOwner ? true : q.barberId === user.id || !q.barberId))
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))

  const add = () => {
    if (!name.trim()) return toast.error('Informe o nome do cliente.')
    addTo('queue', {
      clientName: name.trim(),
      barberId: barberId || (isOwner ? '' : user.id),
      status: 'aguardando',
      createdAt: new Date().toISOString(),
    })
    setName('')
    setBarberId('')
    toast.success('Cliente adicionado à fila!')
  }

  const call = (q) => {
    patch('queue', q.id, { status: 'atendendo' })
    toast.info(`Chamando ${q.clientName}`)
  }
  const finish = (q) => {
    patch('queue', q.id, { status: 'concluido' })
    toast.success('Atendimento concluído.')
  }

  const waiting = queue.filter((q) => q.status === 'aguardando')
  const serving = queue.filter((q) => q.status === 'atendendo')

  return (
    <div>
      <PageHeader title="Fila de espera" subtitle="Gerencie quem chega sem agendamento" />

      {/* Add form */}
      <div className="card mb-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            className="input flex-1"
            placeholder="Nome do cliente"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
          />
          {isOwner && (
            <select className="input sm:w-56" value={barberId} onChange={(e) => setBarberId(e.target.value)}>
              <option value="">Qualquer barbeiro</option>
              {barbers.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          )}
          <button className="btn-primary" onClick={add}>
            <Icon.plus size={18} /> Adicionar
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Now serving */}
        <div className="card lg:col-span-1">
          <h3 className="mb-3 font-bold">Em atendimento</h3>
          {serving.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">Ninguém sendo atendido.</p>
          ) : (
            <div className="space-y-2">
              {serving.map((q) => {
                const b = db.users.find((u) => u.id === q.barberId)
                return (
                  <div key={q.id} className="rounded-xl border border-brand-200 bg-brand-50 p-3 dark:border-brand-800 dark:bg-brand-900/20">
                    <p className="font-bold">{q.clientName}</p>
                    <p className="text-xs text-slate-500">{b ? `com ${b.name.split(' ')[0]}` : 'sem barbeiro'}</p>
                    <button onClick={() => finish(q)} className="btn-primary mt-2 w-full !py-1.5 !text-xs">
                      <Icon.check size={15} /> Concluir
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Waiting list */}
        <div className="card lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-bold">Aguardando</h3>
            <span className="badge bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              {waiting.length} na fila
            </span>
          </div>
          {waiting.length === 0 ? (
            <EmptyState
              icon={<Icon.queue size={40} />}
              title="Fila vazia"
              subtitle="Adicione clientes que chegarem sem agendamento."
            />
          ) : (
            <div className="space-y-2">
              {waiting.map((q, i) => {
                const b = db.users.find((u) => u.id === q.barberId)
                return (
                  <div key={q.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 dark:border-slate-800">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-500 dark:bg-slate-800">
                      {i + 1}
                    </div>
                    <Avatar name={q.clientName} size={36} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{q.clientName}</p>
                      <p className="text-xs text-slate-400">
                        {b ? b.name.split(' ')[0] : 'Qualquer'} · desde {fmtTime(q.createdAt)}
                      </p>
                    </div>
                    <button onClick={() => call(q)} className="btn-primary !py-1.5 !text-xs">Chamar</button>
                    <button onClick={() => remove('queue', q.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                      <Icon.trash size={16} />
                    </button>
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
