'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Package, HandshakeIcon, Briefcase, Clock, ChevronDown, ChevronUp, ShoppingBag } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'

// ── Types ────────────────────────────────────────────────────────────────────

type FeedItem = {
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
}

type Stats = {
  activeBorrows: number
  activeLendings: number
  gigsCompleted: number
}

// ── Config (unchanged from original) ────────────────────────────────────────

const typeConfig: Record<string, { icon: any; color: string }> = {
  listing: { icon: Package,       color: '#3525cd' },
  borrow:  { icon: HandshakeIcon, color: '#22c55e' },
  order:   { icon: ShoppingBag,   color: '#712ae2' },
  gig:     { icon: Briefcase,     color: '#712ae2' },
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  active:            { label: 'Active',            color: '#3525cd', bg: '#e2dfff' },
  pending:           { label: 'Pending',            color: '#b45309', bg: '#fef3c7' },
  accepted:          { label: 'Active',             color: '#15803d', bg: '#dcfce7' },
  return_requested:  { label: 'Return Pending',     color: '#b45309', bg: '#fef9c3' },
  completed:         { label: 'Completed',          color: '#15803d', bg: '#dcfce7' },
  return_confirmed:  { label: 'Return Confirmed',   color: '#15803d', bg: '#dcfce7' },
  rejected:          { label: 'Declined',           color: '#b91c1c', bg: '#fee2e2' },
  returned:          { label: 'Returned',           color: '#464555', bg: '#edeeef' },
  cancelled:         { label: 'Cancelled',          color: '#b91c1c', bg: '#fee2e2' },
}

const card = {
  backgroundColor: 'var(--card)',
  borderRadius: '16px',
  border: '1px solid var(--border)',
  boxShadow: 'var(--shadow-sm)',
}

// ── Return-flow sub-panel ─────────────────────────────────────────────────────

