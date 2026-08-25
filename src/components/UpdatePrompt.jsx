import { useEffect, useState } from 'react'
import Icon from './Icons.jsx'

// Mostra um aviso quando uma nova versão do app foi publicada.
export default function UpdatePrompt() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const h = () => setShow(true)
    window.addEventListener('pwa:need-refresh', h)
    return () => window.removeEventListener('pwa:need-refresh', h)
  }, [])
  if (!show) return null
  return (
    <div className="fixed inset-x-0 bottom-16 z-[90] mx-auto flex max-w-sm items-center gap-3 rounded-2xl bg-slate-900 px-4 py-3 text-sm text-white shadow-2xl dark:bg-slate-800 lg:bottom-4">
      <Icon.download size={18} />
      <span className="flex-1 font-medium">Nova versão disponível.</span>
      <button
        onClick={() => window.__pwaUpdate?.()}
        className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-bold hover:bg-brand-600"
      >
        Atualizar
      </button>
    </div>
  )
}
