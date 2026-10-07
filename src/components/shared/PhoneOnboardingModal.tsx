'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, X } from 'lucide-react'
import { toast } from 'sonner'

interface PhoneOnboardingModalProps {
  isOpen: boolean
  onComplete: (phone: string) => void
}

export default function PhoneOnboardingModal({ isOpen, onComplete }: PhoneOnboardingModalProps) {
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    const trimmed = phone.trim()
    // Basic validation: must be a valid phone with optional + prefix, 7-15 digits
    if (!/^\+?\d{7,15}$/.test(trimmed)) {
      toast.error('Please enter a valid phone number (e.g. +919876543210)')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: trimmed }),
      })

      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? 'Failed to save phone number')
        setSaving(false)
        return
      }

      toast.success('Phone number saved!')
      onComplete(trimmed)
    } catch {
      toast.error('Something went wrong. Please try again.')
    }
    setSaving(false)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0,
              backgroundColor: 'rgba(0,0,0,0.55)',
              zIndex: 500,
              backdropFilter: 'blur(4px)',
            }}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 20 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            style={{
              position: 'fixed',
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 'min(400px, calc(100vw - 32px))',
              backgroundColor: 'var(--card)',
              borderRadius: '24px',
              boxShadow: '0 32px 80px rgba(0,0,0,0.25)',
              zIndex: 501,
              padding: '32px 28px 28px',
              border: '1px solid var(--border)',
            }}
          >
            {/* Icon */}
            <div style={{
              width: '52px', height: '52px', borderRadius: '16px',
              background: 'linear-gradient(135deg,#3525cd,#712ae2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '20px',
            }}>
              <Phone size={24} color="white" />
            </div>

            <h2 style={{
              fontSize: '20px', fontWeight: 800,
              fontFamily: 'var(--font-manrope)',
              color: 'var(--on-surface)',
              marginBottom: '8px',
            }}>
              One last thing!
            </h2>

            <p style={{
              fontSize: '14px',
              color: 'var(--on-surface-variant)',
              lineHeight: 1.6,
              marginBottom: '24px',
            }}>
              Add your mobile number so others can call you securely through UniXchange.
              Your real number stays private — we use masked calling.
            </p>

            <label style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--on-surface-variant)',
              marginBottom: '8px',
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
            }}>
              Mobile Number
            </label>

            <input
              type="tel"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
              autoFocus
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '12px',
                border: '1.5px solid var(--border)',
                backgroundColor: 'var(--surface-container-low)',
                color: 'var(--on-surface)',
                fontSize: '15px',
                outline: 'none',
                fontFamily: 'var(--font-inter)',
                boxSizing: 'border-box',
                marginBottom: '20px',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => (e.target.style.borderColor = '#3525cd')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />

            <button
              onClick={handleSave}
              disabled={saving || !phone.trim()}
              style={{
                width: '100%',
                padding: '13px',
                borderRadius: '12px',
                background: phone.trim() && !saving
                  ? 'linear-gradient(135deg,#3525cd,#712ae2)'
                  : 'var(--surface-container)',
                color: phone.trim() && !saving ? 'white' : 'var(--outline)',
                border: 'none',
                fontSize: '14px',
                fontWeight: 700,
                fontFamily: 'var(--font-manrope)',
                cursor: phone.trim() && !saving ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
              }}
            >
              {saving ? 'Saving...' : 'Save & Continue'}
            </button>

            <p style={{
              textAlign: 'center',
              fontSize: '12px',
              color: 'var(--outline)',
              marginTop: '14px',
            }}>
              🔒 Your number is never shown to other users
            </p>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
