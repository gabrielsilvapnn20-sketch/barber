import { useState, useEffect } from 'react'
import { useData } from '../context/DataContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { PageHeader, Field } from '../components/ui.jsx'
import Icon from '../components/Icons.jsx'

export default function Config() {
  const { db, setDb, resetData, patch } = useData()
  const { theme, toggle } = useTheme()
  const { user } = useAuth()
  const toast = useToast()
  const [shopName, setShopName] = useState(db.settings?.shopName || '')
  const [pin, setPin] = useState(user.pin || '')
  const [installEvt, setInstallEvt] = useState(null)

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault()
      setInstallEvt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const saveShop = () => {
    setDb((prev) => ({ ...prev, settings: { ...prev.settings, shopName } }))
    toast.success('Configurações salvas.')
  }

  const savePin = () => {
    if (pin.length !== 4) return toast.error('O PIN deve ter 4 dígitos.')
    patch('users', user.id, { pin })
    toast.success('PIN atualizado.')
  }

  const install = async () => {
    if (!installEvt) return toast.info('Use o menu do navegador → "Instalar app".')
    installEvt.prompt()
    await installEvt.userChoice
    setInstallEvt(null)
  }

  return (
    <div>
      <PageHeader title="Configurações" subtitle="Ajustes gerais do sistema" />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h3 className="mb-3 font-bold">Barbearia</h3>
          <Field label="Nome da barbearia">
            <div className="flex gap-2">
              <input className="input" value={shopName} onChange={(e) => setShopName(e.target.value)} />
              <button className="btn-primary !px-4" onClick={saveShop}><Icon.check size={18} /></button>
            </div>
          </Field>
        </div>

        <div className="card">
          <h3 className="mb-3 font-bold">Aparência</h3>
          <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
            <div className="flex items-center gap-2">
              {theme === 'dark' ? <Icon.moon size={18} /> : <Icon.sun size={18} />}
              <span className="text-sm font-medium">Tema {theme === 'dark' ? 'escuro' : 'claro'}</span>
            </div>
            <button onClick={toggle} className="btn-ghost !py-1.5 !text-xs">Alternar</button>
          </div>
        </div>

        <div className="card">
          <h3 className="mb-3 font-bold">PIN de acesso rápido</h3>
          <Field label="Seu PIN (4 dígitos)">
            <div className="flex gap-2">
              <input className="input" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} placeholder="0000" />
              <button className="btn-primary !px-4" onClick={savePin}><Icon.check size={18} /></button>
            </div>
          </Field>
          <p className="mt-2 text-xs text-slate-400">Use o PIN para entrar rapidamente no dia a dia.</p>
        </div>

        <div className="card">
          <h3 className="mb-3 font-bold">Aplicativo (PWA)</h3>
          <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">Instale na tela inicial do celular para usar como app nativo, mesmo offline.</p>
          <button className="btn-primary w-full" onClick={install}><Icon.download size={18} /> Instalar aplicativo</button>
        </div>

        <div className="card lg:col-span-2 border-red-200 dark:border-red-900/50">
          <h3 className="mb-1 font-bold text-red-600 dark:text-red-400">Zona de perigo</h3>
          <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">Restaura os dados de demonstração. Todos os lançamentos atuais serão perdidos.</p>
          <button
            className="btn-danger"
            onClick={() => {
              if (confirm('Tem certeza? Isso apaga todos os dados atuais e restaura a demonstração.')) {
                resetData()
                toast.info('Dados restaurados para a demonstração.')
              }
            }}
          >
            <Icon.trash size={16} /> Restaurar dados de demonstração
          </button>
        </div>
      </div>

      <div className="mt-6 text-center text-xs text-slate-400">
        <p>Barbearia — Sistema de Gestão · v1.0.0</p>
        <p className="mt-1">Dados armazenados localmente no dispositivo (offline-first).</p>
      </div>
    </div>
  )
}
