import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { useData } from '../../context/DataContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import Logo from '../../components/Logo.jsx'
import Icon from '../../components/Icons.jsx'

export default function ManagerLogin() {
  const { loginManager } = useAuth()
  const { db } = useData()
  const toast = useToast()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const submit = (e) => {
    e.preventDefault()
    if (loginManager(password)) {
      toast.success('Painel liberado 🔓')
      navigate('/gestor')
    } else {
      setError('Senha incorreta.')
      setPassword('')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-brand-900 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center text-white">
          <Logo alt="" className="mx-auto mb-3 h-24 w-24 rounded-2xl object-contain shadow-lg" />
          <h1 className="text-xl font-extrabold">{db.settings?.shopName || 'Lanchonete Rodrigues'}</h1>
          <p className="text-sm text-slate-400">Painel do gestor</p>
        </div>
        <form onSubmit={submit} className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl backdrop-blur">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">Senha de acesso</label>
          <input type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError('') }} autoFocus
            placeholder="••••••" className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-white outline-none focus:border-brand-500" />
          {error && <p className="mt-2 text-sm font-medium text-red-400">{error}</p>}
          <button type="submit" className="btn-primary mt-4 w-full">Entrar</button>
          <button type="button" onClick={() => navigate('/')} className="mt-3 flex w-full items-center justify-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white">
            <Icon.store size={14} /> Voltar à loja
          </button>
          <p className="mt-4 text-center text-[11px] text-slate-600">Demonstração — senha padrão: <span className="font-mono text-slate-400">123456</span></p>
        </form>
      </div>
    </div>
  )
}
