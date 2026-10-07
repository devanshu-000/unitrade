import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseAdmin()
  const { data: messages, error } = await supabase
    .from('messages')
    .select('id, sender_id, receiver_id, content, created_at, is_read')
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const convMap = new Map()
  for (const msg of messages ?? []) {
    const otherId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id
    if (!convMap.has(otherId)) {
      convMap.set(otherId, {
        other_user_id: otherId,
        last_message: msg.content,
        last_time: msg.created_at,
        unread: !msg.is_read && msg.receiver_id === userId ? 1 : 0,
      })
    } else {
      if (!msg.is_read && msg.receiver_id === userId) convMap.get(otherId).unread++
    }
  }

  const otherIds = Array.from(convMap.keys())
  if (otherIds.length === 0) return NextResponse.json([])

  const { data: users } = await supabase.from('users').select('id, full_name, avatar_url, trust_score').in('id', otherIds)
  const userMap = new Map((users ?? []).map((u: any) => [u.id, u]))

  const conversations = otherIds.map(id => ({
    ...convMap.get(id),
    other_user: userMap.get(id) ?? { id, full_name: 'Unknown', avatar_url: '' },
  })).sort((a, b) => new Date(b.last_time).getTime() - new Date(a.last_time).getTime())

  return NextResponse.json(conversations)
}
