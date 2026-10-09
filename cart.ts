'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type CartItem = {
  key: string; productId: string; name: string; price: number; image?: string
  qty: number; size?: string; color?: string
  customPrint?: { path: string; placement: string; scale: number; offsetX: number; offsetY: number }
}
type S = { items: CartItem[]; add: (i: CartItem) => void; remove: (k: string) => void; clear: () => void }

export const useCart = create<S>()(persist((set) => ({
  items: [],
  add: (i) => set((s) => {
    const ex = s.items.find((x) => x.key === i.key)
    return { items: ex ? s.items.map((x) => x.key === i.key ? { ...x, qty: x.qty + i.qty } : x) : [...s.items, i] }
  }),
  remove: (k) => set((s) => ({ items: s.items.filter((x) => x.key !== k) })),
  clear: () => set({ items: [] }),
}), { name: 'bloom-cart' }))
