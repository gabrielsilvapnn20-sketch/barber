import { useMemo, useState } from 'react'
import { useData } from '../context/DataContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { PageHeader, Avatar } from '../components/ui.jsx'
import Icon from '../components/Icons.jsx'
import { brl, fmtTime } from '../lib/utils.js'

export default function Lancar() {
  const { db, addTransaction, onlyBarbers, owner } = useData()
  const { user, isOwner } = useAuth()
  const toast = useToast()

  const [barberId, setBarberId] = useState(user.id)
  const [serviceId, setServiceId] = useState('')
  const [clientId, setClientId] = useState('')
  const [payment, setPayment] = useState('pix')

  const selectableBarbers = isOwner ? [owner, ...onlyBarbers] : [user]

  // Services allowed for the selected barber (owner releases what each can do)
  const availableServices = useMemo(
    () =>
      db.services.filter(
        (s) =>
          s.active &&
          (s.allowedBarberIds.length === 0 || s.allowedBarberIds.includes(barberId)),
      ),
    [db.services, barberId],
  )

  const service = db.services.find((s) => s.id === serviceId)
  const category = service && db.categories.find((c) => c.id === service.categoryId)
  const barberShare = service && category ? service.price * (category.barberPct / 100) : 0

  // Owner can attach any client; a barber sees their own first but may pick any
  const myClients = isOwner
    ? db.clients
    : [...db.clients.filter((c) => c.barberId === user.id), ...db.clients.filter((c) => c.barberId !== user.id)]

  const submit = () => {
    if (!serviceId) return toast.error('Selecione um serviço.')
    addTransaction({ barberId, serviceId, clientId: clientId || null, paymentMethod: payment })
    toast.success('Atendimento lançado!')
    setServiceId('')
    setClientId('')
  }

  const grouped = useMemo(() => {
    const map = {}
    for (const s of availableServices) {
      const cat = db.categories.find((c) => c.id === s.categoryId)
      const key = cat?.name || 'Outros'
      map[key] = map[key] || { type: cat?.type, items: [] }
      map[key].items.push(s)
    }
    return map
  }, [availableServices, db.categories])

  const todayMine = db.transactions
    .filter((t) => t.barberId === barberId && new Date(t.date).toDateString() === new Date().toDateString())
    .slice(0, 8)

  return (
    <div>
      <PageHeader title="Lançar atendimento" subtitle="Registre um serviço ou venda de produto" />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          {/* Barber selector (owner only) */}
          {isOwner && (
            <div className="mb-4">
              <label className="label">Barbeiro</label>
              <div className="flex flex-wrap gap-2">
                {selectableBarbers.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      setBarberId(b.id)
                      setServiceId('')
                    }}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                      barberId === b.id
                        ? 'border-brand-500 bg-brand-500/10 text-brand-600 dark:text-brand-300'
                        : 'border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <Avatar name={b.name} color={b.color} size={24} />
                    {b.name.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Service picker grouped by category */}
          <label className="label">Serviço / Produto</label>
          <div className="space-y-4">
            {Object.entries(grouped).map(([catName, group]) => (
              <div key={catName}>
                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                  {group.type === 'product' ? <Icon.tag size={13} /> : <Icon.scissors size={13} />}
                  {catName}
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {group.items.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setServiceId(s.id)}
                      className={`rounded-xl border p-3 text-left transition ${
                        serviceId === s.id
                          ? 'border-brand-500 bg-brand-500/10'
                          : 'border-slate-200 hover:border-brand-300 dark:border-slate-700'
                      }`}
                    >
                      <p className="text-sm font-semibold leading-tight">{s.name}</p>
                      <p className="mt-1 text-sm font-bold text-brand-500">{brl(s.price)}</p>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {availableServices.length === 0 && (
              <p className="py-6 text-center text-sm text-slate-400">
                Nenhum serviço liberado para este barbeiro.
              </p>
            )}
          </div>

          {/* Client & payment */}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Cliente (opcional)</label>
              <select className="input" value={clientId} onChange={(e) => setClientId(e.target.value)}>
                <option value="">Cliente avulso</option>
                {myClients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Pagamento</label>
              <select className="input" value={payment} onChange={(e) => setPayment(e.target.value)}>
                <option value="pix">PIX</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="debito">Cartão débito</option>
                <option value="credito">Cartão crédito</option>
              </select>
            </div>
          </div>
        </div>

        {/* Summary + confirm */}
        <div className="card flex h-fit flex-col">
          <h3 className="mb-3 font-bold">Resumo</h3>
          {service ? (
            <div className="space-y-3">
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                <p className="text-sm font-semibold">{service.name}</p>
                <p className="text-xs text-slate-400">{category?.name}</p>
              </div>
              <Row label="Valor total" value={brl(service.price)} />
              <Row label={`Barbeiro (${category?.barberPct}%)`} value={brl(barberShare)} tone="text-emerald-500" />
              <Row label="Barbearia" value={brl(service.price - barberShare)} tone="text-brand-500" />
              <button onClick={submit} className="btn-primary mt-2 w-full">
                <Icon.check size={18} /> Confirmar lançamento
              </button>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-slate-400">
              Selecione um serviço para ver a divisão de comissão.
            </p>
          )}

          {todayMine.length > 0 && (
            <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
              <p className="mb-2 text-xs font-semibold uppercase text-slate-400">Lançados hoje</p>
              <div className="space-y-1.5">
                {todayMine.map((t) => (
                  <div key={t.id} className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">{fmtTime(t.date)} · {t.serviceName}</span>
                    <span className="font-semibold">{brl(t.price)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, tone }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className={`font-bold ${tone || ''}`}>{value}</span>
    </div>
  )
}
