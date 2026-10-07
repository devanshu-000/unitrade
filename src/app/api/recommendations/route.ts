import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { extractInterests, rankListings } from '@/lib/recommendations'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseAdmin()

  // ── 1. Fetch user behaviour data in parallel ───────────────────────────────
  type BorrowedItem = {
    item_name: string
    listing: { title: string; category: string } | null
  }

  type PurchasedItem = {
    listings: { title: string; category: string } | null
    gigs: { title: string; category: string } | null
  }

  const [borrowRes, ordersRes] = await Promise.all([
    supabase
      .from('borrow_requests')
      .select('item_name, listing:listing_id(title, category)')
      .eq('requester_id', userId)
      .in('status', ['accepted', 'returned', 'pending'])
      .order('created_at', { ascending: false })
      .limit(20),

    supabase
      .from('orders')
      .select('listings:listing_id(title, category), gigs:gig_id(title, category)')
      .eq('buyer_id', userId)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  // Safely map raw Supabase rows into our typed shapes
  const borrowedItems: BorrowedItem[] = (borrowRes.data ?? []).map((row: any) => ({
    item_name: row.item_name ?? '',
    listing: row.listing
      ? { title: row.listing.title ?? '', category: row.listing.category ?? '' }
      : null,
  }))

  const purchasedItems: PurchasedItem[] = (ordersRes.data ?? []).map((row: any) => ({
    listings: row.listings
      ? { title: row.listings.title ?? '', category: row.listings.category ?? '' }
      : null,
    gigs: row.gigs
      ? { title: row.gigs.title ?? '', category: row.gigs.category ?? '' }
      : null,
  }))

  // ── 2. Extract interests ───────────────────────────────────────────────────
  const interests = extractInterests(borrowedItems, purchasedItems)

  const hasSignals =
    interests.keywords.length > 0 || interests.categories.length > 0

  // ── 3. Fetch candidate listings ────────────────────────────────────────────
  let candidates: any[] = []

  if (hasSignals) {
    // Build Supabase OR filter from keywords (ilike) + category in()
    //
    // Strategy: fetch up to 80 candidates that touch any user keyword OR category,
    // then re-rank them all in JS with our scoring function.
    //
    // We split into two parallel queries and merge to keep individual query cost low.

    const keywordFilters = interests.keywords
      .slice(0, 10) // cap to avoid huge OR chains
      .map(kw => `title.ilike.%${kw}%`)
      .join(',')

    const [byKeyword, byCategory] = await Promise.all([
      keywordFilters
        ? supabase
            .from('listings')
            .select('*, users(full_name, trust_score, avatar_url)')
            .eq('is_available', true)
            .neq('user_id', userId)
            .or(keywordFilters)
            .order('created_at', { ascending: false })
            .limit(40)
        : { data: [] },

      interests.categories.length > 0
        ? supabase
            .from('listings')
            .select('*, users(full_name, trust_score, avatar_url)')
            .eq('is_available', true)
            .neq('user_id', userId)
            .in('category', interests.categories)
            .order('created_at', { ascending: false })
            .limit(40)
        : { data: [] },
    ])

    // Merge + deduplicate by id
    const seen = new Set<string>()
    for (const item of [...(byKeyword.data ?? []), ...(byCategory.data ?? [])]) {
      if (!seen.has(item.id)) {
        seen.add(item.id)
        candidates.push(item)
      }
    }
  }

  // ── 4. Fallback: latest / trending listings ────────────────────────────────
  //
  // If no signals or not enough candidates, pad with latest listings.
  if (candidates.length < 10) {
    const existingIds = new Set(candidates.map((c: any) => c.id))

    const { data: fallback } = await supabase
      .from('listings')
      .select('*, users(full_name, trust_score, avatar_url)')
      .eq('is_available', true)
      .neq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30)

    for (const item of fallback ?? []) {
      if (!existingIds.has(item.id)) {
        existingIds.add(item.id)
        candidates.push(item)
      }
    }
  }

  // ── 5. Score + rank ────────────────────────────────────────────────────────
  const ranked = hasSignals
    ? rankListings(candidates, interests, 10)
    : candidates
        .sort(
          (a: any, b: any) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        )
        .slice(0, 10)
        .map((l: any) => ({ ...l, score: 0 }))

  return NextResponse.json({
    recommendations: ranked,
    meta: {
      hasSignals,
      interestCategories: interests.categories,
      keywordCount: interests.keywords.length,
    },
  })
}