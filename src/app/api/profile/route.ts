import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Support fetching another user's profile via ?user_id=xxx
  const { searchParams } = new URL(req.url)
  const targetId = searchParams.get('user_id') ?? userId

  const supabase = getSupabaseAdmin()

  const [
    { data: user },
    { count: soldCount },
    { count: borrowCount },
    { count: gigsCount },
    { data: reviews },
    { count: totalItemsCount },
    { count: totalCancellationsCount },
    { count: activeBorrowsCount },
    { count: activeLendingsCount },
  ] = await Promise.all([
    supabase.from('users').select('*').eq('id', targetId).single(),
    supabase.from('orders').select('*', { count: 'exact', head: true })
      .eq('seller_id', targetId).eq('status', 'completed'),
    supabase.from('borrow_requests').select('*', { count: 'exact', head: true })
      .eq('requester_id', targetId),
    supabase.from('orders').select('*', { count: 'exact', head: true })
      .eq('seller_id', targetId).eq('status', 'completed'),
    supabase.from('reviews').select('rating').eq('reviewee_id', targetId),
    supabase.from('listings').select('*', { count: 'exact', head: true })
      .eq('user_id', targetId),
    supabase.from('borrow_requests').select('*', { count: 'exact', head: true })
      .or(`requester_id.eq.${targetId},lender_id.eq.${targetId}`)
      .eq('status', 'rejected'),
    supabase.from('borrow_requests').select('*', { count: 'exact', head: true })
      .eq('requester_id', targetId)
      .in('status', ['pending', 'accepted']),
    supabase.from('borrow_requests').select('*', { count: 'exact', head: true })
      .eq('lender_id', targetId)
      .in('status', ['pending', 'accepted']),
  ])

  const avgRating =
    reviews && reviews.length > 0
      ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
      : null

  return NextResponse.json({
    user,
    stats: {
      itemsSold: soldCount ?? 0,
      borrowHistory: borrowCount ?? 0,
      gigsCompleted: gigsCount ?? 0,
      avgRating,
      totalItems: totalItemsCount ?? 0,
      totalCancellations: totalCancellationsCount ?? 0,
      activeBorrows: activeBorrowsCount ?? 0,
      activeLendings: activeLendingsCount ?? 0,
    },
  })
}

export async function PATCH(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const allowed = ['full_name', 'college', 'avatar_url', 'phone_number']
  const updates: Record<string, string> = {}
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key]
  }

  if (Object.keys(updates).length === 0)
    return NextResponse.json({ error: 'No valid fields' }, { status: 400 })

  const supabase = getSupabaseAdmin()

  // Step 1: fetch the existing row so we have email/full_name/avatar_url
  // These are NOT NULL columns — upsert needs them if it ends up inserting.
  const { data: existingUser } = await supabase
    .from('users')
    .select('email, full_name, avatar_url')
    .eq('id', userId)
    .single()

  // Step 2: upsert — merges existing required fields with the incoming updates
  const { data, error } = await supabase
    .from('users')
    .upsert(
      {
        id: userId,
        email: existingUser?.email ?? '',        // satisfies NOT NULL constraint
        full_name: existingUser?.full_name ?? '',
        avatar_url: existingUser?.avatar_url ?? '',
        ...updates,                               // overrides with whatever was patched
      },
      { onConflict: 'id' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
