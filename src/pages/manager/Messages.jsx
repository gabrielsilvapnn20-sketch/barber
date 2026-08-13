import { useMemo, useState, useEffect } from 'react'
import { useData } from '../../context/DataContext.jsx'
import { PageHeader, EmptyState } from '../../components/ui.jsx'
import Icon from '../../components/Icons.jsx'
import { fmtDateTime } from '../../lib/utils.js'

export default function Messages() {
  const { db, replyMessage, markMessagesRead } = useData()
  const [activeId, setActiveId] = useState(null)
  const [text, setText] = useState('')

  // Agrupa mensagens por cliente (thread).
  const threads = useMemo(() => {
    const map = {}
    for (const m of db.messages) {
      const key = m.customerId || m.name
      map[key] = map[key] || { key, customerId: m.customerId, name: m.name, msgs: [], unread: 0 }
      map[key].msgs.push(m)
      if (m.from === 'customer' && !m.read) map[key].unread++
    }
    return Object.values(map)
      .map((t) => ({ ...t, msgs: t.msgs.slice().sort((a, b) => new Date(a.at) - new Date(b.at)) }))
      .sort((a, b) => new Date(b.msgs.at(-1).at) - new Date(a.msgs.at(-1).at))
  }, [db.messages])

  const active = threads.find((t) => t.key === activeId)

  useEffect(() => {
    if (active?.customerId && active.unread) markMessagesRead(active.customerId)
  }, [active, markMessagesRead])

  if (!threads.length) {
    return <div><PageHeader title="Mensagens" /><EmptyState icon={<Icon.chat size={40} />} title="Nenhuma mensagem" subtitle="As mensagens dos clientes aparecem aqui." /></div>
  }

  const send = () => {
    if (!text.trim() || !active) return
    replyMessage(active.customerId, active.name, text.trim())
    setText('')
  }

  return (
    <div>
      <PageHeader title="Mensagens" subtitle="Suporte aos clientes" />
      <div className="grid gap-3 lg:grid-cols-[280px_1fr]">
        {/* Lista de threads */}
        <div className="space-y-2">
          {threads.map((t) => (
            <button key={t.key} onClick={() => setActiveId(t.key)} className={`card flex w-full items-center gap-3 p-3 text-left ${active?.key === t.key ? 'ring-2 ring-brand-500' : ''}`}>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-azure-100 font-bold text-azure-700 dark:bg-azure-900/40 dark:text-azure-300">{t.name[0]?.toUpperCase()}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{t.name}</p>
                <p className="truncate text-xs text-slate-400">{t.msgs.at(-1).text}</p>
              </div>
              {t.unread > 0 && <span className="badge bg-brand-500 text-white">{t.unread}</span>}
            </button>
          ))}
        </div>

        {/* Conversa */}
        {active ? (
          <div className="card flex max-h-[70vh] flex-col">
            <p className="mb-2 border-b border-slate-100 pb-2 font-bold dark:border-slate-800">{active.name}</p>
            <div className="flex-1 space-y-2 overflow-y-auto py-2">
              {active.msgs.map((m) => (
                <div key={m.id} className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.from === 'shop' ? 'ml-auto bg-brand-500 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>
                  <p>{m.text}</p>
                  <p className={`mt-0.5 text-[10px] ${m.from === 'shop' ? 'text-white/70' : 'text-slate-400'}`}>{fmtDateTime(m.at)}</p>
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-2 border-t border-slate-100 pt-2 dark:border-slate-800">
              <input className="input" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="Responder..." />
              <button className="btn-primary !px-4" onClick={send}><Icon.chevronRight size={18} /></button>
            </div>
          </div>
        ) : (
          <div className="hidden items-center justify-center text-sm text-slate-400 lg:flex">Selecione uma conversa</div>
        )}
      </div>
    </div>
  )
}
