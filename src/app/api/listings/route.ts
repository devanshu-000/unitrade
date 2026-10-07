import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

function buildDaySlots(fromDate: string, toDate: string) {
  const slots = []
  const cur = new Date(fromDate)
  const end = new Date(toDate)
  while (cur <= end) {
    slots.push({ date: cur.toISOString().split('T')[0], booked: false })
    cur.setDate(cur.getDate() + 1)
  }
  return slots
}

function buildHourSlots(totalHours: number, startHour = 9) {
  const slots = []
  for (let i = 0; i < totalHours; i++) {
    const h = (startHour + i) % 24
    const label = `${h % 12 === 0 ? 12 : h % 12}:00 ${h < 12 ? 'AM' : 'PM'}`
    slots.push({ hourIndex: i, label, booked: false })
  }
  return slots
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const listingType = searchParams.get('type')
  const supabase = getSupabaseAdmin()
  let query = supabase
    .from('listings')
    .select('*, users(full_name, trust_score, avatar_url)')
    .eq('is_available', true)
    .order('created_at', { ascending: false })
  if (listingType === 'sell') {
    query = query.or('listing_type.eq.sell,listing_type.is.null')
  } else if (listingType === 'borrow') {
    query = query.eq('listing_type', 'borrow')
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
    title, description, price, category,
    subcategory,                             // ← NEW
    condition, images, listing_type,
    duration_type, price_per_day, price_per_hour,
    slot_from_date, slot_to_date, slot_total_hours, slot_start_hour,
  } = body
  if (!title || !category || !condition)
    return NextResponse.json({ error: 'title, category and condition are required' }, { status: 400 })
  if (listing_type === 'borrow') {
    if (!duration_type)
      return NextResponse.json({ error: 'duration_type required for borrow listings' }, { status: 400 })
    if (duration_type === 'day' && (!price_per_day || !slot_from_date || !slot_to_date))
      return NextResponse.json({ error: 'price_per_day, slot_from_date and slot_to_date required' }, { status: 400 })
    if (duration_type === 'hour' && (!price_per_hour || !slot_total_hours))
      return NextResponse.json({ error: 'price_per_hour and slot_total_hours required' }, { status: 400 })
  } else {
    if (!price) return NextResponse.json({ error: 'price required for sell listings' }, { status: 400 })
  }
  let slots: object[] = []
  let computedPrice = price ? parseFloat(price) : 0
  if (listing_type === 'borrow' && duration_type === 'day') {
    slots = buildDaySlots(slot_from_date, slot_to_date)
    computedPrice = parseFloat(price_per_day)
  } else if (listing_type === 'borrow' && duration_type === 'hour') {
    slots = buildHourSlots(parseInt(slot_total_hours), slot_start_hour ? parseInt(slot_start_hour) : 9)
    computedPrice = parseFloat(price_per_hour)
  }
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('listings')
    .insert({
      user_id: userId,
      title: title.trim(),
      description: description?.trim() ?? '',
      price: computedPrice,
      category,
      subcategory: subcategory ?? null,      // ← NEW
      condition: condition.toLowerCase().replace(' ', '_'),
      listing_type: listing_type ?? 'sell',
      images: images ?? [],
      is_available: true,
      duration_type: listing_type === 'borrow' ? duration_type : null,
      price_per_day: duration_type === 'day' ? parseFloat(price_per_day) : null,
      price_per_hour: duration_type === 'hour' ? parseFloat(price_per_hour) : null,
      slots,
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
