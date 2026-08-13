import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../../context/DataContext.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useCart } from '../../context/CartContext.jsx'
import { usePWA } from '../../context/PWAContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { PageHeader, Progress, Field } from '../../components/ui.jsx'
import Icon from '../../components/Icons.jsx'
import SupportButton from './SupportButton.jsx'
import { brl } from '../../lib/utils.js'

export default function Account() {
  const { db, redeemLoyalty } = useData()
  const { customer, identifyCustomer, updateCustomer, toggleFavorite, logoutCustomer } = useAuth()
  const { addItem } = useCart()
  const { permission, enableNotifications, notificationsSupported } = usePWA()
  const toast = useToast()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')

  const everyN = db.settings?.loyalty?.everyN || 5
  const rewardLabel = db.settings?.loyalty?.rewardLabel || 'um prêmio'
  const count = customer?.loyaltyCount || 0
  const progress = count % everyN
  const rewardReady = count >= everyN
  const missing = everyN - progress

  // Conquistas leves (derivadas dos pedidos).
  const achievements = useMemo(() => {
    if (!customer) return []
    const mine = db.orders.filter((o) => o.customerId === customer.id)
    const flavors = new Set()
    for (const o of mine) for (const li of o.items) {
      if (li.itemId === 'it_caldo' && li.selections?.flavors) li.selections.flavors.forEach((f) => flavors.add(f))
    }
    return [
      { id: 'first', label: 'Primeiro pedido', emoji: '🎉', done: mine.length >= 1 },
      { id: 'regular', label: '3 pedidos feitos', emoji: '🔥', done: mine.length >= 3 },
      { id: 'caldos', label: 'Provou 3 sabores de caldo', emoji: '🍲', done: flavors.size >= 3 },
    ]
  }, [customer, db.orders])

  const favItems = (customer?.favorites || []).map((id) => db.items.find((i) => i.id === id)).filter(Boolean)

  if (!customer) {
    return (
      <div>
        <PageHeader title="Minha conta" />
        <div className="card">
          <p className="mb-1 font-bold">Identifique-se</p>
          <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">Acompanhe seus pedidos, junte selos de fidelidade e salve favoritos. Sem senha — só nome e telefone.</p>
          <div className="space-y-2">
            <Field label="Nome"><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" /></Field>
            <Field label="Telefone"><input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(34) 9...." inputMode="tel" /></Field>
            <button className="btn-primary w-full" onClick={() => {
              if (!name.trim() || !phone.trim()) return toast.error('Preencha nome e telefone.')
              identifyCustomer({ name, phone })
              toast.success(`Bem-vindo(a), ${name.split(' ')[0]}!`)
            }}>Entrar</button>
          </div>
        </div>
        <ManagerLink navigate={navigate} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader title={`Olá, ${customer.name.split(' ')[0]}!`} subtitle={customer.phone} />

      {/* Fidelidade */}
      <div className="card mb-3 bg-gradient-to-br from-brand-500 to-brand-700 text-white">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 font-bold"><Icon.gift size={18} /> Cartão fidelidade</p>
          <span className="text-sm font-semibold">{progress}/{everyN}</span>
        </div>
        <div className="mt-2 flex gap-1.5">
          {Array.from({ length: everyN }).map((_, i) => (
            <div key={i} className={`flex h-8 flex-1 items-center justify-center rounded-lg text-sm ${i < progress ? 'bg-white text-brand-600' : 'bg-white/20'}`}>
              {i < progress ? '🍢' : ''}
            </div>
          ))}
        </div>
        {rewardReady ? (
          <button onClick={() => { redeemLoyalty(customer.id); toast.success('Prêmio resgatado! 🎁') }} className="btn-sun mt-3 w-full">
            🎁 Resgatar: {rewardLabel}
          </button>
        ) : (
          <p className="mt-3 text-sm font-medium text-white/90">Faltam <b>{missing}</b> pedido(s) para ganhar <b>{rewardLabel}</b>.</p>
        )}
      </div>

      {/* Conquistas */}
      <div className="card mb-3">
        <p className="mb-2 font-bold">Conquistas</p>
        <div className="grid grid-cols-3 gap-2">
          {achievements.map((a) => (
            <div key={a.id} className={`rounded-xl border p-2.5 text-center ${a.done ? 'border-sun-400 bg-sun-50 dark:bg-sun-900/15' : 'border-slate-200 opacity-50 dark:border-slate-700'}`}>
              <div className="text-2xl">{a.emoji}</div>
              <p className="mt-1 text-[11px] font-semibold leading-tight">{a.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Favoritos */}
      {favItems.length > 0 && (
        <div className="card mb-3">
          <p className="mb-2 font-bold">Favoritos</p>
          <div className="space-y-2">
            {favItems.map((it) => (
              <div key={it.id} className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-sun-300 to-sun-500">{it.emoji}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{it.name}</span>
                <span className="price text-sm">{brl(it.price)}</span>
                <button className="text-slate-300 hover:text-brand-500" onClick={() => toggleFavorite(it.id)}><Icon.heart size={18} style={{ fill: 'currentColor' }} className="text-brand-500" /></button>
                {it.build === 'simple' && it.available && <button className="btn-primary !px-2.5 !py-1.5 text-xs" onClick={() => { addItem(it, { qty: 1 }); toast.success('Adicionado 🛒') }}><Icon.plus size={14} /></button>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notificações */}
      {notificationsSupported && permission !== 'granted' && (
        <button onClick={async () => { const r = await enableNotifications(); if (r === 'granted') toast.success('Notificações ativadas! 🔔') }} className="btn-sun mb-3 w-full">
          <Icon.bell size={18} /> Ativar notificações do pedido
        </button>
      )}

      <div className="mb-3"><SupportButton inline /></div>

      <button className="btn-ghost w-full" onClick={() => { logoutCustomer(); toast.info('Você saiu.') }}><Icon.logout size={18} /> Sair</button>

      <ManagerLink navigate={navigate} />
    </div>
  )
}

function ManagerLink({ navigate }) {
  return (
    <button onClick={() => navigate('/gestor')} className="mt-6 flex w-full items-center justify-center gap-2 text-xs font-semibold text-slate-400 hover:text-azure-500">
      <Icon.settings size={14} /> Sou o dono — acessar painel de gestão
    </button>
  )
}
