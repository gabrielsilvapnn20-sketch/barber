import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../../context/DataContext.jsx'
import { useCart } from '../../context/CartContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { PageHeader, EmptyState } from '../../components/ui.jsx'
import { QtyStepper } from '../../components/FoodUI.jsx'
import Icon from '../../components/Icons.jsx'
import { brl } from '../../lib/utils.js'

export default function Cart() {
  const { db, itemById } = useData()
  const { lines, subtotal, inc, dec, removeLine, addItem } = useCart()
  const toast = useToast()
  const navigate = useNavigate()

  // Upsell contextual (sugestões relevantes antes de finalizar).
  const suggestions = useMemo(() => {
    if (!lines.length) return []
    const out = []
    const cats = lines.map((l) => itemById(l.itemId)?.categoryId)
    const hasDrink = cats.includes('cat_bebidas')
    const hasMeal = cats.includes('cat_jantinha')
    const hasEspeto = cats.includes('cat_espetos')

    if (!hasDrink) {
      const drink = db.items.find((i) => i.id === 'it_coca_lata' && i.available) || db.items.find((i) => i.categoryId === 'cat_bebidas' && i.available)
      if (drink) out.push({ key: 'drink', text: `Add uma ${drink.name} gelada?`, price: drink.price, item: drink })
    }
    if (hasEspeto && !hasMeal) {
      const jantinha = db.items.find((i) => i.id === 'it_jantinha' && i.available)
      if (jantinha) out.push({ key: 'combo', text: `Que tal transformar em Jantinha completa?`, price: jantinha.price, item: jantinha, build: true })
    }
    return out.slice(0, 2)
  }, [lines, db.items, itemById])

  if (!lines.length) {
    return (
      <div>
        <PageHeader title="Seu carrinho" />
        <EmptyState
          icon={<Icon.cart size={40} />}
          title="Carrinho vazio"
          subtitle="Adicione espetos, jantinhas ou caldos do cardápio."
          action={<button className="btn-primary" onClick={() => navigate('/')}>Ver cardápio</button>}
        />
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Seu carrinho" subtitle={`${lines.reduce((s, l) => s + l.qty, 0)} item(ns)`} />

      <div className="space-y-2">
        {lines.map((l) => (
          <div key={l.uid} className="card flex items-center gap-3 p-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sun-300 to-sun-500 text-2xl">{l.emoji || '🍢'}</div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold leading-tight">{l.name}</p>
              {l.summary && <p className="truncate text-xs text-slate-500 dark:text-slate-400">{l.summary}</p>}
              <p className="price mt-0.5 text-sm">{brl(l.lineTotal)}</p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <QtyStepper qty={l.qty} onInc={() => inc(l.uid)} onDec={() => dec(l.uid)} size="sm" />
              <button onClick={() => removeLine(l.uid)} className="text-xs font-semibold text-slate-400 hover:text-red-500">Remover</button>
            </div>
          </div>
        ))}
      </div>

      {/* Upsell */}
      {suggestions.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
            <Icon.sparkles size={15} /> Que tal adicionar?
          </p>
          <div className="space-y-2">
            {suggestions.map((s) => (
              <div key={s.key} className="flex items-center gap-2 rounded-xl border border-dashed border-brand-300 bg-brand-50/50 p-2.5 dark:border-brand-800 dark:bg-brand-900/15">
                <span className="min-w-0 flex-1 text-sm font-medium">{s.text}</span>
                <button
                  onClick={() => {
                    if (s.build) { navigate('/'); return }
                    addItem(s.item, { qty: 1 })
                    toast.success(`${s.item.name} adicionado 🛒`)
                  }}
                  className="btn-primary !px-3 !py-1.5 text-xs"
                >
                  {s.build ? 'Ver' : `+ ${brl(s.price)}`}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resumo + CTA */}
      <div className="mt-5 card">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500 dark:text-slate-400">Subtotal</span>
          <span className="font-bold tabular-nums">{brl(subtotal)}</span>
        </div>
        <p className="mt-1 text-xs text-slate-400">A taxa de entrega é calculada no próximo passo.</p>
        <button onClick={() => navigate('/checkout')} className="btn-primary mt-3 w-full text-base">
          Finalizar pedido <Icon.chevronRight size={18} />
        </button>
        <button onClick={() => navigate('/')} className="btn-ghost mt-2 w-full">Continuar comprando</button>
      </div>
    </div>
  )
}
