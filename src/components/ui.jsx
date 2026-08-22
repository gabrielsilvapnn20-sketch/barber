import { useEffect, useState } from 'react'
import { initials, colorFrom, paymentLabelOf } from '../lib/utils.js'
import Icon from './Icons.jsx'

// Etiqueta leve da forma de pagamento de um lançamento
export function PayTag({ t, className = '' }) {
  const label = paymentLabelOf(t)
  const tone =
    {
      PIX: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
      Dinheiro: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
      Débito: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
      Crédito: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
      Misto: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
      Pacote: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
    }[label] || 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${tone} ${className}`}>
      {label}
    </span>
  )
}

export function Avatar({ name = '', color, size = 40, src }) {
  const bg = color || colorFrom(name)
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        style={{ width: size, height: size }}
        className="rounded-full object-cover"
      />
    )
  }
  return (
    <div
      className="flex items-center justify-center rounded-full font-bold text-white"
      style={{ width: size, height: size, background: bg, fontSize: size * 0.38 }}
    >
      {initials(name) || '?'}
    </div>
  )
}

export function StatCard({ icon, label, value, hint, tone = 'brand' }) {
  const tones = {
    brand: 'from-brand-500/15 to-brand-500/5 text-brand-600 dark:text-brand-400',
    green: 'from-emerald-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-400',
    amber: 'from-amber-500/15 to-amber-500/5 text-amber-600 dark:text-amber-400',
    violet: 'from-violet-500/15 to-violet-500/5 text-violet-600 dark:text-violet-400',
    red: 'from-red-500/15 to-red-500/5 text-red-600 dark:text-red-400',
  }
  return (
    <div className="card overflow-hidden">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {label}
          </p>
          <p className="mt-1.5 text-lg font-extrabold leading-tight tracking-tight tabular-nums sm:text-2xl">
            {value}
          </p>
          {hint && <p className="mt-1 truncate text-xs text-slate-400">{hint}</p>}
        </div>
        <div className={`shrink-0 rounded-xl bg-gradient-to-br p-2.5 ${tones[tone]}`}>{icon}</div>
      </div>
    </div>
  )
}

export function Modal({ open, onClose, title, children, footer, wide }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl animate-fade-in dark:bg-slate-900 sm:rounded-2xl ${
          wide ? 'sm:max-w-2xl' : 'sm:max-w-md'
        }`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <Icon.close />
          </button>
        </div>
        <div>{children}</div>
        {footer && <div className="mt-5 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  )
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-3">
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-xl font-extrabold tracking-tight sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-0.5 truncate text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export function EmptyState({ icon, title, subtitle, action }) {
  return (
    <div className="card flex flex-col items-center justify-center gap-2 py-12 text-center">
      <div className="text-slate-300 dark:text-slate-600">{icon}</div>
      <p className="font-semibold">{title}</p>
      {subtitle && <p className="max-w-xs text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export function Segmented({ value, onChange, options }) {
  return (
    <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            value === o.value
              ? 'bg-white text-brand-600 shadow-sm dark:bg-slate-700 dark:text-brand-300'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Progress({ value, max, tone = 'bg-brand-500' }) {
  const pctv = Math.min(100, max > 0 ? (value / max) * 100 : 0)
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
      <div className={`h-full rounded-full transition-all ${tone}`} style={{ width: `${pctv}%` }} />
    </div>
  )
}

export function Field({ label, children }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  )
}

export function Accordion({ title, icon, children, defaultOpen = false, right }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-semibold"
      >
        {icon && <span className="text-slate-400">{icon}</span>}
        <span className="flex-1 text-left">{title}</span>
        {right}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && <div className="border-t border-slate-100 p-3 dark:border-slate-800">{children}</div>}
    </div>
  )
}

// Stepper de quantidade (− valor +)
export function Stepper({ value, onChange, min = 1, max = 99 }) {
  return (
    <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        className="px-2.5 py-1 text-lg font-bold text-slate-500 disabled:opacity-30"
        disabled={value <= min}
      >
        −
      </button>
      <span className="min-w-[28px] text-center text-sm font-bold tabular-nums">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        className="px-2.5 py-1 text-lg font-bold text-slate-500 disabled:opacity-30"
        disabled={value >= max}
      >
        +
      </button>
    </div>
  )
}
