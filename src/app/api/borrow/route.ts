import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const listing_id = searchParams.get('listing_id')

  const supabase = getSupabaseAdmin()
  let query = supabase
    .from('borrow_requests')
    .select('*, users!borrow_requests_requester_id_fkey(full_name, trust_score)')
    .order('created_at', { ascending: false })

  if (listing_id) {
    query = supabase
      .from('borrow_requests')
      .select('selected_slots, duration_type, borrow_from, borrow_until, status')
      .eq('listing_id', listing_id)
      .in('status', ['pending', 'accepted'])
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    item_name, description, lender_id, listing_id,
    borrow_from, borrow_until,
    duration_type, selected_slots, total_amount,
  } = body

  if (!item_name || !lender_id) {
    return NextResponse.json({ error: 'item_name and lender_id required' }, { status: 400 })
  }

  // ✅ SINGLE declaration (keep only this one)
  const supabase = getSupabaseAdmin()

  // Duplicate request prevention
  if (listing_id) {
    const { data: dup } = await supabase
      .from('borrow_requests')
      .select('id, status')
      .eq('listing_id', listing_id)
      .eq('requester_id', userId)
      .in('status', ['pending', 'accepted'])
      .limit(1)

    if (dup && dup.length > 0) {
      return NextResponse.json(
        { error: 'You already have a pending or accepted request for this item' },
        { status: 409 }
      )
    }
  }

  let resolvedFrom = borrow_from
  let resolvedUntil = borrow_until

  if (selected_slots && Array.isArray(selected_slots) && selected_slots.length > 0) {
    const sorted = [...selected_slots].sort()
    if (duration_type === 'hour') {
      const datePart = sorted[0].split(' ')[0]
      resolvedFrom = datePart
      resolvedUntil = datePart
    } else {
      resolvedFrom = sorted[0]
      resolvedUntil = sorted[sorted.length - 1]
    }
  }

  if (!resolvedFrom || !resolvedUntil) {
    return NextResponse.json({ error: 'borrow dates are required' }, { status: 400 })
  }

  // ✅ NO second supabase declaration here

  // Slot overlap validation
  if (selected_slots && listing_id) {
    const { data: existing } = await supabase
      .from('borrow_requests')
      .select('selected_slots')
      .eq('listing_id', listing_id)
      .in('status', ['pending', 'accepted'])

    const bookedSet = new Set<string>()
    for (const req of existing ?? []) {
      for (const slot of req.selected_slots ?? []) bookedSet.add(slot)
    }

    const conflict = selected_slots.some((s: string) => bookedSet.has(s))
    if (conflict) {
      return NextResponse.json({ error: 'Some selected slots are already booked' }, { status: 409 })
    }
  }

  const { data, error } = await supabase
    .from('borrow_requests')
    .insert({
      requester_id: userId,
      item_name,
      description: description ?? '',
      lender_id,
      listing_id: listing_id ?? null,
      borrow_from: resolvedFrom,
      borrow_until: resolvedUntil,
      status: 'pending',
      payment_status: 'unpaid',
      duration_type: duration_type ?? null,
      selected_slots: selected_slots ?? null,
      total_amount: total_amount ?? null,
      razorpay_payment_id: null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: requester } = await supabase
    .from('users')
    .select('full_name')
    .eq('id', userId)
    .single()

  await supabase.from('notifications').insert({
    user_id: lender_id,
    type: 'request',
    title: 'New borrow request',
    body: (requester?.full_name ?? 'Someone') + ' wants to borrow "' + item_name + '"',
    href: '/borrow',
  })

  return NextResponse.json(data)
}
