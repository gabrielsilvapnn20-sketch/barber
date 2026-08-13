import { useState } from 'react'
import { usePWA } from '../context/PWAContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import Icon from './Icons.jsx'

// Ícone "Compartilhar" do iOS (quadrado com seta para cima)
const IosShare = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v12" />
    <path d="M8 7l4-4 4 4" />
    <path d="M6 12H5a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2h-1" />
  </svg>
)

/**
 * Trata a instalação como parte obrigatória da experiência:
 * - Enquanto o app NÃO estiver instalado (standalone), mostra uma tela cheia
 *   guiando a instalação (com passos específicos por plataforma).
 * - Depois de dispensada, mantém um banner fixo no topo lembrando de instalar.
 * - Quando já instalado mas sem permissão de notificações, mostra um banner
 *   para ativar as notificações.
 */
export default function InstallGate() {
  const {
    standalone,
    platform,
    canPromptInstall,
    promptInstall,
    permission,
    notificationsSupported,
    enableNotifications,
    bannerDismissed,
    dismissBanner,
  } = usePWA()
  const toast = useToast()
  const [reopen, setReopen] = useState(false)

  // Já instalado: só cuidamos das notificações
  if (standalone) {
    if (notificationsSupported && permission === 'default') {
      return <NotifyBanner onEnable={enableNotifications} toast={toast} />
    }
    return null
  }

  const showOverlay = !bannerDismissed || reopen

  const doInstall = async () => {
    const res = await promptInstall()
    if (res.outcome === 'accepted') toast.success('App instalado! Abra pelo ícone na tela inicial.')
    else if (res.outcome === 'unavailable') toast.info('Use o menu do navegador para instalar.')
  }

  return (
    <>
      {/* Banner fixo (aparece após dispensar a tela) */}
      {!showOverlay && (
        <div className="sticky top-0 z-30 flex items-center gap-2 bg-brand-600 px-4 py-2 text-sm font-semibold text-white">
          <Icon.download size={16} />
          <span className="flex-1">Instale o app para receber notificações e usar em tela cheia.</span>
          <button onClick={() => setReopen(true)} className="rounded-lg bg-white/20 px-3 py-1 text-xs font-bold hover:bg-white/30">
            Instalar
          </button>
        </div>
      )}

      {showOverlay && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/70 backdrop-blur-sm sm:items-center">
          <div className="max-h-[94vh] w-full overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl animate-fade-in dark:bg-slate-900 sm:max-w-md sm:rounded-3xl">
            <div className="mb-4 flex flex-col items-center text-center">
              <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sun-400 to-brand-600 text-white shadow-lg">
                <Icon.flame size={32} />
              </div>
              <h2 className="text-xl font-extrabold">Instale o app na tela inicial</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Para pedir mais rápido, acompanhar sua entrega em tempo real e
                receber notificações, adicione a Lanchonete Rodrigues à tela
                inicial do seu celular.
              </p>
            </div>

            {/* Benefícios */}
            <div className="mb-5 grid grid-cols-3 gap-2 text-center">
              <Benefit icon={<Icon.bell size={18} />} label="Notificações" />
              <Benefit icon={<Icon.dashboard size={18} />} label="Tela cheia" />
              <Benefit icon={<Icon.download size={18} />} label="Offline" />
            </div>

            {/* Passos por plataforma */}
            {platform.isIOS ? (
              <IosSteps />
            ) : canPromptInstall ? (
              <button onClick={doInstall} className="btn-primary w-full text-base">
                <Icon.download size={20} /> Instalar agora
              </button>
            ) : (
              <GenericSteps isAndroid={platform.isAndroid} />
            )}

            <button
              onClick={() => {
                setReopen(false)
                dismissBanner()
              }}
              className="mt-4 w-full text-center text-xs font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              Continuar no navegador por enquanto
            </button>
          </div>
        </div>
      )}
    </>
  )
}

function Benefit({ icon, label }) {
  return (
    <div className="rounded-xl bg-slate-50 py-3 dark:bg-slate-800/50">
      <div className="mx-auto mb-1 flex w-fit text-brand-500">{icon}</div>
      <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  )
}

function Step({ n, children }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">
        {n}
      </span>
      <p className="text-sm text-slate-600 dark:text-slate-300">{children}</p>
    </div>
  )
}

function IosSteps() {
  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
      <Step n={1}>
        Toque no botão <b>Compartilhar</b>{' '}
        <span className="inline-flex align-middle text-brand-500"><IosShare size={16} /></span>{' '}
        na barra do Safari (embaixo).
      </Step>
      <Step n={2}>
        Role e toque em <b>“Adicionar à Tela de Início”</b>.
      </Step>
      <Step n={3}>
        Confirme em <b>“Adicionar”</b> e abra o app pelo novo ícone.
      </Step>
      <p className="rounded-xl bg-sun-50 p-2.5 text-xs text-sun-800 dark:bg-sun-900/20 dark:text-sun-300">
        No iPhone, as notificações do pedido só funcionam com o app aberto pela
        tela inicial (iOS 16.4 ou superior).
      </p>
    </div>
  )
}

function GenericSteps({ isAndroid }) {
  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
      <Step n={1}>
        Abra o menu do navegador <b>(⋮)</b> no canto superior.
      </Step>
      <Step n={2}>
        Toque em <b>{isAndroid ? '“Instalar aplicativo” / “Adicionar à tela inicial”' : '“Instalar Lanchonete Rodrigues”'}</b>.
      </Step>
      <Step n={3}>Confirme e abra o app pelo ícone criado.</Step>
    </div>
  )
}

function NotifyBanner({ onEnable, toast }) {
  const [hidden, setHidden] = useState(false)
  if (hidden) return null
  return (
    <div className="sticky top-0 z-30 flex items-center gap-2 bg-slate-900 px-4 py-2 text-sm font-semibold text-white dark:bg-slate-800">
      <Icon.bell size={16} />
      <span className="flex-1">Ative as notificações para avisos de agendamentos e caixa.</span>
      <button
        onClick={async () => {
          const r = await onEnable()
          if (r === 'granted') toast.success('Notificações ativadas!')
          else if (r === 'denied') toast.error('Permissão negada. Ative nas configurações do navegador.')
          setHidden(true)
        }}
        className="rounded-lg bg-brand-500 px-3 py-1 text-xs font-bold hover:bg-brand-600"
      >
        Ativar
      </button>
      <button onClick={() => setHidden(true)} className="rounded-lg p-1 text-white/70 hover:text-white">
        <Icon.close size={14} />
      </button>
    </div>
  )
}
