import { createContext, useContext, useEffect, useState } from 'react'
import { useData } from './DataContext.jsx'

const AuthContext = createContext(null)
const KEY = 'barber.session'

export function AuthProvider({ children }) {
  const { db } = useData()
  const [userId, setUserId] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(KEY) || 'null')?.userId || null
    } catch {
      return null
    }
  })

  const user = db.users.find((u) => u.id === userId) || null

  useEffect(() => {
    if (userId) localStorage.setItem(KEY, JSON.stringify({ userId }))
    else localStorage.removeItem(KEY)
  }, [userId])

  const login = (email, password) => {
    const found = db.users.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.active,
    )
    if (!found) return { ok: false, error: 'Usuário não encontrado.' }
    if (found.password !== password) return { ok: false, error: 'Senha incorreta.' }
    setUserId(found.id)
    return { ok: true, user: found }
  }

  const loginWithPin = (pin) => {
    const found = db.users.find((u) => u.pin === pin && u.active)
    if (!found) return { ok: false, error: 'PIN inválido.' }
    setUserId(found.id)
    return { ok: true, user: found }
  }

  const logout = () => setUserId(null)

  return (
    <AuthContext.Provider
      value={{ user, isOwner: user?.role === 'owner', login, loginWithPin, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
