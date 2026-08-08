import { useState } from 'react'
import { useData } from '../context/DataContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { usePWA } from '../context/PWAContext.jsx'
import { PageHeader, Field } from '../components/ui.jsx'
import Icon from '../components/Icons.jsx'
import { showLocalNotification } from '../lib/notifications.js'

export default function Config() {
  const { db, setDb, resetData, patch } = useData()
  const { theme, toggle } = useTheme()
  const { user } = useAuth()
  const toast = useToast()
  const {
    standalone,
    canPromptInstall,
    promptInstall,
    permission,
    notificationsSupported,
    enableNotifications,
    platform,
  } = usePWA()
  const [shopName, setShopName] = useState(db.settings?.shopName || '')
  const [pin, setPin] = useState(user.pin || '')

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
    if (standalone) return toast.info('O app já está instalado. 🎉')
    if (!canPromptInstall) {
      return toast.info(
        platform.isIOS
          ? 'No iPhone: toque em Compartilhar → "Adicionar à Tela de Início".'
          : 'Use o menu do navegador → "Instalar app".',
      )
    }
    const res = await promptInstall()
    if (res.outcome === 'accepted') toast.success('App instalado!')
  }

  const enableNotifs = async () => {
    if (!standalone && platform.isIOS)
      return toast.error('No iPhone, instale o app na tela inicial antes de ativar notificações.')
    const r = await enableNotifications()
    if (r === 'granted') toast.success('Notificações ativadas!')
    else if (r === 'denied') toast.error('Permissão negada nas configurações do navegador.')
    else if (r === 'unsupported') toast.error('Este navegador não suporta notificações.')
  }

  const testNotif = async () => {
    const ok = await showLocalNotification('Teste ✅', {
      body: 'As notificações estão funcionando neste dispositivo.',
      data: { url: '/config' },
    })
    if (!ok) toast.error('Ative as notificações primeiro.')
  }

  const permInfo = {
    granted: { label: 'Ativadas', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
    denied: { label: 'Bloqueadas', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
    default: { label: 'Não ativadas', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
    unsupported: { label: 'Sem suporte', cls: 'bg-slate-200 text-slate-500 dark:bg-slate-700' },
  }[permission] || { label: '—', cls: 'bg-slate-200 text-slate-500' }

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
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-bold">Aplicativo (PWA)</h3>
            <span className={`badge ${standalone ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'}`}>
              {standalone ? 'Instalado' : 'Não instalado'}
            </span>
          </div>
          <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
            {standalone
              ? 'Rodando em modo tela cheia (standalone). 🎉'
              : 'Instale na tela inicial para usar em tela cheia e receber notificações.'}
          </p>
          {!standalone && (
            <button className="btn-primary w-full" onClick={install}>
              <Icon.download size={18} /> Instalar aplicativo
            </button>
          )}
        </div>

        <div className="card lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-bold">Notificações</h3>
            <span className={`badge ${permInfo.cls}`}>{permInfo.label}</span>
          </div>
          <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
            Avisos do sistema (fora do app) para <b>novos agendamentos</b> (barbeiro) e
            <b> caixa pendente de fechamento</b> (dono).
          </p>
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary" onClick={enableNotifs} disabled={permission === 'granted' || !notificationsSupported}>
              <Icon.bell size={18} /> {permission === 'granted' ? 'Notificações ativas' : 'Ativar notificações'}
            </button>
            <button className="btn-ghost" onClick={testNotif} disabled={permission !== 'granted'}>
              <Icon.check size={18} /> Enviar teste
            </button>
          </div>
          {platform.isIOS && !standalone && (
            <p className="mt-3 rounded-xl bg-amber-50 p-2.5 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
              No iPhone (iOS 16.4+), as notificações exigem o app instalado na tela inicial.
            </p>
          )}
          <p className="mt-3 text-xs text-slate-400">
            Push do servidor (app fechado / outro aparelho) usa Web Push com chave VAPID —
            requer backend. O scaffolding já está pronto em <code>src/lib/notifications.js</code>.
          </p>
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
        <p>Barbearia — Sistema de Gestão · v1.1.0</p>
        <p className="mt-1">Dados armazenados localmente no dispositivo (offline-first).</p>
      </div>
    </div>
  )
}
