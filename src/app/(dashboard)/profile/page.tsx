'use client'

import { useState, useEffect, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import { MapPin, Star, Package, BookOpen, Briefcase, ExternalLink, Plus, Trash2, Pencil, X } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

const tabs = ['My Listings', 'My Gigs']

const fallbackImages = [
  'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300&h=200&fit=crop',
  'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300&h=200&fit=crop',
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&h=200&fit=crop',
]

function TrustScoreGauge({ score }: { score: number }) {
  const color = score >= 200 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444'
  const circumference = 2 * Math.PI * 54
  // Arc fills progressively: every 100 points = one full revolution, capped visually at full circle
  const progress = Math.min(score / 100, 1)
  const offset = circumference - progress * circumference
  return (
    <div style={{ position: 'relative', width: '128px', height: '128px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }} width="128" height="128" viewBox="0 0 128 128">
        <circle cx="64" cy="64" r="54" fill="none" stroke="var(--surface-container-high)" strokeWidth="10" />
        <circle cx="64" cy="64" r="54" fill="none" stroke={color} strokeWidth="10" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--on-surface)', fontFamily: 'var(--font-manrope)' }}>{score}</div>
      </div>
    </div>
  )
}

const card = { backgroundColor: 'var(--card)', borderRadius: '20px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)' }

export default function ProfilePage() {
  const { user } = useUser()
  const [activeTab, setActiveTab] = useState('My Listings')
  const [profileData, setProfileData] = useState<any>(null)
  const [myListings, setMyListings] = useState<any[]>([])
  const [myGigs, setMyGigs] = useState<any[]>([])
  const [myReviews, setMyReviews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editName, setEditName] = useState('')
  const [editCollege, setEditCollege] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchAll = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const [profileRes, listingsRes, gigsRes, reviewsRes] = await Promise.all([
      fetch('/api/profile'),
      fetch('/api/listings/mine'),
      fetch('/api/gigs/mine'),
      fetch(`/api/reviews?reviewee_id=${user.id}`),
    ])
    const [pd, ld, gd, rd] = await Promise.all([
      profileRes.json(), listingsRes.json(), gigsRes.json(), reviewsRes.json()
    ])
    setProfileData(pd)
    setMyListings(Array.isArray(ld) ? ld : [])
    setMyGigs(Array.isArray(gd) ? gd : [])
    setMyReviews(Array.isArray(rd) ? rd : [])
    setLoading(false)
  }, [user])

  useEffect(() => { fetchAll() }, [fetchAll])

  const handleDeleteListing = async (id: string) => {
    if (!confirm('Delete this listing?')) return
    const res = await fetch(`/api/listings/${id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Listing deleted'); fetchAll() }
    else toast.error('Failed to delete')
  }

  const handleDeleteGig = async (id: string) => {
    if (!confirm('Delete this gig?')) return
    const res = await fetch(`/api/gigs/${id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Gig deleted'); fetchAll() }
    else toast.error('Failed to delete')
  }

  const trustScore = profileData?.user?.trust_score ?? 0
  const stats = profileData?.stats ?? {}


  const handleSaveProfile = async () => {
    setSaving(true)
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: editName, college: editCollege }),
    })
    setSaving(false)
    if (res.ok) {
      toast.success('Profile updated!')
      setShowEditModal(false)
      fetchAll()
    } else {
      toast.error('Failed to update profile')
    }
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Profile Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ ...card, padding: '32px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'row', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', flex: 1, minWidth: '280px' }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              {user?.imageUrl ? (
                <img src={user.imageUrl} alt="avatar" style={{ width: '80px', height: '80px', borderRadius: '20px', objectFit: 'cover' }} />
              ) : (
                <div className="signature-gradient" style={{ width: '80px', height: '80px', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '28px', fontWeight: 800 }}>
                  {user?.firstName?.[0] ?? 'U'}
                </div>
              )}
              <div style={{ position: 'absolute', bottom: '-4px', right: '-4px', width: '18px', height: '18px', backgroundColor: '#22c55e', borderRadius: '50%', border: '3px solid var(--card)' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '6px' }}>
                <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--on-surface)', fontFamily: 'var(--font-manrope)' }}>{profileData?.user?.full_name || user?.fullName || 'Campus User'}</h1>
                <button
                  onClick={() => setShowEditModal(true)}
                  style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999, border: '1px solid var(--border)', backgroundColor: 'var(--surface-container)', color: 'var(--on-surface-variant)', cursor: 'pointer' }}
                >
                  Edit
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                <MapPin size={14} style={{ color: 'var(--on-surface-variant)' }} />
                <span style={{ fontSize: '13px', color: 'var(--on-surface-variant)' }}>
                  {profileData?.user?.college || user?.emailAddresses?.[0]?.emailAddress}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '999px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
                  {trustScore >= 200 ? 'High Trust Member' : trustScore >= 50 ? 'Member' : 'New Member'}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--outline)' }}>Verified · Active</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', borderRadius: '16px', backgroundColor: 'var(--primary-light)', minWidth: '160px' }}>
            {loading ? <div style={{ width: '128px', height: '128px', borderRadius: '50%', backgroundColor: 'var(--surface-container)' }} className="animate-pulse" /> : <TrustScoreGauge score={trustScore} />}
            <p style={{ fontSize: '13px', fontWeight: 700, marginTop: '12px', color: 'var(--primary)' }}>Trust Score</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
          {[
            { icon: Package,   label: 'Total Items',         value: loading ? '—' : stats.totalItems ?? myListings.length },
            { icon: BookOpen,  label: 'Total Cancellations', value: loading ? '—' : stats.totalCancellations ?? 0 },
            { icon: Briefcase, label: 'Active Borrows',      value: loading ? '—' : stats.activeBorrows ?? 0 },
            { icon: Star,      label: 'Active Lendings',     value: loading ? '—' : stats.activeLendings ?? 0 },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '6px' }}>
                <Icon size={16} style={{ color: 'var(--outline)' }} />
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--on-surface)', fontFamily: 'var(--font-manrope)' }}>{value}</div>
              <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)', marginTop: '2px' }}>{label}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '10px 20px', borderRadius: '12px', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'var(--font-manrope)',
            ...(activeTab === tab ? { background: 'linear-gradient(135deg,#3525cd,#712ae2)', color: 'white' } : { backgroundColor: 'var(--card)', color: 'var(--on-surface-variant)', border: '1px solid var(--border)' }),
          }}>{tab}</button>
        ))}
      </div>

      {/* My Listings */}
      {activeTab === 'My Listings' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: '16px' }}>
          {loading ? [...Array(3)].map((_: any, i: number) => <div key={i} style={{ ...card, height: '220px' }} className="animate-pulse" />) :
          myListings.map((item: any, idx: number) => (
            <div key={item.id} style={{ ...card, overflow: 'hidden' }}>
              <div style={{ position: 'relative', height: '140px', overflow: 'hidden' }}>
                <img src={item.images?.[0] ?? fallbackImages[idx % fallbackImages.length]} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <span style={{ position: 'absolute', top: '10px', left: '10px', fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '999px', backgroundColor: item.is_available ? '#22c55e' : '#9ca3af', color: 'white' }}>
                  {item.is_available ? 'ACTIVE' : 'SOLD'}
                </span>
                <span style={{ position: 'absolute', top: '10px', right: '10px', fontSize: '13px', fontWeight: 700, padding: '3px 10px', borderRadius: '999px', backgroundColor: 'var(--card)', color: 'var(--on-surface)' }}>
                  ₹{Number(item.price).toLocaleString()}
                </span>
              </div>
              <div style={{ padding: '16px' }}>
                <p style={{ fontWeight: 600, fontSize: '13px', color: 'var(--on-surface)', marginBottom: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Link href={`/marketplace/${item.id}`} style={{ flex: 1, textDecoration: 'none' }}>
                    <button style={{ width: '100%', padding: '8px', borderRadius: '10px', fontSize: '12px', fontWeight: 600, border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--on-surface-variant)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                      <ExternalLink size={12} /> View
                    </button>
                  </Link>
                  <button onClick={() => handleDeleteListing(item.id)} style={{ padding: '8px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: 600, border: 'none', cursor: 'pointer', backgroundColor: '#fee2e2', color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          <Link href="/marketplace/new" style={{ textDecoration: 'none' }}>
            <div style={{ ...card, height: '220px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed var(--outline-variant)', backgroundColor: 'transparent', cursor: 'pointer' }}
              onMouseEnter={(e: any) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary)'; (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--primary-light)' }}
              onMouseLeave={(e: any) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--outline-variant)'; (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--surface-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                <Plus size={20} style={{ color: 'var(--outline)' }} />
              </div>
              <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--outline)' }}>New Listing</p>
            </div>
          </Link>
        </motion.div>
      )}

      {/* My Gigs */}
      {activeTab === 'My Gigs' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: '16px' }}>
          {loading ? [...Array(2)].map((_: any, i: number) => <div key={i} style={{ ...card, height: '220px' }} className="animate-pulse" />) :
          myGigs.map((gig: any, idx: number) => (
            <div key={gig.id} style={{ ...card, overflow: 'hidden' }}>
              <div style={{ height: '140px', overflow: 'hidden' }}>
                <img src={gig.images?.[0] ?? fallbackImages[idx % fallbackImages.length]} alt={gig.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ padding: '16px' }}>
                <p style={{ fontWeight: 600, fontSize: '13px', color: 'var(--on-surface)', marginBottom: '8px', lineHeight: 1.4 }}>{gig.title}</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--primary)', fontFamily: 'var(--font-manrope)' }}>₹{Number(gig.price).toLocaleString()}</span>
                  <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>{gig.category}</span>
                </div>
                <button onClick={() => handleDeleteGig(gig.id)} style={{ width: '100%', padding: '8px', borderRadius: '10px', fontSize: '12px', fontWeight: 600, border: 'none', cursor: 'pointer', backgroundColor: '#fee2e2', color: '#b91c1c', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                  <Trash2 size={12} /> Delete Gig
                </button>
              </div>
            </div>
          ))}
          <Link href="/gigs" style={{ textDecoration: 'none' }}>
            <div style={{ ...card, height: '220px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed var(--outline-variant)', backgroundColor: 'transparent', cursor: 'pointer' }}
              onMouseEnter={(e: any) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary)'; (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--primary-light)' }}
              onMouseLeave={(e: any) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--outline-variant)'; (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}>
              <Plus size={20} style={{ color: 'var(--outline)', marginBottom: '8px' }} />
              <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--outline)' }}>Post a Gig</p>
            </div>
          </Link>
        </motion.div>
      )}

      <></>


      {/* Edit Profile Modal */}
      {showEditModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ backgroundColor: 'var(--card)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontWeight: 700, fontSize: 18, color: 'var(--on-surface)', fontFamily: 'var(--font-manrope)' }}>Edit Profile</h2>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--outline)' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--on-surface-variant)', display: 'block', marginBottom: 6 }}>Full Name</label>
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder={profileData?.user?.full_name || user?.fullName || 'Your name'}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1px solid var(--border)', backgroundColor: 'var(--surface-container)', color: 'var(--on-surface)', fontSize: 14, outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--on-surface-variant)', display: 'block', marginBottom: 6 }}>College / University</label>
                <input
                  value={editCollege}
                  onChange={e => setEditCollege(e.target.value)}
                  placeholder={profileData?.user?.college || 'e.g. IIT Delhi'}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1px solid var(--border)', backgroundColor: 'var(--surface-container)', color: 'var(--on-surface)', fontSize: 14, outline: 'none' }}
                />
              </div>
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="signature-gradient"
                style={{ padding: '12px', borderRadius: 12, color: 'white', fontWeight: 700, border: 'none', cursor: saving ? 'wait' : 'pointer', fontSize: 14, opacity: saving ? 0.7 : 1 }}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
