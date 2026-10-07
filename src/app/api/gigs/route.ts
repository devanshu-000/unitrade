import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('gigs')
    .select('*, users(id, full_name, trust_score, avatar_url)')
    .eq('is_available', true)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { title, description, category, price, price_type, delivery_time, images } = body

  if (!title || !category || !price) {
    return NextResponse.json({ error: 'title, category and price are required' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  // Build insert — omit price_type/delivery_time initially to test if columns exist
  const insertData: Record<string, unknown> = {
    user_id: userId,
    title: title.trim(),
    description: description?.trim() ?? '',
    category,
    price: parseFloat(price),
    images: images ?? [],
    is_available: true,
  }

  // Try full insert with optional columns
  const fullInsert = {
    ...insertData,
    price_type: price_type ?? 'FIXED',
    delivery_time: delivery_time ?? '3 days',
  }

  const { data, error } = await supabase
    .from('gigs')
    .insert(fullInsert)
    .select()
    .single()

  if (error) {
    // If error is about missing column, retry without those columns
    if (error.message.includes('price_type') || error.message.includes('delivery_time')) {
      const { data: data2, error: error2 } = await supabase
        .from('gigs')
        .insert(insertData)
        .select()
        .single()

      if (error2) return NextResponse.json({ error: error2.message }, { status: 500 })
      return NextResponse.json(data2)
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
