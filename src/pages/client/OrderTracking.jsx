import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useData } from '../../context/DataContext.jsx'
import { useCart } from '../../context/CartContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { Stars } from '../../components/FoodUI.jsx'
import Icon from '../../components/Icons.jsx'
import { flowFor, STATUS_META, minutesLate, PAYMENT_META } from '../../lib/orders.js'
import { brl, fmtTime } from '../../lib/utils.js'
import SupportButton from './SupportButton.jsx'

export default function OrderTracking() {
  const { id } = useParams()
  const { db, orderById, rateOrder } = useData()
  const { loadFromOrder } = useCart()
  const toast = useToast()
  const navigate = useNavigate()
  const order = orderById(id)
  const [now, setNow] = useState(Date.now())
  const [stars, setStars] = useState(0)
  const [comment, setComment] = useState('')

  // Atualiza o "atraso" a cada minuto.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(t)
  }, [])

  if (!order) {
    return (
      <div className="card mt-6 text-center">
        <p className="font-semibold">Pedido não encontrado.</p>
        <button className="btn-primary mt-3" onClick={() => navigate('/')}>Ver cardápio</button>
      </div>
    )
  }

  const flow = flowFor(order)
  const currentIdx = flow.indexOf(order.status)
  const late = minutesLate(order, new Date(now))
  const done = order.status === 'entregue'
  const canceled = order.status === 'cancelado'

  const stampAt = (status) => order.timeline.find((t) => t.status === status)?.at

  const repeat = () => {
    loadFromOrder(order)
    toast.success('Itens adicionados ao carrinho 🛒')
    navigate('/carrinho')
  }

  const submitRating = () => {
    if (!stars) return toast.error('Escolha uma nota.')
    rateOrder(order.id, { stars, comment })
    toast.success('Obrigado pela avaliação! ⭐')
  }

  return (
    <div>
      {/* Cabeçalho de sucesso */}
      <div className="card mb-4 text-center animate-pop">
        <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-3xl dark:bg-emerald-900/30">
          {done ? '✅' : canceled ? '✖️' : '🎉'}
        </div>
        <h1 className="text-xl font-extrabold">{done ? 'Pedido entregue!' : canceled ? 'Pedido cancelado' : 'Pedido confirmado!'}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Pedido <b>{order.code}</b> · {order.type === 'pickup' ? 'Retirada' : 'Entrega'}</p>
        {!done && !canceled && (
          <p className="mt-1 text-sm">Tempo estimado: <b>~{order.etaMin} min</b></p>
        )}
      </div>

      {/* Aviso de atraso automático */}
      {late > 0 && !done && !canceled && (
        <div className="mb-4 rounded-xl bg-sun-100 px-3 py-2.5 text-sm font-medium text-sun-800 dark:bg-sun-900/25 dark:text-sun-200">
          {db.settings?.delayNotice?.text || 'Seu pedido está a caminho, agradecemos a paciência! 🙏'}
        </div>
      )}

      {/* Linha do tempo */}
      {!canceled && (
        <div className="card mb-4">
          <p className="mb-3 font-bold">Acompanhe seu pedido</p>
          <ol className="relative ml-3 space-y-5 border-l-2 border-slate-200 pl-6 dark:border-slate-700">
            {flow.map((status, i) => {
              const meta = STATUS_META[status]
              const reached = i <= currentIdx
              const active = i === currentIdx && !done
              return (
                <li key={status} className="relative">
                  <span className={`absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full text-xs ${reached ? 'bg-brand-500 text-white' : 'bg-slate-200 text-slate-400 dark:bg-slate-700'} ${active ? 'ring-4 ring-brand-500/25' : ''}`}>
                    {reached ? <Icon.check size={14} /> : i + 1}
                  </span>
                  <p className={`font-semibold leading-tight ${reached ? '' : 'text-slate-400'}`}>{meta.emoji} {meta.clientLabel}</p>
                  {stampAt(status) && <p className="text-xs text-slate-400">{fmtTime(stampAt(status))}</p>}
                </li>
              )
            })}
          </ol>
        </div>
      )}

      {/* Itens do pedido */}
      <div className="card mb-4">
        <p className="mb-2 font-bold">Itens</p>
        <div className="space-y-1.5">
          {order.items.map((li) => (
            <div key={li.uid} className="flex items-start justify-between gap-2 text-sm">
              <span><b>{li.qty}×</b> {li.name}{li.summary ? <span className="text-slate-400"> — {li.summary}</span> : ''}</span>
              <span className="shrink-0 tabular-nums">{brl(li.lineTotal)}</span>
            </div>
          ))}
        </div>
        <div className="my-2 border-t border-slate-200 dark:border-slate-800" />
        <div className="flex justify-between text-sm text-slate-500"><span>Subtotal</span><span className="tabular-nums">{brl(order.subtotal)}</span></div>
        {order.deliveryFee > 0 && <div className="flex justify-between text-sm text-slate-500"><span>Entrega</span><span className="tabular-nums">{brl(order.deliveryFee)}</span></div>}
        <div className="mt-1 flex justify-between font-bold"><span>Total</span><span className="tabular-nums text-brand-600 dark:text-brand-400">{brl(order.total)}</span></div>
        <p className="mt-2 text-xs text-slate-400">
          {PAYMENT_META[order.payment?.method]?.emoji} {PAYMENT_META[order.payment?.method]?.label}
          {order.payment?.changeFor ? ` · troco para ${brl(order.payment.changeFor)}` : ''}
        </p>
      </div>

      {/* Avaliação pós-entrega */}
      {done && (
        <div className="card mb-4">
          {order.rating ? (
            <div className="text-center">
              <p className="font-bold">Sua avaliação</p>
              <div className="mt-2 flex justify-center"><Stars value={order.rating.stars} /></div>
              {order.rating.comment && <p className="mt-2 text-sm text-slate-500">"{order.rating.comment}"</p>}
            </div>
          ) : (
            <>
              <p className="mb-2 font-bold">Como foi seu pedido?</p>
              <div className="flex justify-center"><Stars value={stars} onChange={setStars} size={30} /></div>
              <textarea className="input mt-3" rows={2} placeholder="Comentário (opcional)" value={comment} onChange={(e) => setComment(e.target.value)} />
              <button className="btn-primary mt-2 w-full" onClick={submitRating}>Enviar avaliação</button>
            </>
          )}
        </div>
      )}

      {/* Ações */}
      <div className="grid grid-cols-2 gap-2">
        <button className="btn-sun" onClick={repeat}><Icon.receipt size={18} /> Pedir de novo</button>
        <button className="btn-ghost" onClick={() => navigate('/')}>Voltar ao cardápio</button>
      </div>

      <SupportButton customerName={order.customerName} customerId={order.customerId} />
    </div>
  )
}
