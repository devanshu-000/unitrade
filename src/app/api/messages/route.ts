import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseAdmin()

  // Get all messages involving this user, grouped into conversations
  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      sender:users!messages_sender_id_fkey(id, full_name, avatar_url),
      receiver:users!messages_receiver_id_fkey(id, full_name, avatar_url),
      listing:listings(id, title, images, price)
    `)
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Group into conversations by the other user
  const convMap = new Map<string, any>()
  for (const msg of data ?? []) {
    const otherId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id
    const otherUser = msg.sender_id === userId ? msg.receiver : msg.sender
    if (!convMap.has(otherId)) {
      convMap.set(otherId, {
        other_user: otherUser,
        last_message: msg,
        unread: !msg.read && msg.receiver_id === userId ? 1 : 0,
      })
    } else {
      const conv = convMap.get(otherId)!
      if (!msg.read && msg.receiver_id === userId) conv.unread++
    }
  }

  return NextResponse.json(Array.from(convMap.values()))
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { receiver_id, content, listing_id } = await req.json()
  if (!receiver_id || !content?.trim()) {
    return NextResponse.json({ error: 'receiver_id and content are required' }, { status: 400 })
  }
  if (receiver_id === userId) {
    return NextResponse.json({ error: 'Cannot message yourself' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('messages')
    .insert({
      sender_id: userId,
      receiver_id,
      content: content.trim(),
      listing_id: listing_id ?? null,
    })
    .select(`
      *,
      sender:users!messages_sender_id_fkey(id, full_name, avatar_url),
      receiver:users!messages_receiver_id_fkey(id, full_name, avatar_url)
    `)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
