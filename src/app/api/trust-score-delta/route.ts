import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { delta } = await req.json()
  if (typeof delta !== 'number') return NextResponse.json({ error: 'Invalid delta' }, { status: 400 })

  const supabase = getSupabaseAdmin()

  const { data: user, error: fetchError } = await supabase
    .from('users')
    .select('trust_score')
    .eq('id', userId)
    .single()

  if (fetchError || !user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const newScore = Math.max(0, (user.trust_score ?? 0) + delta)

  const { error: updateError } = await supabase
    .from('users')
    .update({ trust_score: newScore })
    .eq('id', userId)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  return NextResponse.json({ trust_score: newScore })
}
