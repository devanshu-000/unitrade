'use client'

import { useState, useEffect } from 'react'
import { MessageCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import MessageModal from '@/components/shared/MessageModal'

export default function MessagesPage() {
  const [convos, setConvos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState<any>(null)

  const fetchConvos = () => {
    fetch('/api/messages')
      .then(r => r.json())
      .then(d => { setConvos(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { fetchConvos() }, [])

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: 'clamp(24px,6vw,36px)', fontWeight: 800, fontFamily: 'var(--font-manrope)', marginBottom: '6px' }}>Messages</h1>
        <p style={{ fontSize: '14px', color: 'var(--on-surface-variant)' }}>Your conversations with sellers and buyers.</p>
      </motion.div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[...Array(4)].map((_,i) => <div key={i} style={{ height: '76px', backgroundColor: 'var(--card)', borderRadius: '16px', border: '1px solid var(--border)' }} className="animate-pulse" />)}
        </div>
      ) : convos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <MessageCircle size={48} style={{ color: 'var(--outline-variant)', margin: '0 auto 16px' }} />
          <p style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'var(--font-manrope)' }}>No messages yet</p>
          <p style={{ fontSize: '14px', color: 'var(--on-surface-variant)', marginTop: '8px' }}>
            Contact a seller from any listing to start a conversation.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {convos.map((conv, idx) => {
            const other = conv.other_user
            const msg = conv.last_message
            return (
              <motion.button
                key={other?.id ?? idx}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.04 }}
                onClick={() => setActive(conv)}
                style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', borderRadius: '16px', backgroundColor: 'var(--card)', border: `1px solid ${conv.unread > 0 ? 'var(--primary-light)' : 'var(--border)'}`, cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--shadow)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
              >
                {other?.avatar_url
                  ? <img src={other.avatar_url} alt="" style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                  : <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg,#3525cd,#712ae2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '16px', flexShrink: 0 }}>{other?.full_name?.[0] ?? '?'}</div>
                }
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <p style={{ fontWeight: conv.unread > 0 ? 800 : 600, fontSize: '14px', color: 'var(--on-surface)', fontFamily: 'var(--font-manrope)' }}>{other?.full_name ?? 'Unknown'}</p>
                    <span style={{ fontSize: '11px', color: 'var(--outline)' }}>
                      {msg?.created_at ? formatDistanceToNow(new Date(msg.created_at), { addSuffix: true }) : ''}
                    </span>
                  </div>
                  <p style={{ fontSize: '13px', color: conv.unread > 0 ? 'var(--on-surface)' : 'var(--on-surface-variant)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {msg?.content ?? 'No messages yet'}
                  </p>
                </div>
                {conv.unread > 0 && (
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'linear-gradient(135deg,#3525cd,#712ae2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: '10px', fontWeight: 800, color: 'white' }}>{conv.unread}</span>
                  </div>
                )}
              </motion.button>
            )
          })}
        </div>
      )}

      {active && (
        <MessageModal
          isOpen={!!active}
          onClose={() => { setActive(null); fetchConvos() }}
          receiver={active.other_user}
        />
      )}
    </div>
  )
}
