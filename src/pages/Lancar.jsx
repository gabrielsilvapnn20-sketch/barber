import { useEffect, useMemo, useState } from 'react'
import { useData } from '../context/DataContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { PageHeader, Avatar, Modal, Field, Accordion, Stepper } from '../components/ui.jsx'
import Icon from '../components/Icons.jsx'
import { brl, fmtTime } from '../lib/utils.js'

const PAY_METHODS = [
  { v: 'pix', l: 'PIX' },
  { v: 'dinheiro', l: 'Dinheiro' },
  { v: 'debito', l: 'Cartão débito' },
  { v: 'credito', l: 'Cartão crédito' },
]

const emptyPay = () => ({ split: false, method: 'pix', lines: [{ method: 'pix', amount: '' }, { method: 'dinheiro', amount: '' }] })
const paymentsFromState = (st, total) =>
  st.split
    ? st.lines.map((l) => ({ method: l.method, amount: +(+l.amount || 0) })).filter((p) => p.amount > 0)
    : [{ method: st.method, amount: total }]
const paySum = (st) => st.lines.reduce((s, l) => s + (+l.amount || 0), 0)
const payValid = (st, total) => {
  if (!st.split) return total > 0
  const s = +paySum(st).toFixed(2)
  return s > 0 && Math.abs(s - total) < 0.005
}

