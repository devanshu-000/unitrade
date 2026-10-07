'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Upload, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { SUBCATEGORIES } from '@/lib/subcategories'

const categories = ['Books', 'Electronics', 'Clothes', 'Sports', 'Other']
const conditions = ['New', 'Like New', 'Good', 'Fair']

const suggestedPrices: Record<string, number> = {
  Books: 350, Electronics: 5000, Clothes: 400, Sports: 800, Other: 500,
}

const label = {
  display: 'block', fontSize: '13px', fontWeight: 600,
  color: 'var(--on-surface)', marginBottom: '8px', fontFamily: 'var(--font-manrope)',
}

const inputStyle = {
  width: '100%', padding: '12px 16px', borderRadius: '12px',
  border: '1px solid var(--border)', backgroundColor: 'var(--surface-container-low)',
  color: 'var(--on-surface)', fontSize: '14px', outline: 'none',
  fontFamily: 'var(--font-inter)', transition: 'border-color 0.2s, box-shadow 0.2s',
}

export default function NewListingPage() {
  const router = useRouter()
  const [title, setTitle]           = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice]           = useState('')
  const [category, setCategory]     = useState('')
  const [subcategory, setSubcategory] = useState('')   // ← NEW
  const [condition, setCondition]   = useState('')
  const [loading, setLoading]       = useState(false)
  const [listingType, setListingType] = useState<'sell'|'borrow'>('sell')
  const [imageUrl, setImageUrl]     = useState('')
  const [uploading, setUploading]   = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // borrow-specific state
  const [durationType, setDurationType]     = useState<'day'|'hour'>('day')
  const [pricePerDay, setPricePerDay]       = useState('')
  const [pricePerHour, setPricePerHour]     = useState('')
  const [slotFromDate, setSlotFromDate]     = useState('')
  const [slotToDate, setSlotToDate]         = useState('')
  const [slotTotalHours, setSlotTotalHours] = useState('8')
  const [slotStartHour, setSlotStartHour]   = useState('9')

  const suggested = category ? suggestedPrices[category] : null

  // ── NEW: when category changes, reset subcategory ──────────────────────────
  function handleCategoryChange(val: string) {
    setCategory(val)
    setSubcategory('')
  }
  // ──────────────────────────────────────────────────────────────────────────

  const uploadToCloudinary = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!)
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: 'POST', body: formData }
    )
    const data = await res.json()
    if (!data.secure_url) throw new Error(data.error?.message ?? 'Upload failed')
    return data.secure_url as string
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { alert('File too large. Max 5MB.'); return }
    setUploading(true)
    try { const url = await uploadToCloudinary(file); setImageUrl(url) }
    catch { alert('Upload failed. Check your Cloudinary settings.') }
    finally { setUploading(false) }
  }

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { alert('File too large. Max 5MB.'); return }
    setUploading(true)
    try { const url = await uploadToCloudinary(file); setImageUrl(url) }
    catch { alert('Upload failed. Check your Cloudinary settings.') }
    finally { setUploading(false) }
  }

  const handleSubmit = async () => {
    if (!title || !category || !condition) { alert('Please fill in all required fields'); return }
    if (listingType === 'sell' && !price) { alert('Price is required for sell listings'); return }
    if (listingType === 'borrow') {
      if (durationType === 'day' && (!pricePerDay || !slotFromDate || !slotToDate)) {
        alert('Please fill in price per day, from date, and to date'); return
      }
      if (durationType === 'hour' && (!pricePerHour || !slotTotalHours)) {
        alert('Please fill in price per hour and total hours'); return
      }
    }
    setLoading(true)
    try {
      const body: Record<string, any> = {
        title, description, category,
        subcategory: subcategory || null,   // ← NEW: send subcategory (null if empty)
        condition, listing_type: listingType,
        images: imageUrl ? [imageUrl] : [],
      }
      if (listingType === 'sell') {
        body.price = price
      } else {
        body.duration_type = durationType
        if (durationType === 'day') {
          body.price_per_day  = pricePerDay
          body.slot_from_date = slotFromDate
          body.slot_to_date   = slotToDate
        } else {
          body.price_per_hour  = pricePerHour
          body.slot_total_hours = slotTotalHours
          body.slot_start_hour  = slotStartHour
        }
      }
      const res = await fetch('/api/listings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        router.push('/marketplace')
      } else {
        const err = await res.json()
        alert(err.error ?? 'Something went wrong')
      }
    } catch { alert('Network error') }
    finally { setLoading(false) }
  }

  // Subcategory options for the currently chosen category
  const subcategoryOptions = SUBCATEGORIES[category] ?? []

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>
      <Link href="/marketplace" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--on-surface-variant)', textDecoration: 'none', marginBottom: '24px', transition: 'color 0.2s' }}>
        <ArrowLeft size={16} /> Back to Marketplace
      </Link>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        style={{ backgroundColor: 'var(--card)', borderRadius: '24px', padding: '36px', boxShadow: 'var(--shadow)', border: '1px solid var(--border)' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--on-surface)', fontFamily: 'var(--font-manrope)', marginBottom: '4px' }}>Create Listing</h1>
        <p style={{ fontSize: '14px', color: 'var(--on-surface-variant)', marginBottom: '24px' }}>Turn your unused items into campus currency.</p>

        {/* Listing Type */}
        <div style={{ marginBottom: '28px' }}>
          <label style={label}>Listing Type <span style={{ color: 'var(--error)' }}>*</span></label>
          <div style={{ display: 'flex', gap: '10px' }}>
            {([['sell', '🛍️ Sell Item', 'List for purchase'], ['borrow', '🤝 Lend for Borrowing', 'Let others borrow']] as const).map(([type, t, sub]) => (
              <button key={type} onClick={() => setListingType(type)} style={{ flex: 1, padding: '14px 16px', borderRadius: '14px', cursor: 'pointer', border: '2px solid', textAlign: 'left', transition: 'all 0.2s',
                ...(listingType === type ? { borderColor: 'var(--primary)', backgroundColor: 'var(--primary-light)', color: 'var(--primary)' } : { borderColor: 'var(--border)', backgroundColor: 'var(--surface-container-low)', color: 'var(--on-surface-variant)' }) }}>
                <p style={{ fontWeight: 700, fontSize: '14px', marginBottom: '2px' }}>{t}</p>
                <p style={{ fontSize: '11px', opacity: 0.7 }}>{sub}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Image Upload */}
        <div style={{ border: '2px dashed var(--outline-variant)', borderRadius: '20px', padding: '40px', textAlign: 'center', marginBottom: '24px', cursor: 'pointer', transition: 'all 0.2s', backgroundColor: 'var(--surface-container-low)', position: 'relative', overflow: 'hidden' }}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.backgroundColor = 'var(--primary-light)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--outline-variant)'; e.currentTarget.style.backgroundColor = 'var(--surface-container-low)' }}>
          <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileSelect} />
          {uploading ? (
            <><div style={{ width: '48px', height: '48px', borderRadius: '14px', backgroundColor: 'var(--surface-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}><Upload size={22} style={{ color: 'var(--primary)', animation: 'pulse 1s infinite' }} /></div><p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--primary)' }}>Uploading...</p></>
          ) : imageUrl ? (
            <><img src={imageUrl} alt="Preview" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '12px', marginBottom: '10px' }} /><p style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>Click to replace image</p></>
          ) : (
            <><div style={{ width: '48px', height: '48px', borderRadius: '14px', backgroundColor: 'var(--surface-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}><Upload size={22} style={{ color: 'var(--outline)' }} /></div><p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--on-surface)' }}>Upload visual assets</p><p style={{ fontSize: '12px', color: 'var(--on-surface-variant)', marginTop: '4px' }}>Drag and drop, or click to browse (Max 5MB)</p></>
          )}
        </div>

        {/* Title */}
        <div style={{ marginBottom: '20px' }}>
          <label style={label}>Listing Title <span style={{ color: 'var(--error)' }}>*</span></label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. MacBook Air M1, Calculus Textbook..." style={inputStyle} />
        </div>

        {/* Description */}
        <div style={{ marginBottom: '20px' }}>
          <label style={label}>Tell us about this item</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe condition, included accessories..." rows={4} style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }} />
        </div>

        {/* Sell: price + category + subcategory */}
        {listingType === 'sell' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={label}>Price (₹) <span style={{ color: 'var(--error)' }}>*</span></label>
                <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" style={inputStyle} />
                {suggested && (
                  <button onClick={() => setPrice(suggested.toString())} style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, padding: '6px 12px', borderRadius: '999px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', border: 'none', cursor: 'pointer' }}>
                    <Sparkles size={12} /> Suggested: ₹{suggested.toLocaleString()}
                  </button>
                )}
              </div>
              <div>
                {/* ── CHANGED: now calls handleCategoryChange ── */}
                <label style={label}>Category <span style={{ color: 'var(--error)' }}>*</span></label>
                <select value={category} onChange={(e) => handleCategoryChange(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="">Select category</option>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* ── NEW: Subcategory dropdown (only shown when category has subcategories) ── */}
            {subcategoryOptions.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <label style={label}>Subcategory <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--on-surface-variant)' }}>(optional)</span></label>
                <select value={subcategory} onChange={(e) => setSubcategory(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="">Select subcategory</option>
                  {subcategoryOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}
          </>
        )}

        {/* Borrow: category + subcategory + duration */}
        {listingType === 'borrow' && (
          <>
            <div style={{ marginBottom: '20px' }}>
              {/* ── CHANGED: now calls handleCategoryChange ── */}
              <label style={label}>Category <span style={{ color: 'var(--error)' }}>*</span></label>
              <select value={category} onChange={(e) => handleCategoryChange(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="">Select category</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* ── NEW: Subcategory dropdown for borrow listings ── */}
            {subcategoryOptions.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <label style={label}>Subcategory <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--on-surface-variant)' }}>(optional)</span></label>
                <select value={subcategory} onChange={(e) => setSubcategory(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="">Select subcategory</option>
                  {subcategoryOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <label style={label}>Availability Type <span style={{ color: 'var(--error)' }}>*</span></label>
              <div style={{ display: 'flex', gap: '10px' }}>
                {([['day', '📅 Day-wise', 'Borrow by day'], ['hour', '⏰ Hour-wise', 'Borrow by hour']] as const).map(([dt, t, sub]) => (
                  <button key={dt} onClick={() => setDurationType(dt)} style={{ flex: 1, padding: '12px 14px', borderRadius: '14px', cursor: 'pointer', border: '2px solid', textAlign: 'left', transition: 'all 0.2s',
                    ...(durationType === dt ? { borderColor: 'var(--primary)', backgroundColor: 'var(--primary-light)', color: 'var(--primary)' } : { borderColor: 'var(--border)', backgroundColor: 'var(--surface-container-low)', color: 'var(--on-surface-variant)' }) }}>
                    <p style={{ fontWeight: 700, fontSize: '13px', marginBottom: '2px' }}>{t}</p>
                    <p style={{ fontSize: '11px', opacity: 0.7 }}>{sub}</p>
                  </button>
                ))}
              </div>
            </div>

            {durationType === 'day' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label style={label}>From Date <span style={{ color: 'var(--error)' }}>*</span></label>
                  <input type="date" value={slotFromDate} onChange={e => setSlotFromDate(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={label}>To Date <span style={{ color: 'var(--error)' }}>*</span></label>
                  <input type="date" value={slotToDate} onChange={e => setSlotToDate(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={label}>Price/Day (₹) <span style={{ color: 'var(--error)' }}>*</span></label>
                  <input type="number" value={pricePerDay} onChange={e => setPricePerDay(e.target.value)} placeholder="0" style={inputStyle} />
                </div>
              </div>
            )}

            {durationType === 'hour' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label style={label}>Total Hours <span style={{ color: 'var(--error)' }}>*</span></label>
                  <input type="number" value={slotTotalHours} onChange={e => setSlotTotalHours(e.target.value)} placeholder="8" min="1" max="24" style={inputStyle} />
                </div>
                <div>
                  <label style={label}>Start Hour (24h)</label>
                  <input type="number" value={slotStartHour} onChange={e => setSlotStartHour(e.target.value)} placeholder="9" min="0" max="23" style={inputStyle} />
                </div>
                <div>
                  <label style={label}>Price/Hour (₹) <span style={{ color: 'var(--error)' }}>*</span></label>
                  <input type="number" value={pricePerHour} onChange={e => setPricePerHour(e.target.value)} placeholder="0" style={inputStyle} />
                </div>
              </div>
            )}
          </>
        )}

        {/* Condition */}
        <div style={{ marginBottom: '32px' }}>
          <label style={label}>Item Condition <span style={{ color: 'var(--error)' }}>*</span></label>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {conditions.map((c) => (
              <button key={c} onClick={() => setCondition(c)} style={{ padding: '10px 20px', borderRadius: '12px', fontSize: '13px', fontWeight: 600, border: '2px solid', cursor: 'pointer', transition: 'all 0.2s',
                ...(condition === c ? { borderColor: 'var(--primary)', backgroundColor: 'var(--primary-light)', color: 'var(--primary)' } : { borderColor: 'var(--border)', backgroundColor: 'var(--surface-container-low)', color: 'var(--on-surface-variant)' }) }}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <button onClick={handleSubmit} disabled={loading} className="signature-gradient"
          style={{ width: '100%', padding: '16px', borderRadius: '14px', color: 'white', fontWeight: 700, fontSize: '15px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, transition: 'opacity 0.2s', fontFamily: 'var(--font-manrope)', boxShadow: '0 8px 25px rgba(53, 37, 205, 0.3)' }}>
          {loading ? 'Posting...' : listingType === 'borrow' ? 'Post for Borrowing →' : 'Post Listing →'}
        </button>

        <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--outline)', marginTop: '16px' }}>
          By posting, you agree to our Campus Marketplace guidelines.
        </p>
      </motion.div>
    </div>
  )
}
