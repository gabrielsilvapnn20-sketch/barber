import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { uid } from '../lib/utils.js'
import { unitPriceOf, summarize } from '../lib/orders.js'

const CartContext = createContext(null)
const KEY = 'lr.cart'

export function CartProvider({ children }) {
  const [lines, setLines] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
  })

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(lines))
  }, [lines])

  // Adiciona um item já montado ao carrinho.
  const addItem = useCallback((item, { selections = null, qty = 1 } = {}) => {
    const unitPrice = unitPriceOf(item, selections)
    const summary = summarize(item, selections)
    const key = JSON.stringify({ id: item.id, selections })
    setLines((prev) => {
      // Itens idênticos (mesmo item + mesmas escolhas) são somados.
      const idx = prev.findIndex((l) => l._key === key)
      if (idx >= 0) {
        const next = [...prev]
        const merged = { ...next[idx], qty: next[idx].qty + qty }
        merged.lineTotal = +(merged.unitPrice * merged.qty).toFixed(2)
        next[idx] = merged
        return next
      }
      return [
        {
          uid: uid('li'),
          _key: key,
          itemId: item.id,
          name: item.name,
          emoji: item.emoji,
          photo: item.photo || '',
          unitPrice,
          qty,
          lineTotal: +(unitPrice * qty).toFixed(2),
          selections,
          summary,
        },
        ...prev,
      ]
    })
  }, [])

  const setQty = useCallback((lineUid, qty) => {
    setLines((prev) =>
      prev
        .map((l) => (l.uid === lineUid ? { ...l, qty, lineTotal: +(l.unitPrice * qty).toFixed(2) } : l))
        .filter((l) => l.qty > 0),
    )
  }, [])

  const inc = useCallback((lineUid) => setLines((prev) => prev.map((l) => (l.uid === lineUid ? { ...l, qty: l.qty + 1, lineTotal: +(l.unitPrice * (l.qty + 1)).toFixed(2) } : l))), [])
  const dec = useCallback((lineUid) => setLines((prev) => prev.map((l) => (l.uid === lineUid ? { ...l, qty: l.qty - 1, lineTotal: +(l.unitPrice * (l.qty - 1)).toFixed(2) } : l)).filter((l) => l.qty > 0)), [])
  const removeLine = useCallback((lineUid) => setLines((prev) => prev.filter((l) => l.uid !== lineUid)), [])
  const clear = useCallback(() => setLines([]), [])

  // Repetir pedido: preenche o carrinho a partir dos itens de um pedido antigo.
  const loadFromOrder = useCallback((order) => {
    setLines(
      order.items.map((li) => ({
        uid: uid('li'),
        _key: JSON.stringify({ id: li.itemId, selections: li.selections }),
        itemId: li.itemId,
        name: li.name,
        emoji: li.emoji || '🍢',
        photo: li.photo || '',
        unitPrice: li.unitPrice,
        qty: li.qty,
        lineTotal: li.lineTotal,
        selections: li.selections,
        summary: li.summary,
      })),
    )
  }, [])

  const value = useMemo(() => {
    const count = lines.reduce((s, l) => s + l.qty, 0)
    const subtotal = +lines.reduce((s, l) => s + l.lineTotal, 0).toFixed(2)
    return { lines, count, subtotal, addItem, setQty, inc, dec, removeLine, clear, loadFromOrder }
  }, [lines, addItem, setQty, inc, dec, removeLine, clear, loadFromOrder])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export const useCart = () => useContext(CartContext)
