import { useMemo, useState } from 'react'
import { useData } from '../context/DataContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { PageHeader, StatCard, Modal, Field } from '../components/ui.jsx'
import Icon from '../components/Icons.jsx'
import { brl, fmtDate, fmtDateTime, fmtTime, isSameDay } from '../lib/utils.js'

const payLabel = { pix: 'PIX', dinheiro: 'Dinheiro', debito: 'Débito', credito: 'Crédito', pacote: 'Pacote', misto: 'Misto' }

export default function Caixa() {
  const { db, addTo, patch } = useData()
  const { user } = useAuth()
  const toast = useToast()
  const [openModal, setOpenModal] = useState(false)
  const [closeModal, setCloseModal] = useState(false)
  const [opening, setOpening] = useState('0')

  const current = db.cashSessions.find((c) => c.status === 'aberto')

  // Movement since the current session opened (or today)
  const sinceDate = current ? new Date(current.date) : new Date(new Date().setHours(0, 0, 0, 0))
  const movement = useMemo(
    () => db.transactions.filter((t) => new Date(t.date) >= sinceDate),
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
    const expected = (current.opening || 0) + cashIn
    patch('cashSessions', current.id, {
      status: 'fechado',
      closing: expected,
      closedAt: new Date().toISOString(),
      totalMovement: totalIn,
      cashMovement: cashIn,
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
          <div className="card mb-4 border-brand-200 bg-brand-50 dark:border-brand-800 dark:bg-brand-900/20">
            <div className="flex items-center gap-2 text-brand-600 dark:text-brand-300">
              <Icon.clock size={18} />
              <p className="font-semibold">Caixa aberto desde {fmtDateTime(current.date)}</p>
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
                <div className="flex items-center justify-between rounded-xl bg-emerald-500/10 px-3 py-2.5 text-emerald-600 dark:text-emerald-400">
                  <span className="text-sm font-bold">Saldo esperado em caixa</span>
                  <span className="font-extrabold">{brl((current.opening || 0) + cashIn)}</span>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="mb-3 font-bold">Movimentações</h3>
              <div className="max-h-72 space-y-1.5 overflow-y-auto">
                {movement.length === 0 ? (
                  <p className="py-6 text-center text-sm text-slate-400">Nenhuma movimentação.</p>
                ) : (
                  movement.slice().reverse().map((t) => (
                    <div key={t.id} className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">{fmtTime(t.date)} · {t.serviceName}</span>
                      <span className="font-semibold">+{brl(t.price)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
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
          <Row label="Total movimentado" value={brl(totalIn)} />
          <div className="mt-2 flex items-center justify-between rounded-xl bg-emerald-500/10 px-3 py-3 text-emerald-600 dark:text-emerald-400">
            <span className="font-bold">Saldo esperado em caixa</span>
            <span className="text-lg font-extrabold">{brl((current?.opening || 0) + cashIn)}</span>
          </div>
        </div>
      </Modal>
    </div>
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
