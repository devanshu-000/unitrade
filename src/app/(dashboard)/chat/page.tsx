'use client'

import { Suspense } from 'react'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import { useSearchParams } from 'next/navigation'
import { Send, MessageCircle, Search, ArrowLeft } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { createClient } from '@supabase/supabase-js'


function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

const card = { backgroundColor: 'var(--card)', border: '1px solid var(--border)' }

function Avatar({ user, size = 40 }: { user: any; size?: number }) {
  if (user?.avatar_url) {
    return <img src={user.avatar_url} alt={user.full_name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }} />
  }
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: 'linear-gradient(135deg,#3525cd,#712ae2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: size * 0.35, flexShrink: 0 }}>
      {(user?.full_name ?? 'U')[0].toUpperCase()}
    </div>
  )
}

 function ChatPage() {
  const { user } = useUser()
  const searchParams = useSearchParams()
  const initialUser = searchParams.get('user')

  const [conversations, setConversations] = useState<any[]>([])
  const [activeConv, setActiveConv] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingConvs, setLoadingConvs] = useState(true)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list')
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabaseRef = useRef<any>(null)

  const fetchConversations = useCallback(async () => {
    const res = await fetch('/api/messages/conversations')
    const data = await res.json()
    if (Array.isArray(data)) setConversations(data)
    setLoadingConvs(false)
  }, [])

  const fetchMessages = useCallback(async (otherId: string) => {
    setLoadingMsgs(true)
    const res = await fetch(`/api/messages?other_user_id=${otherId}`)
    const data = await res.json()
    if (Array.isArray(data)) setMessages(data)
    setLoadingMsgs(false)
  }, [])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  useEffect(() => {
    if (initialUser && conversations.length > 0) {
      const conv = conversations.find(c => c.other_user_id === initialUser)
      if (conv) {
        setActiveConv(conv)
        setMobileView('chat')
      } else {
        fetch(`/api/profile?user_id=${initialUser}`)
          .then(r => r.json())
          .then(data => {
            if (data?.user) {
              const newConv = { other_user_id: initialUser, other_user: data.user, last_message: '', unread: 0 }
              setActiveConv(newConv)
              setMobileView('chat')
            }
          }).catch(() => {})
      }
    }
  }, [initialUser, conversations])

  useEffect(() => {
    if (!activeConv) return
    fetchMessages(activeConv.other_user_id)
  }, [activeConv, fetchMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!user?.id || !activeConv) return

    const supabase = getSupabaseClient()
    supabaseRef.current = supabase

    const channel = supabase
      .channel(`messages_${user.id}_${activeConv.other_user_id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${user.id}`,
      }, (payload: any) => {
        const msg = payload.new as any
        if (msg.sender_id === activeConv.other_user_id) {
          setMessages(prev => [...prev, { ...msg, sender: activeConv.other_user }])
          fetchConversations()
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, activeConv, fetchConversations])

  const handleSend = async () => {
    if (!input.trim() || !activeConv || sending) return
    setSending(true)

    const tempMsg = {
      id: 'temp_' + Date.now(),
      sender_id: user?.id,
      receiver_id: activeConv.other_user_id,
      content: input.trim(),
      created_at: new Date().toISOString(),
      sender: { id: user?.id, full_name: user?.fullName, avatar_url: user?.imageUrl },
    }

    setMessages(prev => [...prev, tempMsg])
    setInput('')

    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receiver_id: activeConv.other_user_id, content: tempMsg.content }),
    })

    setSending(false)

    if (res.ok) {
      const saved = await res.json()
      setMessages(prev => prev.map(m => m.id === tempMsg.id ? { ...saved, sender: tempMsg.sender } : m))
      fetchConversations()
    }
  }

  const filteredConvs = conversations.filter(c =>
    c.other_user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const ConversationList = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '20px 20px 12px', borderBottom: '1px solid var(--border)' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800 }}>Messages</h1>
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search conversations..."
        />
      </div>

      <div style={{ flex: 1 }}>
        {filteredConvs.map(conv => {
          const isActive = activeConv?.other_user_id === conv.other_user_id
          return (
            <button
              key={conv.other_user_id}
              onClick={() => { setActiveConv(conv); setMobileView('chat') }}
              style={{ width: '100%', backgroundColor: isActive ? 'var(--primary-light)' : 'transparent' }}
              onMouseEnter={(e: any) => {
                if (!isActive) e.currentTarget.style.backgroundColor = 'var(--surface-container)'
              }}
              onMouseLeave={(e: any) => {
                if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              {conv.other_user?.full_name}
            </button>
          )
        })}
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex' }}>
      <ConversationList />
    </div>
  )
}
export default function ChatPageWrapper() {
  return (
    <Suspense fallback={<div style={{ padding: 20 }}>Loading chat...</div>}>
      <ChatPage />
    </Suspense>
  )
}


