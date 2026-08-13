import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import InstallGate from './components/InstallGate.jsx'
import NotificationEngine from './components/NotificationEngine.jsx'
import ClientLayout from './components/ClientLayout.jsx'
import ManagerLayout from './components/ManagerLayout.jsx'

// Cliente
import Menu from './pages/client/Menu.jsx'
import Cart from './pages/client/Cart.jsx'
import Checkout from './pages/client/Checkout.jsx'
import OrderTracking from './pages/client/OrderTracking.jsx'
import Orders from './pages/client/Orders.jsx'
import Account from './pages/client/Account.jsx'

// Gestor
import ManagerLogin from './pages/manager/ManagerLogin.jsx'
import Dashboard from './pages/manager/Dashboard.jsx'
import OrdersBoard from './pages/manager/OrdersBoard.jsx'
import Stock from './pages/manager/Stock.jsx'
import Finance from './pages/manager/Finance.jsx'
import CashBox from './pages/manager/CashBox.jsx'
import Messages from './pages/manager/Messages.jsx'
import Settings from './pages/manager/Settings.jsx'

function ManagerArea() {
  const { isManager } = useAuth()
  if (!isManager) return <ManagerLogin />
  return (
    <ManagerLayout>
      <Routes>
        <Route index element={<Dashboard />} />
        <Route path="pedidos" element={<OrdersBoard />} />
        <Route path="estoque" element={<Stock />} />
        <Route path="financeiro" element={<Finance />} />
        <Route path="caixa" element={<CashBox />} />
        <Route path="mensagens" element={<Messages />} />
        <Route path="config" element={<Settings />} />
        <Route path="*" element={<Navigate to="/gestor" replace />} />
      </Routes>
    </ManagerLayout>
  )
}

function ClientArea() {
  return (
    <ClientLayout>
      <Routes>
        <Route index element={<Menu />} />
        <Route path="carrinho" element={<Cart />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="pedido/:id" element={<OrderTracking />} />
        <Route path="pedidos" element={<Orders />} />
        <Route path="conta" element={<Account />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ClientLayout>
  )
}

export default function App() {
  return (
    <>
      <InstallGate />
      <NotificationEngine />
      <Routes>
        <Route path="/gestor/*" element={<ManagerArea />} />
        <Route path="/*" element={<ClientArea />} />
      </Routes>
    </>
  )
}
