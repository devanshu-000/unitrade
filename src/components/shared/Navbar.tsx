'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { Bell, Plus } from 'lucide-react'
import ThemeToggle from './ThemeToggle'

const navLinks = [
  { href: '/marketplace', label: 'Marketplace' },
  { href: '/borrow', label: 'Borrow' },
  { href: '/gigs', label: 'Gigs' },
]

export default function Navbar() {
  const pathname = usePathname()

  return (
    <nav style={{
      backgroundColor: 'var(--card)',
      borderBottom: '1px solid var(--border)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      boxShadow: 'var(--shadow)',
    }}>
      <div style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '0 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '64px',
      }}>

        {/* Logo */}
        <Link href="/marketplace" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          textDecoration: 'none',
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            backgroundColor: '#6C47FF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 900,
            fontSize: '14px',
          }}>U</div>
          <span style={{
            fontWeight: 700,
            fontSize: '18px',
            color: 'var(--text-1)',
            letterSpacing: '-0.3px',
          }}>UniXchange</span>
        </Link>

        {/* Nav Links */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: 'var(--bg)',
          borderRadius: '12px',
          padding: '4px',
          gap: '4px',
        }}>
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
                textDecoration: 'none',
                transition: 'all 0.2s',
                backgroundColor: pathname === href ? 'var(--card)' : 'transparent',
                color: pathname === href ? 'var(--text-1)' : 'var(--text-2)',
                boxShadow: pathname === href ? 'var(--shadow)' : 'none',
              }}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Right Side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

          {/* Post Button */}
          <Link href="/marketplace/new" style={{ textDecoration: 'none' }}>
            <button style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              backgroundColor: '#6C47FF',
              color: 'white',
              fontSize: '14px',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
            }}>
              <Plus size={16} />
              Post
            </button>
          </Link>

          {/* Trust Score */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '6px 12px',
            borderRadius: '999px',
            backgroundColor: 'var(--primary-light)',
            cursor: 'pointer',
          }}>
            <span style={{
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--primary)',
            }}>★ 50</span>
          </div>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Bell */}
          <button style={{
            position: 'relative',
            padding: '8px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            color: 'var(--text-2)',
          }}>
            <Bell size={18} />
            <span style={{
              position: 'absolute',
              top: '6px',
              right: '6px',
              width: '6px',
              height: '6px',
              backgroundColor: '#ef4444',
              borderRadius: '50%',
            }} />
          </button>

          <UserButton />
        </div>
      </div>
    </nav>
  )
}