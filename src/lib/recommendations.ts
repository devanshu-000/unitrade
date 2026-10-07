/**
 * Lightweight Hybrid Recommendation Engine
 * Strategy: Content-Based Filtering + Behavior-Weighted Scoring
 *
 * Weights:
 *   40% → keyword/title similarity  (TF-IDF inspired term overlap)
 *   30% → category match
 *   20% → borrow / purchase history signal
 *   10% → recency (newer listings score higher)
 */

export interface UserInterests {
  keywords: string[]       // extracted from item names / titles user interacted with
  categories: string[]     // categories the user has interacted with
  borrowedKeywords: string[] // keywords from borrow history
  purchasedKeywords: string[] // keywords from order history
}

export interface ScoredListing {
  id: string
  title: string
  description: string
  price: number
  category: string
  condition: string
  listing_type: string
  images: string[]
  is_available: boolean
  created_at: string
  users?: { full_name: string; trust_score: number; avatar_url: string }
  score: number
}

// ─── Text utilities ──────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  'a','an','the','is','it','in','on','at','to','for','of','and','or','but',
  'with','this','that','my','your','i','we','you','he','she','they','from',
  'by','as','be','are','was','were','not','have','has','had','do','does',
  'did','will','would','can','could','should','may','might','shall','need',
])

/**
 * Tokenise a string into lowercase, stop-word-filtered word tokens.
 */
export function tokenise(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w))
}

/**
 * Term-frequency map for an array of tokens.
 */
function termFrequency(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>()
  for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1)
  return tf
}

/**
 * Cosine-like overlap score between two token arrays.
 * Returns a value in [0, 1].
 */
export function keywordOverlapScore(queryTokens: string[], targetTokens: string[]): number {
  if (!queryTokens.length || !targetTokens.length) return 0

  const qtf = termFrequency(queryTokens)
  const ttf = termFrequency(targetTokens)

  let dotProduct = 0
  let qMag = 0
  let tMag = 0

  for (const [term, qFreq] of qtf) {
    const tFreq = ttf.get(term) ?? 0
    dotProduct += qFreq * tFreq
    qMag += qFreq * qFreq
  }
  for (const [, tFreq] of ttf) {
    tMag += tFreq * tFreq
  }

  if (qMag === 0 || tMag === 0) return 0
  return dotProduct / (Math.sqrt(qMag) * Math.sqrt(tMag))
}

// ─── Interest extraction ─────────────────────────────────────────────────────

export function extractInterests(
  borrowedItems: Array<{ item_name: string; listing?: { category: string; title: string } | null }>,
  purchasedItems: Array<{ listings?: { title: string; category: string } | null; gigs?: { title: string; category: string } | null }>,
): UserInterests {
  const categories = new Set<string>()
  const borrowedKeywords: string[] = []
  const purchasedKeywords: string[] = []

  // From borrow history
  for (const b of borrowedItems) {
    borrowedKeywords.push(...tokenise(b.item_name))
    if (b.listing?.category) categories.add(b.listing.category)
    if (b.listing?.title) borrowedKeywords.push(...tokenise(b.listing.title))
  }

  // From order/purchase history
  for (const o of purchasedItems) {
    const src = o.listings ?? o.gigs
    if (!src) continue
    purchasedKeywords.push(...tokenise(src.title))
    if (src.category) categories.add(src.category)
  }

  // All keywords combined (deduplicated for the general pool)
  const allKw = [...new Set([...borrowedKeywords, ...purchasedKeywords])]

  return {
    keywords: allKw,
    categories: [...categories],
    borrowedKeywords,
    purchasedKeywords,
  }
}

// ─── Scoring function ────────────────────────────────────────────────────────

/**
 * Score a single listing against the user's extracted interests.
 *
 * Breakdown:
 *   40% keyword similarity   – cosine-overlap of user interest tokens vs listing title+description
 *   30% category match       – exact or soft match against user's interested categories
 *   20% behaviour signal     – separate weights for borrow vs purchase history overlap
 *   10% recency              – normalised age score (newer = higher)
 */
export function scoreListing(
  listing: Omit<ScoredListing, 'score'>,
  interests: UserInterests,
  now: Date = new Date(),
): number {
  const listingTokens = tokenise(`${listing.title} ${listing.description}`)

  // 40% – keyword similarity
  const kwScore = keywordOverlapScore(interests.keywords, listingTokens)

  // 30% – category match
  const catMatch = interests.categories.includes(listing.category)
  const catScore = catMatch ? 1 : 0

  // 20% – behaviour history (borrow 12% + purchase 8%)
  const borrowScore = keywordOverlapScore(interests.borrowedKeywords, listingTokens)
  const purchaseScore = keywordOverlapScore(interests.purchasedKeywords, listingTokens)
  const historyScore = borrowScore * 0.6 + purchaseScore * 0.4

  // 10% – recency (decay over 30 days, linear)
  const ageMs = now.getTime() - new Date(listing.created_at).getTime()
  const ageDays = ageMs / (1000 * 60 * 60 * 24)
  const recencyScore = Math.max(0, 1 - ageDays / 30)

  return (
    kwScore      * 0.40 +
    catScore     * 0.30 +
    historyScore * 0.20 +
    recencyScore * 0.10
  )
}

/**
 * Rank an array of listings and return the top N by score.
 */
export function rankListings(
  listings: Array<Omit<ScoredListing, 'score'>>,
  interests: UserInterests,
  topN = 10,
): ScoredListing[] {
  const now = new Date()

  return listings
    .map(l => ({ ...l, score: scoreListing(l, interests, now) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
}