'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, PhoneOff } from 'lucide-react'

type CallStatus = 'connecting' | 'ringing' | 'active' | 'ended' | 'failed'

interface ActiveCallOverlayProps {
  receiverName: string
  status: CallStatus
  onDismiss: () => void
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export default function ActiveCallOverlay({ receiverName, status, onDismiss }: ActiveCallOverlayProps) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (status !== 'active') return
    const timer = setInterval(() => setElapsed(s => s + 1), 1000)
    return () => clearInterval(timer)
  }, [status])

  // Auto-dismiss after 4s when ended/failed
  useEffect(() => {
    if (status === 'ended' || status === 'failed') {
      const t = setTimeout(onDismiss, 4000)
      return () => clearTimeout(t)
    }
  }, [status, onDismiss])

  const statusLabel = {
    connecting: 'Calling you now…',
    ringing: 'Ringing…',
    active: formatDuration(elapsed),
    ended: 'Call ended',
    failed: 'Call failed',
  }[status]

  const isLive = status === 'connecting' || status === 'ringing' || status === 'active'

  return (
    <AnimatePresence>
      <motion.div
        key="call-overlay"
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ type: 'spring', damping: 24, stiffness: 300 }}
        style={{
          position: 'fixed',
          bottom: '24px',
          left: '24px',
          zIndex: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 16px',
          borderRadius: '16px',
          backgroundColor: status === 'ended' || status === 'failed'
            ? 'var(--surface-container)'
            : '#1a1a2e',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          border: '1px solid rgba(255,255,255,0.08)',
          minWidth: '220px',
        }}
      >
        {/* Animated icon */}
        <div style={{
          width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
          background: isLive
            ? 'linear-gradient(135deg,#22c55e,#16a34a)'
            : status === 'ended'
              ? 'var(--surface-container-high)'
              : '#ef4444',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative',
        }}>
          {isLive && (
            <motion.div
              animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ repeat: Infinity, duration: 1.8 }}
              style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                backgroundColor: '#22c55e',
              }}
            />
          )}
          <Phone size={16} color="white" style={{ position: 'relative', zIndex: 1 }} />
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: '13px', fontWeight: 700,
            color: isLive ? 'white' : 'var(--on-surface)',
            fontFamily: 'var(--font-manrope)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {receiverName}
          </p>
          <p style={{
            fontSize: '11px',
            color: isLive ? 'rgba(255,255,255,0.65)' : 'var(--outline)',
            marginTop: '1px',
          }}>
            {statusLabel}
          </p>
        </div>

        {/* Dismiss / End */}
        <button
          onClick={onDismiss}
          style={{
            width: '30px', height: '30px', borderRadius: '8px', flexShrink: 0,
            background: isLive ? 'rgba(239,68,68,0.2)' : 'var(--surface-container)',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: isLive ? '#ef4444' : 'var(--outline)',
          }}
          title="Dismiss"
        >
          <PhoneOff size={14} />
        </button>
      </motion.div>
    </AnimatePresence>
  )
}
