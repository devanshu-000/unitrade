import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false },
      global: {
        fetch: (url, options) => fetch(url as string, { ...options, cache: 'no-store' }),
      },
    }
  )
}

export async function POST(req: NextRequest) {
  const { userId } = await req.json()
  const supabase = getSupabase()

  const [{ count: completedOrders }, { count: returnedBorrows }, { data: reviews }] =
    await Promise.all([
      supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', userId)
        .eq('status', 'completed'),
      supabase
        .from('borrow_requests')
        .select('*', { count: 'exact', head: true })
        .eq('lender_id', userId)
        .eq('status', 'returned'),
      supabase
        .from('reviews')
        .select('rating')
        .eq('reviewee_id', userId),
    ])

  const totalRating =
    reviews && reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0)
      : 0

  const score = Math.round(
    (completedOrders ?? 0) * 10 +
    (returnedBorrows ?? 0) * 7 +
    totalRating * 2
  )

  await supabase
    .from('users')
    .update({ trust_score: score })
    .eq('id', userId)

  return NextResponse.json({ score })
}