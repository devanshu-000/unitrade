'use client'

import { use, useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft, Heart, MapPin, Shield, Share2, Trash2, MessageCircle, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { useUser } from '@clerk/nextjs'
import PayButton from '@/components/shared/PayButton'
import MessageModal from '@/components/shared/MessageModal'

declare global { interface Window { Razorpay: any } }

const conditionColors: Record<string, { color: string; bg: string }> = {
  new:      { color: '#15803d', bg: '#dcfce7' },
  like_new: { color: '#1d4ed8', bg: '#dbeafe' },
  good:     { color: '#b45309', bg: '#fef3c7' },
  fair:     { color: '#c2410c', bg: '#ffedd5' },
}
const conditionLabels: Record<string, string> = {
  new: 'New', like_new: 'Like New', good: 'Good', fair: 'Fair',
}

function buildHourSlots(totalHours = 10, startHour = 9): string[] {
  const slots: string[] = []
  for (let i = 0; i < totalHours; i++) {
    const h = (startHour + i) % 24
    const label = `${h % 12 === 0 ? 12 : h % 12}:00 ${h < 12 ? 'AM' : 'PM'}`
    slots.push(label)
  }
  return slots
}

function slotToKey(date: string, slot: string) { return `${date} ${slot}` }

function loadRazorpay(): Promise<boolean> {
  return new Promise(resolve => {
    if (window.Razorpay) return resolve(true)
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.onload = () => resolve(true)
    s.onerror = () => resolve(false)
    document.body.appendChild(s)
  })
}

// ─── Hour-wise borrow panel ───────────────────────────────────────────────────
function HourBorrowPanel({
  listing, bookedSlots, onSuccess,
}: {
  listing: any
  bookedSlots: Set<string>
  onSuccess: () => void
}) {
  const HOUR_SLOTS = buildHourSlots(
    listing.slot_total_hours ?? 10,
    listing.slot_start_hour ?? 9,
  )

  const [selectedDate, setSelectedDate] = useState<string>(() =>
    new Date().toISOString().split('T')[0]
  )
  const [selectedHours, setSelectedHours] = useState<string[]>([])
  const [reason, setReason] = useState('')
  // FIX: renamed paying -> submitting; payment removed from this panel
  const [submitting, setSubmitting] = useState(false)

  const pricePerHour = Number(listing.price_per_hour ?? listing.price ?? 0)
  const total = selectedHours.length * pricePerHour

  const toggleHour = (slot: string) => {
    const key = slotToKey(selectedDate, slot)
    if (bookedSlots.has(key)) return
    setSelectedHours(prev =>
      prev.includes(slot) ? prev.filter(h => h !== slot) : [...prev, slot]
    )
  }

  useEffect(() => { setSelectedHours([]) }, [selectedDate])

  // FIX: submit request only — no payment here. Payment happens after lender approval.
  const handleRequestOnly = async () => {
    if (selectedHours.length === 0) { toast.error('Select at least one hour slot'); return }
    setSubmitting(true)
    const slots = selectedHours.map(h => slotToKey(selectedDate, h))
    const borrowRes = await fetch('/api/borrow', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item_name: listing.title, description: reason,
        lender_id: listing.user_id, listing_id: listing.id,
        duration_type: 'hour', selected_slots: slots,
        total_amount: total,
      }),
    })
    const borrowData = await borrowRes.json()
    setSubmitting(false)
    if (!borrowRes.ok) { toast.error(borrowData.error ?? 'Failed to send request'); return }
    toast.success('Request sent! 🎉', { description: "Waiting for lender approval. You'll be notified when approved." })
    onSuccess()
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      style={{ background: 'var(--surface-container-low)', borderRadius: '16px', padding: '16px', border: '1px solid var(--border)' }}>
      <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--on-surface)', marginBottom: '14px' }}>Borrow Details</p>

      <div style={{ marginBottom: '14px' }}>
        <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--on-surface-variant)', display: 'block', marginBottom: '6px' }}>Select Date</label>
        <input type="date" value={selectedDate} min={new Date().toISOString().split('T')[0]}
          onChange={e => setSelectedDate(e.target.value)}
          style={{ width: '100%', padding: '8px 12px', borderRadius: '10px', fontSize: '13px', outline: 'none', border: '1px solid var(--border)', backgroundColor: 'var(--surface-container)', color: 'var(--on-surface)' }} />
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--on-surface-variant)', display: 'block', marginBottom: '8px' }}>Select hours</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {HOUR_SLOTS.map(slot => {
            const key = slotToKey(selectedDate, slot)
            const isBooked = bookedSlots.has(key)
            const isSelected = selectedHours.includes(slot)
            return (
              <button key={slot} onClick={() => toggleHour(slot)} disabled={isBooked}
                style={{
                  padding: '7px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                  cursor: isBooked ? 'not-allowed' : 'pointer', border: '1px solid', transition: 'all 0.15s',
                  ...(isBooked
                    ? { borderColor: 'var(--border)', backgroundColor: 'var(--surface-container)', color: 'var(--outline)', opacity: 0.4 }
                    : isSelected
                      ? { borderColor: 'var(--primary)', backgroundColor: 'var(--primary)', color: 'white' }
                      : { borderColor: 'var(--border)', backgroundColor: 'var(--surface-container)', color: 'var(--on-surface)' }),
                }}>
                {slot}
              </button>
            )
          })}
        </div>
      </div>

      {selectedHours.length > 0 && (
        <div style={{ padding: '10px 14px', borderRadius: '10px', backgroundColor: 'var(--primary-light)', marginBottom: '12px' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary)' }}>
            {selectedHours.length} hour(s) · Total: ₹{total}
          </span>
        </div>
      )}

      <textarea value={reason} onChange={e => setReason(e.target.value)}
        placeholder="Why do you need this? (optional)" rows={2}
        style={{ width: '100%', padding: '8px 12px', borderRadius: '10px', fontSize: '13px', outline: 'none', resize: 'none', marginBottom: '12px', border: '1px solid var(--border)', backgroundColor: 'var(--surface-container)', color: 'var(--on-surface)' }} />

      {/* FIX: button sends request only, payment after approval */}
      <button onClick={handleRequestOnly} disabled={submitting || selectedHours.length === 0}
        className={selectedHours.length > 0 ? 'signature-gradient' : ''}
        style={{
          width: '100%', padding: '13px', borderRadius: '12px', fontWeight: 700, fontSize: '14px', border: 'none',
          cursor: submitting || selectedHours.length === 0 ? 'not-allowed' : 'pointer',
          opacity: selectedHours.length === 0 ? 0.5 : 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          backgroundColor: selectedHours.length === 0 ? 'var(--surface-container)' : undefined,
          color: selectedHours.length === 0 ? 'var(--outline)' : 'white',
          fontFamily: 'var(--font-manrope)',
        }}>
        {submitting
          ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Sending Request...</>
          : selectedHours.length > 0 ? `Send Borrow Request · ₹${total}` : 'Select hour slots above'}
      </button>
      {selectedHours.length > 0 && (
        <p style={{ fontSize: '11px', color: 'var(--on-surface-variant)', textAlign: 'center', marginTop: '8px' }}>
          💡 Payment only required after lender approves
        </p>
      )}
    </motion.div>
  )
}

