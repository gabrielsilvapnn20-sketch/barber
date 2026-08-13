import Icon from './Icons.jsx'
import { STATUS_META } from '../lib/orders.js'
import { brl } from '../lib/utils.js'

// Imagem do prato. Se houver foto real (item.photo), usa; senão mostra um bloco
// apetitoso com o emoji da categoria (fallback bonito, não imagem genérica).
export function ItemImage({ item, className = '', rounded = 'rounded-2xl' }) {
  if (item?.photo) {
    return <img src={item.photo} alt={item.name} className={`h-full w-full object-cover ${rounded} ${className}`} />
  }
  return (
    <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br from-sun-300 to-sun-500 ${rounded} ${className}`}>
      <span className="text-4xl drop-shadow-sm sm:text-5xl">{item?.emoji || '🍢'}</span>
    </div>
  )
}

const TONES = {
  azure: 'bg-azure-100 text-azure-700 dark:bg-azure-900/40 dark:text-azure-300',
  sun: 'bg-sun-100 text-sun-700 dark:bg-sun-900/40 dark:text-sun-300',
  brand: 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300',
  green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  slate: 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
}

export function StatusPill({ status, client = false }) {
  const m = STATUS_META[status] || STATUS_META.novo
  return (
    <span className={`badge ${TONES[m.tone] || TONES.slate}`}>
      <span className="mr-1">{m.emoji}</span>
      {client ? m.clientLabel : m.short}
    </span>
  )
}

export function QtyStepper({ qty, onInc, onDec, size = 'md' }) {
  const s = size === 'sm' ? 'h-7 w-7' : 'h-9 w-9'
  return (
    <div className="inline-flex items-center gap-2">
      <button onClick={onDec} className={`${s} flex items-center justify-center rounded-full bg-slate-100 text-slate-700 transition active:scale-90 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200`}>
        <Icon.minus size={16} />
      </button>
      <span className="w-5 text-center font-bold tabular-nums">{qty}</span>
      <button onClick={onInc} className={`${s} flex items-center justify-center rounded-full bg-brand-500 text-white transition active:scale-90 hover:bg-brand-600`}>
        <Icon.plus size={16} />
      </button>
    </div>
  )
}

export function Stars({ value = 0, onChange, size = 22 }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange?.(n)}
          disabled={!onChange}
          className={n <= value ? 'text-sun-500' : 'text-slate-300 dark:text-slate-600'}
        >
          <Icon.star size={size} style={n <= value ? { fill: 'currentColor' } : undefined} />
        </button>
      ))}
    </div>
  )
}

export { brl }
