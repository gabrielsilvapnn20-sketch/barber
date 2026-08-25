import { useEffect, useMemo, useState } from 'react'
import { useData } from '../context/DataContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { PageHeader, StatCard, Modal, Field, PayTag } from '../components/ui.jsx'
import Icon from '../components/Icons.jsx'
import { brl, fmtDate, fmtDateTime, fmtTime, isSameDay } from '../lib/utils.js'
import { shareWhatsApp, exportPDF } from '../lib/reports.js'

const payLabel = { pix: 'PIX', dinheiro: 'Dinheiro', debito: 'Débito', credito: 'Crédito', pacote: 'Pacote', misto: 'Misto' }

export default function Caixa() {
  const { db, addTo, patch } = useData()
  const { user } = useAuth()
  const toast = useToast()
  const [openModal, setOpenModal] = useState(false)
  const [closeModal, setCloseModal] = useState(false)
  const [movModal, setMovModal] = useState(null) // 'sangria' | 'suprimento'
  const [opening, setOpening] = useState('0')

  const current = db.cashSessions.find((c) => c.status === 'aberto')

  // Movimentações do caixa: só as de HOJE, desde a abertura, e que envolvem
  // dinheiro de verdade (abatimento de pacote não entra — foi pago antes).
  const sinceDate = current ? new Date(current.date) : new Date(new Date().setHours(0, 0, 0, 0))
  const movement = useMemo(
    () =>
      db.transactions.filter((t) => {
        if (t.type === 'redemption') return false
        const d = new Date(t.date)
        return d >= sinceDate && isSameDay(d, new Date())
      }),
    [db.transactions, current],
  )
  // Divide cada venda pelas formas de pagamento (suporta pagamento misto)
  const paymentsOf = (t) =>
    t.payments?.length ? t.payments : [{ method: t.paymentMethod, amount: t.price }]

  const totalIn = movement.reduce((s, t) => s + t.price, 0)
  const cashIn = movement.reduce(
    (s, t) => s + paymentsOf(t).filter((p) => p.method === 'dinheiro').reduce((a, p) => a + (p.amount || 0), 0),
    0,
  )

  const byMethod = useMemo(() => {
    const map = {}
    for (const t of movement) {
      for (const p of paymentsOf(t)) {
        if (!p.amount) continue
        map[p.method] = (map[p.method] || 0) + p.amount
      }
    }
    return map
  }, [movement])

  // Faturamento e comissão por barbeiro (movimentações de hoje)
  const byBarber = useMemo(() => {
    const map = {}
    for (const t of movement) {
      const u = db.users.find((x) => x.id === t.barberId)
      const name = u?.name || 'Barbeiro'
      map[t.barberId] = map[t.barberId] || { name, total: 0, commission: 0, count: 0 }
      map[t.barberId].total += t.price
      map[t.barberId].commission += t.barberShare || 0
      map[t.barberId].count += 1
    }
    return Object.values(map).sort((a, b) => b.total - a.total)
  }, [movement, db.users])

  // Monta o texto/linhas do relatório de fechamento do dia.
  const buildReport = () => {
    const shop = db.settings?.shopName || 'Barbearia'
    const today = fmtDate(new Date())
    const summary = [
      { label: 'Faturamento', value: brl(totalIn) },
      { label: 'Atendimentos', value: String(movement.length) },
      { label: 'Em dinheiro', value: brl(cashIn) },
      { label: 'Saldo em caixa', value: brl(expectedCash) },
    ]
    const rows = byBarber.map((b) => ({
      Barbeiro: b.name,
      Atendimentos: b.count,
      Faturamento: brl(b.total),
      Comissão: brl(b.commission),
    }))
    return { shop, today, summary, rows }
  }

  const shareReport = () => {
    const { shop, today } = buildReport()
    const lines = [
      `*${shop}* — Fechamento do dia`,
      today,
      '',
      `Faturamento: ${brl(totalIn)}`,
      `Atendimentos: ${movement.length}`,
      '',
      '*Por forma de pagamento:*',
      ...Object.entries(byMethod).map(([k, v]) => `• ${payLabel[k] || k}: ${brl(v)}`),
    ]
    if (sangriaTotal > 0) lines.push(`• Sangrias: - ${brl(sangriaTotal)}`)
    if (suprimentoTotal > 0) lines.push(`• Suprimentos: + ${brl(suprimentoTotal)}`)
    lines.push('', '*Por barbeiro:*')
    for (const b of byBarber) {
      lines.push(`• ${b.name}: ${brl(b.total)} (${b.count} atend.) — comissão ${brl(b.commission)}`)
    }
    lines.push('', `Saldo esperado em caixa: ${brl(expectedCash)}`)
    shareWhatsApp(lines.join('\n'))
  }

  const pdfReport = () => {
    const { shop, today, summary, rows } = buildReport()
    exportPDF({ title: 'Fechamento do dia', shopName: shop, period: today, summary, rows })
  }

  // Sangrias (retiradas) e suprimentos (reforços) da sessão atual
  const sessionMovs = (db.cashMovements || [])
    .filter((m) => m.sessionId === current?.id)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
  const sangriaTotal = sessionMovs.filter((m) => m.type === 'sangria').reduce((s, m) => s + (m.amount || 0), 0)
  const suprimentoTotal = sessionMovs.filter((m) => m.type === 'suprimento').reduce((s, m) => s + (m.amount || 0), 0)
  const expectedCash = (current?.opening || 0) + cashIn - sangriaTotal + suprimentoTotal

  const registerMov = (type, amount, reason) => {
    if (!current) return
    addTo('cashMovements', {
      sessionId: current.id,
      type,
      amount: Number(amount) || 0,
      reason: reason || '',
      date: new Date().toISOString(),
      by: user.id,
    })
    toast.success(type === 'sangria' ? 'Sangria registrada.' : 'Suprimento registrado.')
    setMovModal(null)
  }

  const open = () => {
    addTo('cashSessions', {
      date: new Date().toISOString(),
      opening: Number(opening) || 0,
      closing: null,
      status: 'aberto',
      openedBy: user.id,
      notes: '',
    })
    toast.success('Caixa aberto!')
    setOpenModal(false)
    setOpening('0')
  }

  const close = () => {
    patch('cashSessions', current.id, {
      status: 'fechado',
      closing: expectedCash,
      closedAt: new Date().toISOString(),
      totalMovement: totalIn,
      cashMovement: cashIn,
      sangriaTotal,
      suprimentoTotal,
    })
    toast.success('Caixa fechado!')
    setCloseModal(false)
  }

  const history = db.cashSessions
    .filter((c) => c.status === 'fechado')
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 8)

  return (
    <div>
      <PageHeader
        title="Caixa do dia"
        subtitle="Abertura e fechamento de caixa"
        action={
          current ? (
            <button className="btn-danger" onClick={() => setCloseModal(true)}><Icon.cash size={18} /> Fechar caixa</button>
          ) : (
            <button className="btn-primary" onClick={() => setOpenModal(true)}><Icon.cash size={18} /> Abrir caixa</button>
          )
        }
      />

      {current ? (
        <>
          <div className="card mb-4 flex flex-wrap items-center justify-between gap-3 border-brand-200 bg-brand-50 dark:border-brand-800 dark:bg-brand-900/20">
            <div className="flex items-center gap-2 text-brand-600 dark:text-brand-300">
              <Icon.clock size={18} />
              <p className="font-semibold">Caixa aberto desde {fmtDateTime(current.date)}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setMovModal('sangria')} className="btn-ghost !py-2 !text-xs">
                <Icon.download size={15} /> Sangria
              </button>
              <button onClick={() => setMovModal('suprimento')} className="btn-ghost !py-2 !text-xs">
                <Icon.plus size={15} /> Suprimento
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard icon={<Icon.cash />} label="Fundo de troco" value={brl(current.opening)} tone="brand" />
            <StatCard icon={<Icon.money />} label="Total movimentado" value={brl(totalIn)} tone="green" />
            <StatCard icon={<Icon.wallet />} label="Em dinheiro" value={brl(cashIn)} tone="amber" />
            <StatCard icon={<Icon.scissors />} label="Atendimentos" value={movement.length} tone="violet" />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="card">
              <h3 className="mb-3 font-bold">Por forma de pagamento</h3>
              <div className="space-y-2">
                {Object.keys(byMethod).length === 0 ? (
                  <p className="py-6 text-center text-sm text-slate-400">Nenhuma movimentação ainda.</p>
                ) : (
                  Object.entries(byMethod).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/50">
                      <span className="text-sm font-medium">{payLabel[k] || k}</span>
                      <span className="font-bold">{brl(v)}</span>
                    </div>
                  ))
                )}
                {sangriaTotal > 0 && (
                  <div className="flex items-center justify-between rounded-xl bg-red-500/10 px-3 py-2.5 text-red-600 dark:text-red-400">
                    <span className="text-sm font-medium">Sangrias (retiradas)</span>
                    <span className="font-bold">- {brl(sangriaTotal)}</span>
                  </div>
                )}
                {suprimentoTotal > 0 && (
                  <div className="flex items-center justify-between rounded-xl bg-brand-500/10 px-3 py-2.5 text-brand-600 dark:text-brand-300">
                    <span className="text-sm font-medium">Suprimentos (reforços)</span>
                    <span className="font-bold">+ {brl(suprimentoTotal)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between rounded-xl bg-emerald-500/10 px-3 py-2.5 text-emerald-600 dark:text-emerald-400">
                  <span className="text-sm font-bold">Saldo esperado em caixa</span>
                  <span className="font-extrabold">{brl(expectedCash)}</span>
                </div>
                {sessionMovs.length > 0 && (
                  <div className="mt-2 border-t border-slate-100 pt-2 dark:border-slate-800">
                    <p className="mb-1 text-xs font-semibold uppercase text-slate-400">Sangrias / suprimentos</p>
                    <div className="space-y-1">
                      {sessionMovs.map((m) => (
                        <div key={m.id} className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">
                            {fmtTime(m.date)} · {m.type === 'sangria' ? 'Sangria' : 'Suprimento'}
                            {m.reason ? ` — ${m.reason}` : ''}
                          </span>
                          <span className={m.type === 'sangria' ? 'font-semibold text-red-500' : 'font-semibold text-brand-500'}>
                            {m.type === 'sangria' ? '-' : '+'} {brl(m.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="card">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-bold">Movimentações de hoje</h3>
                <span className="text-xs text-slate-400">{movement.length} venda(s)</span>
              </div>
              <div className="max-h-80 space-y-1 overflow-y-auto">
                {movement.length === 0 ? (
                  <p className="py-6 text-center text-sm text-slate-400">Nenhuma venda hoje ainda.</p>
                ) : (
                  movement
                    .slice()
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .map((t) => {
                      const client = db.clients.find((c) => c.id === t.clientId)
                      return (
                        <div key={t.id} className="flex items-center justify-between gap-2 rounded-lg px-1 py-1.5">
                          <div className="min-w-0">
                            <p className="truncate text-sm">
                              <span className="text-slate-400">{fmtTime(t.date)}</span> {t.serviceName}
                            </p>
                            <p className="truncate text-xs text-slate-400">{client?.name || 'Cliente avulso'}</p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <PayTag t={t} />
                            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">+{brl(t.price)}</span>
                          </div>
                        </div>
                      )
                    })
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 card">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-bold">Relatório do dia</h3>
              <div className="flex gap-2">
                <button className="btn-primary !bg-emerald-500 hover:!bg-emerald-600 !py-2 !text-xs" onClick={shareReport}>
                  <Icon.phone size={15} /> WhatsApp
                </button>
                <button className="btn-ghost !py-2 !text-xs" onClick={pdfReport}>
                  <Icon.download size={15} /> PDF
                </button>
              </div>
            </div>
            {byBarber.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-400">Sem atendimentos para o relatório ainda.</p>
            ) : (
              <div className="space-y-2">
                {byBarber.map((b) => (
                  <div key={b.name} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/50">
                    <div>
                      <p className="text-sm font-semibold">{b.name}</p>
                      <p className="text-xs text-slate-400">{b.count} atend. · comissão {brl(b.commission)}</p>
                    </div>
                    <span className="font-bold">{brl(b.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="card flex flex-col items-center gap-3 py-12 text-center">
          <div className="text-slate-300 dark:text-slate-600"><Icon.cash size={48} /></div>
          <p className="font-semibold">Caixa fechado</p>
          <p className="max-w-xs text-sm text-slate-400">Abra o caixa para começar a registrar as movimentações do dia.</p>
          <button className="btn-primary" onClick={() => setOpenModal(true)}><Icon.cash size={16} /> Abrir caixa</button>
        </div>
      )}

      {history.length > 0 && (
        <div className="mt-4 card">
          <h3 className="mb-3 font-bold">Histórico de caixas</h3>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {history.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-2.5 text-sm">
                <span className="text-slate-500">{fmtDate(c.date)}</span>
                <span className="text-slate-400">Movimentou {brl(c.totalMovement || 0)}</span>
                <span className="font-semibold">Fechou {brl(c.closing || 0)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal open={openModal} onClose={() => setOpenModal(false)} title="Abrir caixa"
        footer={<><button className="btn-ghost" onClick={() => setOpenModal(false)}>Cancelar</button><button className="btn-primary" onClick={open}>Abrir</button></>}>
        <Field label="Fundo de troco inicial (R$)">
          <input type="number" step="0.01" className="input" value={opening} onChange={(e) => setOpening(e.target.value)} autoFocus />
        </Field>
      </Modal>

      <Modal open={closeModal} onClose={() => setCloseModal(false)} title="Fechar caixa"
        footer={<><button className="btn-ghost" onClick={() => setCloseModal(false)}>Cancelar</button><button className="btn-danger" onClick={close}>Confirmar fechamento</button></>}>
        <div className="space-y-2 text-sm">
          <Row label="Fundo de troco" value={brl(current?.opening || 0)} />
          <Row label="Recebido em dinheiro" value={brl(cashIn)} />
          {sangriaTotal > 0 && <Row label="− Sangrias" value={`- ${brl(sangriaTotal)}`} />}
          {suprimentoTotal > 0 && <Row label="+ Suprimentos" value={`+ ${brl(suprimentoTotal)}`} />}
          <Row label="Total movimentado (vendas)" value={brl(totalIn)} />
          <div className="mt-2 flex items-center justify-between rounded-xl bg-emerald-500/10 px-3 py-3 text-emerald-600 dark:text-emerald-400">
            <span className="font-bold">Saldo esperado em caixa</span>
            <span className="text-lg font-extrabold">{brl(expectedCash)}</span>
          </div>
        </div>
      </Modal>

      <CashMovementModal
        type={movModal}
        onClose={() => setMovModal(null)}
        onConfirm={(amount, reason) => registerMov(movModal, amount, reason)}
      />
    </div>
  )
}

function CashMovementModal({ type, onClose, onConfirm }) {
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  useEffect(() => {
    if (type) { setAmount(''); setReason('') }
  }, [type])
  if (!type) return null
  const isSangria = type === 'sangria'
  return (
    <Modal
      open={!!type}
      onClose={onClose}
      title={isSangria ? 'Sangria (retirada de dinheiro)' : 'Suprimento (reforço de caixa)'}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className={isSangria ? 'btn-danger' : 'btn-primary'} onClick={() => Number(amount) > 0 && onConfirm(amount, reason)}>
            Confirmar
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {isSangria
            ? 'Retirada de dinheiro do caixa (ex.: pagar fornecedor, guardar excedente). Reduz o saldo esperado.'
            : 'Entrada de dinheiro no caixa (ex.: reforço de troco). Aumenta o saldo esperado.'}
        </p>
        <Field label="Valor (R$)">
          <input type="number" step="0.01" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
        </Field>
        <Field label="Motivo">
          <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={isSangria ? 'Ex: pagamento fornecedor' : 'Ex: reforço de troco'} />
        </Field>
      </div>
    </Modal>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  )
}
