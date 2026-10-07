'use client'

/**
 * RecommendedSection
 * ------------------
 * Standalone "Recommended for You" section for the dashboard home page.
 * Fetches from /api/recommendations and renders listing cards matching
 * the existing design system (inline styles + CSS variables) so it slots
 * in without touching any existing component.
 *
 * Usage (in home/page.tsx — ADD only, change nothing else):
 *
 *   import RecommendedSection from '@/components/shared/RecommendedSection'
 *   ...
 *   <RecommendedSection />   ← place ABOVE the Quick Actions section
 */

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'

interface RecommendedListing {
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
  score: number
  users?: { full_name: string; trust_score: number; avatar_url: string }
}

interface RecommendationsResponse {
  recommendations: RecommendedListing[]
  meta: {
    hasSignals: boolean
    interestCategories: string[]
    keywordCount: number
  }
}

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300&h=200&fit=crop',
  'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300&h=200&fit=crop',
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&h=200&fit=crop',
  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=200&fit=crop',
]

const card = {
  backgroundColor: 'var(--card)',
  borderRadius: '20px',
  border: '1px solid var(--border)',
  boxShadow: 'var(--shadow-sm)',
} as const

export default function RecommendedSection() {
  const [data, setData] = useState<RecommendationsResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/recommendations')
      .then(r => r.json())
      .then((res: RecommendationsResponse) => {
        setData(res)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // Don't render the section at all if we have no items to show
  if (!loading && (!data || data.recommendations.length === 0)) return null

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.05 }}
      style={{ marginBottom: '40px' }}
    >
      {/* Section header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={18} style={{ color: 'var(--primary)' }} />
          <h2
            style={{
              fontSize: '20px',
              fontWeight: 700,
              fontFamily: 'var(--font-manrope)',
              color: 'var(--on-surface)',
            }}
          >
            Recommended for You
          </h2>
        </div>

        {/* Subtle "personalised" badge when we have real signals */}
        {!loading && data?.meta.hasSignals && (
          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: '999px',
              backgroundColor: 'var(--primary-light)',
              color: 'var(--primary)',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            Personalised
          </span>
        )}
      </div>

      {/* Loading skeletons */}
      {loading ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))',
            gap: '16px',
          }}
        >
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              style={{ ...card, height: '200px' }}
              className="animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))',
            gap: '16px',
          }}
        >
          {data!.recommendations.map((item, idx) => (
            <Link
              key={item.id}
              href={`/marketplace/${item.id}`}
              style={{ textDecoration: 'none' }}
            >
              <motion.div
                whileHover={{ y: -4 }}
                style={{ ...card, overflow: 'hidden', cursor: 'pointer' }}
              >
                {/* Thumbnail */}
                <div style={{ height: '130px', overflow: 'hidden', position: 'relative' }}>
                  <img
                    src={item.images?.[0] ?? FALLBACK_IMAGES[idx % FALLBACK_IMAGES.length]}
                    alt={item.title}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transition: 'transform 0.5s',
                    }}
                    onMouseEnter={e =>
                      (e.currentTarget.style.transform = 'scale(1.05)')
                    }
                    onMouseLeave={e =>
                      (e.currentTarget.style.transform = 'scale(1)')
                    }
                  />

                  {/* listing_type badge overlay */}
                  <span
                    style={{
                      position: 'absolute',
                      top: '8px',
                      left: '8px',
                      fontSize: '9px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '999px',
                      backgroundColor: item.listing_type === 'borrow'
                        ? 'rgba(59,130,246,0.85)'
                        : 'rgba(16,185,129,0.85)',
                      color: 'white',
                      backdropFilter: 'blur(4px)',
                    }}
                  >
                    {item.listing_type === 'borrow' ? 'BORROW' : 'SALE'}
                  </span>
                </div>

                {/* Card body */}
                <div style={{ padding: '14px' }}>
                  <p
                    style={{
                      fontWeight: 600,
                      fontSize: '13px',
                      color: 'var(--on-surface)',
                      marginBottom: '4px',
                      fontFamily: 'var(--font-manrope)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.title}
                  </p>

                  <p
                    style={{
                      fontSize: '11px',
                      color: 'var(--on-surface-variant)',
                      marginBottom: '6px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.category}
                  </p>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '14px',
                        fontWeight: 800,
                        color: 'var(--primary)',
                        fontFamily: 'var(--font-manrope)',
                      }}
                    >
                      ₹{Number(item.price).toLocaleString()}
                    </span>

                    {item.users?.trust_score !== undefined && (
                      <span
                        style={{
                          fontSize: '10px',
                          color: 'var(--on-surface-variant)',
                        }}
                      >
                        ⭐ {item.users.trust_score}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      )}
    </motion.section>
  )
}