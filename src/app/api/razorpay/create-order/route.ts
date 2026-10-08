import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const missing = ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'NEXT_PUBLIC_RAZORPAY_KEY_ID']
    .filter(k => !process.env[k])
  if (missing.length > 0) {
    // Names only, never values. Visible in server logs / Vercel function logs.
    console.error('[razorpay/create-order] missing env vars:', missing.join(', '))
    return NextResponse.json({ error: 'Payment not configured' }, { status: 503 })
  }

  const Razorpay = (await import('razorpay')).default
  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  })

  let body: Record<string, unknown> & { type?: string; id?: string; borrow_request_id?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  const { type, id } = body
  const supabase = getSupabaseAdmin()

  let amount = 0
  let sellerId = ''
  let title = ''
  let orderInsert: Record<string, unknown> | null = null

  if (type === 'listing') {
    const { data: listing } = await supabase
      .from('listings').select('price, user_id, title, is_available').eq('id', id).single()
    if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    if (!listing.is_available) return NextResponse.json({ error: 'Item no longer available' }, { status: 400 })
    if (listing.user_id === userId) return NextResponse.json({ error: 'Cannot buy your own listing' }, { status: 400 })
    amount = Math.round(listing.price * 100)
    sellerId = listing.user_id
    title = listing.title
    orderInsert = {
      buyer_id: userId, seller_id: sellerId,
      amount: listing.price, listing_id: id,
      status: 'pending', payment_status: 'pending',
    }
  } else if (type === 'gig') {
    const { data: gig } = await supabase
      .from('gigs').select('price, user_id, title, is_available').eq('id', id).single()
    if (!gig) return NextResponse.json({ error: 'Gig not found' }, { status: 404 })
    if (!gig.is_available) return NextResponse.json({ error: 'Gig not available' }, { status: 400 })
    if (gig.user_id === userId) return NextResponse.json({ error: 'Cannot hire your own gig' }, { status: 400 })
    amount = Math.round(gig.price * 100)
    sellerId = gig.user_id
    title = gig.title
    orderInsert = {
      buyer_id: userId, seller_id: sellerId,
      amount: gig.price, gig_id: id,
      status: 'pending', payment_status: 'pending',
    }
  } else if (type === 'borrow') {
    // Payment is only allowed for an approved, unpaid borrow request owned by the caller.
    // The amount comes from the stored request, never from the client body.
    const { borrow_request_id } = body
    if (!borrow_request_id) {
      return NextResponse.json({ error: 'borrow_request_id required' }, { status: 400 })
    }

    const { data: borrowReq } = await supabase
      .from('borrow_requests')
      .select('status, requester_id, lender_id, listing_id, total_amount, payment_status')
      .eq('id', borrow_request_id)
      .single()

    if (!borrowReq) return NextResponse.json({ error: 'Borrow request not found' }, { status: 404 })
    if (borrowReq.requester_id !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (borrowReq.status !== 'accepted') {
      return NextResponse.json(
        { error: 'Payment not allowed. Lender has not approved this request yet.' },
        { status: 403 }
      )
    }
    if (borrowReq.payment_status === 'paid') {
      return NextResponse.json({ error: 'This request has already been paid for.' }, { status: 409 })
    }

    const { data: listing } = await supabase
      .from('listings').select('user_id, title, is_available').eq('id', borrowReq.listing_id).single()
    if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    if (listing.user_id === userId) return NextResponse.json({ error: 'Cannot borrow your own item' }, { status: 400 })

    // Note: is_available is deliberately not checked. A lender may keep an item listed
    // for other time slots, and this request was already approved.
    amount = Math.round(Number(borrowReq.total_amount) * 100)
    sellerId = borrowReq.lender_id ?? listing.user_id
    title = listing.title
    // No listing_id on this order row: verify marks the listing sold when listing_id is set,
    // which must not happen for a borrow.
    orderInsert = {
      buyer_id: userId, seller_id: sellerId,
      amount: Number(borrowReq.total_amount),
      status: 'pending', payment_status: 'pending',
    }
  } else {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }

  if (!Number.isFinite(amount) || amount < 100) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
  }

  try {
    const rzpOrder = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`,
      notes: { buyer_id: userId, seller_id: sellerId, type, item_id: String(id ?? body.borrow_request_id ?? '') },
    })

    let dbOrderId: string | null = null
    if (orderInsert) {
      const { data: dbOrder, error } = await supabase
        .from('orders').insert({ ...orderInsert, razorpay_order_id: rzpOrder.id }).select().single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      dbOrderId = dbOrder.id
    }

    return NextResponse.json({
      razorpay_order_id: rzpOrder.id,
      amount,
      currency: 'INR',
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      db_order_id: dbOrderId,
      title,
      seller_id: sellerId,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Payment error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
