import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext.jsx'
import { useCart } from '../context/CartContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import { isOpenNow } from '../lib/orders.js'
import { brl } from '../lib/utils.js'
import Icon from './Icons.jsx'
import Logo from './Logo.jsx'

const nav = [
  { to: '/', label: 'Cardápio', icon: Icon.home, end: true },
  { to: '/pedidos', label: 'Pedidos', icon: Icon.receipt },
  { to: '/conta', label: 'Conta', icon: Icon.user },
]

export default function ClientLayout({ children }) {
  const { db } = useData()
  const { count, subtotal } = useCart()
  const { theme, toggle } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const open = isOpenNow(db.settings)
  const promo = db.settings?.promoOfDay
  const showCartBar = count > 0 && location.pathname !== '/carrinho' && location.pathname !== '/checkout'

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-sun-300/60 bg-sun-400 text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-2.5">
          <Logo alt="" className="h-9 w-9 shrink-0 rounded-lg object-contain" />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-extrabold">{db.settings?.shopName || 'Lanchonete Rodrigues'}</p>
            <p className="flex items-center gap-1 text-[11px] font-semibold">
              <span className={`inline-block h-2 w-2 rounded-full ${open ? 'bg-emerald-500' : 'bg-red-500'}`} />
              {open ? 'Aberto agora' : 'Fechado'} · {db.settings?.tagline || 'Espetinho & Jantinha'}
            </p>
          </div>
          <button onClick={toggle} className="rounded-lg p-1.5 hover:bg-black/10 dark:hover:bg-white/10">
            {theme === 'dark' ? <Icon.sun size={20} /> : <Icon.moon size={20} />}
          </button>
        </div>
      </header>

      {/* Banners */}
      <div className="mx-auto max-w-2xl px-4">
        {!open && (
          <div className="mt-3 rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white dark:bg-slate-800">
            🌙 Fechado agora — abrimos às {db.settings?.hours?.open || '18:00'}. Você pode montar seu pedido e enviar quando abrirmos.
          </div>
        )}
        {promo?.active && promo?.text && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-2.5 text-sm font-semibold text-brand-700 dark:bg-brand-900/25 dark:text-brand-300">
            <Icon.sparkles size={18} /> {promo.text}
          </div>
        )}
      </div>

      <main className="mx-auto max-w-2xl px-4 pb-32 pt-3">{children}</main>

      {/* Barra de carrinho flutuante */}
      {showCartBar && (
        <button
          onClick={() => navigate('/carrinho')}
          className="fixed inset-x-0 bottom-[68px] z-30 mx-auto flex max-w-2xl items-center justify-between gap-3 rounded-2xl bg-brand-500 px-4 py-3 text-white shadow-lg shadow-brand-500/40 animate-pop"
          style={{ left: 12, right: 12, width: 'calc(100% - 24px)', maxWidth: 640, marginLeft: 'auto', marginRight: 'auto' }}
        >
          <span className="flex items-center gap-2 font-bold">
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-white/25 px-1.5 text-sm">{count}</span>
            Ver carrinho
          </span>
          <span className="font-extrabold tabular-nums">{brl(subtotal)}</span>
        </button>
      )}

      {/* Bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex items-stretch justify-around border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        {nav.map((n) => {
          const active = n.end ? location.pathname === '/' : location.pathname.startsWith(n.to)
          return (
            <NavLink key={n.to} to={n.to} className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold ${active ? 'text-brand-500' : 'text-slate-400'}`}>
              <n.icon size={22} />
              {n.label}
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}
