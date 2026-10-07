'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Calendar, CheckCircle, XCircle, Clock, ArrowRight, MessageCircle } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'

declare global { interface Window { Razorpay: any } }

// FIX: load Razorpay script dynamically for payment after approval
function loadRazorpay(): Promise<boolean> {
  return new Promise(resolve => {
    if (typeof window !== 'undefined' && window.Razorpay) return resolve(true)
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.onload = () => resolve(true)
    s.onerror = () => resolve(false)
    document.body.appendChild(s)
  })
}

const statusColors: Record<string, { color: string; bg: string }> = {
  pending:  { color: '#b45309', bg: '#fef3c7' },
  accepted: { color: '#15803d', bg: '#dcfce7' },
  rejected: { color: '#b91c1c', bg: '#fee2e2' },
  returned: { color: '#464555', bg: '#edeeef' },
  active:   { color: '#1d4ed8', bg: '#dbeafe' }, // FIX: paid + active borrow
}

const conditionColors: Record<string, string> = {
  new: '#22c55e', like_new: '#3b82f6', good: '#f59e0b', fair: '#f97316',
}

const fallbackImages = [
  'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop',
]

const card = { backgroundColor: 'var(--card)', borderRadius: '20px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }

export default function BorrowPage() {
  const { user } = useUser()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'browse'|'mine'|'received'>('browse')
  const [search, setSearch] = useState('')
  const [listings, setListings] = useState<any[]>([])
  const [myRequests, setMyRequests] = useState<any[]>([])
  const [receivedRequests, setReceivedRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string|null>(null)
  const [paying, setPaying] = useState<string|null>(null) // FIX: track which request is being paid

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [listRes, mineRes, recvRes] = await Promise.all([
      fetch('/api/listings?type=borrow'),
      fetch('/api/borrow/mine'),
      fetch('/api/borrow/received'),
    ])
    const [listData, mineData, recvData] = await Promise.all([
      listRes.json(), mineRes.json(), recvRes.json()
    ])
    setListings(Array.isArray(listData) ? listData : [])
    setMyRequests(Array.isArray(mineData) ? mineData : [])
    setReceivedRequests(Array.isArray(recvData) ? recvData : [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleStatusUpdate = async (id: string, status: string) => {
    setUpdating(id)
    const res = await fetch(`/api/borrow/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setUpdating(null)
    if (res.ok) {
      toast.success(`Request ${status}`)
      fetchData()
    } else {
      toast.error('Failed to update request')
    }
  }

  // FIX: payment handler — only called after lender approves (status === 'accepted')
  const handlePay = async (req: any) => {
    if (paying) return
    setPaying(req.id)

    const loaded = await loadRazorpay()
    if (!loaded) { toast.error('Failed to load payment gateway'); setPaying(null); return }

    // Create Razorpay order — backend will verify status === 'accepted'
    const orderRes = await fetch('/api/razorpay/create-order', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'borrow',
        id: req.listing_id,
        listing_id: req.listing_id,
        lender_id: req.lender_id,
        total_amount: req.total_amount,
        borrow_request_id: req.id,   // FIX: passed so backend can verify approved status
      }),
    })
    const orderData = await orderRes.json()
    if (!orderRes.ok) { toast.error(orderData.error ?? 'Failed to create order'); setPaying(null); return }

    const options = {
      key: orderData.key,
      amount: orderData.amount,
      currency: 'INR',
      name: 'UniXchange',
      description: req.item_name,
      order_id: orderData.razorpay_order_id,
      theme: { color: '#3525cd' },
      handler: async (response: any) => {
        // Verify payment on backend + update borrow_request status to 'active'
        const verifyRes = await fetch('/api/razorpay/verify', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            db_order_id: orderData.db_order_id,
            borrow_request_id: req.id,   // FIX: so verify route can update borrow_request
          }),
        })
        const verifyData = await verifyRes.json()
        if (!verifyRes.ok) { toast.error(verifyData.error ?? 'Payment verification failed'); setPaying(null); return }
        toast.success('Payment successful! 🎉', { description: `Borrowing "${req.item_name}" confirmed.` })
        setPaying(null)
        fetchData()
      },
      modal: { ondismiss: () => setPaying(null) },
    }
    const rzp = new window.Razorpay(options)
    rzp.on('payment.failed', (r: any) => { toast.error(`Payment failed: ${r.error.description}`); setPaying(null) })
    rzp.open()
  }

  const filtered = listings.filter(l =>
    l.title.toLowerCase().includes(search.toLowerCase()) &&
    l.is_available &&
    l.user_id !== user?.id
  )

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '42px', fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1.1, fontFamily: 'var(--font-manrope)', color: 'var(--on-surface)', marginBottom: '10px' }}>
          Peer <span className="signature-gradient-text">Lending</span>
        </h1>
        <p style={{ fontSize: '15px', color: 'var(--on-surface-variant)', lineHeight: 1.6 }}>
          Borrow what you need, lend what you don&apos;t. Build campus trust one item at a time.
        </p>
      </motion.div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        {([['browse','Browse Items'],['mine','My Requests'],['received','Requests Received']] as const).map(([tab, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '10px 20px', borderRadius: '12px', fontSize: '13px', fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'var(--font-manrope)',
            ...(activeTab === tab
              ? { background: 'linear-gradient(135deg,#3525cd,#712ae2)', color: 'white', boxShadow: '0 4px 15px rgba(53,37,205,0.3)' }
              : { backgroundColor: 'var(--card)', color: 'var(--on-surface-variant)', border: '1px solid var(--border)' }),
          }}>
            {label}
            {tab === 'received' && receivedRequests.filter(r => r.status === 'pending').length > 0 && (
              <span style={{ marginLeft: '6px', backgroundColor: '#ef4444', color: 'white', borderRadius: '999px', fontSize: '10px', fontWeight: 800, padding: '2px 6px' }}>
                {receivedRequests.filter(r => r.status === 'pending').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Browse tab */}
      {activeTab === 'browse' && (
        <>
          <div style={{ position: 'relative', marginBottom: '24px' }}>
            <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--outline)' }} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items to borrow..."
              style={{ width: '100%', paddingLeft: '48px', paddingRight: '16px', paddingTop: '14px', paddingBottom: '14px', borderRadius: '16px', border: '1px solid var(--border)', backgroundColor: 'var(--card)', color: 'var(--on-surface)', fontSize: '14px', outline: 'none' }} />
          </div>

          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: '20px' }}>
              {[...Array(6)].map((_: any, i: number) => <div key={i} style={{ ...card, height: '320px' }} className="animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 0' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
              <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--on-surface)' }}>No items available to borrow</p>
              <p style={{ fontSize: '14px', color: 'var(--on-surface-variant)', marginTop: '8px' }}>No items available for borrowing yet. List an item as &quot;Lend for Borrowing&quot; to get started!</p>
              <Link href="/marketplace/new" style={{ textDecoration: 'none' }}>
                <button className="signature-gradient" style={{ marginTop: '20px', padding: '12px 28px', borderRadius: '12px', color: 'white', fontWeight: 700, border: 'none', cursor: 'pointer' }}>Post an Item</button>
              </Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: '20px' }}>
              {filtered.map((item: any, idx: number) => (
                <motion.div key={item.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }} whileHover={{ y: -4 }} style={card}>
                  <div style={{ position: 'relative', height: '180px', overflow: 'hidden' }}>
                    <img src={item.images?.[0] ?? fallbackImages[idx % fallbackImages.length]} alt={item.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s' }}
                      onMouseEnter={(e: any) => (e.currentTarget.style.transform = 'scale(1.05)')}
                      onMouseLeave={(e: any) => (e.currentTarget.style.transform = 'scale(1)')} />
                    <span style={{ position: 'absolute', top: '12px', left: '12px', fontSize: '10px', fontWeight: 700, padding: '4px 10px', borderRadius: '999px', backgroundColor: conditionColors[item.condition] ?? '#9ca3af', color: 'white' }}>
                      {item.condition?.replace('_',' ').toUpperCase()}
                    </span>
                    <span style={{ position: 'absolute', top: '12px', right: '12px', fontSize: '13px', fontWeight: 700, padding: '4px 10px', borderRadius: '999px', backgroundColor: 'var(--card)', color: 'var(--on-surface)', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
                      ₹{Number(item.price).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ padding: '16px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--on-surface)', marginBottom: '4px', fontFamily: 'var(--font-manrope)' }}>{item.title}</h3>
                    <p style={{ fontSize: '12px', color: 'var(--on-surface-variant)', marginBottom: '12px' }}>{item.category}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                      {item.users?.avatar_url ? <img src={item.users.avatar_url} alt="" style={{ width: '26px', height: '26px', borderRadius: '50%', objectFit: 'cover' }} /> : (
                        <div className="signature-gradient" style={{ width: '26px', height: '26px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '10px', fontWeight: 700 }}>{item.users?.full_name?.[0] ?? '?'}</div>
                      )}
                      <span style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>{item.users?.full_name ?? 'Unknown'}</span>
                      <div style={{ marginLeft: 'auto', padding: '3px 10px', borderRadius: '999px', backgroundColor: 'var(--primary-light)' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary)' }}>★ {item.users?.trust_score ?? 50}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Link href={`/marketplace/${item.id}`} style={{ textDecoration: 'none', flex: 1 }}>
                        <button className="signature-gradient" style={{ width: '100%', padding: '12px', borderRadius: '12px', fontSize: '13px', fontWeight: 700, border: 'none', cursor: 'pointer', color: 'white', fontFamily: 'var(--font-manrope)', boxShadow: '0 4px 15px rgba(53,37,205,0.25)' }}>
                          Request Borrow
                        </button>
                      </Link>
                      <button
                        onClick={() => router.push('/chat?user=' + item.user_id)}
                        style={{ padding: '12px', borderRadius: '12px', fontSize: '13px', border: '1px solid var(--border)', backgroundColor: 'var(--surface-container)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title="Message owner"
                      >
                        <MessageCircle size={16} color="var(--on-surface-variant)" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}

      {/* My Requests tab */}
      {activeTab === 'mine' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {loading ? [...Array(3)].map((_: any, i: number) => <div key={i} style={{ height: '96px', backgroundColor: 'var(--card)', borderRadius: '16px', border: '1px solid var(--border)' }} className="animate-pulse" />) :
          myRequests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 0' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🤝</div>
              <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--on-surface)' }}>No borrow requests yet</p>
              <p style={{ fontSize: '14px', color: 'var(--on-surface-variant)', marginTop: '8px' }}>Browse items above and send your first request!</p>
            </div>
          ) : myRequests.map((req: any, idx: number) => {
            const status = statusColors[req.status] ?? statusColors.pending
            const lender = req.users
            const img = req.listings?.images?.[0] ?? fallbackImages[idx % fallbackImages.length]
            return (
              <motion.div key={req.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}
                style={{ backgroundColor: 'var(--card)', borderRadius: '16px', border: '1px solid var(--border)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: 'var(--shadow-sm)' }}>
                <img src={img} alt={req.item_name} style={{ width: '64px', height: '64px', borderRadius: '12px', objectFit: 'cover', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--on-surface)', marginBottom: '4px' }}>{req.item_name}</h3>
                  <p style={{ fontSize: '12px', color: 'var(--on-surface-variant)', marginBottom: '6px' }}>Lender: {lender?.full_name ?? 'Unknown'}</p>
                  {req.borrow_from && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={11} style={{ color: 'var(--outline)' }} />
                      <span style={{ fontSize: '11px', color: 'var(--outline)' }}>{req.borrow_from} → {req.borrow_until}</span>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', flexShrink: 0 }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, padding: '4px 10px', borderRadius: '999px', backgroundColor: status.bg, color: status.color }}>{req.status.toUpperCase()}</span>
                  {/* FIX: show Pay Now button only when approved and unpaid */}
                  {req.status === 'accepted' && req.payment_status !== 'paid' && req.total_amount && (
                    <button onClick={() => handlePay(req)} disabled={paying === req.id}
                      className="signature-gradient"
                      style={{ padding: '7px 14px', borderRadius: '8px', border: 'none', color: 'white', fontWeight: 700, fontSize: '11px', cursor: paying === req.id ? 'not-allowed' : 'pointer', opacity: paying === req.id ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {paying === req.id ? 'Processing...' : `Pay Now · ₹${req.total_amount}`}
                    </button>
                  )}
                  {/* FIX: show Mark Returned only after payment is done */}
                  {req.status === 'active' && (
                    <button onClick={() => handleStatusUpdate(req.id, 'returned')} disabled={updating === req.id}
                      style={{ fontSize: '11px', color: '#15803d', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      Mark Returned <ArrowRight size={12} />
                    </button>
                  )}
                  {req.status === 'pending' && (
                    <span style={{ fontSize: '10px', color: 'var(--on-surface-variant)', fontStyle: 'italic' }}>Awaiting lender</span>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Received Requests tab */}
      {activeTab === 'received' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {loading ? [...Array(3)].map((_: any, i: number) => <div key={i} style={{ height: '96px', backgroundColor: 'var(--card)', borderRadius: '16px', border: '1px solid var(--border)' }} className="animate-pulse" />) :
          receivedRequests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 0' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📬</div>
              <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--on-surface)' }}>No requests received yet</p>
              <p style={{ fontSize: '14px', color: 'var(--on-surface-variant)', marginTop: '8px' }}>When someone wants to borrow your listed items, they&apos;ll appear here.</p>
            </div>
          ) : receivedRequests.map((req: any, idx: number) => {
            const status = statusColors[req.status] ?? statusColors.pending
            const requester = req.users
            const img = req.listings?.images?.[0] ?? fallbackImages[idx % fallbackImages.length]
            return (
              <motion.div key={req.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}
                style={{ backgroundColor: 'var(--card)', borderRadius: '16px', border: '1px solid var(--border)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: 'var(--shadow-sm)' }}>
                <img src={img} alt={req.item_name} style={{ width: '64px', height: '64px', borderRadius: '12px', objectFit: 'cover', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--on-surface)', marginBottom: '4px' }}>{req.item_name}</h3>
                  <p style={{ fontSize: '12px', color: 'var(--on-surface-variant)', marginBottom: '4px' }}>
                    Requested by: <strong>{requester?.full_name ?? 'Unknown'}</strong> · Trust ★{requester?.trust_score ?? 50}
                  </p>
                  {req.borrow_from && <p style={{ fontSize: '11px', color: 'var(--outline)' }}>{req.borrow_from} → {req.borrow_until}</p>}
                  {req.description && <p style={{ fontSize: '12px', color: 'var(--on-surface-variant)', marginTop: '4px', fontStyle: 'italic' }}>&quot;{req.description}&quot;</p>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', flexShrink: 0 }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, padding: '4px 10px', borderRadius: '999px', backgroundColor: status.bg, color: status.color }}>{req.status.toUpperCase()}</span>
                  {req.status === 'pending' && (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => handleStatusUpdate(req.id, 'accepted')} disabled={updating === req.id}
                        style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', backgroundColor: '#dcfce7', color: '#15803d', fontWeight: 700, fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle size={12} /> Accept
                      </button>
                      <button onClick={() => handleStatusUpdate(req.id, 'rejected')} disabled={updating === req.id}
                        style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', backgroundColor: '#fee2e2', color: '#b91c1c', fontWeight: 700, fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <XCircle size={12} /> Reject
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
