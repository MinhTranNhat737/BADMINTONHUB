"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"

export interface CartItem {
  productId: number
  name: string
  price: number
  qty: number
}

interface CartContextType {
  cart: CartItem[]
  totalItems: number
  addToCart: (item: Omit<CartItem, "qty"> & { qty?: number }) => void
  updateQty: (productId: number, delta: number) => void
  removeFromCart: (productId: number) => void
  setCart: (items: CartItem[]) => void
  clearCart: () => void
}

const STORAGE_KEY = "badmintonhub_cart"

const CartContext = createContext<CartContextType | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCartState] = useState<CartItem[]>([])
  const [hydrated, setHydrated] = useState(false)

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const items = JSON.parse(stored) as CartItem[]
        if (Array.isArray(items)) setCartState(items)
      }
    } catch {}
    setHydrated(true)
  }, [])

  // Persist cart to localStorage on change (after hydration)
  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart))
  }, [cart, hydrated])

  // Listen for storage changes from other tabs / product detail page
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const items = JSON.parse(e.newValue) as CartItem[]
          if (Array.isArray(items)) setCartState(items)
        } catch {}
      }
    }
    window.addEventListener("storage", handler)
    return () => window.removeEventListener("storage", handler)
  }, [])

  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0)

  const addToCart = useCallback((item: Omit<CartItem, "qty"> & { qty?: number }) => {
    const addQty = item.qty ?? 1
    setCartState(prev => {
      const existing = prev.find(i => i.productId === item.productId)
      if (existing) {
        return prev.map(i =>
          i.productId === item.productId ? { ...i, qty: i.qty + addQty } : i
        )
      }
      return [...prev, { productId: item.productId, name: item.name, price: item.price, qty: addQty }]
    })
  }, [])

  const updateQty = useCallback((productId: number, delta: number) => {
    setCartState(prev =>
      prev.map(i => i.productId === productId ? { ...i, qty: Math.max(1, i.qty + delta) } : i)
    )
  }, [])

  const removeFromCart = useCallback((productId: number) => {
    setCartState(prev => prev.filter(i => i.productId !== productId))
  }, [])

  const setCart = useCallback((items: CartItem[]) => {
    setCartState(items)
  }, [])

  const clearCart = useCallback(() => {
    setCartState([])
  }, [])

  return (
    <CartContext.Provider value={{ cart, totalItems, addToCart, updateQty, removeFromCart, setCart, clearCart }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCart must be used within a CartProvider")
  return ctx
}
