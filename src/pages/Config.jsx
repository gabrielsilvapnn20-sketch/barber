import { useRef, useState } from 'react'
import { useData } from '../context/DataContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { usePWA } from '../context/PWAContext.jsx'
import { PageHeader, Field } from '../components/ui.jsx'
import Icon from '../components/Icons.jsx'
import { showLocalNotification } from '../lib/notifications.js'
import { exportJSON } from '../lib/reports.js'
import { fmtDate } from '../lib/utils.js'

export default function Config() {
  const { db, setDb, resetData, startFresh, patch, syncStatus } = useData()
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
  const fileRef = useRef(null)

  const downloadBackup = () => {
    const stamp = new Date().toISOString().slice(0, 10)
    exportJSON(`backup-barbearia-${stamp}.json`, db)
    toast.success('Backup baixado.')
  }

  const onPickFile = () => fileRef.current?.click()

  const restoreBackup = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result)
        if (!data || typeof data !== 'object' || !Array.isArray(data.users)) {
          return toast.error('Arquivo inválido — não parece um backup do app.')
        }
        if (
          !confirm(
            'Restaurar este backup? Os dados atuais deste dispositivo serão substituídos e sincronizados com a nuvem.',
          )
        )
          return
        setDb(() => data)
        toast.success('Backup restaurado com sucesso.')
      } catch {
        toast.error('Não foi possível ler o arquivo.')
      }
    }
    reader.readAsText(file)
  }

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
          <div className="mb-1 flex items-center justify-between">
            <h3 className="font-bold">Sincronização (nuvem)</h3>
            {(() => {
              const info = {
                online: { label: 'Sincronizado', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
                connecting: { label: 'Conectando…', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
                error: { label: 'Sem conexão', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
                offline: { label: 'Desativada', cls: 'bg-slate-200 text-slate-500 dark:bg-slate-700' },
              }[syncStatus] || { label: '—', cls: 'bg-slate-200 text-slate-500' }
              return <span className={`badge ${info.cls}`}>{info.label}</span>
            })()}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {syncStatus === 'online'
              ? 'Os dados são compartilhados entre o dono e os barbeiros em tempo real.'
              : syncStatus === 'error'
                ? 'Sem conexão com a nuvem no momento — o app segue funcionando offline e sincroniza quando voltar.'
                : syncStatus === 'connecting'
                  ? 'Conectando à nuvem…'
                  : 'Sincronização em nuvem não configurada.'}
          </p>
        </div>

        <div className="card lg:col-span-2">
          <h3 className="mb-1 font-bold">Backup dos dados</h3>
          <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
            Baixe uma cópia de segurança de todos os dados (clientes, lançamentos,
            comissões, caixa…) em um arquivo. Guarde em local seguro e restaure quando precisar.
          </p>
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary" onClick={downloadBackup}>
              <Icon.download size={18} /> Baixar backup
            </button>
            <button className="btn-ghost" onClick={onPickFile}>
              <Icon.upload size={18} /> Restaurar de arquivo
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={restoreBackup}
            />
          </div>
          {db.settings?.lastSnapshotAt && (
            <p className="mt-3 text-xs text-slate-400">
              Último backup automático interno: {fmtDate(new Date(db.settings.lastSnapshotAt))}.
            </p>
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

        <div className="card lg:col-span-2 border-emerald-200 dark:border-emerald-900/50">
          <h3 className="mb-1 font-bold text-emerald-600 dark:text-emerald-400">Começar do zero (uso real)</h3>
          <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
            Apaga os dados de demonstração — <b>faturamento, agendamentos, despesas, fila,
            caixa, metas, folgas, portfólio e clientes</b> — e deixa o app limpo para o uso
            real. <b>Mantém</b> seu login, a equipe e os serviços/comissões já cadastrados.
          </p>
          <button
            className="btn-primary !bg-emerald-500 hover:!bg-emerald-600"
            onClick={() => {
              if (confirm('Zerar os dados de demonstração para começar o uso real? A equipe e os serviços serão mantidos.')) {
                startFresh()
                toast.success('Tudo pronto! App zerado para o uso real.')
              }
            }}
          >
            <Icon.check size={16} /> Zerar e começar do zero
          </button>
          <p className="mt-3 text-xs text-slate-400">
            Dica: depois disso, revise a <b>Equipe</b> (renomeie/adicione seus barbeiros) e os
            <b> Serviços &amp; Comissões</b> com seus preços reais.
          </p>
        </div>

        <div className="card lg:col-span-2 border-red-200 dark:border-red-900/50">
          <h3 className="mb-1 font-bold text-red-600 dark:text-red-400">Zona de perigo</h3>
          <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">Restaura os dados de demonstração (para voltar a treinar). Todos os lançamentos atuais serão perdidos.</p>
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
