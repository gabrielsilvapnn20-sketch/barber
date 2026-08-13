import { useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import { useData } from '../context/DataContext.jsx'
import Icon from './Icons.jsx'
import Logo from './Logo.jsx'

const nav = [
  { to: '/gestor', label: 'Painel', icon: Icon.dashboard, end: true },
  { to: '/gestor/pedidos', label: 'Pedidos', icon: Icon.receipt, badge: 'orders' },
  { to: '/gestor/estoque', label: 'Estoque', icon: Icon.box },
  { to: '/gestor/financeiro', label: 'Financeiro', icon: Icon.money },
  { to: '/gestor/caixa', label: 'Caixa', icon: Icon.cash },
  { to: '/gestor/mensagens', label: 'Mensagens', icon: Icon.chat, badge: 'msgs' },
  { to: '/gestor/config', label: 'Configurações', icon: Icon.settings },
]

const bottomSet = ['/gestor', '/gestor/pedidos', '/gestor/estoque', '/gestor/financeiro', '/gestor/caixa']

export default function ManagerLayout({ children }) {
  const { logoutManager } = useAuth()
  const { theme, toggle } = useTheme()
  const { db, activeOrders, unreadMessages } = useData()
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  const badgeVal = (b) => (b === 'orders' ? activeOrders.length : b === 'msgs' ? unreadMessages : 0)
  const bottom = nav.filter((n) => bottomSet.includes(n.to))

  const Sidebar = ({ onClose }) => (
    <>
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <div className="flex min-w-0 items-center gap-2.5">
          <Logo alt="" className="h-9 w-9 shrink-0 rounded-lg object-contain" />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-extrabold">{db.settings?.shopName || 'Lanchonete Rodrigues'}</p>
            <p className="text-[11px] text-slate-400">Painel do gestor</p>
          </div>
        </div>
        {onClose && <button onClick={onClose} className="rounded-lg p-1 text-slate-400 lg:hidden"><Icon.close /></button>}
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2" onClick={onClose}>
        {nav.map((n) => {
          const b = badgeVal(n.badge)
          return (
            <NavLink key={n.to} to={n.to} end={n.end}
              className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${isActive ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/30' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}>
              <n.icon size={20} />
              <span className="flex-1">{n.label}</span>
              {b > 0 && <span className="badge bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">{b}</span>}
            </NavLink>
          )
        })}
      </nav>
      <div className="space-y-2 border-t border-slate-200 p-3 dark:border-slate-800">
        <button onClick={() => navigate('/')} className="btn-ghost w-full !py-2 !text-xs"><Icon.store size={16} /> Ver a loja</button>
        <div className="flex gap-2">
          <button onClick={toggle} className="btn-ghost flex-1 !py-2 !text-xs">{theme === 'dark' ? <Icon.sun size={16} /> : <Icon.moon size={16} />}{theme === 'dark' ? 'Claro' : 'Escuro'}</button>
          <button onClick={() => { logoutManager(); navigate('/') }} className="btn-ghost flex-1 !py-2 !text-xs"><Icon.logout size={16} /> Sair</button>
        </div>
      </div>
    </>
  )

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex dark:border-slate-800 dark:bg-slate-900">
        <Sidebar />
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-white shadow-xl animate-fade-in dark:bg-slate-900">
            <Sidebar onClose={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur lg:hidden dark:border-slate-800 dark:bg-slate-950/80">
          <button onClick={() => setOpen(true)} className="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"><Icon.menu /></button>
          <div className="flex min-w-0 flex-1 items-center justify-center gap-2 px-2 font-bold">
            <Logo alt="" className="h-7 w-7 shrink-0 rounded-md object-contain" />
            <span className="truncate">Painel</span>
          </div>
          <button onClick={toggle} className="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800">{theme === 'dark' ? <Icon.sun /> : <Icon.moon />}</button>
        </header>

        <main className="mx-auto max-w-6xl px-4 pb-28 pt-5 lg:pb-10">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 flex items-stretch justify-around border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden dark:border-slate-800 dark:bg-slate-950/95">
        {bottom.map((n) => {
          const active = n.end ? location.pathname === '/gestor' : location.pathname.startsWith(n.to)
          const b = badgeVal(n.badge)
          return (
            <NavLink key={n.to} to={n.to} className={`relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold ${active ? 'text-brand-500' : 'text-slate-400'}`}>
              <n.icon size={22} />
              {b > 0 && <span className="absolute right-1/4 top-1.5 h-4 min-w-4 rounded-full bg-brand-500 px-1 text-[9px] leading-4 text-white">{b}</span>}
              {n.label}
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}
