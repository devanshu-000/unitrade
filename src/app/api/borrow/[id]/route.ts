import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params  // ← await added
  const { status } = await req.json()

  const supabase = getSupabaseAdmin()

  const { data: borrow, error: fetchErr } = await supabase
    .from('borrow_requests')
    .select('lender_id, requester_id, item_name')
    .eq('id', id)
    .single()

  console.log('userId:', userId)
  console.log('lender_id:', borrow?.lender_id)
  console.log('fetchErr:', fetchErr)

  if (!borrow) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (['accepted', 'rejected'].includes(status) && borrow.lender_id !== userId)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // FIX: idempotency — if already in that status, return current data without re-notifying
  const { data: current } = await supabase
    .from('borrow_requests').select('status').eq('id', id).single()
  if (current?.status === status) {
    return NextResponse.json(current)
  }

  const { data, error } = await supabase
    .from('borrow_requests')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('notifications').insert({
    user_id: borrow.requester_id,
    type: status,
    title: status === 'accepted' ? '✅ Request approved!' : '❌ Request rejected',
    // FIX: accepted notification tells borrower to proceed to payment
    body: status === 'accepted'
      ? `Your request for "${borrow.item_name}" was approved. Please proceed to payment in My Requests.`
      : `Your request for "${borrow.item_name}" was rejected.`,
    href: '/borrow',
  })

  return NextResponse.json(data)
}