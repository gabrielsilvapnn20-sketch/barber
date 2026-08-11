import { useEffect, useMemo, useState } from 'react'
import { useData, ownerMetrics } from '../context/DataContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { PageHeader, Progress, Modal, Field, EmptyState } from '../components/ui.jsx'
import Icon from '../components/Icons.jsx'
import { brl, monthKey, isSameMonth } from '../lib/utils.js'

export default function Metas() {
  const { db, addTo, patch, remove } = useData()
  const toast = useToast()
  const [modal, setModal] = useState(null)

  const monthRevenue = ownerMetrics(db, 'month').total
  const goals = db.goals.slice().sort((a, b) => b.monthKey.localeCompare(a.monthKey))

  const monthLabel = (mk) => {
    const [y, m] = mk.split('-')
    return new Date(y, m - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  }

  const revenueForMonth = (mk) =>
    db.transactions
      .filter((t) => {
        const d = new Date(t.date)
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === mk
      })
      .reduce((s, t) => s + t.price, 0)

  const save = (form) => {
    const existing = db.goals.find((g) => g.monthKey === form.monthKey)
    if (modal === 'new' && existing) {
      patch('goals', existing.id, { target: Number(form.target), label: form.label })
    } else if (modal === 'new') {
      addTo('goals', { monthKey: form.monthKey, target: Number(form.target), label: form.label })
    } else {
      patch('goals', modal.id, { target: Number(form.target), label: form.label })
    }
    toast.success('Meta salva!')
    setModal(null)
  }

  return (
    <div>
      <PageHeader
        title="Metas"
        subtitle="Defina e acompanhe metas mensais"
        action={<button className="btn-primary" onClick={() => setModal('new')}><Icon.plus size={18} /> Nova meta</button>}
      />

      {goals.length === 0 ? (
        <EmptyState icon={<Icon.target size={40} />} title="Nenhuma meta definida"
          subtitle="Crie metas de faturamento para motivar a equipe."
          action={<button className="btn-primary" onClick={() => setModal('new')}><Icon.plus size={16} /> Criar meta</button>} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {goals.map((g) => {
            const rev = g.monthKey === monthKey() ? monthRevenue : revenueForMonth(g.monthKey)
            const p = Math.round((rev / g.target) * 100)
            const isCurrent = g.monthKey === monthKey()
            return (
              <div key={g.id} className="card">
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <p className="font-bold capitalize">{monthLabel(g.monthKey)}</p>
                    <p className="text-xs text-slate-400">{g.label || 'Meta de faturamento'}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {isCurrent && <span className="badge bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">Atual</span>}
                    <button onClick={() => setModal(g)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><Icon.edit size={15} /></button>
                    <button onClick={() => { remove('goals', g.id); toast.info('Meta removida.') }} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><Icon.trash size={15} /></button>
                  </div>
                </div>
                <div className="mb-2 flex items-end justify-between">
                  <span className="text-2xl font-extrabold">{brl(rev)}</span>
                  <span className="text-sm text-slate-400">de {brl(g.target)}</span>
                </div>
                <Progress value={rev} max={g.target} tone={p >= 100 ? 'bg-emerald-500' : 'bg-brand-500'} />
                <p className={`mt-2 text-sm font-semibold ${p >= 100 ? 'text-emerald-500' : 'text-brand-500'}`}>
                  {p >= 100 ? '🎉 Meta atingida!' : `${p}% concluído · faltam ${brl(Math.max(0, g.target - rev))}`}
                </p>
              </div>
            )
          })}
        </div>
      )}

      <GoalModal open={!!modal} goal={modal === 'new' ? null : modal} onClose={() => setModal(null)} onSave={save} />
    </div>
  )
}

function GoalModal({ open, goal, onClose, onSave }) {
  const [form, setForm] = useState({ monthKey: monthKey(), target: '', label: '' })
  useEffect(() => {
    if (!open) return
    if (goal) setForm({ monthKey: goal.monthKey, target: goal.target, label: goal.label || '' })
    else setForm({ monthKey: monthKey(), target: '', label: 'Meta de faturamento' })
  }, [goal, open])
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <Modal open={open} onClose={onClose} title={goal ? 'Editar meta' : 'Nova meta'}
      footer={<><button className="btn-ghost" onClick={onClose}>Cancelar</button><button className="btn-primary" onClick={() => form.target && onSave(form)}>Salvar</button></>}>
      <div className="space-y-3">
        <Field label="Mês"><input type="month" className="input" value={form.monthKey} onChange={(e) => set('monthKey', e.target.value)} disabled={!!goal} /></Field>
        <Field label="Valor da meta (R$)"><input type="number" className="input" value={form.target} onChange={(e) => set('target', e.target.value)} placeholder="15000" /></Field>
        <Field label="Descrição"><input className="input" value={form.label} onChange={(e) => set('label', e.target.value)} placeholder="Meta de faturamento" /></Field>
      </div>
    </Modal>
  )
}