// ─── Day-wise borrow panel ────────────────────────────────────────────────────
function DayBorrowPanel({
  listing, bookedSlots, onSuccess,
}: {
  listing: any
  bookedSlots: Set<string>
  onSuccess: () => void
}) {
  // Use separate from/to state — more reliable than deriving from array
  const [fromInput, setFromInput] = useState('')
  const [toInput, setToInput] = useState('')
  const [reason, setReason] = useState('')
  // FIX: renamed paying -> submitting
  const [submitting, setSubmitting] = useState(false)

  const pricePerDay = Number(listing.price_per_day ?? listing.price ?? 0)

  // Build range of days between from and to
  const selectedDays: string[] = []
  if (fromInput && toInput && toInput >= fromInput) {
    const cur = new Date(fromInput + 'T12:00:00')
    const end = new Date(toInput + 'T12:00:00')
    while (cur <= end) {
      selectedDays.push(cur.toISOString().split('T')[0])
      cur.setDate(cur.getDate() + 1)
    }
  }

  const total = selectedDays.length * pricePerDay

  // Pre-set available window from listing (if the lender defined one)
  const minDate = listing.from_date ?? new Date().toISOString().split('T')[0]
  const maxDate = listing.to_date ?? ''

  // If lender set a fixed window, show clickable day chips instead of date pickers
  const allDays: string[] = []
  if (listing.from_date && listing.to_date) {
    const cur = new Date(listing.from_date + 'T12:00:00')
    const end = new Date(listing.to_date + 'T12:00:00')
    while (cur <= end) {
      allDays.push(cur.toISOString().split('T')[0])
      cur.setDate(cur.getDate() + 1)
    }
  }

  // For chip-based selection, track selected set
  const [chipSelected, setChipSelected] = useState<string[]>([])
  const toggleChip = (day: string) => {
    if (bookedSlots.has(day)) return
    setChipSelected(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])
  }

  const finalSelectedDays = allDays.length > 0 ? chipSelected : selectedDays
  const finalTotal = finalSelectedDays.length * pricePerDay

  // FIX: submit request only — payment happens after lender approval
  const handleRequestOnly = async () => {
    if (finalSelectedDays.length === 0) { toast.error('Select at least one day'); return }
    const conflict = finalSelectedDays.some(d => bookedSlots.has(d))
    if (conflict) { toast.error('Some selected days are already booked'); return }
    setSubmitting(true)
    const sorted = [...finalSelectedDays].sort()
    const borrowRes = await fetch('/api/borrow', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item_name: listing.title, description: reason,
        lender_id: listing.user_id, listing_id: listing.id,
        duration_type: 'day', selected_slots: sorted,
        total_amount: finalTotal,
      }),
    })
    const borrowData = await borrowRes.json()
    setSubmitting(false)
    if (!borrowRes.ok) { toast.error(borrowData.error ?? 'Failed to send request'); return }
    toast.success('Request sent! 🎉', { description: "Waiting for lender approval. You'll be notified when approved." })
    onSuccess()
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      style={{ background: 'var(--surface-container-low)', borderRadius: '16px', padding: '16px', border: '1px solid var(--border)' }}>
      <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--on-surface)', marginBottom: '14px' }}>Borrow Details</p>

      {/* Chip mode — lender set a specific window */}
      {allDays.length > 0 ? (
        <div style={{ marginBottom: '14px' }}>
          <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--on-surface-variant)', display: 'block', marginBottom: '8px' }}>
            Select days <span style={{ fontWeight: 400 }}>(tap to select)</span>
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {allDays.map(day => {
              const isBooked = bookedSlots.has(day)
              const isSelected = chipSelected.includes(day)
              const label = new Date(day + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
              return (
                <button key={day} onClick={() => toggleChip(day)} disabled={isBooked}
                  style={{
                    padding: '7px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                    cursor: isBooked ? 'not-allowed' : 'pointer', border: '1px solid', transition: 'all 0.15s',
                    ...(isBooked
                      ? { borderColor: 'var(--border)', backgroundColor: 'var(--surface-container)', color: 'var(--outline)', opacity: 0.4 }
                      : isSelected
                        ? { borderColor: 'var(--primary)', backgroundColor: 'var(--primary)', color: 'white' }
                        : { borderColor: 'var(--border)', backgroundColor: 'var(--surface-container)', color: 'var(--on-surface)' }),
                  }}>
                  {label}
                </button>
              )
            })}
          </div>
        </div>
      ) : (
        /* Free date-picker mode — lender didn't fix a window */
        <div style={{ marginBottom: '14px' }}>
          <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--on-surface-variant)', display: 'block', marginBottom: '8px' }}>
            Select date range
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '10px', color: 'var(--on-surface-variant)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>From</label>
              <input
                type="date"
                value={fromInput}
                min={minDate}
                max={maxDate || undefined}
                onChange={e => {
                  setFromInput(e.target.value)
                  // Reset to if it's now before from
                  if (toInput && e.target.value > toInput) setToInput('')
                }}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '10px', fontSize: '13px', outline: 'none', border: '1px solid var(--border)', backgroundColor: 'var(--surface-container)', color: 'var(--on-surface)' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '10px', color: 'var(--on-surface-variant)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>To</label>
              <input
                type="date"
                value={toInput}
                min={fromInput || minDate}
                max={maxDate || undefined}
                onChange={e => setToInput(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '10px', fontSize: '13px', outline: 'none', border: '1px solid var(--border)', backgroundColor: 'var(--surface-container)', color: 'var(--on-surface)' }}
              />
            </div>
          </div>
        </div>
      )}

      {finalSelectedDays.length > 0 && (
        <div style={{ padding: '10px 14px', borderRadius: '10px', backgroundColor: 'var(--primary-light)', marginBottom: '12px' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary)' }}>
            {finalSelectedDays.length} day(s) · Total: ₹{finalTotal}
          </span>
        </div>
      )}

      <textarea value={reason} onChange={e => setReason(e.target.value)}
        placeholder="Why do you need this? (optional)" rows={2}
        style={{ width: '100%', padding: '8px 12px', borderRadius: '10px', fontSize: '13px', outline: 'none', resize: 'none', marginBottom: '12px', border: '1px solid var(--border)', backgroundColor: 'var(--surface-container)', color: 'var(--on-surface)' }} />

      {/* FIX: button sends request only, payment happens after approval */}
      <button onClick={handleRequestOnly} disabled={submitting || finalSelectedDays.length === 0}
        className={finalSelectedDays.length > 0 ? 'signature-gradient' : ''}
        style={{
          width: '100%', padding: '13px', borderRadius: '12px', fontWeight: 700, fontSize: '14px', border: 'none',
          cursor: submitting || finalSelectedDays.length === 0 ? 'not-allowed' : 'pointer',
          opacity: finalSelectedDays.length === 0 ? 0.5 : 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          backgroundColor: finalSelectedDays.length === 0 ? 'var(--surface-container)' : undefined,
          color: finalSelectedDays.length === 0 ? 'var(--outline)' : 'white',
          fontFamily: 'var(--font-manrope)',
        }}>
        {submitting
          ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Sending Request...</>
          : finalSelectedDays.length > 0 ? `Send Borrow Request · ₹${finalTotal}` : 'Select days above'}
      </button>
      {finalSelectedDays.length > 0 && (
        <p style={{ fontSize: '11px', color: 'var(--on-surface-variant)', textAlign: 'center', marginTop: '8px' }}>
          💡 Payment only required after lender approves
        </p>
      )}
    </motion.div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user } = useUser()
  const [listing, setListing] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState(0)
  const [wishlisted, setWishlisted] = useState(false)
  const [showBorrowForm, setShowBorrowForm] = useState(false)
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [bookedSlots, setBookedSlots] = useState<Set<string>>(new Set())

  const [borrowFrom, setBorrowFrom] = useState('')
  const [borrowUntil, setBorrowUntil] = useState('')
  const [borrowMsg, setBorrowMsg] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchListing = useCallback(async () => {
    const res = await fetch(`/api/listings/${id}`)
    const data = await res.json()
    setListing(data)
    setLoading(false)
  }, [id])

  const fetchBookedSlots = useCallback(async () => {
    const res = await fetch(`/api/borrow?listing_id=${id}`)
    const data = await res.json()
    if (!Array.isArray(data)) return
    const set = new Set<string>()
    for (const req of data) {
      for (const slot of req.selected_slots ?? []) set.add(slot)
    }
    setBookedSlots(set)
  }, [id])

  useEffect(() => { fetchListing(); fetchBookedSlots() }, [fetchListing, fetchBookedSlots])

  const isOwner = user?.id === listing?.user_id
  const isBorrowListing = listing?.listing_type === 'borrow'

  const handleShare = () => { navigator.clipboard?.writeText(window.location.href); toast.success('Link copied!') }

  const handleDelete = async () => {
    if (!confirm('Delete this listing?')) return
    const res = await fetch(`/api/listings/${id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Listing deleted'); window.location.href = '/marketplace' }
    else toast.error('Failed to delete')
  }

  const handleMarkSold = async () => {
    const res = await fetch(`/api/listings/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_available: false }),
    })
    if (res.ok) { toast.success('Marked as sold'); setListing((p: any) => ({ ...p, is_available: false })) }
  }

  const handleBorrowSubmit = async () => {
    if (!borrowFrom || !borrowUntil) { toast.error('Please fill in borrow dates'); return }
    setSubmitting(true)
    const res = await fetch('/api/borrow', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item_name: listing.title, description: borrowMsg,
        lender_id: listing.user_id, listing_id: listing.id,
        borrow_from: borrowFrom, borrow_until: borrowUntil,
      }),
    })
    setSubmitting(false)
    if (res.ok) { toast.success('Borrow request sent!'); setShowBorrowForm(false) }
    else { const err = await res.json(); toast.error(err.error ?? 'Failed') }
  }

  if (loading) return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ height: '32px', width: '160px', background: 'var(--surface-container)', borderRadius: '8px', marginBottom: '28px' }} className="animate-pulse" />
      <div className="two-col">
        <div style={{ height: '320px', background: 'var(--surface-container)', borderRadius: '20px' }} className="animate-pulse" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[60, 90, 40, 70, 55].map((w, i) => <div key={i} style={{ height: '24px', background: 'var(--surface-container)', borderRadius: '8px', width: `${w}%` }} className="animate-pulse" />)}
        </div>
      </div>
    </div>
  )

  if (!listing || listing.error) return (
    <div style={{ textAlign: 'center', padding: '80px 0' }}>
      <p style={{ fontSize: '18px', fontWeight: 700 }}>Listing not found.</p>
      <Link href="/marketplace" style={{ color: 'var(--primary)', textDecoration: 'none', display: 'block', marginTop: '8px' }}>Back to Marketplace</Link>
    </div>
  )

  const images = listing.images?.length ? listing.images : ['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&h=600&fit=crop']
  const cond = conditionColors[listing.condition] ?? { color: '#464555', bg: '#edeeef' }
  const seller = listing.users

  const priceLabel = isBorrowListing
    ? listing.duration_type === 'hour'
      ? `₹${Number(listing.price_per_hour ?? listing.price ?? 0).toLocaleString()}/hr`
      : `₹${Number(listing.price_per_day ?? listing.price ?? 0).toLocaleString()}/day`
    : `₹${Number(listing.price).toLocaleString()}`

  const onBorrowSuccess = () => {
    setShowBorrowForm(false)
    fetchListing()
    fetchBookedSlots()
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <Link href="/marketplace" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--on-surface-variant)', textDecoration: 'none', marginBottom: '24px' }}>
        <ArrowLeft size={16} /> Back to Marketplace
      </Link>

      {!listing.is_available && (
        <div style={{ backgroundColor: '#fee2e2', borderRadius: '12px', padding: '12px 20px', marginBottom: '20px', fontSize: '14px', fontWeight: 600, color: '#b91c1c' }}>
          This item is no longer available.
        </div>
      )}

      <div className="two-col">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <div style={{ borderRadius: '20px', overflow: 'hidden', height: '320px', background: 'var(--surface-container)' }}>
            <img src={images[selectedImage]} alt={listing.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          {images.length > 1 && (
            <div style={{ display: 'flex', gap: '10px', marginTop: '12px', flexWrap: 'wrap' }}>
              {images.map((img: string, i: number) => (
                <button key={i} onClick={() => setSelectedImage(i)} style={{ width: '68px', height: '68px', borderRadius: '12px', overflow: 'hidden', border: `2px solid ${i === selectedImage ? 'var(--primary)' : 'var(--border)'}`, padding: 0, cursor: 'pointer' }}>
                  <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </button>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '999px', background: cond.bg, color: cond.color }}>{conditionLabels[listing.condition] ?? listing.condition}</span>
            <span style={{ fontSize: '11px', fontWeight: 600, padding: '4px 12px', borderRadius: '999px', background: 'var(--surface-container)', color: 'var(--on-surface-variant)' }}>{listing.category}</span>
            {isBorrowListing && <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '999px', backgroundColor: '#fef3c7', color: '#b45309' }}>🤝 For Borrow</span>}
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px', gap: '12px' }}>
            <h1 style={{ fontSize: 'clamp(18px,4vw,22px)', fontWeight: 800, color: 'var(--on-surface)', lineHeight: 1.3, fontFamily: 'var(--font-manrope)', flex: 1 }}>{listing.title}</h1>
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
              <button onClick={() => setWishlisted(!wishlisted)} style={{ padding: '8px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--card)', cursor: 'pointer', color: wishlisted ? '#ef4444' : 'var(--on-surface-variant)' }}>
                <Heart size={16} fill={wishlisted ? '#ef4444' : 'none'} />
              </button>
              <button onClick={handleShare} style={{ padding: '8px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--card)', cursor: 'pointer', color: 'var(--on-surface-variant)' }}>
                <Share2 size={16} />
              </button>
            </div>
          </div>

          <div style={{ fontSize: 'clamp(28px,6vw,36px)', fontWeight: 800, marginBottom: '24px', fontFamily: 'var(--font-manrope)' }} className="signature-gradient-text">
            {priceLabel}
          </div>

          {isOwner ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {listing.is_available && (
                <button onClick={handleMarkSold} style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '2px solid var(--primary)', background: 'transparent', color: 'var(--primary)', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>
                  {isBorrowListing ? 'Mark as Unavailable' : 'Mark as Sold'}
                </button>
              )}
              <button onClick={handleDelete} style={{ width: '100%', padding: '14px', borderRadius: '14px', border: 'none', background: '#fee2e2', color: '#b91c1c', fontWeight: 700, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Trash2 size={16} /> Delete Listing
              </button>
            </div>
          ) : listing.is_available ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {!isBorrowListing && (
                <PayButton type="listing" itemId={listing.id} price={Number(listing.price)} sellerName={seller?.full_name}
                  label={`Buy Now · ₹${Number(listing.price).toLocaleString()}`} className="signature-gradient"
                  style={{ width: '100%', padding: '16px', borderRadius: '14px', color: 'white', fontWeight: 700, fontSize: '15px', border: 'none', boxShadow: '0 8px 25px rgba(53,37,205,0.3)', fontFamily: 'var(--font-manrope)' }}
                  onSuccess={() => setListing((p: any) => ({ ...p, is_available: false }))} />
              )}

              <button onClick={() => setShowMessageModal(true)}
                style={{ width: '100%', padding: '14px', borderRadius: '14px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', border: '2px solid var(--primary)', background: 'transparent', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontFamily: 'var(--font-manrope)' }}>
                <MessageCircle size={16} /> {isBorrowListing ? 'Contact Lender' : 'Contact Seller'}
              </button>

              {isBorrowListing && (
                <button onClick={() => setShowBorrowForm(!showBorrowForm)}
                  style={{ width: '100%', padding: '13px', borderRadius: '14px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', border: 'none', background: showBorrowForm ? 'var(--surface-container)' : 'linear-gradient(135deg,#3525cd,#712ae2)', color: showBorrowForm ? 'var(--on-surface-variant)' : 'white', fontFamily: 'var(--font-manrope)', boxShadow: showBorrowForm ? 'none' : '0 4px 15px rgba(53,37,205,0.3)' }}>
                  {showBorrowForm ? 'Cancel' : '🤝 Request to Borrow'}
                </button>
              )}

              {isBorrowListing && showBorrowForm && user && (
                listing.duration_type === 'hour'
                  ? <HourBorrowPanel listing={listing} bookedSlots={bookedSlots} onSuccess={onBorrowSuccess} />
                  : <DayBorrowPanel listing={listing} bookedSlots={bookedSlots} onSuccess={onBorrowSuccess} />
              )}

              {!isBorrowListing && showBorrowForm && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  style={{ background: 'var(--surface-container-low)', borderRadius: '16px', padding: '16px', border: '1px solid var(--border)' }}>
                  <p style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px' }}>Borrow Details</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--on-surface-variant)', display: 'block', marginBottom: '4px' }}>From</label>
                      <input type="date" value={borrowFrom} onChange={e => setBorrowFrom(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '10px', fontSize: '13px', outline: 'none', border: '1px solid var(--border)', backgroundColor: 'var(--surface-container)', color: 'var(--on-surface)' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--on-surface-variant)', display: 'block', marginBottom: '4px' }}>Until</label>
                      <input type="date" value={borrowUntil} onChange={e => setBorrowUntil(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '10px', fontSize: '13px', outline: 'none', border: '1px solid var(--border)', backgroundColor: 'var(--surface-container)', color: 'var(--on-surface)' }} />
                    </div>
                  </div>
                  <textarea value={borrowMsg} onChange={e => setBorrowMsg(e.target.value)} placeholder="Why do you need this? (optional)" rows={2} style={{ width: '100%', padding: '8px 12px', borderRadius: '10px', fontSize: '13px', outline: 'none', resize: 'none', marginBottom: '10px', border: '1px solid var(--border)', backgroundColor: 'var(--surface-container)', color: 'var(--on-surface)' }} />
                  <button onClick={handleBorrowSubmit} disabled={submitting} className="signature-gradient" style={{ width: '100%', padding: '12px', borderRadius: '10px', color: 'white', fontWeight: 700, fontSize: '13px', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
                    {submitting ? 'Sending...' : 'Send Borrow Request'}
                  </button>
                </motion.div>
              )}
            </div>
          ) : null}

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderRadius: '12px', background: '#dcfce7', marginBottom: '20px' }}>
            <Shield size={16} style={{ color: '#15803d', flexShrink: 0 }} />
            <p style={{ fontSize: '12px', color: '#15803d', fontWeight: 600 }}>Safe Exchange Hub — meet at Student Union, Main Entrance</p>
          </div>

          {seller && (
            <div style={{ background: 'var(--surface-container-low)', borderRadius: '16px', padding: '16px', border: '1px solid var(--border)' }}>
              <p style={{ fontSize: '10px', color: 'var(--outline)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{isBorrowListing ? 'Lender' : 'Seller'}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {seller.avatar_url
                  ? <img src={seller.avatar_url} alt="" style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover' }} />
                  : <div className="signature-gradient" style={{ width: '44px', height: '44px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '16px' }}>{seller.full_name?.[0] ?? '?'}</div>}
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 700, fontSize: '14px', color: 'var(--on-surface)' }}>{seller.full_name}</p>
                  <p style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>{seller.total_transactions ?? 0} transactions</p>
                </div>
                <div style={{ padding: '6px 12px', borderRadius: '999px', background: 'var(--primary-light)' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--primary)' }}>★ {seller.trust_score ?? 50}</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                <MapPin size={13} style={{ color: 'var(--outline)' }} />
                <span style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>Campus · Safe Exchange Zone</span>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {listing.description && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ marginTop: '40px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'var(--font-manrope)', marginBottom: '12px' }}>Description</h2>
          <p style={{ fontSize: '14px', color: 'var(--on-surface-variant)', lineHeight: 1.8 }}>{listing.description}</p>
        </motion.div>
      )}

      {seller && !isOwner && (
        <MessageModal isOpen={showMessageModal} onClose={() => setShowMessageModal(false)} receiver={seller} listingId={listing.id} listingTitle={listing.title} />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
