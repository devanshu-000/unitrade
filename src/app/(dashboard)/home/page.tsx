'use client'


import { useUser } from '@clerk/nextjs'
import Link from 'next/link'
import { ShoppingBag, HandshakeIcon, Briefcase, TrendingUp, Zap } from 'lucide-react'
import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import RecommendedSection from '@/components/shared/RecommendedSection'

const quickActions = [
  { icon: ShoppingBag, label: 'Sell Item',    desc: 'Convert unused gear into campus credits.', href: '/marketplace/new' },
  { icon: HandshakeIcon, label: 'Borrow Item', desc: 'Need a tool for a day? Find it locally.',  href: '/borrow' },
  { icon: Briefcase,   label: 'Offer Service', desc: 'Tutor, design, or code for peers.',        href: '/gigs' },
]

const card = { backgroundColor: 'var(--card)', borderRadius: '20px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }

const fallbackImages = [
  'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300&h=200&fit=crop',
  'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300&h=200&fit=crop',
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&h=200&fit=crop',
  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=200&fit=crop',
]

export default function HomePage() {
  const { user } = useUser()
  const [listings, setListings] = useState<any[]>([])
  const [gigs, setGigs] = useState<any[]>([])
  const [trustScore, setTrustScore] = useState(0)
  const [loadingListings, setLoadingListings] = useState(true)
  const [loadingGigs, setLoadingGigs] = useState(true)

  useEffect(() => {
    fetch('/api/listings?type=sell')
      .then(r => r.json())
      .then(data => { setListings(Array.isArray(data) ? data.slice(0, 4) : []); setLoadingListings(false) })
      .catch(() => setLoadingListings(false))

    fetch('/api/gigs')
      .then(r => r.json())
      .then(data => { setGigs(Array.isArray(data) ? data.slice(0, 2) : []); setLoadingGigs(false) })
      .catch(() => setLoadingGigs(false))

    fetch('/api/profile')
      .then(r => r.json())
      .then(data => { if (data?.user?.trust_score) setTrustScore(data.user.trust_score) })
      .catch(() => {})
  }, [])

  return (
    <div>
      {/* Hero */}
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} style={{ marginBottom: '40px' }}>
        <p style={{ fontSize: '13px', color: 'var(--on-surface-variant)', marginBottom: '6px', fontWeight: 500 }}>Welcome back</p>
        <h1 style={{ fontSize: '44px', fontWeight: 800, letterSpacing: '-1px', lineHeight: 1.1, color: 'var(--on-surface)', fontFamily: 'var(--font-manrope)', marginBottom: '8px' }}>
          Namaste, {user?.firstName ?? 'Student'}.
          <br />
          <span className="signature-gradient-text">The campus is yours.</span>
        </h1>
      </motion.section>

      {/* ─── Recommended for You (NEW – additive only) ─── */}
      <RecommendedSection />

      {/* Quick Actions */}
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} style={{ marginBottom: '40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '16px' }}>
          {quickActions.map(({ icon: Icon, label, desc, href }, idx) => (
            <Link key={label} href={href} style={{ textDecoration: 'none' }}>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 + 0.2 }} whileHover={{ y: -6 }} style={{ ...card, padding: '24px', cursor: 'pointer' }}>
                <div className="signature-gradient" style={{ width: '44px', height: '44px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                  <Icon size={20} color="white" />
                </div>
                <p style={{ fontWeight: 700, fontSize: '15px', color: 'var(--on-surface)', fontFamily: 'var(--font-manrope)', marginBottom: '6px' }}>{label}</p>
                <p style={{ fontSize: '12px', color: 'var(--on-surface-variant)', lineHeight: 1.5 }}>{desc}</p>
              </motion.div>
            </Link>
          ))}
        </div>
      </motion.section>

      {/* Trending Now */}
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} style={{ marginBottom: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={18} style={{ color: 'var(--primary)' }} />
            <></>
          </div>
          <></>
        </div>

        {loadingListings ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: '16px' }}>
            {[...Array(4)].map((_,i) => <div key={i} style={{ ...card, height: '200px' }} className="animate-pulse" />)}
          </div>
        ) : listings.length === 0 ? (
          <div style={{ ...card, padding: '40px', textAlign: 'center' }}>
            <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--on-surface)' }}>No listings yet</p>
            <p style={{ fontSize: '13px', color: 'var(--on-surface-variant)', marginTop: '8px' }}>Be the first to post something!</p>
            <Link href="/marketplace/new" style={{ textDecoration: 'none' }}>
              <button className="signature-gradient" style={{ marginTop: '16px', padding: '10px 24px', borderRadius: '12px', color: 'white', fontWeight: 700, border: 'none', cursor: 'pointer' }}>Post a Listing</button>
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: '16px' }}>
            {listings.map((item, idx) => (
              <Link key={item.id} href={`/marketplace/${item.id}`} style={{ textDecoration: 'none' }}>
                <motion.div whileHover={{ y: -4 }} style={{ ...card, overflow: 'hidden', cursor: 'pointer' }}>
                  <div style={{ height: '130px', overflow: 'hidden' }}>
                    <img src={item.images?.[0] ?? fallbackImages[idx % fallbackImages.length]} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s' }}
                      onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
                      onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')} />
                  </div>
                  <div style={{ padding: '14px' }}>
                    <p style={{ fontWeight: 600, fontSize: '13px', color: 'var(--on-surface)', marginBottom: '6px', fontFamily: 'var(--font-manrope)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--primary)', fontFamily: 'var(--font-manrope)' }}>₹{Number(item.price).toLocaleString()}</span>
                      <span style={{ fontSize: '9px', fontWeight: 700, padding: '3px 8px', borderRadius: '999px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>SALE</span>
                    </div>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        )}
      </motion.section>

      {/* Featured Gigs */}
      {!loadingGigs && gigs.length > 0 && (
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Briefcase size={18} style={{ color: 'var(--primary)' }} />
              <h2 style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'var(--font-manrope)', color: 'var(--on-surface)' }}>Featured Services</h2>
            </div>
            <></>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: '16px' }}>
            {gigs.map((gig, idx) => (
              <Link key={gig.id} href="/gigs" style={{ textDecoration: 'none' }}>
                <motion.div whileHover={{ y: -4 }} style={{ ...card, padding: '16px', display: 'flex', gap: '16px', cursor: 'pointer' }}>
                  <div style={{ width: '80px', height: '80px', borderRadius: '12px', overflow: 'hidden', flexShrink: 0, backgroundColor: 'var(--surface-container)' }}>
                    <img src={gig.images?.[0] ?? fallbackImages[idx % fallbackImages.length]} alt={gig.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 700, fontSize: '14px', color: 'var(--on-surface)', marginBottom: '4px', fontFamily: 'var(--font-manrope)', lineHeight: 1.3 }}>{gig.title}</p>
                    <p style={{ fontSize: '11px', color: 'var(--on-surface-variant)', marginBottom: '8px' }}>{gig.users?.full_name ?? 'Unknown'}</p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--primary)', fontFamily: 'var(--font-manrope)' }}>₹{Number(gig.price).toLocaleString()}</span>
                      <span style={{ fontSize: '9px', fontWeight: 700, padding: '3px 8px', borderRadius: '999px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>SERVICE</span>
                    </div>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        </motion.section>
      )}

      {/* Trust Banner */}
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}>
        <div className="signature-gradient" style={{ borderRadius: '24px', padding: '32px 36px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <Zap size={14} style={{ opacity: 0.8 }} />
              <p style={{ fontSize: '11px', fontWeight: 600, opacity: 0.8, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Campus Trust</p>
            </div>
            <p style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'var(--font-manrope)', lineHeight: 1.4 }}>
              Your trust score is {trustScore}.<br />
              <span style={{ opacity: 0.85, fontSize: '16px' }}>{trustScore >= 200 ? "You're a top-rated member!" : "Complete more trades to grow your score."}</span>
            </p>
          </div>
          <Link href="/profile" style={{ textDecoration: 'none' }}>
            <button style={{ padding: '14px 28px', borderRadius: '999px', backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 700, border: '1px solid rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '14px', fontFamily: 'var(--font-manrope)', backdropFilter: 'blur(10px)' }}>
              View Profile →
            </button>
          </Link>
        </div>
      </motion.section>
    </div>
  )
}