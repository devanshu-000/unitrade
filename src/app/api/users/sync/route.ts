import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await currentUser()
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const supabase = getSupabaseAdmin()
    const email = user.emailAddresses[0]?.emailAddress ?? ''
    const fullName = user.fullName ?? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
    const avatarUrl = user.imageUrl ?? ''

    const { data, error } = await supabase
      .from('users')
      .upsert(
        {
          id: userId,
          email,
          full_name: fullName,
          avatar_url: avatarUrl,
        },
        { onConflict: 'id' }
      )
      .select()
      .single()

    if (error) {
      console.error('User sync error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err: any) {
    console.error('User sync API error:', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
