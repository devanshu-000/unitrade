'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { Home, ShoppingBag, HandshakeIcon, Briefcase, History, User, Plus, ChevronLeft, ChevronRight, X, MessageCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSidebar } from '@/context/SidebarContext'

const navItems = [
  { href: '/home',        label: 'Home',        icon: Home },
  { href: '/marketplace', label: 'Marketplace', icon: ShoppingBag },
  { href: '/borrow',      label: 'Borrow',      icon: HandshakeIcon },
  { href: '/gigs',        label: 'Gigs',        icon: Briefcase },
  { href: '/activity',    label: 'Activity',    icon: History },
  { href: '/messages',   label: 'Messages',    icon: MessageCircle },
  { href: '/profile',     label: 'Profile',     icon: User },
]

function NavContent({ isMobile = false }: { isMobile?: boolean }) {
  const pathname = usePathname()
  const { user } = useUser()
  const { isCollapsed, toggleCollapsed, closeDrawer } = useSidebar()
  const [trustScore, setTrustScore] = useState<number | null>(null)

  useEffect(() => {
    if (!user) return
    fetch('/api/profile')
      .then(r => r.json())
      .then(d => { if (d?.user?.trust_score !== undefined) setTrustScore(d.user.trust_score) })
      .catch(() => {})
  }, [user])

  const collapsed = isCollapsed && !isMobile

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', padding: '0 12px', height: '64px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {!collapsed && (
          <span style={{ fontSize: '20px', fontWeight: 800, fontFamily: 'var(--font-manrope)', letterSpacing: '-0.5px' }} className="signature-gradient-text">
            UniXchange
          </span>
        )}
        {isMobile ? (
          <button onClick={closeDrawer} style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--surface-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--on-surface-variant)', marginLeft: collapsed ? '0' : 'auto' }}>
            <X size={15} />
          </button>
        ) : (
          <button onClick={toggleCollapsed} title={collapsed ? 'Expand' : 'Collapse'} style={{ width: '28px', height: '28px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--surface-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--on-surface-variant)', flexShrink: 0, transition: 'background 0.2s' }} onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--primary-light)')} onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--surface-container)')}>
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        )}
      </div>

      {/* User chip */}
      <div style={{ padding: '10px' }}>
        {collapsed ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0' }}>
            {user?.imageUrl
              ? <img src={user.imageUrl} alt="" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
              : <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg,#3525cd,#712ae2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '14px' }}>{user?.firstName?.[0] ?? 'U'}</div>
            }
          </div>
        ) : (
          <div style={{ padding: '10px 12px', borderRadius: '12px', backgroundColor: 'var(--surface-container-low)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {user?.imageUrl
                ? <img src={user.imageUrl} alt="" style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                : <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'linear-gradient(135deg,#3525cd,#712ae2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '13px', flexShrink: 0 }}>{user?.firstName?.[0] ?? 'U'}</div>
              }
              <div style={{ minWidth: 0 }}>
                <p style={{ fontWeight: 700, fontSize: '13px', color: 'var(--on-surface)', fontFamily: 'var(--font-manrope)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.firstName ?? 'Student'}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--primary)' }}>★ {trustScore ?? '—'}</span>
                  <span style={{ fontSize: '10px', color: 'var(--outline)' }}>Trust</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', padding: '4px 8px', overflowY: 'auto' }}>
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href === '/marketplace' && pathname.startsWith('/marketplace'))
          return (
            <Link key={href} href={href} onClick={isMobile ? closeDrawer : undefined} title={collapsed ? label : undefined}
              style={{ display: 'flex', alignItems: 'center', gap: collapsed ? '0' : '12px', padding: collapsed ? '12px' : '11px 12px', justifyContent: collapsed ? 'center' : 'flex-start', borderRadius: '10px', textDecoration: 'none', transition: 'all 0.15s', backgroundColor: active ? 'var(--primary-light)' : 'transparent', color: active ? 'var(--primary)' : 'var(--on-surface-variant)', fontWeight: active ? 700 : 500, fontSize: '13.5px', fontFamily: 'var(--font-manrope)', position: 'relative' }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.backgroundColor = 'var(--surface-container)' }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.backgroundColor = 'transparent' }}>
              {active && <span style={{ position: 'absolute', left: 0, top: '18%', bottom: '18%', width: '3px', borderRadius: '0 3px 3px 0', backgroundColor: 'var(--primary)' }} />}
              <Icon size={17} style={{ flexShrink: 0 }} />
              {!collapsed && <span>{label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Post button */}
      <div style={{ padding: '10px', flexShrink: 0 }}>
        <Link href="/marketplace/new" style={{ textDecoration: 'none' }} onClick={isMobile ? closeDrawer : undefined}>
          <button className="signature-gradient" style={{ width: '100%', padding: collapsed ? '12px' : '12px 16px', borderRadius: '12px', color: 'white', fontWeight: 700, fontSize: '13px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: collapsed ? '0' : '8px', boxShadow: '0 4px 16px rgba(53,37,205,0.28)', fontFamily: 'var(--font-manrope)' }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')} onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
            <Plus size={15} />
            {!collapsed && 'New Listing'}
          </button>
        </Link>
      </div>
    </div>
  )
}

export default function Sidebar() {
  const { isOpen, isCollapsed, closeDrawer } = useSidebar()

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block" style={{ width: isCollapsed ? '72px' : '256px', minHeight: '100vh', backgroundColor: 'var(--surface)', borderRight: '1px solid var(--border)', position: 'sticky', top: 0, flexShrink: 0, transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)', overflow: 'hidden' }}>
        <NavContent />
      </aside>

      {/* Mobile backdrop */}
      {isOpen && (
        <div className="lg:hidden" onClick={closeDrawer} style={{ position: 'fixed', inset: 0, zIndex: 200, backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)' }} />
      )}

      {/* Mobile drawer */}
      <aside className="lg:hidden" style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: '280px', backgroundColor: 'var(--surface)', zIndex: 201, transform: isOpen ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)', boxShadow: isOpen ? '8px 0 48px rgba(0,0,0,0.18)' : 'none', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <NavContent isMobile />
      </aside>
    </>
  )
}
