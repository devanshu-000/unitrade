'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { ShoppingCart, Loader2 } from 'lucide-react'

declare global {
  interface Window {
    Razorpay: any
  }
}

interface PayButtonProps {
  type: 'listing' | 'gig'
  itemId: string
  label?: string
  price: number
  sellerName?: string
  style?: React.CSSProperties
  className?: string
  onSuccess?: () => void
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise(resolve => {
    if (window.Razorpay) return resolve(true)
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export default function PayButton({
  type,
  itemId,
  label,
  price,
  sellerName,
  style,
  className,
  onSuccess,
}: PayButtonProps) {
  const [loading, setLoading] = useState(false)

  const handlePay = async () => {
    setLoading(true)

    // Load Razorpay script
    const loaded = await loadRazorpayScript()
    if (!loaded) {
      toast.error('Failed to load payment gateway. Check your connection.')
      setLoading(false)
      return
    }

    // Create order on backend
    const res = await fetch('/api/razorpay/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, id: itemId }),
    })

    const orderData = await res.json()
    if (!res.ok) {
      toast.error(orderData.error ?? 'Failed to create order')
      setLoading(false)
      return
    }

    const {
      razorpay_order_id,
      amount,
      currency,
      key,
      db_order_id,
      title,
    } = orderData

    // Open Razorpay checkout
    const options = {
      key,
      amount,
      currency,
      name: 'UniXchange',
      description: title,
      order_id: razorpay_order_id,
      image: 'https://i.imgur.com/n5tjHFD.png', // optional logo
      prefill: {
        name: '',
        email: '',
        contact: '',
      },
      theme: { color: '#3525cd' },
      config: {
        display: {
          blocks: {
            utib: { name: 'Pay via UPI', instruments: [{ method: 'upi' }] },
            other: { name: 'Other Methods', instruments: [{ method: 'card' }, { method: 'netbanking' }, { method: 'wallet' }] },
          },
          sequence: ['block.utib', 'block.other'],
          preferences: { show_default_blocks: false },
        },
      },
      handler: async (response: any) => {
        // Verify payment
        const verifyRes = await fetch('/api/razorpay/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            db_order_id,
          }),
        })

        const verifyData = await verifyRes.json()
        if (verifyData.success) {
          toast.success('Payment successful! 🎉', {
            description: `₹${(amount / 100).toLocaleString()} paid to ${sellerName ?? 'seller'}.`,
          })
          onSuccess?.()
        } else {
          toast.error('Payment verification failed. Contact support.')
        }
      },
      modal: {
        ondismiss: () => {
          toast.info('Payment cancelled.')
          setLoading(false)
        },
      },
    }

    const rzp = new window.Razorpay(options)
    rzp.on('payment.failed', (response: any) => {
      toast.error(`Payment failed: ${response.error.description}`)
      setLoading(false)
    })
    rzp.open()
    setLoading(false)
  }

  return (
    <button
      onClick={handlePay}
      disabled={loading}
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.75 : 1,
        transition: 'opacity 0.2s',
        ...style,
      }}
    >
      {loading
        ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
        : <ShoppingCart size={16} />
      }
      {loading ? 'Processing...' : (label ?? `Buy Now · ₹${price.toLocaleString()}`)}
    </button>
  )
}
