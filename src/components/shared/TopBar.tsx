'use client'

import { UserButton } from '@clerk/nextjs'
import { Bell, Plus, X, CheckCheck, Menu } from 'lucide-react'
import ThemeToggle from './ThemeToggle'
import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { useSidebar } from '@/context/SidebarContext'

const pageTitles: Record<string, string> = {
  '/home':        'Home',
  '/marketplace': 'Marketplace',
  '/borrow':      'Borrow',
  '/gigs':        'Gigs',
  '/chat':        'Messages',
  '/activity':    'Activity',
  '/profile':     'Profile',
}

const typeColors: Record<string, string> = {
  message: '#3525cd',
  payment: '#22c55e',
  request: '#f59e0b',
  accepted: '#22c55e',
  rejected: '#ef4444',
  review: '#712ae2',
}
const typeEmojis: Record<string, string> = {
  message: '💬', payment: '💳', request: '🤝', accepted: '✅', rejected: '❌', review: '⭐',
}

export default function TopBar() {
  const pathname = usePathname()
  const title = Object.entries(pageTitles).find(([k]) => pathname.startsWith(k))?.[1] ?? 'UniXchange'

  const { toggleOpen } = useSidebar()
  const [notifs, setNotifs] = useState<any[]>([])
  const [showNotifs, setShowNotifs] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)

  const unread = notifs.filter(n => !n.is_read).length

  const fetchNotifs = () => {
    fetch('/api/notifications')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setNotifs(data) })
      .catch(() => {})
  }

  useEffect(() => {
    fetchNotifs()
    const iv = setInterval(fetchNotifs, 20000)
    return () => clearInterval(iv)
  }, [])

  // Close on outside click
  useEffect(() => {
    const handler = (e: any) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifs(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const markAllRead = async () => {
    await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  return (
    <header
      className="glass-nav"
      style={{
        position: 'sticky', top: 0, zIndex: 50,
        padding: '0 20px', height: '60px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid var(--border)', gap: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Hamburger — mobile only */}
        <button onClick={toggleOpen} className="lg:hidden" style={{ width: '36px', height: '36px', borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'var(--surface-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--on-surface-variant)', flexShrink: 0 }}>
          <Menu size={18} />
        </button>
        {/* Mobile: app name */}
        <span className="signature-gradient-text lg:hidden" style={{ fontSize: '17px', fontWeight: 800, fontFamily: 'var(--font-manrope)', letterSpacing: '-0.3px' }}>
          UniXchange
        </span>
        {/* Desktop: page title */}
        <span className="hidden lg:block" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--on-surface)', fontFamily: 'var(--font-manrope)' }}>
          {title}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Link href="/marketplace/new" style={{ textDecoration: 'none' }} className="hidden lg:block">
          <button className="signature-gradient" style={{ padding: '8px 18px', borderRadius: '999px', color: 'white', fontWeight: 700, fontSize: '13px', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-manrope)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={14} /> Post New
          </button>
        </Link>

        <Link href="/marketplace/new" style={{ textDecoration: 'none' }} className="lg:hidden">
          <button style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #3525cd, #712ae2)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            <Plus size={16} />
          </button>
        </Link>

        <ThemeToggle />

        {/* Notifications */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setShowNotifs(v => !v)}
            style={{ padding: '8px', borderRadius: '50%', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: 'var(--on-surface-variant)', position: 'relative', display: 'flex' }}
          >
            <Bell size={18} />
            {unread > 0 && (
              <span style={{ position: 'absolute', top: '5px', right: '5px', width: '8px', height: '8px', backgroundColor: '#ef4444', borderRadius: '50%', border: '2px solid var(--card)' }} />
            )}
          </button>

          {showNotifs && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0,
              width: 340, maxHeight: 420,
              backgroundColor: 'var(--card)', borderRadius: 16,
              border: '1px solid var(--border)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
              zIndex: 1000, overflow: 'hidden',
              display: 'flex', flexDirection: 'column',
            }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--on-surface)', fontFamily: 'var(--font-manrope)' }}>Notifications</span>
                  {unread > 0 && (
                    <span style={{ backgroundColor: 'var(--primary)', color: 'white', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 999 }}>{unread}</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {unread > 0 && (
                    <button onClick={markAllRead} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CheckCheck size={13} /> Mark all read
                    </button>
                  )}
                  <button onClick={() => setShowNotifs(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--outline)', display: 'flex' }}>
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div style={{ overflowY: 'auto', flex: 1 }}>
                {notifs.length === 0 ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                    <div style={{ fontSize: 36, marginBottom: 10 }}>🔔</div>
                    <p style={{ fontWeight: 600, color: 'var(--on-surface)', fontSize: 14 }}>All caught up!</p>
                    <p style={{ color: 'var(--on-surface-variant)', fontSize: 12, marginTop: 4 }}>No notifications yet</p>
                  </div>
                ) : (
                  notifs.map(notif => (
                    <a
                      key={notif.id}
                      href={notif.href || '#'}
                      onClick={() => setShowNotifs(false)}
                      style={{
                        display: 'flex', gap: 12, padding: '12px 16px',
                        textDecoration: 'none',
                        backgroundColor: notif.is_read ? 'transparent' : 'var(--primary-light)',
                        borderBottom: '1px solid var(--border)',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--surface-container)' }}
                      onMouseLeave={e => { e.currentTarget.style.backgroundColor = notif.is_read ? 'transparent' : 'var(--primary-light)' }}
                    >
                      <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: (typeColors[notif.type] ?? '#3525cd') + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                        {typeEmojis[notif.type] ?? '🔔'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: notif.is_read ? 500 : 700, color: 'var(--on-surface)', marginBottom: 2 }}>{notif.title}</p>
                        {notif.body && <p style={{ fontSize: 11, color: 'var(--on-surface-variant)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{notif.body}</p>}
                        <p style={{ fontSize: 10, color: 'var(--outline)', marginTop: 3 }}>
                          {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      {!notif.is_read && (
                        <div style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: 'var(--primary)', flexShrink: 0, marginTop: 4 }} />
                      )}
                    </a>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <UserButton />
      </div>
    </header>
  )
}