export default function Lancar() {
  const { db, addSale, sellPackage, redeemFromPackage, activePackagesForClient, onlyBarbers, owner } = useData()
  const { user, isOwner } = useAuth()
  const toast = useToast()

  const [barberId, setBarberId] = useState(user.id)
  const [clientId, setClientId] = useState('')
  const [cart, setCart] = useState([]) // [{serviceId, qty}]
  const [addSel, setAddSel] = useState('')
  const [editValue, setEditValue] = useState(false)
  const [totalOverride, setTotalOverride] = useState('')
  const [pay, setPay] = useState(emptyPay)
  const [pkgModal, setPkgModal] = useState(false)

  const selectableBarbers = isOwner ? [owner, ...onlyBarbers] : [user]

  const availableServices = useMemo(
    () => db.services.filter((s) => s.active && (s.allowedBarberIds.length === 0 || s.allowedBarberIds.includes(barberId))),
    [db.services, barberId],
  )
  const svcById = (id) => db.services.find((s) => s.id === id)
  const catPct = (s) => db.categories.find((c) => c.id === s?.categoryId)?.barberPct ?? 50

  const clients = isOwner
    ? db.clients
    : [...db.clients.filter((c) => c.barberId === user.id), ...db.clients.filter((c) => c.barberId !== user.id)]

  const activePkgs = clientId ? activePackagesForClient(clientId) : []

  // ---- cart helpers ----
  const addToCart = (serviceId) => {
    if (!serviceId) return
    setCart((c) => {
      const ex = c.find((i) => i.serviceId === serviceId)
      return ex ? c.map((i) => (i.serviceId === serviceId ? { ...i, qty: i.qty + 1 } : i)) : [...c, { serviceId, qty: 1 }]
    })
  }
  const setQty = (serviceId, qty) => setCart((c) => c.map((i) => (i.serviceId === serviceId ? { ...i, qty } : i)))
  const removeItem = (serviceId) => setCart((c) => c.filter((i) => i.serviceId !== serviceId))

  const baseTotal = cart.reduce((s, i) => s + (svcById(i.serviceId)?.price || 0) * i.qty, 0)
  const finalTotal = editValue && totalOverride !== '' ? +totalOverride : baseTotal

  // commissão prevista (média ponderada)
  const preview = useMemo(() => {
    let base = 0
    let weighted = 0
    for (const i of cart) {
      const s = svcById(i.serviceId)
      const line = (s?.price || 0) * i.qty
      base += line
      weighted += line * catPct(s)
    }
    const pct = base > 0 ? weighted / base : 50
    const share = +(finalTotal * (pct / 100)).toFixed(2)
    return { share, shop: +(finalTotal - share).toFixed(2), pct: Math.round(pct) }
  }, [cart, finalTotal])

  const reset = () => {
    setCart([])
    setAddSel('')
    setEditValue(false)
    setTotalOverride('')
    setPay(emptyPay())
  }

  const finalize = () => {
    if (!cart.length) return toast.error('Adicione ao menos um serviço.')
    if (!payValid(pay, finalTotal)) return toast.error('O pagamento não fecha com o total.')
    addSale({
      barberId,
      clientId: clientId || null,
      items: cart,
      total: editValue && totalOverride !== '' ? +totalOverride : null,
      payments: paymentsFromState(pay, finalTotal),
    })
    toast.success('Atendimento finalizado!')
    reset()
  }

  const redeem = (pkg, serviceId, serviceName) => {
    redeemFromPackage({ packageId: pkg.id, serviceId, barberId })
    toast.success(`${serviceName} abatido do pacote (sem cobrança).`)
  }

  const todayMine = db.transactions
    .filter((t) => t.barberId === barberId && new Date(t.date).toDateString() === new Date().toDateString())
    .slice(0, 10)

  return (
    <div>
      <PageHeader
        title="Checkout"
        subtitle="Feche o atendimento"
        action={
          <button className="btn-ghost" onClick={() => setPkgModal(true)}>
            <Icon.tag size={16} /> Vender pacote
          </button>
        }
      />

      <div className="mx-auto max-w-xl space-y-3">
        {/* Barbeiro + Cliente */}
        <div className="card space-y-3">
          {isOwner && (
            <Field label="Barbeiro">
              <select className="input" value={barberId} onChange={(e) => { setBarberId(e.target.value); setCart([]) }}>
                {selectableBarbers.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Cliente">
            <select className="input" value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">Cliente avulso</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>

          {/* Combo ativo do cliente */}
          {activePkgs.length > 0 && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-800/60 dark:bg-emerald-900/20">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase text-emerald-700 dark:text-emerald-300">
                <Icon.tag size={13} /> Pacote ativo
              </p>
              <div className="space-y-2">
                {activePkgs.map((pkg) =>
                  pkg.items
                    .filter((i) => i.qtyTotal - i.qtyUsed > 0)
                    .map((i) => (
                      <div key={pkg.id + i.serviceId} className="flex items-center justify-between gap-2">
                        <span className="text-sm">
                          Restam <b>{i.qtyTotal - i.qtyUsed}</b> {i.serviceName}
                        </span>
                        <button
                          onClick={() => redeem(pkg, i.serviceId, i.serviceName)}
                          className="rounded-lg bg-emerald-500 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-600"
                        >
                          Abater 1
                        </button>
                      </div>
                    )),
                )}
              </div>
              <p className="mt-2 text-[11px] text-emerald-700/80 dark:text-emerald-300/70">
                Abater usa o saldo já pago — não gera cobrança.
              </p>
            </div>
          )}
        </div>

        {/* Serviços (carrinho) */}
        <div className="card space-y-3">
          <Field label="Adicionar serviço">
            <select
              className="input"
              value={addSel}
              onChange={(e) => { addToCart(e.target.value); setAddSel('') }}
            >
              <option value="">Selecione um serviço…</option>
              {Object.entries(groupByCat(availableServices, db.categories)).map(([cat, items]) => (
                <optgroup key={cat} label={cat}>
                  {items.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} — {brl(s.price)}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Field>

          {cart.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-400">Nenhum serviço adicionado ainda.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {cart.map((i) => {
                const s = svcById(i.serviceId)
                return (
                  <div key={i.serviceId} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{s?.name}</p>
                      <p className="text-xs text-slate-400">{brl(s?.price || 0)} cada</p>
                    </div>
                    <Stepper value={i.qty} onChange={(q) => setQty(i.serviceId, q)} />
                    <span className="w-16 text-right text-sm font-bold">{brl((s?.price || 0) * i.qty)}</span>
                    <button onClick={() => removeItem(i.serviceId)} className="text-slate-400 hover:text-red-500">
                      <Icon.close size={16} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Total + pagamento */}
        {cart.length > 0 && (
          <div className="card space-y-3">
            {/* Total (editável) */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Total</span>
              <div className="flex items-center gap-2">
                {!editValue && <span className="text-2xl font-extrabold">{brl(finalTotal)}</span>}
                {editValue ? (
                  <input
                    type="number"
                    step="0.01"
                    autoFocus
                    className="input !w-32 text-right text-lg font-bold"
                    value={totalOverride}
                    onChange={(e) => setTotalOverride(e.target.value)}
                    onBlur={() => { if (totalOverride === '') { setEditValue(false) } }}
                  />
                ) : (
                  <button onClick={() => { setEditValue(true); setTotalOverride(String(baseTotal)) }} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" title="Editar valor">
                    <Icon.edit size={16} />
                  </button>
                )}
              </div>
            </div>
            {editValue && baseTotal !== finalTotal && (
              <p className="text-right text-xs text-amber-500">Valor ajustado (soma dos serviços: {brl(baseTotal)})</p>
            )}

            <PaymentControl total={finalTotal} state={pay} setState={setPay} />

            {/* Comissão (discreta) */}
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs dark:bg-slate-800/50">
              <span className="text-slate-400">Comissão barbeiro ({preview.pct}%)</span>
              <span className="font-semibold text-emerald-500">{brl(preview.share)}</span>
            </div>

            <button onClick={finalize} className="btn-primary w-full text-base">
              <Icon.check size={20} /> Finalizar — {brl(finalTotal)}
            </button>
          </div>
        )}

        {/* Lançados hoje (recolhido) */}
        {todayMine.length > 0 && (
          <Accordion title={`Lançados hoje (${todayMine.length})`} icon={<Icon.clock size={16} />}>
            <div className="space-y-1.5">
              {todayMine.map((t) => (
                <div key={t.id} className="flex items-center justify-between text-sm">
                  <span className="min-w-0 flex-1 truncate text-slate-500">
                    {fmtTime(t.date)} · {t.serviceName}
                    {t.type === 'redemption' && <span className="ml-1 text-emerald-500">(pacote)</span>}
                  </span>
                  <span className="font-semibold">{t.price > 0 ? brl(t.price) : '—'}</span>
                </div>
              ))}
            </div>
          </Accordion>
        )}
      </div>

      <PackageModal
        open={pkgModal}
        onClose={() => setPkgModal(false)}
        clients={clients}
        defaultClientId={clientId}
        services={availableServices}
        categories={db.categories}
        onSell={(data) => {
          const res = sellPackage({ barberId, ...data })
          if (res) {
            toast.success('Pacote vendido!')
            setPkgModal(false)
          } else {
            toast.error('Selecione cliente e ao menos um serviço.')
          }
        }}
      />
    </div>
  )
}

function groupByCat(services, categories) {
  const map = {}
  for (const s of services) {
    const cat = categories.find((c) => c.id === s.categoryId)?.name || 'Outros'
    map[cat] = map[cat] || []
    map[cat].push(s)
  }
  return map
}

function PaymentControl({ total, state, setState }) {
  const remaining = +(total - paySum(state)).toFixed(2)
  const setLine = (idx, key, val) =>
    setState((st) => ({ ...st, lines: st.lines.map((l, i) => (i === idx ? { ...l, [key]: val } : l)) }))
  const addLine = () => setState((st) => ({ ...st, lines: [...st.lines, { method: 'pix', amount: '' }] }))
  const removeLine = (idx) => setState((st) => ({ ...st, lines: st.lines.filter((_, i) => i !== idx) }))

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="label !mb-0">Pagamento</label>
        <button
          type="button"
          onClick={() => setState((st) => ({ ...st, split: !st.split }))}
          className={`text-xs font-semibold ${state.split ? 'text-brand-500' : 'text-slate-400'}`}
        >
          {state.split ? '← Pagamento único' : 'Dividir pagamento'}
        </button>
      </div>

      {!state.split ? (
        <select className="input" value={state.method} onChange={(e) => setState((st) => ({ ...st, method: e.target.value }))}>
          {PAY_METHODS.map((m) => (
            <option key={m.v} value={m.v}>{m.l}</option>
          ))}
        </select>
      ) : (
        <div className="space-y-2">
          {state.lines.map((l, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <select className="input !w-auto flex-1" value={l.method} onChange={(e) => setLine(idx, 'method', e.target.value)}>
                {PAY_METHODS.map((m) => (
                  <option key={m.v} value={m.v}>{m.l}</option>
                ))}
              </select>
              <input
                type="number"
                step="0.01"
                placeholder="0,00"
                className="input !w-28 text-right"
                value={l.amount}
                onChange={(e) => setLine(idx, 'amount', e.target.value)}
              />
              {state.lines.length > 2 && (
                <button onClick={() => removeLine(idx)} className="text-slate-400 hover:text-red-500"><Icon.close size={16} /></button>
              )}
            </div>
          ))}
          <div className="flex items-center justify-between">
            <button type="button" onClick={addLine} className="text-xs font-semibold text-brand-500">+ Adicionar forma</button>
            <span className={`text-xs font-semibold ${Math.abs(remaining) < 0.005 ? 'text-emerald-500' : 'text-amber-500'}`}>
              {Math.abs(remaining) < 0.005 ? 'Fechado ✓' : remaining > 0 ? `Faltam ${brl(remaining)}` : `Excede ${brl(-remaining)}`}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

function PackageModal({ open, onClose, clients, defaultClientId, services, categories, onSell }) {
  const [clientId, setClientId] = useState(defaultClientId || '')
  const [name, setName] = useState('Pacote Mensal')
  const [items, setItems] = useState([]) // [{serviceId, qty}]
  const [addSel, setAddSel] = useState('')
  const [total, setTotal] = useState('')
  const [pay, setPay] = useState(emptyPay)

  // reinicia ao abrir
  useMemoOpen(open, () => {
    setClientId(defaultClientId || '')
    setName('Pacote Mensal')
    setItems([])
    setAddSel('')
    setTotal('')
    setPay(emptyPay())
  })

  const svcById = (id) => services.find((s) => s.id === id)
  const base = items.reduce((s, i) => s + (svcById(i.serviceId)?.price || 0) * i.qty, 0)
  const finalTotal = total !== '' ? +total : base
  const add = (id) => {
    if (!id) return
    setItems((c) => {
      const ex = c.find((i) => i.serviceId === id)
      return ex ? c.map((i) => (i.serviceId === id ? { ...i, qty: i.qty + 1 } : i)) : [...c, { serviceId: id, qty: 1 }]
    })
  }

  const submit = () => {
    onSell({
      clientId,
      name,
      items,
      total: total !== '' ? +total : null,
      payments: paymentsFromState(pay, finalTotal),
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Vender pacote / combo"
      wide
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={submit} disabled={!clientId || !items.length || !payValid(pay, finalTotal)}>
            Vender {brl(finalTotal)}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Cliente">
            <select className="input" value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">Selecione</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Nome do pacote">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
        </div>

        <Field label="Serviços do pacote">
          <select className="input" value={addSel} onChange={(e) => { add(e.target.value); setAddSel('') }}>
            <option value="">Adicionar serviço ao pacote…</option>
            {Object.entries(groupByCat(services, categories)).map(([cat, list]) => (
              <optgroup key={cat} label={cat}>
                {list.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} — {brl(s.price)}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </Field>

        {items.length > 0 && (
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 px-3 dark:divide-slate-800 dark:border-slate-700">
            {items.map((i) => {
              const s = svcById(i.serviceId)
              return (
                <div key={i.serviceId} className="flex items-center gap-3 py-2.5">
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">{s?.name}</span>
                  <Stepper value={i.qty} onChange={(q) => setItems((c) => c.map((x) => (x.serviceId === i.serviceId ? { ...x, qty: q } : x)))} />
                  <span className="w-16 text-right text-sm font-bold">{brl((s?.price || 0) * i.qty)}</span>
                  <button onClick={() => setItems((c) => c.filter((x) => x.serviceId !== i.serviceId))} className="text-slate-400 hover:text-red-500"><Icon.close size={16} /></button>
                </div>
              )
            })}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Valor do pacote (editável)">
            <input type="number" step="0.01" className="input" placeholder={String(base)} value={total} onChange={(e) => setTotal(e.target.value)} />
          </Field>
          <div className="flex items-end">
            <p className="text-xs text-slate-400">Sugestão pela soma: <b>{brl(base)}</b></p>
          </div>
        </div>

        <PaymentControl total={finalTotal} state={pay} setState={setPay} />
      </div>
    </Modal>
  )
}

// pequeno helper para rodar um efeito só quando `open` muda para true
function useMemoOpen(open, fn) {
  useEffect(() => {
    if (open) fn()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
}
