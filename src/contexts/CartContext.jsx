import { createContext, useContext, useState } from 'react'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [items, setItems] = useState([])

  function addItem({ id, name, price, size }) {
    const cartKey = size ? `${id}__${size}` : id
    setItems(prev => {
      const existing = prev.find(i => i.cartKey === cartKey)
      if (existing) {
        return prev.map(i => i.cartKey === cartKey ? { ...i, qty: i.qty + 1 } : i)
      }
      return [...prev, { cartKey, id, name, price, size: size ?? null, qty: 1 }]
    })
  }

  function removeItem(cartKey) {
    setItems(prev => prev.filter(i => i.cartKey !== cartKey))
  }

  function updateQty(cartKey, qty) {
    if (qty <= 0) { removeItem(cartKey); return }
    setItems(prev => prev.map(i => i.cartKey === cartKey ? { ...i, qty } : i))
  }

  function clearCart() { setItems([]) }

  const totalCount = items.reduce((sum, i) => sum + i.qty, 0)

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQty, clearCart, totalCount }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  return useContext(CartContext)
}
