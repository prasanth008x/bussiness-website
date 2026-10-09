'use client'
import { useState } from 'react'
import { browserClient } from '@/lib/supabase'
import { useCart } from '@/store/cart'

const COLORS = { White: '#ffffff', Blush: '#f9d5d3', Sky: '#cfe5f4', Mint: '#d3ecdc', Lilac: '#e3d7f1' }
const PLACEMENTS = { front: 'top-[28%] left-1/2 w-[42%]', back: 'top-[28%] left-1/2 w-[42%]', left_chest: 'top-[24%] left-[62%] w-[16%]', sleeve: 'top-[20%] left-[14%] w-[12%]' } as const
const SIZES = ['XS', 'S', 'M', 'L', 'XL', '2-3Y', '4-5Y', '6-7Y']
const BASE_PRICE = 499, PRINT_FEE = 150  // server re-validates from products table

export default function Customize() {
  const add = useCart((s) => s.add)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string>()
  const [color, setColor] = useState<keyof typeof COLORS>('White')
  const [size, setSize] = useState('M')
  const [placement, setPlacement] = useState<keyof typeof PLACEMENTS>('front')
  const [scale, setScale] = useState(1)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  function pick(f?: File) {
    if (!f) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(f.type)) return setErr('Use PNG, JPG or WebP')
    if (f.size > 10 * 1024 * 1024) return setErr('Max file size is 10MB')
    setErr(''); setFile(f); setPreview(URL.createObjectURL(f))
  }

  async function addToCart() {
    if (!file) return setErr('Please upload a design first')
    setBusy(true)
    const sb = browserClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) { setBusy(false); return setErr('Please log in to upload your design') }
    const path = `${user.id}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, '_')}`
    const { error } = await sb.storage.from('custom-prints').upload(path, file)
    setBusy(false)
    if (error) return setErr(error.message)
    add({
      key: `custom-${path}`, productId: process.env.NEXT_PUBLIC_CUSTOM_TEE_PRODUCT_ID!, name: 'Custom Printed T-Shirt',
      price: BASE_PRICE + PRINT_FEE, image: preview, qty: 1, size, color,
      customPrint: { path, placement, scale, offsetX: 0, offsetY: 0 },
    })
    window.location.href = '/checkout'
  }

  return (
    <main className="mx-auto grid max-w-5xl gap-10 bg-[#fffaf7] px-5 py-10 md:grid-cols-2">
      <div className="relative mx-auto aspect-square w-full max-w-md rounded-[2.5rem] bg-stone-100 p-8">
        <div className="relative h-full w-full transition-colors duration-500" style={{ background: COLORS[color],
          clipPath: 'polygon(30% 0,70% 0,100% 20%,88% 38%,78% 32%,78% 100%,22% 100%,22% 32%,12% 38%,0 20%)' }} />
        {preview && <img src={preview} alt="design" style={{ transform: `translateX(-50%) scale(${scale})` }}
          className={`absolute object-contain ${PLACEMENTS[placement]}`} />}
        <p className="absolute bottom-3 left-0 right-0 text-center text-xs text-stone-400">Preview only — final print is checked by our team</p>
      </div>

      <div className="space-y-6">
        <h1 className="font-serif text-3xl">Design your tee</h1>
        <label className="grid cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-rose-200 bg-white p-8 text-sm text-stone-500 hover:border-rose-400">
          {file ? file.name : 'Tap to upload sticker / graphic (PNG with transparent background works best)'}
          <input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => pick(e.target.files?.[0])} />
        </label>

        <div><p className="mb-2 text-sm">Colour: {color}</p>
          <div className="flex gap-3">{(Object.keys(COLORS) as (keyof typeof COLORS)[]).map((c) => (
            <button key={c} aria-label={c} onClick={() => setColor(c)} style={{ background: COLORS[c] }}
              className={`h-9 w-9 rounded-full border ${color === c ? 'ring-2 ring-rose-400 ring-offset-2' : ''}`} />))}</div></div>

        <div><p className="mb-2 text-sm">Size</p>
          <div className="flex flex-wrap gap-2">{SIZES.map((s) => (
            <button key={s} onClick={() => setSize(s)} className={`rounded-full border px-4 py-1.5 text-sm ${size === s ? 'bg-stone-900 text-white' : 'bg-white'}`}>{s}</button>))}</div></div>

        <div><p className="mb-2 text-sm">Print placement</p>
          <div className="flex flex-wrap gap-2">{(Object.keys(PLACEMENTS) as (keyof typeof PLACEMENTS)[]).map((p) => (
            <button key={p} onClick={() => setPlacement(p)} className={`rounded-full border px-4 py-1.5 text-sm capitalize ${placement === p ? 'bg-rose-400 text-white' : 'bg-white'}`}>{p.replace('_', ' ')}</button>))}</div></div>

        <div><p className="mb-2 text-sm">Design size</p>
          <input type="range" min={0.5} max={1.4} step={0.05} value={scale} onChange={(e) => setScale(+e.target.value)} className="w-full accent-rose-400" /></div>

        {err && <p className="text-sm text-red-500">{err}</p>}
        <button disabled={busy} onClick={addToCart} className="w-full rounded-full bg-stone-900 py-4 text-white transition hover:bg-rose-400 disabled:opacity-50">
          {busy ? 'Uploading…' : `Add to cart · ₹${BASE_PRICE + PRINT_FEE}`}</button>
      </div>
    </main>
  )
}
