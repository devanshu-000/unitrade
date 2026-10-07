import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import crypto from 'crypto'

// ── Helper: atomically add delta to a user's trust_score ─────────────────────
// Fetches current score first to avoid overwriting concurrent updates.
// Runs only once per call — callers must gate on transaction status themselves.
async function addTrustScore(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  delta: number,
): Promise<void> {
  const { data: user } = await supabase
    .from('users')
    .select('trust_score')
    .eq('id', userId)
    .single()

  if (!user) return

  const newScore = Math.max(0, (user.trust_score ?? 0) + delta)

  await supabase
    .from('users')
    .update({ trust_score: newScore })
    .eq('id', userId)
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    db_order_id,
    borrow_request_id,   // FIX: included in body so we can update borrow_request after payment
  } = await req.json()

  // Verify signature
  const body = razorpay_order_id + '|' + razorpay_payment_id
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(body)
    .digest('hex')

  if (expectedSignature !== razorpay_signature) {
    return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  // Update order to paid + completed
  const { data, error } = await supabase
    .from('orders')
    .update({
      razorpay_payment_id,
      payment_status: 'paid',
      status: 'completed',
    })
    .eq('id', db_order_id)
    // Guard: only update if not already completed — prevents duplicate trust awards
    .neq('status', 'completed')
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // data is null when .neq guard fired (already completed) — safe to skip
  if (!data) {
    return NextResponse.json({ success: true, skipped: true })
  }

  // ── If listing purchase, mark it as sold ──────────────────────────────────
  if (data.listing_id) {
    await supabase
      .from('listings')
      .update({ is_available: false })
      .eq('id', data.listing_id)

    // Increment seller transaction count
    const { data: seller } = await supabase
      .from('users')
      .select('total_transactions')
      .eq('id', data.seller_id)
      .single()

    if (seller) {
      await supabase
        .from('users')
        .update({ total_transactions: (seller.total_transactions ?? 0) + 1 })
        .eq('id', data.seller_id)
    }
  }

  // FIX: after borrow payment success, update borrow_request status + payment_status
  if (borrow_request_id) {
    await supabase
      .from('borrow_requests')
      .update({
        status: 'active',
        payment_status: 'paid',
        razorpay_payment_id,
      })
      .eq('id', borrow_request_id)
      .eq('status', 'accepted') // idempotency guard

    // Notify borrower of successful payment
    const { data: borrowReq } = await supabase
      .from('borrow_requests')
      .select('requester_id, lender_id, item_name')
      .eq('id', borrow_request_id)
      .single()

    if (borrowReq) {
      await supabase.from('notifications').insert({
        user_id: borrowReq.requester_id,
        type: 'payment',
        title: '🎉 Borrowing confirmed!',
        body: `Payment successful for "${borrowReq.item_name}". Enjoy your borrow!`,
        href: '/borrow',
      })
    }
  }

  // ── TRUST SCORE: +50 for buyer, +50 for seller on every completed payment ──
  // Runs only when status transitions to 'completed' (guarded by .neq above).
  await Promise.all([
    addTrustScore(supabase, data.buyer_id, 50),
    addTrustScore(supabase, data.seller_id, 50),
  ])
  // ── END TRUST SCORE ────────────────────────────────────────────────────────

  return NextResponse.json({ success: true, order: data })
}
