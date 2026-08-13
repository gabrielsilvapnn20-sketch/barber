import { useMemo } from 'react'
import { useData } from '../../context/DataContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { PageHeader } from '../../components/ui.jsx'
import Icon from '../../components/Icons.jsx'
import { brl } from '../../lib/utils.js'

export default function Stock() {
  const { db, toggleItemAvailable } = useData()
  const toast = useToast()

  const categories = useMemo(() => [...db.categories].sort((a, b) => (a.order || 0) - (b.order || 0)), [db.categories])
  const outCount = db.items.filter((i) => !i.available).length

  return (
    <div>
      <PageHeader title="Estoque" subtitle={outCount ? `${outCount} item(ns) esgotado(s)` : 'Tudo disponível'} />

      <div className="mb-3 rounded-xl bg-azure-50 px-3 py-2.5 text-sm text-azure-700 dark:bg-azure-900/20 dark:text-azure-300">
        Toque para marcar como <b>esgotado</b> ou <b>disponível</b> — o cardápio do cliente atualiza na hora.
      </div>

      {categories.map((cat) => {
        const items = db.items.filter((i) => i.categoryId === cat.id)
        if (!items.length) return null
        return (
          <div key={cat.id} className="mb-4">
            <p className="mb-2 font-bold">{cat.emoji} {cat.name}</p>
            <div className="space-y-2">
              {items.map((it) => (
                <div key={it.id} className="card flex items-center gap-3 p-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sun-300 to-sun-500 text-xl">{it.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{it.name}</p>
                    <p className="text-xs text-slate-400">{brl(it.price)}</p>
                  </div>
                  <button
                    onClick={() => { toggleItemAvailable(it.id); toast.success(`${it.name}: ${it.available ? 'esgotado' : 'disponível'}`) }}
                    className={`relative h-8 w-14 shrink-0 rounded-full transition ${it.available ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                    aria-label="Alternar disponibilidade"
                  >
                    <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${it.available ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
