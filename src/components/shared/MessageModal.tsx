'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Send, MessageCircle, Phone } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import ActiveCallOverlay from '@/components/shared/ActiveCallOverlay'

interface MessageModalProps {
  isOpen: boolean
  onClose: () => void
  receiver: {
    id: string
    full_name: string
    avatar_url?: string
  }
  listingId?: string
  listingTitle?: string
}

type CallStatus = 'connecting' | 'ringing' | 'active' | 'ended' | 'failed'

export default function MessageModal({
  isOpen,
  onClose,
  receiver,
  listingId,
  listingTitle,
}: MessageModalProps) {
  const [messages, setMessages] = useState<any[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Call state
  const [callStatus, setCallStatus] = useState<CallStatus | null>(null)
  const [calling, setCalling] = useState(false)

  useEffect(() => {
    if (!isOpen || !receiver?.id) return
    setLoading(true)
    fetch(`/api/messages/${receiver.id}`)
      .then(r => r.json())
      .then(d => { setMessages(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [isOpen, receiver?.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!text.trim() || sending) return
    setSending(true)
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        receiver_id: receiver.id,
        content: text.trim(),
        listing_id: listingId ?? null,
      }),
    })
    setSending(false)
    if (res.ok) {
      const newMsg = await res.json()
      setMessages(prev => [...prev, newMsg])
      setText('')
    } else {
      const err = await res.json()
      toast.error(err.error ?? 'Failed to send message')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const handleCall = async () => {
    if (calling) return
    setCalling(true)
    setCallStatus('connecting')

    try {
      const res = await fetch('/api/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiver_id: receiver.id }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? 'Could not start call')
        setCallStatus('failed')
        setCalling(false)
        return
      }

      // Twilio is now calling the current user's phone.
      // We show "connecting" → after a few seconds move to "ringing" to reflect real flow.
      toast.success(data.message ?? 'Calling you now…')

      setTimeout(() => setCallStatus('ringing'), 4000)
      setTimeout(() => setCallStatus('active'), 12000)

      // After 3 min auto-mark ended (safety fallback — real end is when user hangs up their phone)
      setTimeout(() => {
        setCallStatus('ended')
        setCalling(false)
      }, 3 * 60 * 1000)

    } catch {
      toast.error('Failed to initiate call. Please try again.')
      setCallStatus('failed')
      setCalling(false)
    }
  }

  const dismissCall = () => {
    setCallStatus(null)
    setCalling(false)
  }

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={onClose}
              style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 300, backdropFilter: 'blur(3px)' }}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.97 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              style={{
                position: 'fixed',
                bottom: '24px', right: '24px',
                width: 'min(420px, calc(100vw - 32px))',
                height: 'min(560px, calc(100vh - 100px))',
                backgroundColor: 'var(--card)',
                borderRadius: '20px',
                boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
                zIndex: 301,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                border: '1px solid var(--border)',
              }}
            >
              {/* Header */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                {receiver.avatar_url
                  ? <img src={receiver.avatar_url} alt="" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                  : <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg,#3525cd,#712ae2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '14px' }}>
                      {receiver.full_name?.[0] ?? '?'}
                    </div>
                }
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, fontSize: '14px', color: 'var(--on-surface)', fontFamily: 'var(--font-manrope)' }}>{receiver.full_name}</p>
                  {listingTitle && <p style={{ fontSize: '11px', color: 'var(--outline)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>re: {listingTitle}</p>}
                </div>

                {/* ── Call button ── */}
                <button
                  onClick={handleCall}
                  disabled={calling}
                  title={calling ? 'Call in progress…' : `Call ${receiver.full_name}`}
                  style={{
                    width: '32px', height: '32px', borderRadius: '10px', flexShrink: 0,
                    background: calling
                      ? 'linear-gradient(135deg,#22c55e,#16a34a)'
                      : 'var(--surface-container)',
                    border: '1px solid var(--border)',
                    cursor: calling ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: calling ? 'white' : 'var(--on-surface-variant)',
                    transition: 'all 0.2s',
                    marginRight: '4px',
                  }}
                  onMouseEnter={e => {
                    if (!calling) {
                      e.currentTarget.style.background = 'linear-gradient(135deg,#3525cd,#712ae2)'
                      e.currentTarget.style.color = 'white'
                      e.currentTarget.style.borderColor = 'transparent'
                    }
                  }}
                  onMouseLeave={e => {
                    if (!calling) {
                      e.currentTarget.style.background = 'var(--surface-container)'
                      e.currentTarget.style.color = 'var(--on-surface-variant)'
                      e.currentTarget.style.borderColor = 'var(--border)'
                    }
                  }}
                >
                  <Phone size={14} />
                </button>

                <button onClick={onClose} style={{ width: '30px', height: '30px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--surface-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--on-surface-variant)' }}>
                  <X size={14} />
                </button>
              </div>

              {/* Messages area */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {loading ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <p style={{ fontSize: '13px', color: 'var(--outline)' }}>Loading messages...</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <MessageCircle size={32} style={{ color: 'var(--outline-variant)' }} />
                    <p style={{ fontSize: '13px', color: 'var(--outline)', textAlign: 'center' }}>
                      No messages yet.<br />Say hi to {receiver.full_name}!
                    </p>
                  </div>
                ) : (
                  messages.map(msg => {
                    const isMe = msg.sender_id !== receiver.id
                    return (
                      <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                        <div style={{ maxWidth: '75%' }}>
                          <div style={{
                            padding: '10px 14px',
                            borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                            backgroundColor: isMe ? 'var(--primary)' : 'var(--surface-container)',
                            color: isMe ? 'white' : 'var(--on-surface)',
                            fontSize: '13px',
                            lineHeight: 1.5,
                          }}>
                            {msg.content}
                          </div>
                          <p style={{ fontSize: '10px', color: 'var(--outline)', marginTop: '3px', textAlign: isMe ? 'right' : 'left', padding: '0 4px' }}>
                            {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: '10px', flexShrink: 0 }}>
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message... (Enter to send)"
                  rows={1}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--surface-container-low)',
                    color: 'var(--on-surface)',
                    fontSize: '13px',
                    resize: 'none',
                    outline: 'none',
                    fontFamily: 'var(--font-inter)',
                    lineHeight: 1.5,
                    maxHeight: '100px',
                    overflowY: 'auto',
                  }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!text.trim() || sending}
                  style={{
                    width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0,
                    background: text.trim() ? 'linear-gradient(135deg,#3525cd,#712ae2)' : 'var(--surface-container)',
                    border: 'none', cursor: text.trim() ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: text.trim() ? 'white' : 'var(--outline)',
                    transition: 'all 0.2s',
                  }}
                >
                  <Send size={16} />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Active call overlay — renders outside the modal so it persists if modal closes */}
      {callStatus && (
        <ActiveCallOverlay
          receiverName={receiver.full_name}
          status={callStatus}
          onDismiss={dismissCall}
        />
      )}
    </>
  )
}
