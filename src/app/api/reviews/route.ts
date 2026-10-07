import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const reviewee_id = searchParams.get('reviewee_id')

  const supabase = getSupabaseAdmin()
  let query = supabase
    .from('reviews')
    .select('*, users!reviews_reviewer_id_fkey(full_name, avatar_url)')
    .order('created_at', { ascending: false })

  if (reviewee_id) query = query.eq('reviewee_id', reviewee_id)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { reviewee_id, rating, comment, order_id, listing_id } = await req.json()

  if (!reviewee_id || !rating)
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  if (reviewee_id === userId)
    return NextResponse.json({ error: 'Cannot review yourself' }, { status: 400 })

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('reviews')
    .insert({ reviewer_id: userId, reviewee_id, rating, comment, order_id, listing_id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Recalculate trust score for reviewee
  const [{ count: completedOrders }, { count: returnedBorrows }, { data: reviews }] =
    await Promise.all([
      supabase.from('orders').select('*', { count: 'exact', head: true })
        .eq('seller_id', reviewee_id).eq('status', 'completed'),
      supabase.from('borrow_requests').select('*', { count: 'exact', head: true })
        .eq('lender_id', reviewee_id).eq('status', 'returned'),
      supabase.from('reviews').select('rating').eq('reviewee_id', reviewee_id),
    ])

  const totalRating = reviews && reviews.length > 0
    ? reviews.reduce((s, r) => s + r.rating, 0) : 0

  const score = Math.round(
    (completedOrders ?? 0) * 10 +
    (returnedBorrows ?? 0) * 7 +
    totalRating * 2
  )

  await supabase.from('users').update({ trust_score: score }).eq('id', reviewee_id)

  return NextResponse.json(data)
}
