import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import Layout from './components/Layout.jsx'
import Login from './pages/Login.jsx'
import OwnerDashboard from './pages/OwnerDashboard.jsx'
import BarberDashboard from './pages/BarberDashboard.jsx'
import Agenda from './pages/Agenda.jsx'
import Fila from './pages/Fila.jsx'
import Lancar from './pages/Lancar.jsx'
import Clientes from './pages/Clientes.jsx'
import Equipe from './pages/Equipe.jsx'
import Financeiro from './pages/Financeiro.jsx'
import Despesas from './pages/Despesas.jsx'
import Metas from './pages/Metas.jsx'
import Caixa from './pages/Caixa.jsx'
import Comissoes from './pages/Comissoes.jsx'
import Galeria from './pages/Galeria.jsx'
import Lembretes from './pages/Lembretes.jsx'
import Config from './pages/Config.jsx'

function OwnerOnly({ children }) {
  const { isOwner } = useAuth()
  return isOwner ? children : <Navigate to="/" replace />
}

export default function App() {
  const { user, isOwner } = useAuth()

  if (!user) return <Login />

  return (
    <Layout>
      <Routes>
        <Route path="/" element={isOwner ? <OwnerDashboard /> : <BarberDashboard />} />
        <Route path="/agenda" element={<Agenda />} />
        <Route path="/fila" element={<Fila />} />
        <Route path="/lancar" element={<Lancar />} />
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/galeria" element={<Galeria />} />

        {/* Owner-only */}
        <Route path="/equipe" element={<OwnerOnly><Equipe /></OwnerOnly>} />
        <Route path="/financeiro" element={<OwnerOnly><Financeiro /></OwnerOnly>} />
        <Route path="/despesas" element={<OwnerOnly><Despesas /></OwnerOnly>} />
        <Route path="/metas" element={<OwnerOnly><Metas /></OwnerOnly>} />
        <Route path="/caixa" element={<OwnerOnly><Caixa /></OwnerOnly>} />
        <Route path="/comissoes" element={<OwnerOnly><Comissoes /></OwnerOnly>} />
        <Route path="/lembretes" element={<OwnerOnly><Lembretes /></OwnerOnly>} />
        <Route path="/config" element={<OwnerOnly><Config /></OwnerOnly>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}
