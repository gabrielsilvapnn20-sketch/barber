import { useMemo, useState, useEffect } from 'react'
import { useData } from '../context/DataContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { PageHeader, Avatar, Modal, Field, EmptyState } from '../components/ui.jsx'
import Icon from '../components/Icons.jsx'
import {
  brl,
  fmtDate,
  fmtTime,
  monthKey,
  prevMonthKey,
  monthKeyLabel,
} from '../lib/utils.js'
import { exportPDF, shareWhatsApp } from '../lib/reports.js'

// Uma transação "entra" no convênio quando foi paga como convênio.
const isConvenioTx = (t) =>
  t.paymentMethod === 'convenio' || (t.payments || []).some((p) => p.method === 'convenio')

export default function Convenios() {
  const { db, addTo, patch, remove } = useData()
  const toast = useToast()
  const [selected, setSelected] = useState(null) // convenio being viewed
  const [modal, setModal] = useState(null) // null | 'new' | convenio

  const convenios = db.convenios || []

  const clientCount = (convId) => db.clients.filter((c) => c.convenioId === convId).length

  const saveConvenio = (form) => {
    if (modal === 'new') {
      addTo('convenios', { ...form, active: true, lastClosedCycle: null, createdAt: new Date().toISOString() })
      toast.success('Convênio cadastrado!')
    } else {
      patch('convenios', modal.id, form)
      toast.success('Convênio atualizado.')
    }
    setModal(null)
  }

  // Se um convênio está selecionado, mostra seu relatório
  const conv = selected ? convenios.find((c) => c.id === selected) : null
  if (conv) {
    return (
      <ConvenioReport
        conv={conv}
        db={db}
        onBack={() => setSelected(null)}
        onEdit={() => setModal(conv)}
        onClose={(cycle) => {
          patch('convenios', conv.id, { lastClosedCycle: cycle })
          toast.success('Mês marcado como fechado.')
        }}
        modalNode={
          <ConvenioModal
            open={!!modal && modal !== 'new'}
            convenio={modal === 'new' ? null : modal}
            onClose={() => setModal(null)}
            onSave={saveConvenio}
            onDelete={null}
          />
        }
      />
    )
  }

  return (
    <div>
      <PageHeader
        title="Convênios"
        subtitle="Empresas que pagam pelos atendimentos dos funcionários"
        action={
          <button className="btn-primary" onClick={() => setModal('new')}>
            <Icon.plus size={18} /> Empresa
          </button>
        }
      />

      {convenios.length === 0 ? (
        <EmptyState
          icon={<Icon.tag size={40} />}
          title="Nenhum convênio cadastrado"
          subtitle="Cadastre a empresa (ex.: Pontal Drogas) para faturar os atendimentos dos funcionários e gerar o relatório mensal."
          action={<button className="btn-primary" onClick={() => setModal('new')}><Icon.plus size={16} /> Cadastrar empresa</button>}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {convenios.map((c) => {
            const cycle = monthKey()
            const closed = c.lastClosedCycle === prevMonthKey()
            return (
              <div key={c.id} className="card">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
                    <Icon.tag size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-bold">{c.name}</p>
                      {c.active === false && <span className="badge bg-slate-200 text-slate-500 dark:bg-slate-700">Inativo</span>}
                    </div>
                    <p className="text-xs text-slate-400">{c.contact || 'Sem contato'}</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Fecha dia {c.closingDay || 5} · {clientCount(c.id)} funcionário(s)
                    </p>
                  </div>
                  <button onClick={() => setModal(c)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                    <Icon.edit size={16} />
                  </button>
                </div>
                <button className="btn-primary mt-3 w-full" onClick={() => setSelected(c.id)}>
                  <Icon.money size={16} /> Ver relatório
                </button>
              </div>
            )
          })}
        </div>
      )}

      <ConvenioModal
        open={!!modal}
        convenio={modal === 'new' ? null : modal}
        onClose={() => setModal(null)}
        onSave={saveConvenio}
        onDelete={
          modal && modal !== 'new'
            ? () => {
                if (!confirm('Excluir esta empresa de convênio? Os clientes vinculados perdem o vínculo.')) return
                // desvincula clientes
                db.clients
                  .filter((c) => c.convenioId === modal.id)
                  .forEach((c) => patch('clients', c.id, { convenioId: '' }))
                remove('convenios', modal.id)
                toast.info('Convênio removido.')
                setModal(null)
              }
            : null
        }
      />
    </div>
  )
}

// ---------- Relatório mensal de um convênio ----------
function ConvenioReport({ conv, db, onBack, onEdit, onClose, modalNode }) {
  // Até o dia de fechamento, o foco é o mês anterior (que está sendo fechado);
  // depois dele, o foco passa a ser o mês atual (que está acumulando).
  const closingDay = Math.min(28, Math.max(1, conv.closingDay || 5))
  const [month, setMonth] = useState(
    new Date().getDate() > closingDay ? monthKey() : prevMonthKey(),
  )

  const employees = useMemo(
    () => db.clients.filter((c) => c.convenioId === conv.id),
    [db.clients, conv.id],
  )
  const empIds = new Set(employees.map((e) => e.id))

  const txs = useMemo(
    () =>
      db.transactions
        .filter((t) => empIds.has(t.clientId) && isConvenioTx(t) && monthKey(new Date(t.date)) === month)
        .sort((a, b) => new Date(a.date) - new Date(b.date)),
    [db.transactions, month, conv.id],
  )

  const groups = useMemo(() => {
    const map = new Map()
    for (const t of txs) {
      if (!map.has(t.clientId)) {
        const c = employees.find((e) => e.id === t.clientId)
        map.set(t.clientId, { client: c, items: [], total: 0 })
      }
      const g = map.get(t.clientId)
      g.items.push(t)
      g.total += t.price
    }
    return [...map.values()].sort((a, b) => b.total - a.total)
  }, [txs, employees])

  const grandTotal = txs.reduce((s, t) => s + t.price, 0)
  const monthNav = (delta) => {
    const [y, m] = month.split('-').map(Number)
    setMonth(monthKey(new Date(y, m - 1 + delta, 1)))
  }
  const closedThisMonth = conv.lastClosedCycle === month

  const shopName = db.settings?.shopName || 'Barbearia'

  const pdf = () => {
    const rows = txs.map((t) => {
      const c = employees.find((e) => e.id === t.clientId)
      return {
        Funcionário: c?.name || '—',
        CPF: c?.cpf || '—',
        Data: `${fmtDate(t.date)} ${fmtTime(t.date)}`,
        Serviço: t.serviceName,
        Valor: brl(t.price),
      }
    })
    exportPDF({
      title: `Convênio ${conv.name}`,
      shopName,
      period: monthKeyLabel(month),
      summary: [
        { label: 'Empresa', value: conv.name },
        { label: 'Funcionários', value: String(groups.length) },
        { label: 'Atendimentos', value: String(txs.length) },
        { label: 'Total a faturar', value: brl(grandTotal) },
      ],
      rows,
    })
  }

  const whats = () => {
    const lines = [
      `*${shopName}* — Relatório de convênio`,
      `Empresa: *${conv.name}*`,
      `Período: ${monthKeyLabel(month)}`,
      '',
    ]
    for (const g of groups) {
      lines.push(`*${g.client?.name || '—'}* (CPF ${g.client?.cpf || '—'}) — ${brl(g.total)}`)
      for (const t of g.items) lines.push(`   • ${fmtDate(t.date)} ${t.serviceName}: ${brl(t.price)}`)
    }
    lines.push('', `*Total a faturar: ${brl(grandTotal)}* (${txs.length} atendimentos)`)
    shareWhatsApp(lines.join('\n'))
  }

  return (
    <div>
      <button onClick={onBack} className="mb-3 flex items-center gap-1 text-sm font-semibold text-brand-500">
        <span aria-hidden>‹</span> Voltar aos convênios
      </button>
      <PageHeader
        title={conv.name}
        subtitle={`Relatório de ${monthKeyLabel(month)}`}
        action={
          <button className="btn-ghost" onClick={onEdit}><Icon.edit size={16} /> Editar empresa</button>
        }
      />

      {/* Navegação de mês */}
      <div className="card mb-4 flex items-center justify-between">
        <button onClick={() => monthNav(-1)} className="rounded-lg px-3 py-1.5 text-lg font-bold hover:bg-slate-100 dark:hover:bg-slate-800">‹</button>
        <div className="text-center">
          <p className="font-bold capitalize">{monthKeyLabel(month)}</p>
          {closedThisMonth ? (
            <span className="badge bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">Fechado ✓</span>
          ) : (
            <span className="text-xs text-slate-400">Em aberto</span>
          )}
        </div>
        <button
          onClick={() => monthNav(1)}
          disabled={month >= monthKey()}
          className="rounded-lg px-3 py-1.5 text-lg font-bold hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
        >›</button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <MiniStat label="Funcionários" value={groups.length} />
        <MiniStat label="Atendimentos" value={txs.length} />
        <MiniStat label="Total a faturar" value={brl(grandTotal)} tone />
      </div>

      <div className="mt-4 mb-4 flex flex-wrap gap-2">
        <button className="btn-primary !bg-emerald-500 hover:!bg-emerald-600" onClick={whats} disabled={txs.length === 0}>
          <Icon.phone size={16} /> Enviar no WhatsApp
        </button>
        <button className="btn-ghost" onClick={pdf} disabled={txs.length === 0}>
          <Icon.download size={16} /> Gerar PDF
        </button>
        {!closedThisMonth ? (
          <button className="btn-ghost" onClick={() => onClose(month)} disabled={txs.length === 0}>
            <Icon.check size={16} /> Marcar como fechado
          </button>
        ) : (
          <button className="btn-ghost" onClick={() => onClose(null)}>
            <Icon.close size={16} /> Reabrir
          </button>
        )}
      </div>

      {txs.length === 0 ? (
        <EmptyState
          icon={<Icon.money size={40} />}
          title="Sem atendimentos de convênio neste mês"
          subtitle="Os atendimentos entram aqui quando o pagamento é lançado como “Convênio” para um cliente vinculado a esta empresa."
        />
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <div key={g.client?.id} className="card">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <Avatar name={g.client?.name || '—'} size={36} />
                  <div className="min-w-0">
                    <p className="truncate font-bold">{g.client?.name || '—'}</p>
                    <p className="text-xs text-slate-400">CPF {g.client?.cpf || '—'}</p>
                  </div>
                </div>
                <span className="font-extrabold text-brand-600 dark:text-brand-300">{brl(g.total)}</span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {g.items.map((t) => (
                  <div key={t.id} className="flex items-center justify-between py-1.5 text-sm">
                    <span className="text-slate-400">{fmtDate(t.date).slice(0, 5)}</span>
                    <span className="flex-1 truncate px-3">{t.serviceName}</span>
                    <span className="font-semibold">{brl(t.price)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="card flex items-center justify-between bg-brand-50 dark:bg-brand-900/20">
            <span className="font-bold">Total a faturar — {conv.name}</span>
            <span className="text-lg font-extrabold text-brand-600 dark:text-brand-300">{brl(grandTotal)}</span>
          </div>
        </div>
      )}

      {modalNode}
    </div>
  )
}

function MiniStat({ label, value, tone }) {
  return (
    <div className="card !p-3 text-center">
      <p className={`text-lg font-extrabold ${tone ? 'text-brand-600 dark:text-brand-300' : ''}`}>{value}</p>
      <p className="text-[10px] uppercase text-slate-400">{label}</p>
    </div>
  )
}

function ConvenioModal({ open, convenio, onClose, onSave, onDelete }) {
  const [form, setForm] = useState({ name: '', contact: '', closingDay: 5, notes: '', active: true })
  useEffect(() => {
    if (!open) return
    if (convenio)
      setForm({
        name: convenio.name || '',
        contact: convenio.contact || '',
        closingDay: convenio.closingDay || 5,
        notes: convenio.notes || '',
        active: convenio.active !== false,
      })
    else setForm({ name: '', contact: '', closingDay: 5, notes: '', active: true })
  }, [convenio, open])
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={convenio ? 'Editar convênio' : 'Novo convênio'}
      footer={
        <>
          {onDelete && <button className="btn-danger mr-auto" onClick={onDelete}><Icon.trash size={16} /></button>}
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={() => form.name.trim() && onSave({ ...form, closingDay: Math.min(28, Math.max(1, +form.closingDay || 5)) })}>Salvar</button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Nome da empresa"><input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Ex.: Pontal Drogas" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Contato"><input className="input" value={form.contact} onChange={(e) => set('contact', e.target.value)} placeholder="Telefone/e-mail" /></Field>
          <Field label="Dia de fechamento">
            <input type="number" min={1} max={28} className="input" value={form.closingDay} onChange={(e) => set('closingDay', e.target.value)} />
          </Field>
        </div>
        <Field label="Observações"><textarea className="input" rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} /></Field>
        {convenio && (
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={form.active} onChange={(e) => set('active', e.target.checked)} className="accent-brand-500" />
            Convênio ativo
          </label>
        )}
        <p className="text-xs text-slate-400">
          O <b>dia de fechamento</b> é usado para lembrar você de gerar o relatório (avisos começam 2 dias antes).
        </p>
      </div>
    </Modal>
  )
}
