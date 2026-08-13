import { useState } from 'react'
import { useData } from '../../context/DataContext.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { Modal } from '../../components/ui.jsx'
import Icon from '../../components/Icons.jsx'

// Canal de suporte — mensagem direta ao estabelecimento (sempre acessível).
export default function SupportButton({ customerName, customerId, inline = false }) {
  const { addMessage } = useData()
  const { customer } = useAuth()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')

  const name = customerName || customer?.name || 'Cliente'
  const cid = customerId || customer?.id || null

  const send = () => {
    if (!text.trim()) return
    addMessage({ customerId: cid, name, text: text.trim() })
    toast.success('Mensagem enviada ao estabelecimento 💬')
    setText('')
    setOpen(false)
  }

  return (
    <>
      {inline ? (
        <button onClick={() => setOpen(true)} className="btn-ghost w-full"><Icon.chat size={18} /> Falar com o estabelecimento</button>
      ) : (
        <button onClick={() => setOpen(true)} className="mt-4 flex w-full items-center justify-center gap-2 text-sm font-semibold text-slate-500 hover:text-brand-500">
          <Icon.chat size={16} /> Precisa de ajuda? Fale com a gente
        </button>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Falar com a lanchonete"
        footer={<>
          <button className="btn-ghost" onClick={() => setOpen(false)}>Cancelar</button>
          <button className="btn-primary" onClick={send}>Enviar</button>
        </>}>
        <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">Dúvida sobre o pedido, cardápio ou entrega? Escreva pra gente:</p>
        <textarea className="input" rows={4} autoFocus placeholder="Sua mensagem..." value={text} onChange={(e) => setText(e.target.value)} />
      </Modal>
    </>
  )
}
