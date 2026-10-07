import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file selected' }, { status: 400 })
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds 10MB limit' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Preserve extension or fallback
    const originalExt = file.name.split('.').pop()?.toLowerCase() || 'png'
    const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'avif'].includes(originalExt)
      ? originalExt
      : 'png'

    const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${safeExt}`

    const supabase = getSupabaseAdmin()

    // Ensure bucket exists or handle upload directly
    const { data, error } = await supabase.storage
      .from('images')
      .upload(fileName, buffer, {
        contentType: file.type || `image/${safeExt}`,
        upsert: true,
      })

    if (error) {
      console.error('Storage upload error:', error)
      return NextResponse.json({ error: `Upload failed: ${error.message}` }, { status: 500 })
    }

    const { data: urlData } = supabase.storage.from('images').getPublicUrl(data.path)

    return NextResponse.json({ url: urlData.publicUrl })
  } catch (err: any) {
    console.error('Upload API route error:', err)
    return NextResponse.json(
      { error: err.message || 'Server error during upload' },
      { status: 500 }
    )
  }
}
