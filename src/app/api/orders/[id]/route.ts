import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { status } = await req.json()

  if (!['pending', 'accepted', 'completed', 'cancelled'].includes(status))
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })

  const supabase = getSupabaseAdmin()
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('buyer_id, seller_id, amount, status, gigs(title)')
    .eq('id', id)
    .single()

  if (orderError || !order) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const allowed = order.seller_id === userId || order.buyer_id === userId
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Guard: prevent re-processing an already-completed order
  // This ensures trust score is only awarded once per transaction
  if (order.status === 'completed' && status === 'completed') {
    return NextResponse.json({ error: 'Order already completed' }, { status: 409 })
  }

  const { data, error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const gigTitle = (order.gigs as any)?.title ?? 'your order'

  // Send notifications based on status change
  if (status === 'accepted' && order.seller_id === userId) {
    await supabase.from('notifications').insert({
      user_id: order.buyer_id,
      type: 'accepted',
      title: 'Order accepted!',
      body: '"' + gigTitle + '" has been accepted by the seller',
      href: '/activity',
    })
  }

  if (status === 'completed') {
    // Notify buyer
    await supabase.from('notifications').insert({
      user_id: order.buyer_id,
      type: 'accepted',
      title: 'Order completed!',
      body: '"' + gigTitle + '" marked as complete. Please leave a review!',
      href: '/activity',
    })

    // Update seller transaction count
    const { error: updateError } = await supabase
      .from('users')
      .update({
        total_transactions: supabase.rpc('increment_transactions', {
          uid: order.seller_id,
        }),
      })
      .eq('id', order.seller_id)

    if (updateError) {
      console.error('Failed to update transactions:', updateError)
    }

    // ── TRUST SCORE: +50 for buyer, +50 for seller on completion ─────────────
    // Guarded above by the 409 check — only runs once per order.
    await Promise.all([
      addTrustScore(supabase, order.buyer_id, 50),
      addTrustScore(supabase, order.seller_id, 50),
    ])
    // ── END TRUST SCORE ────────────────────────────────────────────────────────
  }

  return NextResponse.json(data)
}
