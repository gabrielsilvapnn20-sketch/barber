import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useData } from '../context/DataContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import Icon from '../components/Icons.jsx'
import { Modal } from '../components/ui.jsx'

export default function Login() {
  const { login, loginWithPin } = useAuth()
  const { db } = useData()
  const toast = useToast()
  const [mode, setMode] = useState('password') // 'password' | 'pin'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [recover, setRecover] = useState(false)

  const submit = (e) => {
    e.preventDefault()
    setError('')
    const res = login(email, password)
    if (!res.ok) setError(res.error)
    else toast.success(`Bem-vindo, ${res.user.name.split(' ')[0]}!`)
  }

  const pushPin = (n) => {
    if (pin.length >= 4) return
    const next = pin + n
    setPin(next)
    setError('')
    if (next.length === 4) {
      const res = loginWithPin(next)
      if (!res.ok) {
        setError(res.error)
        setTimeout(() => setPin(''), 500)
      } else {
        toast.success(`Olá, ${res.user.name.split(' ')[0]}!`)
      }
    }
  }

  const quickFill = (u) => {
    setEmail(u.email)
    setPassword(u.password)
    setMode('password')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-brand-950 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center text-white">
          <img
            src="/logo.svg"
            alt={db.settings?.shopName || 'João Victor Barbershop'}
            className="mx-auto mb-3 h-28 w-28 rounded-full bg-white/5 shadow-lg shadow-black/40 ring-1 ring-white/10"
          />
          <h1 className="text-2xl font-extrabold">{db.settings?.shopName || 'João Victor Barbershop'}</h1>
          <p className="text-sm text-slate-400">Sistema de gestão</p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl backdrop-blur">
          <div className="mb-5 flex rounded-xl bg-slate-800 p-1">
            {[
              { v: 'password', l: 'E-mail e senha' },
              { v: 'pin', l: 'PIN rápido' },
            ].map((t) => (
              <button
                key={t.v}
                onClick={() => {
                  setMode(t.v)
                  setError('')
                }}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
                  mode === t.v ? 'bg-brand-500 text-white' : 'text-slate-400'
                }`}
              >
                {t.l}
              </button>
            ))}
          </div>

          {mode === 'password' ? (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                  E-mail
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@barbearia.com"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-sm text-white outline-none focus:border-brand-500"
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Senha
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-sm text-white outline-none focus:border-brand-500"
                  required
                />
              </div>
              {error && <p className="text-sm font-medium text-red-400">{error}</p>}
              <button type="submit" className="btn-primary w-full">
                Entrar
              </button>
              <button
                type="button"
                onClick={() => setRecover(true)}
                className="w-full text-center text-xs font-medium text-slate-400 hover:text-brand-400"
              >
                Esqueci minha senha
              </button>
            </form>
          ) : (
            <div className="space-y-5">
              <p className="text-center text-sm text-slate-400">Digite seu PIN de 4 dígitos</p>
              <div className="flex justify-center gap-3">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`h-4 w-4 rounded-full border-2 transition ${
                      pin.length > i ? 'border-brand-500 bg-brand-500' : 'border-slate-600'
                    }`}
                  />
                ))}
              </div>
              {error && <p className="text-center text-sm font-medium text-red-400">{error}</p>}
              <div className="mx-auto grid max-w-[240px] grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                  <PinKey key={n} onClick={() => pushPin(String(n))}>
                    {n}
                  </PinKey>
                ))}
                <div />
                <PinKey onClick={() => pushPin('0')}>0</PinKey>
                <PinKey onClick={() => setPin((p) => p.slice(0, -1))}>
                  <Icon.close size={20} />
                </PinKey>
              </div>
            </div>
          )}
        </div>

        {/* Demo quick access */}
        <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
          <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
            Acesso de demonstração
          </p>
          <div className="space-y-1.5">
            {db.users.map((u) => (
              <button
                key={u.id}
                onClick={() => quickFill(u)}
                className="flex w-full items-center justify-between rounded-lg bg-slate-800/60 px-3 py-2 text-left text-xs text-slate-300 hover:bg-slate-800"
              >
                <span>
                  <span className="font-semibold text-white">{u.name}</span>{' '}
                  <span className="text-slate-500">({u.role === 'owner' ? 'Dono' : 'Barbeiro'})</span>
                </span>
                <span className="font-mono text-slate-500">PIN {u.pin}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <Modal
        open={recover}
        onClose={() => setRecover(false)}
        title="Recuperar senha"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setRecover(false)}>
              Fechar
            </button>
            <button
              className="btn-primary"
              onClick={() => {
                toast.success('Link de recuperação enviado (simulado)')
                setRecover(false)
              }}
            >
              Enviar link
            </button>
          </>
        }
      >
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          Escolha como deseja receber o link de redefinição de senha.
        </p>
        <div className="space-y-2">
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
            <input type="radio" name="rec" defaultChecked className="accent-brand-500" />
            <Icon.money size={18} />
            <span className="text-sm font-medium">Por e-mail</span>
          </label>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
            <input type="radio" name="rec" className="accent-brand-500" />
            <Icon.phone size={18} />
            <span className="text-sm font-medium">Por WhatsApp</span>
          </label>
        </div>
      </Modal>
    </div>
  )
}

function PinKey({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex h-16 items-center justify-center rounded-2xl bg-slate-800 text-xl font-bold text-white transition active:scale-95 hover:bg-slate-700"
    >
      {children}
    </button>
  )
}
