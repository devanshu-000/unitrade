import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('orders')
    .select('*, gigs(title, category, price), users!orders_seller_id_fkey(full_name, avatar_url), users!orders_buyer_id_fkey(full_name, avatar_url)')
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { gig_id, message } = await req.json()
  const supabase = getSupabaseAdmin()

  // Get gig to find seller and price
  const { data: gig, error: gigError } = await supabase
    .from('gigs')
    .select('user_id, price, is_available')
    .eq('id', gig_id)
    .single()

  if (gigError || !gig) return NextResponse.json({ error: 'Gig not found' }, { status: 404 })
  if (!gig.is_available) return NextResponse.json({ error: 'Gig not available' }, { status: 400 })
  if (gig.user_id === userId) return NextResponse.json({ error: 'Cannot hire your own gig' }, { status: 400 })

  const { data, error } = await supabase
    .from('orders')
    .insert({
      gig_id,
      buyer_id: userId,
      seller_id: gig.user_id,
      amount: gig.price,
      status: 'pending',
      message: message ?? '',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
