import { useMemo, useState } from 'react'
import { useData } from '../context/DataContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { PageHeader, Modal, Field, StatCard, EmptyState } from '../components/ui.jsx'
import Icon from '../components/Icons.jsx'
import { brl, fmtDate, isSameMonth } from '../lib/utils.js'
import { exportCSV } from '../lib/reports.js'

const CATS = ['Fixo', 'Utilidades', 'Estoque', 'Salários', 'Marketing', 'Manutenção', 'Outros']

export default function Despesas() {
  const { db, addTo, patch, remove } = useData()
  const toast = useToast()
  const [modal, setModal] = useState(null)

  const monthExpenses = useMemo(
    () => db.expenses.filter((e) => isSameMonth(e.date)).sort((a, b) => new Date(b.date) - new Date(a.date)),
    [db.expenses],
  )
  const total = monthExpenses.reduce((s, e) => s + e.amount, 0)
  const byCat = useMemo(() => {
    const map = {}
    for (const e of monthExpenses) map[e.category] = (map[e.category] || 0) + e.amount
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [monthExpenses])

  const save = (form) => {
    const payload = { ...form, amount: Number(form.amount), date: new Date(form.date + 'T12:00').toISOString() }
    if (modal === 'new') { addTo('expenses', payload); toast.success('Despesa registrada.') }
    else { patch('expenses', modal.id, payload); toast.success('Despesa atualizada.') }
    setModal(null)
  }

  return (
    <div>
      <PageHeader
        title="Despesas"
        subtitle="Custos da barbearia neste mês"
        action={
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={() => exportCSV('despesas.csv', monthExpenses.map((e) => ({ Descrição: e.description, Categoria: e.category, Valor: brl(e.amount), Data: fmtDate(e.date) })))}>
              <Icon.download size={16} />
            </button>
            <button className="btn-primary" onClick={() => setModal('new')}><Icon.plus size={18} /> Nova</button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={<Icon.wallet />} label="Total do mês" value={brl(total)} tone="red" />
        {byCat.slice(0, 3).map(([cat, val]) => (
          <StatCard key={cat} icon={<Icon.tag />} label={cat} value={brl(val)} tone="amber" />
        ))}
      </div>

      <div className="mt-4 card">
        {monthExpenses.length === 0 ? (
          <EmptyState icon={<Icon.wallet size={40} />} title="Sem despesas" subtitle="Registre aluguel, contas e reposições." />
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {monthExpenses.map((e) => (
              <div key={e.id} className="flex items-center gap-3 py-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
                  <Icon.wallet size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{e.description}</p>
                  <p className="text-xs text-slate-400">{e.category} · {fmtDate(e.date)}</p>
                </div>
                <p className="font-bold text-red-500">- {brl(e.amount)}</p>
                <button onClick={() => setModal(e)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><Icon.edit size={16} /></button>
                <button onClick={() => { remove('expenses', e.id); toast.info('Despesa removida.') }} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><Icon.trash size={16} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      <ExpenseModal open={!!modal} expense={modal === 'new' ? null : modal} onClose={() => setModal(null)} onSave={save} />
    </div>
  )
}

function ExpenseModal({ open, expense, onClose, onSave }) {
  const [form, setForm] = useState({ description: '', category: 'Fixo', amount: '', date: new Date().toISOString().slice(0, 10) })
  useMemo(() => {
    if (expense) setForm({ description: expense.description, category: expense.category, amount: expense.amount, date: expense.date.slice(0, 10) })
    else setForm({ description: '', category: 'Fixo', amount: '', date: new Date().toISOString().slice(0, 10) })
  }, [expense, open])
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <Modal open={open} onClose={onClose} title={expense ? 'Editar despesa' : 'Nova despesa'}
      footer={<><button className="btn-ghost" onClick={onClose}>Cancelar</button><button className="btn-primary" onClick={() => form.description && form.amount && onSave(form)}>Salvar</button></>}>
      <div className="space-y-3">
        <Field label="Descrição"><input className="input" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Ex: Aluguel" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Categoria">
            <select className="input" value={form.category} onChange={(e) => set('category', e.target.value)}>
              {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Valor (R$)"><input type="number" step="0.01" className="input" value={form.amount} onChange={(e) => set('amount', e.target.value)} /></Field>
        </div>
        <Field label="Data"><input type="date" className="input" value={form.date} onChange={(e) => set('date', e.target.value)} /></Field>
      </div>
    </Modal>
  )
}
