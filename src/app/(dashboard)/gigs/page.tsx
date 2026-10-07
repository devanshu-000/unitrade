'use client'

import { useState, useEffect, useCallback } from 'react'
import PayButton from '@/components/shared/PayButton'
import { Clock, Star, Plus, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { useUser } from '@clerk/nextjs'

const categories = ['All Gigs', 'Notes', 'Tutoring', 'Design', 'Coding', 'Other']
const priceTypes = [{ value: 'HOURLY', label: 'Per Hour' }, { value: 'FIXED', label: 'Fixed Price' }, { value: 'PROJECT', label: 'Per Project' }]

const priceTypeColors: Record<string, { color: string; bg: string }> = {
  HOURLY:  { color: '#1d4ed8', bg: '#dbeafe' },
  PROJECT: { color: '#7e22ce', bg: '#f3e8ff' },
  FIXED:   { color: '#15803d', bg: '#dcfce7' },
}

const card = { backgroundColor: 'var(--card)', borderRadius: '20px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }

const fallbackImages = [
  'https://images.unsplash.com/photo-1587620962725-abab19836100?w=400&h=250&fit=crop',
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=250&fit=crop',
  'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=250&fit=crop',
  'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&h=250&fit=crop',
]

const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border)', backgroundColor: 'var(--surface-container-low)', color: 'var(--on-surface)', fontSize: '14px', outline: 'none', fontFamily: 'var(--font-inter)' }

export default function GigsPage() {
  const { user } = useUser()
  const [activeCategory, setActiveCategory] = useState('All Gigs')
  const [gigs, setGigs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showHireModal, setShowHireModal] = useState<any>(null)
  const [hireMsg, setHireMsg] = useState('')
  const [hiring, setHiring] = useState(false)
  const [creating, setCreating] = useState(false)

  // Create gig form
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [newCategory, setNewCategory] = useState('Coding')
  const [newPriceType, setNewPriceType] = useState('PROJECT')
  const [newDelivery, setNewDelivery] = useState('3 days')

  const fetchGigs = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/gigs')
    const data = await res.json()
    setGigs(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchGigs() }, [fetchGigs])

  const filtered = gigs.filter(g => activeCategory === 'All Gigs' || g.category === activeCategory)

  const handleCreateGig = async () => {
    if (!newTitle || !newPrice || !newCategory) { toast.error('Please fill in all required fields'); return }
    setCreating(true)
    const res = await fetch('/api/gigs', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle, description: newDesc, price: newPrice, category: newCategory, delivery_time: newDelivery, price_type: newPriceType }),
    })
    setCreating(false)
    if (res.ok) {
      toast.success('Gig posted successfully!')
      setShowCreateModal(false)
      setNewTitle(''); setNewDesc(''); setNewPrice(''); setNewDelivery('3 days')
      fetchGigs()
    } else {
      const err = await res.json()
      toast.error(err.error ?? 'Failed to create gig')
    }
  }

  const handleHire = async () => {
    if (!showHireModal) return
    setHiring(true)
    const res = await fetch('/api/orders', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gig_id: showHireModal.id, message: hireMsg }),
    })
    setHiring(false)
    if (res.ok) {
      toast.success('Hire request sent!', { description: 'The provider will contact you shortly.' })
      setShowHireModal(null); setHireMsg('')
    } else {
      const err = await res.json()
      toast.error(err.error ?? 'Failed to send request')
    }
  }

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '32px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '42px', fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1.1, fontFamily: 'var(--font-manrope)', color: 'var(--on-surface)', marginBottom: '10px' }}>
            Service <span className="signature-gradient-text">Marketplace</span>
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--on-surface-variant)' }}>Connect with skilled students for notes, tutoring, coding, and creative projects.</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="signature-gradient"
          style={{ padding: '12px 24px', borderRadius: '14px', color: 'white', fontWeight: 700, fontSize: '14px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, marginTop: '8px', boxShadow: '0 4px 15px rgba(53,37,205,0.3)', fontFamily: 'var(--font-manrope)' }}>
          <Plus size={16} /> Post a Gig
        </button>
      </motion.div>

      <></>

      {/* Category Filter */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {categories.map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)} style={{
            padding: '10px 20px', borderRadius: '999px', fontSize: '13px', fontWeight: 600, border: '1px solid', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'var(--font-manrope)',
            ...(activeCategory === cat ? { background: 'linear-gradient(135deg,#3525cd,#712ae2)', color: 'white', borderColor: 'transparent', boxShadow: '0 4px 15px rgba(53,37,205,0.3)' } : { backgroundColor: 'var(--card)', color: 'var(--on-surface-variant)', borderColor: 'var(--border)' }),
          }}>{cat}</button>
        ))}
      </div>

      {/* Gigs Grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: '20px' }}>
          {[...Array(6)].map((_,i) => <div key={i} style={{ ...card, height: '340px' }} className="animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>💼</div>
          <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--on-surface)' }}>No gigs yet in {activeCategory}</p>
          <p style={{ fontSize: '14px', color: 'var(--on-surface-variant)', marginTop: '8px' }}>Be the first to offer a service!</p>
          <button onClick={() => setShowCreateModal(true)} className="signature-gradient" style={{ marginTop: '20px', padding: '12px 28px', borderRadius: '12px', color: 'white', fontWeight: 700, border: 'none', cursor: 'pointer' }}>Post a Gig</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: '20px' }}>
          {filtered.map((gig, idx) => {
            const pt = priceTypeColors[gig.price_type ?? 'PROJECT']
            const isOwner = gig.user_id === user?.id
            return (
              <motion.div key={gig.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} whileHover={{ y: -4 }} style={card}>
                <div style={{ position: 'relative', height: '160px', overflow: 'hidden' }}>
                  <img src={gig.images?.[0] ?? fallbackImages[idx % fallbackImages.length]} alt={gig.title} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s' }}
                    onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')} />
                  <span style={{ position: 'absolute', top: '12px', left: '12px', fontSize: '10px', fontWeight: 700, padding: '4px 10px', borderRadius: '999px', backgroundColor: pt.bg, color: pt.color }}>{gig.category}</span>
                  <div style={{ position: 'absolute', top: '12px', right: '12px', padding: '4px 10px', borderRadius: '999px', backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#191c1d' }}>★ {gig.users?.trust_score ?? 50}</span>
                  </div>
                </div>
                <div style={{ padding: '16px' }}>
                  <h3 style={{ fontWeight: 700, fontSize: '14px', color: 'var(--on-surface)', lineHeight: 1.4, marginBottom: '12px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontFamily: 'var(--font-manrope)' }}>{gig.title}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    {gig.users?.avatar_url ? <img src={gig.users.avatar_url} alt="" style={{ width: '26px', height: '26px', borderRadius: '50%', objectFit: 'cover' }} /> : (
                      <div className="signature-gradient" style={{ width: '26px', height: '26px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '10px', fontWeight: 700 }}>{gig.users?.full_name?.[0] ?? '?'}</div>
                    )}
                    <span style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>{gig.users?.full_name ?? 'Unknown'}</span>
                    {isOwner && <span style={{ marginLeft: 'auto', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>Your Gig</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid var(--border)', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--primary)', fontFamily: 'var(--font-manrope)' }}>₹{Number(gig.price).toLocaleString()}</span>
                      <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '999px', backgroundColor: pt.bg, color: pt.color }}>
                        {gig.price_type === 'HOURLY' ? '/hr' : gig.price_type === 'FIXED' ? 'Fixed' : gig.price_type ?? 'PROJECT'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} style={{ color: 'var(--outline)' }} />
                      <span style={{ fontSize: '11px', color: 'var(--outline)' }}>{gig.delivery_time}</span>
                    </div>
                  </div>
                  {isOwner ? (
                    <button style={{ width: '100%', padding: '12px', borderRadius: '12px', fontSize: '13px', fontWeight: 700, border: '1px solid var(--border)', background: 'transparent', color: 'var(--on-surface-variant)', cursor: 'default' }}>Your Gig</button>
                  ) : (
                    <PayButton
                      type="gig"
                      itemId={gig.id}
                      price={Number(gig.price)}
                      sellerName={gig.users?.full_name}
                      label="Hire Now"
                      className="signature-gradient"
                      style={{ width: '100%', padding: '12px', borderRadius: '12px', fontSize: '13px', fontWeight: 700, border: 'none', color: 'white', boxShadow: '0 4px 15px rgba(53,37,205,0.25)' }}
                      onSuccess={() => fetchGigs()}
                    />
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Create Gig Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
            onClick={e => { if (e.target === e.currentTarget) setShowCreateModal(false) }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              style={{ backgroundColor: 'var(--card)', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
              <button onClick={() => setShowCreateModal(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--on-surface-variant)' }}>
                <X size={20} />
              </button>
              <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--on-surface)', fontFamily: 'var(--font-manrope)', marginBottom: '4px' }}>Post a Gig</h2>
              <p style={{ fontSize: '14px', color: 'var(--on-surface-variant)', marginBottom: '24px' }}>Offer your skills to the campus community.</p>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--on-surface)', marginBottom: '6px' }}>Title *</label>
                <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g. React Developer for MVPs" style={inputStyle} />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--on-surface)', marginBottom: '6px' }}>Description</label>
                <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Describe what you offer..." rows={3} style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--on-surface)', marginBottom: '6px' }}>Price (₹) *</label>
                  <input type="number" value={newPrice} onChange={e => setNewPrice(e.target.value)} placeholder="0" style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--on-surface)', marginBottom: '6px' }}>Category *</label>
                  <select value={newCategory} onChange={e => setNewCategory(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                    {['Notes','Tutoring','Design','Coding','Other'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--on-surface)', marginBottom: '6px' }}>Price Type</label>
                  <select value={newPriceType} onChange={e => setNewPriceType(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                    {priceTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--on-surface)', marginBottom: '6px' }}>Delivery Time</label>
                  <input value={newDelivery} onChange={e => setNewDelivery(e.target.value)} placeholder="e.g. 3 days" style={inputStyle} />
                </div>
              </div>
              <button onClick={handleCreateGig} disabled={creating} className="signature-gradient"
                style={{ width: '100%', padding: '16px', borderRadius: '14px', color: 'white', fontWeight: 700, fontSize: '15px', border: 'none', cursor: creating ? 'not-allowed' : 'pointer', opacity: creating ? 0.7 : 1, boxShadow: '0 8px 25px rgba(53,37,205,0.3)' }}>
                {creating ? 'Posting...' : 'Post Gig →'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hire Modal */}
      <AnimatePresence>
        {showHireModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
            onClick={e => { if (e.target === e.currentTarget) setShowHireModal(null) }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              style={{ backgroundColor: 'var(--card)', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '480px', position: 'relative' }}>
              <button onClick={() => setShowHireModal(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--on-surface-variant)' }}>
                <X size={20} />
              </button>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--on-surface)', fontFamily: 'var(--font-manrope)', marginBottom: '4px' }}>Hire for this Gig</h2>
              <p style={{ fontSize: '14px', color: 'var(--on-surface-variant)', marginBottom: '20px' }}>Send a hire request to <strong>{showHireModal.users?.full_name}</strong></p>
              <div style={{ backgroundColor: 'var(--surface-container-low)', borderRadius: '14px', padding: '16px', marginBottom: '20px' }}>
                <p style={{ fontWeight: 700, fontSize: '14px', color: 'var(--on-surface)', marginBottom: '8px' }}>{showHireModal.title}</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '22px', fontWeight: 800, color: 'var(--primary)', fontFamily: 'var(--font-manrope)' }}>₹{Number(showHireModal.price).toLocaleString()}</span>
                  <span style={{ fontSize: '12px', color: 'var(--on-surface-variant)', display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> {showHireModal.delivery_time}</span>
                </div>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--on-surface)', marginBottom: '8px' }}>Message (optional)</label>
                <textarea value={hireMsg} onChange={e => setHireMsg(e.target.value)} placeholder="Describe your project or requirements..." rows={3} style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }} />
              </div>
              <PayButton
                type="gig"
                itemId={showHireModal.id}
                price={Number(showHireModal.price)}
                sellerName={showHireModal.users?.full_name}
                label={`Pay & Hire · ₹${Number(showHireModal.price).toLocaleString()}`}
                className="signature-gradient"
                style={{ width: '100%', padding: '16px', borderRadius: '14px', color: 'white', fontWeight: 700, fontSize: '15px', border: 'none', boxShadow: '0 8px 25px rgba(53,37,205,0.3)' }}
                onSuccess={() => { setShowHireModal(null); fetchGigs() }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
