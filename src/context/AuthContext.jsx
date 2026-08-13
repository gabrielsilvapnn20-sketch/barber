import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useData } from './DataContext.jsx'
import { uid, onlyDigits } from '../lib/utils.js'

const AuthContext = createContext(null)
const CUS_KEY = 'lr.customer'
const MGR_KEY = 'lr.manager'

export function AuthProvider({ children }) {
  const { db, setDb } = useData()
  const [customerId, setCustomerId] = useState(() => {
    try { return JSON.parse(localStorage.getItem(CUS_KEY) || 'null')?.id || null } catch { return null }
  })
  const [isManager, setIsManager] = useState(() => sessionStorage.getItem(MGR_KEY) === '1')

  const customer = db.customers.find((c) => c.id === customerId) || null

  useEffect(() => {
    if (customerId) localStorage.setItem(CUS_KEY, JSON.stringify({ id: customerId }))
    else localStorage.removeItem(CUS_KEY)
  }, [customerId])

  // Identifica o cliente na finalização do pedido (login de baixa fricção:
  // nome + telefone). Reaproveita cadastro existente pelo telefone.
  const identifyCustomer = useCallback(({ name, phone, birthday }) => {
    const digits = onlyDigits(phone)
    let found
    setDb((prev) => {
      const existing = prev.customers.find((c) => onlyDigits(c.phone) === digits && digits)
      if (existing) {
        found = { ...existing, name: name || existing.name, birthday: birthday || existing.birthday }
        return { ...prev, customers: prev.customers.map((c) => (c.id === existing.id ? found : c)) }
      }
      found = {
        id: uid('cus'), name, phone, birthday: birthday || '',
        addresses: [], favorites: [], loyaltyCount: 0, points: 0,
      }
      return { ...prev, customers: [found, ...prev.customers] }
    })
    if (found) setCustomerId(found.id)
    return found
  }, [setDb])

  const updateCustomer = useCallback((changes) => {
    if (!customerId) return
    setDb((prev) => ({
      ...prev,
      customers: prev.customers.map((c) => (c.id === customerId ? { ...c, ...changes } : c)),
    }))
  }, [customerId, setDb])

  const toggleFavorite = useCallback((itemId) => {
    if (!customerId) return
    setDb((prev) => ({
      ...prev,
      customers: prev.customers.map((c) => {
        if (c.id !== customerId) return c
        const favs = c.favorites || []
        return { ...c, favorites: favs.includes(itemId) ? favs.filter((x) => x !== itemId) : [...favs, itemId] }
      }),
    }))
  }, [customerId, setDb])

  const logoutCustomer = useCallback(() => setCustomerId(null), [])

  // Gestor: senha em settings.managerPassword.
  const loginManager = useCallback((password) => {
    const ok = password === (db.settings?.managerPassword || '123456')
    if (ok) {
      setIsManager(true)
      sessionStorage.setItem(MGR_KEY, '1')
    }
    return ok
  }, [db.settings])

  const logoutManager = useCallback(() => {
    setIsManager(false)
    sessionStorage.removeItem(MGR_KEY)
  }, [])

  return (
    <AuthContext.Provider
      value={{ customer, customerId, isManager, identifyCustomer, updateCustomer, toggleFavorite, logoutCustomer, loginManager, logoutManager }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
