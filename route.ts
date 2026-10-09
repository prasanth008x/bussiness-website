import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase'

export async function POST(req: Request) {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = await req.json()
  const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex')
  const ok = expected.length === razorpay_signature?.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(razorpay_signature))
  const db = adminClient()
  await db.from('transactions').update({ provider_payment_id: razorpay_payment_id, status: ok ? 'paid' : 'failed' }).eq('provider_order_id', razorpay_order_id)
  if (!ok) { await db.from('orders').update({ payment_status: 'failed' }).eq('id', orderId); return NextResponse.json({ error: 'Invalid signature' }, { status: 400 }) }
  await db.from('orders').update({ payment_status: 'paid', status: 'confirmed' }).eq('id', orderId)
  return NextResponse.json({ ok: true })
}
