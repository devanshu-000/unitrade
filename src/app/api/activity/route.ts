import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

// Active borrow statuses (item is still out)
const ACTIVE_BORROW_STATUSES = ['pending', 'accepted', 'return_requested']

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseAdmin()

  const [
    { data: listings },
    { data: borrowSent },
    { data: borrowReceived },
    { data: ordersBuyer },
    { data: ordersSeller },
    { count: gigsCompleted },
    { count: activeBorrows },
    { count: activeLendings },
  ] = await Promise.all([
    supabase
      .from('listings')
      .select('id, title, price, category, created_at, is_available')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10),

    // Current user is BORROWER (sent the request)
    supabase
      .from('borrow_requests')
      .select(
        'id, item_name, status, created_at, returned_by_borrower, confirmed_by_lender, returned_on_time, item_damaged, ' +
        'users!borrow_requests_lender_id_fkey(full_name)'
      )
      .eq('requester_id', userId)
      .order('created_at', { ascending: false })
      .limit(15),

    // Current user is LENDER (received the request)
    supabase
      .from('borrow_requests')
      .select(
        'id, item_name, status, created_at, returned_by_borrower, confirmed_by_lender, returned_on_time, item_damaged, ' +
        'users!borrow_requests_requester_id_fkey(full_name)'
      )
      .eq('lender_id', userId)
      .order('created_at', { ascending: false })
      .limit(15),

    supabase
      .from('orders')
      .select('id, amount, status, created_at, gigs(title), listings(title)')
      .eq('buyer_id', userId)
      .order('created_at', { ascending: false })
      .limit(10),

    supabase
      .from('orders')
      .select('id, amount, status, created_at, gigs(title), listings(title)')
      .eq('seller_id', userId)
      .order('created_at', { ascending: false })
      .limit(10),

    supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('seller_id', userId)
      .eq('status', 'completed'),

    // Active borrows: user borrowed something, not yet returned
    supabase
      .from('borrow_requests')
      .select('*', { count: 'exact', head: true })
      .eq('requester_id', userId)
      .in('status', ACTIVE_BORROW_STATUSES),

    // Active lendings: user lent something, not yet confirmed returned
    supabase
      .from('borrow_requests')
      .select('*', { count: 'exact', head: true })
      .eq('lender_id', userId)
      .in('status', ACTIVE_BORROW_STATUSES),
  ])

  const feed: Array<{
    id: string
    type: string
    role: 'borrower' | 'lender' | 'buyer' | 'seller' | 'owner'
    title: string
    subtitle: string
    time: string
    status: string
    borrowId?: string
    returnedByBorrower?: boolean
    confirmedByLender?: boolean
    returnedOnTime?: boolean | null
    itemDamaged?: boolean | null
    href: string
  }> = []

  for (const l of listings ?? []) {
    feed.push({
      id: `listing-${l.id}`,
      type: 'listing',
      role: 'owner',
      title: `You listed "${l.title}"`,
      subtitle: `₹${Number(l.price).toLocaleString()} · ${l.category}`,
      time: l.created_at,
      status: l.is_available ? 'active' : 'completed',
      href: `/marketplace/${l.id}`,
    })
  }

  for (const b of (borrowSent ?? []) as any[]) {
    const lenderName =Array.isArray(b.users)? b.users[0]?.full_name: b.users?.full_name ?? 'someone'
    let title = `You borrowed "${b.item_name}"`
    if (b.status === 'pending')          title = `Borrow request sent for "${b.item_name}"`
    if (b.status === 'rejected')         title = `Borrow request for "${b.item_name}" was declined`
    if (b.status === 'return_requested') title = `Return pending confirmation — "${b.item_name}"`
    if (b.status === 'completed')        title = `You returned "${b.item_name}" ✓`

    feed.push({
      id: `borrow-sent-${b.id}`,
      type: 'borrow',
      role: 'borrower',
      title,
      subtitle: `Lender: ${lenderName}`,
      time: b.created_at as string,
      status: b.status,
      borrowId: b.id,
      returnedByBorrower: b.returned_by_borrower,
      confirmedByLender: b.confirmed_by_lender,
      returnedOnTime: b.returned_on_time,
      itemDamaged: b.item_damaged,
      href: '/borrow',
    })
  }

  for (const b of (borrowReceived ?? []) as any[]){
    const borrowerName =Array.isArray(b.users)? b.users[0]?.full_name: b.users?.full_name ?? 'someone'
    let title = `You lent "${b.item_name}" to ${borrowerName}`
    if (b.status === 'pending')          title = `${borrowerName} wants to borrow "${b.item_name}"`
    if (b.status === 'rejected')         title = `You declined "${b.item_name}" from ${borrowerName}`
    if (b.status === 'return_requested') title = `${borrowerName} says they returned "${b.item_name}"`
    if (b.status === 'completed')        title = `"${b.item_name}" returned by ${borrowerName} ✓`

    feed.push({
      id: `borrow-recv-${b.id}`,
      type: 'borrow',
      role: 'lender',
      title,
      subtitle: `Borrower: ${borrowerName}`,
      time: b.created_at as string,
      status: b.status,
      borrowId: b.id,
      returnedByBorrower: b.returned_by_borrower,
      confirmedByLender: b.confirmed_by_lender,
      returnedOnTime: b.returned_on_time,
      itemDamaged: b.item_damaged,
      href: '/borrow',
    })
  }

  for (const o of ordersBuyer ?? []) {
    const title = (o.gigs as any)?.title ?? (o.listings as any)?.title ?? 'an item'
    feed.push({
      id: `order-buy-${o.id}`,
      type: 'order',
      role: 'buyer',
      title: `You hired "${title}"`,
      subtitle: `₹${Number(o.amount).toLocaleString()}`,
      time: o.created_at,
      status: o.status,
      href: '/gigs',
    })
  }

  for (const o of ordersSeller ?? []) {
    const title = (o.gigs as any)?.title ?? (o.listings as any)?.title ?? 'your item'
    feed.push({
      id: `order-sell-${o.id}`,
      type: 'order',
      role: 'seller',
      title: `Order received for "${title}"`,
      subtitle: `₹${Number(o.amount).toLocaleString()}`,
      time: o.created_at,
      status: o.status,
      href: '/gigs',
    })
  }

  feed.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())

  return NextResponse.json({
    feed: feed.slice(0, 30),
    stats: {
      activeBorrows: activeBorrows ?? 0,
      activeLendings: activeLendings ?? 0,
      gigsCompleted: gigsCompleted ?? 0,
    },
  })
}