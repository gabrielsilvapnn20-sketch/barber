import { Link } from 'react-router-dom'
import { useData } from '../context/DataContext.jsx'
import { usePWA } from '../context/PWAContext.jsx'
import Icon from './Icons.jsx'

// Cartão de primeiros passos para o dono. Aparece no começo (poucos dados) e
// some quando o dono já dispensou ou já começou a usar de verdade.
export default function OnboardingCard() {
  const { db, setDb, onlyBarbers } = useData()
  const { standalone } = usePWA()

  if (db.settings?.onboardingDismissed) return null

  const steps = [
    {
      done: !!db.settings?.shopName,
      label: 'Confirmar o nome da barbearia',
      to: '/config',
      cta: 'Configurações',
    },
    {
      done: onlyBarbers.length > 0,
      label: 'Revisar a equipe e os acessos (login de cada barbeiro)',
      to: '/equipe',
      cta: 'Equipe',
    },
    {
      done: (db.services?.length || 0) > 0,
      label: 'Conferir serviços, preços e comissões',
      to: '/comissoes',
      cta: 'Comissões',
    },
    {
      done: !!db.settings?.freshStarted,
      label: 'Zerar os dados de demonstração para começar o uso real',
      to: '/config',
      cta: 'Zerar dados',
    },
    {
      done: standalone,
      label: 'Instalar o app na tela inicial',
      to: '/config',
      cta: 'Instalar',
    },
  ]

  const doneCount = steps.filter((s) => s.done).length

  return (
    <div className="card mb-4 border-brand-200 bg-brand-50/60 dark:border-brand-900/50 dark:bg-brand-900/10">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-brand-700 dark:text-brand-300">👋 Primeiros passos</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {doneCount}/{steps.length} concluídos — deixe o sistema pronto para o dia a dia.
          </p>
        </div>
        <button
          onClick={() => setDb((prev) => ({ ...prev, settings: { ...prev.settings, onboardingDismissed: true } }))}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-white/60 hover:text-slate-600 dark:hover:bg-slate-800"
          title="Dispensar"
        >
          <Icon.close size={18} />
        </button>
      </div>
      <div className="space-y-1.5">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center justify-between gap-3 rounded-xl bg-white/70 px-3 py-2 dark:bg-slate-900/40">
            <div className="flex min-w-0 items-center gap-2.5">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  s.done
                    ? 'bg-emerald-500 text-white'
                    : 'border-2 border-slate-300 text-transparent dark:border-slate-600'
                }`}
              >
                {s.done ? <Icon.check size={14} /> : '•'}
              </span>
              <span className={`truncate text-sm ${s.done ? 'text-slate-400 line-through' : 'font-medium'}`}>
                {s.label}
              </span>
            </div>
            {!s.done && (
              <Link to={s.to} className="shrink-0 text-xs font-bold text-brand-500 hover:text-brand-600">
                {s.cta} →
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
