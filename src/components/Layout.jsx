import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import { useData } from '../context/DataContext.jsx'
import Icon from './Icons.jsx'
import { Avatar } from './ui.jsx'

const ownerNav = [
  { to: '/', label: 'Dashboard', icon: Icon.dashboard, end: true },
  { to: '/agenda', label: 'Agenda', icon: Icon.calendar },
  { to: '/fila', label: 'Fila', icon: Icon.queue },
  { to: '/lancar', label: 'Lançar', icon: Icon.scissors },
  { to: '/clientes', label: 'Clientes', icon: Icon.users },
  { to: '/equipe', label: 'Equipe', icon: Icon.user },
  { to: '/financeiro', label: 'Financeiro', icon: Icon.money },
  { to: '/despesas', label: 'Despesas', icon: Icon.wallet },
  { to: '/metas', label: 'Metas', icon: Icon.target },
  { to: '/caixa', label: 'Caixa', icon: Icon.cash },
  { to: '/comissoes', label: 'Comissões', icon: Icon.tag },
  { to: '/galeria', label: 'Portfólio', icon: Icon.camera },
  { to: '/lembretes', label: 'Lembretes', icon: Icon.bell },
  { to: '/config', label: 'Configurações', icon: Icon.settings },
]

const barberNav = [
  { to: '/', label: 'Meu Painel', icon: Icon.dashboard, end: true },
  { to: '/agenda', label: 'Agenda', icon: Icon.calendar },
  { to: '/fila', label: 'Fila', icon: Icon.queue },
  { to: '/lancar', label: 'Lançar', icon: Icon.scissors },
  { to: '/clientes', label: 'Clientes', icon: Icon.users },
  { to: '/galeria', label: 'Portfólio', icon: Icon.camera },
]

// bottom-bar items (subset for mobile)
const bottomOwner = ['/', '/agenda', '/lancar', '/financeiro', '/equipe']
const bottomBarber = ['/', '/agenda', '/lancar', '/clientes', '/galeria']

export default function Layout({ children }) {
  const { user, isOwner, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const { db } = useData()
  const [open, setOpen] = useState(false)
  const location = useLocation()

  const nav = isOwner ? ownerNav : barberNav
  const bottomSet = isOwner ? bottomOwner : bottomBarber
  const bottom = nav.filter((n) => bottomSet.includes(n.to))

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex dark:border-slate-800 dark:bg-slate-900">
        <Brand shopName={db.settings?.shopName} />
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {nav.map((n) => (
            <NavItem key={n.to} {...n} />
          ))}
        </nav>
        <UserFooter user={user} isOwner={isOwner} onLogout={logout} theme={theme} onToggle={toggle} />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-white shadow-xl animate-fade-in dark:bg-slate-900">
            <Brand shopName={db.settings?.shopName} onClose={() => setOpen(false)} />
            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2" onClick={() => setOpen(false)}>
              {nav.map((n) => (
                <NavItem key={n.to} {...n} />
              ))}
            </nav>
            <UserFooter user={user} isOwner={isOwner} onLogout={logout} theme={theme} onToggle={toggle} />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="lg:pl-64">
        {/* Top bar (mobile) */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur lg:hidden dark:border-slate-800 dark:bg-slate-950/80">
          <button onClick={() => setOpen(true)} className="shrink-0 rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800">
            <Icon.menu />
          </button>
          <div className="flex min-w-0 flex-1 items-center justify-center gap-2 px-2 font-bold">
            <img src="/logo.svg" alt="" className="h-7 w-7 shrink-0 rounded-md" />
            <span className="truncate">{db.settings?.shopName || 'João Victor Barbershop'}</span>
          </div>
          <button onClick={toggle} className="shrink-0 rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800">
            {theme === 'dark' ? <Icon.sun /> : <Icon.moon />}
          </button>
        </header>

        <main className="mx-auto max-w-6xl px-4 pb-28 pt-5 lg:pb-10">
          {children}
        </main>
      </div>

      {/* Bottom nav (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex items-stretch justify-around border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden dark:border-slate-800 dark:bg-slate-950/95">
        {bottom.map((n) => {
          const active = n.end ? location.pathname === '/' : location.pathname.startsWith(n.to)
          return (
            <NavLink
              key={n.to}
              to={n.to}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold ${
                active ? 'text-brand-500' : 'text-slate-400'
              }`}
            >
              <n.icon size={22} />
              {n.label}
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}

function Brand({ shopName, onClose }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
      <div className="flex min-w-0 items-center gap-2.5">
        <img src="/logo.svg" alt="" className="h-9 w-9 shrink-0 rounded-lg" />
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-extrabold">{shopName || 'João Victor Barbershop'}</p>
          <p className="text-[11px] text-slate-400">Gestão</p>
        </div>
      </div>
      {onClose && (
        <button onClick={onClose} className="rounded-lg p-1 text-slate-400 lg:hidden">
          <Icon.close />
        </button>
      )}
    </div>
  )
}

function NavItem({ to, label, icon: I, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
          isActive
            ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/30'
            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
        }`
      }
    >
      <I size={20} />
      {label}
    </NavLink>
  )
}

function UserFooter({ user, isOwner, onLogout, theme, onToggle }) {
  return (
    <div className="border-t border-slate-200 p-3 dark:border-slate-800">
      <div className="mb-2 flex items-center gap-3 rounded-xl px-2 py-1.5">
        <Avatar name={user?.name} color={user?.color} size={38} />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm font-bold">{user?.name}</p>
          <span className={`badge ${isOwner ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300' : 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300'}`}>
            {isOwner ? 'Dono' : 'Barbeiro'}
          </span>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={onToggle} className="btn-ghost flex-1 !py-2 !text-xs">
          {theme === 'dark' ? <Icon.sun size={16} /> : <Icon.moon size={16} />}
          {theme === 'dark' ? 'Claro' : 'Escuro'}
        </button>
        <button onClick={onLogout} className="btn-ghost flex-1 !py-2 !text-xs">
          <Icon.logout size={16} /> Sair
        </button>
      </div>
    </div>
  )
}
