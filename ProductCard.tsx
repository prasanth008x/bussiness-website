import Link from 'next/link'

export type Product = { id: string; slug: string; name: string; price: number; compare_at?: number | null; images: string[]; stock: number }

export default function ProductCard({ p }: { p: Product }) {
  const off = p.compare_at ? Math.round((1 - p.price / p.compare_at) * 100) : 0
  return (
    <Link href={`/product/${p.slug}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-rose-50">
        <img src={p.images[0]} alt={p.name} loading="lazy"
          className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
        {off > 0 && <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs text-rose-500">{off}% off</span>}
        {p.stock === 0 && <span className="absolute inset-0 grid place-items-center bg-white/70 text-sm">Sold out</span>}
      </div>
      <h3 className="mt-3 truncate text-sm text-stone-700">{p.name}</h3>
      <p className="text-sm">
        <span className="font-medium text-stone-900">₹{p.price}</span>
        {p.compare_at && <span className="ml-2 text-stone-400 line-through">₹{p.compare_at}</span>}
      </p>
    </Link>
  )
}
