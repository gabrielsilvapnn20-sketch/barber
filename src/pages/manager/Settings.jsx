import { useState } from 'react'
import { useData } from '../../context/DataContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { PageHeader, Field } from '../../components/ui.jsx'
import Icon from '../../components/Icons.jsx'
import { uid } from '../../lib/utils.js'

const WEEKDAYS = [['Dom', 0], ['Seg', 1], ['Ter', 2], ['Qua', 3], ['Qui', 4], ['Sex', 5], ['Sáb', 6]]

export default function Settings() {
  const { db, updateSettings, resetData, startFresh } = useData()
  const toast = useToast()
  const s = db.settings

  const set = (changes) => updateSettings(changes)
  const setNested = (key, changes) => updateSettings({ [key]: { ...s[key], ...changes } })

  return (
    <div className="space-y-4">
      <PageHeader title="Configurações" subtitle="Ajuste a operação da lanchonete" />

      {/* Identidade */}
      <Section title="Estabelecimento" icon={<Icon.store size={18} />}>
        <Field label="Nome"><input className="input" value={s.shopName} onChange={(e) => set({ shopName: e.target.value })} /></Field>
        <Field label="Frase (tagline)"><input className="input" value={s.tagline || ''} onChange={(e) => set({ tagline: e.target.value })} /></Field>
        <Field label="Senha do painel"><input className="input" value={s.managerPassword} onChange={(e) => set({ managerPassword: e.target.value })} /></Field>
      </Section>

      {/* Horário */}
      <Section title="Horário de funcionamento" icon={<Icon.clock size={18} />}>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Abre"><input type="time" className="input" value={s.hours.open} onChange={(e) => setNested('hours', { open: e.target.value })} /></Field>
          <Field label="Fecha"><input type="time" className="input" value={s.hours.close} onChange={(e) => setNested('hours', { close: e.target.value })} /></Field>
        </div>
        <p className="label mt-2">Dias que abre</p>
        <div className="flex flex-wrap gap-1.5">
          {WEEKDAYS.map(([lbl, d]) => {
            const on = s.hours.days.includes(d)
            return (
              <button key={d} onClick={() => setNested('hours', { days: on ? s.hours.days.filter((x) => x !== d) : [...s.hours.days, d] })}
                className={`chip ${on ? '!border-brand-500 !bg-brand-50 text-brand-700 dark:!bg-brand-900/30 dark:text-brand-300' : ''}`}>{lbl}</button>
            )
          })}
        </div>
      </Section>

      {/* Fidelidade */}
      <Section title="Fidelidade" icon={<Icon.gift size={18} />}>
        <div className="grid grid-cols-2 gap-2">
          <Field label="A cada X pedidos"><input type="number" className="input" value={s.loyalty.everyN} onChange={(e) => setNested('loyalty', { everyN: Math.max(1, +e.target.value) })} /></Field>
          <Field label="Prêmio"><input className="input" value={s.loyalty.rewardLabel} onChange={(e) => setNested('loyalty', { rewardLabel: e.target.value })} /></Field>
        </div>
      </Section>

      {/* Entrega */}
      <Section title="Taxas de entrega por bairro" icon={<Icon.moto size={18} />}>
        <div className="space-y-2">
          {s.delivery.zones.map((z) => (
            <div key={z.id} className="flex items-center gap-2">
              <input className="input flex-1" value={z.name} onChange={(e) => updateZone(s, setNested, z.id, { name: e.target.value })} placeholder="Bairro" />
              <div className="relative w-24"><span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">R$</span><input className="input pl-7" type="number" value={z.fee} onChange={(e) => updateZone(s, setNested, z.id, { fee: +e.target.value })} /></div>
              <div className="relative w-20"><input className="input pr-7" type="number" value={z.etaMin} onChange={(e) => updateZone(s, setNested, z.id, { etaMin: +e.target.value })} /><span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">min</span></div>
              <button onClick={() => setNested('delivery', { zones: s.delivery.zones.filter((x) => x.id !== z.id) })} className="text-slate-300 hover:text-red-500"><Icon.trash size={18} /></button>
            </div>
          ))}
        </div>
        <button onClick={() => setNested('delivery', { zones: [...s.delivery.zones, { id: uid('z'), name: 'Novo bairro', fee: 5, etaMin: 40 }] })} className="btn-ghost mt-2 w-full !py-2 text-xs"><Icon.plus size={15} /> Adicionar bairro</button>
        <label className="mt-3 flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 dark:border-slate-700">
          <span className="text-sm font-semibold">Permitir retirada no local (sem taxa)</span>
          <input type="checkbox" checked={s.delivery.pickup !== false} onChange={(e) => setNested('delivery', { pickup: e.target.checked })} className="h-5 w-5 accent-brand-500" />
        </label>
      </Section>

      {/* Aviso de atraso */}
      <Section title="Aviso automático de atraso" icon={<Icon.bell size={18} />}>
        <Field label="Avisar após passar do estimado em (min)"><input type="number" className="input" value={s.delayNotice.minutesOver} onChange={(e) => setNested('delayNotice', { minutesOver: +e.target.value })} /></Field>
        <Field label="Mensagem"><textarea rows={2} className="input" value={s.delayNotice.text} onChange={(e) => setNested('delayNotice', { text: e.target.value })} /></Field>
      </Section>

      {/* Promoção do dia */}
      <Section title="Promoção do dia" icon={<Icon.sparkles size={18} />}>
        <label className="mb-2 flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 dark:border-slate-700">
          <span className="text-sm font-semibold">Mostrar promoção no cardápio</span>
          <input type="checkbox" checked={s.promoOfDay.active} onChange={(e) => setNested('promoOfDay', { active: e.target.checked })} className="h-5 w-5 accent-brand-500" />
        </label>
        <Field label="Texto"><input className="input" value={s.promoOfDay.text} onChange={(e) => setNested('promoOfDay', { text: e.target.value })} /></Field>
      </Section>

      {/* Dados */}
      <Section title="Dados" icon={<Icon.settings size={18} />}>
        <p className="mb-2 text-sm text-slate-500 dark:text-slate-400">Ao começar a usar de verdade, zere os dados de demonstração (mantém o cardápio e as configurações).</p>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => { if (confirm('Zerar pedidos, caixa e clientes para uso real?')) { startFresh(); toast.success('Pronto para uso real!') } }} className="btn-sun !py-2 text-xs">Começar do zero</button>
          <button onClick={() => { if (confirm('Restaurar todos os dados de demonstração?')) { resetData(); toast.info('Demonstração restaurada') } }} className="btn-ghost !py-2 text-xs">Restaurar demo</button>
        </div>
      </Section>
    </div>
  )
}

function updateZone(s, setNested, id, changes) {
  setNested('delivery', { zones: s.delivery.zones.map((z) => (z.id === id ? { ...z, ...changes } : z)) })
}

function Section({ title, icon, children }) {
  return (
    <div className="card">
      <p className="mb-3 flex items-center gap-2 font-bold">{icon} {title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  )
}
