import { useNavigate } from 'react-router-dom'
import { useData } from '../../context/DataContext.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useCart } from '../../context/CartContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { PageHeader, EmptyState } from '../../components/ui.jsx'
import { StatusPill } from '../../components/FoodUI.jsx'
import Icon from '../../components/Icons.jsx'
import { brl, fmtDateTime } from '../../lib/utils.js'

export default function Orders() {
  const { db } = useData()
  const { customer } = useAuth()
  const { loadFromOrder } = useCart()
  const toast = useToast()
  const navigate = useNavigate()

  const orders = customer ? db.orders.filter((o) => o.customerId === customer.id) : []

  if (!customer || !orders.length) {
    return (
      <div>
        <PageHeader title="Meus pedidos" />
        <EmptyState
          icon={<Icon.receipt size={40} />}
          title="Nenhum pedido ainda"
          subtitle="Seus pedidos aparecem aqui com o acompanhamento em tempo real."
          action={<button className="btn-primary" onClick={() => navigate('/')}>Fazer meu primeiro pedido</button>}
        />
      </div>
    )
  }

  const repeat = (o) => {
    loadFromOrder(o)
    toast.success('Itens adicionados ao carrinho 🛒')
    navigate('/carrinho')
  }

  return (
    <div>
      <PageHeader title="Meus pedidos" subtitle={`${orders.length} pedido(s)`} />
      <div className="space-y-2">
        {orders.map((o) => (
          <div key={o.id} className="card">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold">{o.code}</p>
                <p className="text-xs text-slate-400">{fmtDateTime(o.createdAt)}</p>
              </div>
              <StatusPill status={o.status} client />
            </div>
            <p className="mt-2 line-clamp-1 text-sm text-slate-500 dark:text-slate-400">
              {o.items.map((li) => `${li.qty}× ${li.name}`).join(', ')}
            </p>
            <div className="mt-2 flex items-center justify-between">
              <span className="price">{brl(o.total)}</span>
              <div className="flex gap-2">
                <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => repeat(o)}>Pedir de novo</button>
                <button className="btn-primary !px-3 !py-1.5 text-xs" onClick={() => navigate(`/pedido/${o.id}`)}>Acompanhar</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
