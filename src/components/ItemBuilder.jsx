import { useEffect, useMemo, useState } from 'react'
import { Modal } from './ui.jsx'
import { ItemImage } from './FoodUI.jsx'
import Icon from './Icons.jsx'
import { unitPriceOf, summarize, brl } from '../lib/orders.js'
import { useCart } from '../context/CartContext.jsx'
import { useToast } from '../context/ToastContext.jsx'

/**
 * Modal de montagem do item. Lê as regras do próprio item (build):
 *  - simple   → só quantidade
 *  - assembly → etapas (escolha do espeto, feijão...) + acompanhamentos fixos
 *  - soup     → escolha do sabor, opção de misturar dois + adicionais
 */
export default function ItemBuilder({ item, open, onClose }) {
  const { addItem } = useCart()
  const toast = useToast()
  const [qty, setQty] = useState(1)
  const [steps, setSteps] = useState({}) // assembly: { stepId: optionId }
  const [flavors, setFlavors] = useState([]) // soup
  const [mix, setMix] = useState(false)
  const [addons, setAddons] = useState([])

  // Reinicia o estado sempre que abre um item novo.
  useEffect(() => {
    if (!open || !item) return
    setQty(1)
    setSteps({})
    setFlavors(item.build === 'soup' && item.flavors?.length ? [item.flavors[0].id] : [])
    setMix(false)
    setAddons([])
  }, [open, item])

  const selections = useMemo(() => {
    if (!item) return null
    if (item.build === 'assembly') return steps
    if (item.build === 'soup') return { flavors, addons }
    return null
  }, [item, steps, flavors, addons])

  if (!item) return null

  const unit = unitPriceOf(item, selections)
  const summary = summarize(item, selections)

  const missing = (() => {
    if (item.build === 'assembly') {
      const req = (item.steps || []).filter((s) => s.required)
      return req.some((s) => !steps[s.id])
    }
    if (item.build === 'soup') return flavors.length === 0
    return false
  })()

  const toggleFlavor = (id) => {
    setFlavors((prev) => {
      if (mix) {
        // no modo mistura, permite dois sabores
        if (prev.includes(id)) return prev.filter((x) => x !== id)
        const next = [...prev, id]
        return next.slice(-2) // mantém no máximo 2
      }
      return [id]
    })
  }

  const toggleAddon = (id) => setAddons((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const add = () => {
    if (missing) {
      toast.error('Escolha as opções obrigatórias.')
      return
    }
    addItem(item, { selections, qty })
    toast.success(`${qty}× ${item.name} no carrinho 🛒`)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={item.name} wide>
      <div className="-mt-1">
        <div className="mb-4 h-40 overflow-hidden rounded-2xl">
          <ItemImage item={item} rounded="rounded-2xl" />
        </div>
        {item.desc && <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">{item.desc}</p>}

        {/* ETAPAS (assembly) */}
        {item.build === 'assembly' && (
          <div className="space-y-4">
            {item.steps.map((step) => (
              <div key={step.id}>
                <p className="label flex items-center gap-2">
                  {step.label}
                  {step.required && <span className="text-brand-500">*</span>}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {step.options.map((o) => {
                    const active = steps[step.id] === o.id
                    return (
                      <button
                        key={o.id}
                        onClick={() => setSteps((prev) => ({ ...prev, [step.id]: o.id }))}
                        className={`rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition ${
                          active
                            ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                            : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        {o.label}
                        {o.priceDelta ? <span className="ml-1 text-xs text-slate-400">+{brl(o.priceDelta)}</span> : null}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
            {item.includes?.length > 0 && (
              <div className="rounded-xl bg-sun-50 p-3 dark:bg-sun-900/15">
                <p className="mb-1 text-xs font-bold uppercase tracking-wide text-sun-700 dark:text-sun-300">Acompanha</p>
                <p className="text-sm text-slate-600 dark:text-slate-300">{item.includes.join(' · ')}</p>
              </div>
            )}
          </div>
        )}

        {/* CALDOS (soup) */}
        {item.build === 'soup' && (
          <div className="space-y-4">
            <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 dark:border-slate-700">
              <span className="text-sm font-semibold">Misturar dois sabores</span>
              <input
                type="checkbox"
                checked={mix}
                onChange={(e) => {
                  setMix(e.target.checked)
                  setFlavors((prev) => (e.target.checked ? prev.slice(0, 1) : prev.slice(0, 1)))
                }}
                className="h-5 w-9 cursor-pointer appearance-none rounded-full bg-slate-300 transition checked:bg-brand-500 dark:bg-slate-600 relative after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition checked:after:translate-x-4"
              />
            </label>
            <div>
              <p className="label">{mix ? 'Escolha até 2 sabores' : 'Escolha o sabor'} <span className="text-brand-500">*</span></p>
              <div className="grid grid-cols-3 gap-2">
                {item.flavors.map((f) => {
                  const active = flavors.includes(f.id)
                  return (
                    <button
                      key={f.id}
                      onClick={() => toggleFlavor(f.id)}
                      className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                        active
                          ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                          : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {f.label}
                    </button>
                  )
                })}
              </div>
              {mix && flavors.length === 2 && (
                <p className="mt-2 text-xs text-slate-500">Metade {item.flavors.find((f) => f.id === flavors[0])?.label} + metade {item.flavors.find((f) => f.id === flavors[1])?.label}</p>
              )}
            </div>
            {item.addons?.length > 0 && (
              <div>
                <p className="label">Adicionais (inclusos)</p>
                <div className="flex flex-wrap gap-2">
                  {item.addons.map((a) => {
                    const active = addons.includes(a.id)
                    return (
                      <button
                        key={a.id}
                        onClick={() => toggleAddon(a.id)}
                        className={`chip ${active ? '!border-brand-500 !bg-brand-50 text-brand-700 dark:!bg-brand-900/30 dark:text-brand-300' : ''}`}
                      >
                        {active && <Icon.check size={14} />}
                        {a.label}{a.price ? ` +${brl(a.price)}` : ''}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {summary && (
          <p className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {summary}
          </p>
        )}

        {/* Quantidade + adicionar */}
        <div className="mt-5 flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-3">
            <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800"><Icon.minus size={18} /></button>
            <span className="w-6 text-center text-lg font-bold tabular-nums">{qty}</span>
            <button onClick={() => setQty((q) => q + 1)} className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800"><Icon.plus size={18} /></button>
          </div>
          <button onClick={add} className="btn-primary flex-1 text-base" disabled={missing}>
            <Icon.cart size={18} /> Adicionar · {brl(unit * qty)}
          </button>
        </div>
      </div>
    </Modal>
  )
}
