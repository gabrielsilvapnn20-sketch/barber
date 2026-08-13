import { useMemo, useRef, useState } from 'react'
import { useData } from '../../context/DataContext.jsx'
import { useCart } from '../../context/CartContext.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { ItemImage } from '../../components/FoodUI.jsx'
import ItemBuilder from '../../components/ItemBuilder.jsx'
import Icon from '../../components/Icons.jsx'
import { brl } from '../../lib/utils.js'

export default function Menu() {
  const { db } = useData()
  const { addItem } = useCart()
  const { customer, toggleFavorite } = useAuth()
  const toast = useToast()
  const [builderItem, setBuilderItem] = useState(null)
  const sectionRefs = useRef({})

  const categories = useMemo(
    () => [...db.categories].sort((a, b) => (a.order || 0) - (b.order || 0)),
    [db.categories],
  )

  const quickAdd = (item) => {
    addItem(item, { qty: 1 })
    toast.success(`${item.name} no carrinho 🛒`)
  }

  const scrollTo = (catId) => {
    sectionRefs.current[catId]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div>
      {/* Navegação rápida por categoria */}
      <div className="sticky top-[57px] z-10 -mx-4 mb-2 overflow-x-auto bg-slate-100/90 px-4 py-2 backdrop-blur dark:bg-slate-950/90">
        <div className="flex gap-2">
          {categories.map((c) => (
            <button key={c.id} onClick={() => scrollTo(c.id)} className="chip shrink-0 whitespace-nowrap">
              <span>{c.emoji}</span> {c.name}
            </button>
          ))}
        </div>
      </div>

      {categories.map((cat) => {
        const items = db.items.filter((i) => i.categoryId === cat.id)
        if (!items.length) return null
        return (
          <section key={cat.id} ref={(el) => (sectionRefs.current[cat.id] = el)} className="mb-6 scroll-mt-28">
            <div className="mb-2 flex items-baseline gap-2">
              <h2 className="text-lg font-extrabold">{cat.emoji} {cat.name}</h2>
              {cat.desc && <span className="truncate text-xs text-slate-400">{cat.desc}</span>}
            </div>
            <div className="space-y-3">
              {items.map((item) => (
                <MenuCard
                  key={item.id}
                  item={item}
                  fav={customer?.favorites?.includes(item.id)}
                  onFav={customer ? () => toggleFavorite(item.id) : null}
                  onAdd={() => (item.build === 'simple' ? quickAdd(item) : setBuilderItem(item))}
                />
              ))}
            </div>
          </section>
        )
      })}

      <ItemBuilder item={builderItem} open={!!builderItem} onClose={() => setBuilderItem(null)} />
    </div>
  )
}

function MenuCard({ item, fav, onFav, onAdd }) {
  const out = !item.available
  return (
    <div className={`card flex items-center gap-3 p-3 ${out ? 'opacity-70' : ''}`}>
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl">
        <ItemImage item={item} rounded="rounded-xl" />
        {out && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-slate-900/60 text-center text-[10px] font-bold leading-tight text-white">
            Esgotado<br />por hoje
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="font-bold leading-tight">{item.name}</p>
          {onFav && (
            <button onClick={onFav} className={fav ? 'text-brand-500' : 'text-slate-300 dark:text-slate-600'}>
              <Icon.heart size={18} style={fav ? { fill: 'currentColor' } : undefined} />
            </button>
          )}
        </div>
        <p className="mt-0.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{item.desc}</p>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <span className="price text-base">{brl(item.price)}{item.build !== 'simple' && <span className="text-xs font-medium text-slate-400"> +</span>}</span>
          <button
            onClick={onAdd}
            disabled={out}
            className={`${out ? 'btn-ghost' : 'btn-primary'} !px-3 !py-2 text-xs`}
          >
            {out ? 'Esgotado' : item.build === 'simple' ? <><Icon.plus size={15} /> Adicionar</> : <><Icon.flame size={15} /> Montar</>}
          </button>
        </div>
      </div>
    </div>
  )
}