function ReturnFlowPanel({
  item,
  onUpdate,
}: {
  item: FeedItem
  onUpdate: () => void
}) {
  const [loading, setLoading] = useState(false)

  const call = useCallback(
    async (action: string, extra?: Record<string, unknown>) => {
      if (!item.borrowId) return
      setLoading(true)
      try {
        const res = await fetch(`/api/borrow/${item.borrowId}/return-flow`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, ...extra }),
        })
        if (!res.ok) {
          const err = await res.json()
          toast.error(err.error ?? 'Something went wrong')
        } else {
          onUpdate()
        }
      } catch {
        toast.error('Network error')
      } finally {
        setLoading(false)
      }
    },
    [item.borrowId, onUpdate]
  )

  const btnBase: React.CSSProperties = {
    padding: '6px 16px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: 700,
    cursor: loading ? 'not-allowed' : 'pointer',
    border: 'none',
    opacity: loading ? 0.6 : 1,
    transition: 'opacity 0.15s',
  }
  const btnYes: React.CSSProperties = { ...btnBase, backgroundColor: '#22c55e', color: '#fff' }
  const btnNo:  React.CSSProperties = { ...btnBase, backgroundColor: '#fee2e2', color: '#b91c1c' }
  const label: React.CSSProperties = {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--on-surface)',
    marginBottom: '10px',
  }
  const row: React.CSSProperties = { display: 'flex', gap: '8px', alignItems: 'center' }

  // ── BORROWER VIEW ──────────────────────────────────────────────────────────

  if (item.role === 'borrower') {
    // Already marked returned → waiting for lender
    if (item.status === 'return_requested') {
      return (
        <div style={{ padding: '12px 16px', background: 'var(--surface-variant)', borderRadius: '10px', marginTop: '10px' }}>
          <p style={{ fontSize: '13px', color: 'var(--on-surface-variant)' }}>
            ⏳ Waiting for the lender to confirm the return…
          </p>
        </div>
      )
    }

    // Active borrow → let borrower say they returned it
    if (item.status === 'accepted') {
      return (
        <div style={{ padding: '12px 16px', background: 'var(--surface-variant)', borderRadius: '10px', marginTop: '10px' }}>
          <p style={label}>Have you returned the item?</p>
          <div style={row}>
            <button style={btnYes} disabled={loading} onClick={() => call('borrower_returned')}>YES</button>
            <button style={btnNo}  disabled={loading} onClick={() => toast.info('No problem — mark it when you return it.')}>NO</button>
          </div>
        </div>
      )
    }

    // Completed
    if (item.status === 'completed') {
      return (
        <div style={{ padding: '12px 16px', background: '#f0fdf4', borderRadius: '10px', marginTop: '10px' }}>
          <p style={{ fontSize: '13px', color: '#15803d', fontWeight: 600 }}>
            ✅ Return confirmed by the lender.
            {item.returnedOnTime === true  && ' Returned on time.'}
            {item.returnedOnTime === false && ' Returned late.'}
          </p>
        </div>
      )
    }

    return null
  }

  // ── LENDER VIEW ────────────────────────────────────────────────────────────

  if (item.role === 'lender') {
    // Borrower has marked as returned → lender must confirm
    if (item.status === 'return_requested') {
      return (
        <div style={{ padding: '12px 16px', background: 'var(--surface-variant)', borderRadius: '10px', marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <p style={label}>Has the borrower returned the item?</p>
            <div style={row}>
              <button style={btnYes} disabled={loading}
                onClick={async () => {
                  // We'll ask follow-ups after the first YES via a small inline state
                  // For simplicity we collect both answers before calling the API
                  const onTime   = window.confirm('Was it returned on time?\n\nOK = Yes  |  Cancel = No')
                  const damaged  = window.confirm('Was the item damaged?\n\nOK = Yes  |  Cancel = No')
                  await call('lender_confirm', { returned_on_time: onTime, item_damaged: damaged })
                }}>
                YES
              </button>
              <button style={btnNo} disabled={loading} onClick={() => call('lender_deny')}>
                NO — not returned yet
              </button>
            </div>
          </div>
        </div>
      )
    }

    // Active lending — nothing to act on yet
    if (item.status === 'accepted') {
      return (
        <div style={{ padding: '12px 16px', background: 'var(--surface-variant)', borderRadius: '10px', marginTop: '10px' }}>
          <p style={{ fontSize: '13px', color: 'var(--on-surface-variant)' }}>
            Item is currently with the borrower. You'll be notified when they mark it as returned.
          </p>
        </div>
      )
    }

    // Completed
    if (item.status === 'completed') {
      return (
        <div style={{ padding: '12px 16px', background: '#f0fdf4', borderRadius: '10px', marginTop: '10px' }}>
          <p style={{ fontSize: '13px', color: '#15803d', fontWeight: 600 }}>
            ✅ Return confirmed.
            {item.returnedOnTime === true  && ' On time.'}
            {item.returnedOnTime === false && ' Returned late.'}
            {item.itemDamaged    === true  && ' ⚠️ Item was reported damaged.'}
            {item.itemDamaged    === false && ' No damage reported.'}
          </p>
        </div>
      )
    }

    return null
  }

  return null
}

// ── Feed item row ─────────────────────────────────────────────────────────────

function FeedRow({ item, onUpdate }: { item: FeedItem; onUpdate: () => void }) {
  const [expanded, setExpanded] = useState(false)

  const tc = typeConfig[item.type] ?? typeConfig.listing
  const sc = statusConfig[item.status] ?? statusConfig.pending
  const Icon = tc.icon

  // Only borrow items with an active/actionable status get the expand toggle
  const expandable =
    item.type === 'borrow' &&
    ['accepted', 'return_requested', 'completed'].includes(item.status)

  const handleRowClick = () => {
    if (expandable) setExpanded(e => !e)
  }

  const rowContent = (
    <div
      style={{
        ...card,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        transition: 'all 0.2s',
        cursor: expandable ? 'pointer' : 'default',
      }}
      onClick={handleRowClick}
      onMouseEnter={(e: any) => {
        e.currentTarget.style.boxShadow = 'var(--shadow)'
        e.currentTarget.style.transform = 'translateX(4px)'
      }}
      onMouseLeave={(e: any) => {
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
        e.currentTarget.style.transform = 'translateX(0)'
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '12px',
          flexShrink: 0,
          backgroundColor: `${tc.color}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={20} style={{ color: tc.color }} />
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--on-surface)', marginBottom: '2px' }}>
          {item.title}
        </p>
        <p style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>{item.subtitle}</p>
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
        <span
          style={{
            fontSize: '10px',
            fontWeight: 700,
            padding: '3px 8px',
            borderRadius: '999px',
            backgroundColor: sc.bg,
            color: sc.color,
          }}
        >
          {sc.label}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Clock size={10} style={{ color: 'var(--outline)' }} />
          <span style={{ fontSize: '11px', color: 'var(--outline)' }}>
            {formatDistanceToNow(new Date(item.time), { addSuffix: true })}
          </span>
        </div>
      </div>

      {/* Expand arrow for borrow items, link arrow for others */}
      {expandable ? (
        expanded ? (
          <ChevronUp size={14} style={{ color: 'var(--outline)', flexShrink: 0 }} />
        ) : (
          <ChevronDown size={14} style={{ color: 'var(--outline)', flexShrink: 0 }} />
        )
      ) : null}
    </div>
  )

  return (
    <div>
      {/* For non-expandable items, wrap in Link */}
      {expandable ? (
        rowContent
      ) : (
        <Link href={item.href} style={{ textDecoration: 'none' }}>
          {rowContent}
        </Link>
      )}

      {/* Expandable return-flow panel */}
      <AnimatePresence>
        {expanded && expandable && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden', paddingLeft: '4px', paddingRight: '4px' }}
          >
            <ReturnFlowPanel item={item} onUpdate={onUpdate} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ActivityPage() {
  const [data, setData] = useState<{ feed: FeedItem[]; stats: Stats } | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    fetch('/api/activity')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: '32px' }}
      >
        <h1
          style={{
            fontSize: '36px',
            fontWeight: 800,
            letterSpacing: '-0.5px',
            color: 'var(--on-surface)',
            fontFamily: 'var(--font-manrope)',
            marginBottom: '8px',
          }}
        >
          My Activity
        </h1>
        <p style={{ fontSize: '15px', color: 'var(--on-surface-variant)' }}>
          Track all your transactions, borrows, and gigs in one place.
        </p>
      </motion.div>

      {/* ── Stats ─────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '32px' }}
      >
        {loading
          ? [...Array(3)].map((_: any, i: number) => (
              <div key={i} style={{ ...card, height: '100px' }} className="animate-pulse" />
            ))
          : [
              { label: 'Active Borrows',  value: data?.stats?.activeBorrows  ?? 0, icon: HandshakeIcon },
              { label: 'Active Lendings', value: data?.stats?.activeLendings ?? 0, icon: Package },
              { label: 'Gigs Completed',  value: data?.stats?.gigsCompleted  ?? 0, icon: Briefcase },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} style={{ ...card, padding: '20px', textAlign: 'center' }}>
                <Icon size={18} style={{ color: 'var(--primary)', margin: '0 auto 8px' }} />
                <div
                  style={{
                    fontSize: '28px',
                    fontWeight: 800,
                    color: 'var(--on-surface)',
                    fontFamily: 'var(--font-manrope)',
                  }}
                >
                  {value}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)', marginTop: '2px' }}>
                  {label}
                </div>
              </div>
            ))}
      </motion.div>

      {/* ── Feed ──────────────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[...Array(5)].map((_: any, i: number) => (
            <div key={i} style={{ ...card, height: '76px' }} className="animate-pulse" />
          ))}
        </div>
      ) : !data?.feed?.length ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
          <p
            style={{
              fontSize: '18px',
              fontWeight: 700,
              color: 'var(--on-surface)',
              fontFamily: 'var(--font-manrope)',
            }}
          >
            No activity yet
          </p>
          <p style={{ fontSize: '14px', color: 'var(--on-surface-variant)', marginTop: '8px' }}>
            Start by listing an item or browsing the marketplace!
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {data.feed.map((item: FeedItem, idx: number) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.04 }}
            >
              <FeedRow item={item} onUpdate={load} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
