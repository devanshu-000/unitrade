import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 })
    }

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || process.env.CLOUDINARY_UPLOAD_PRESET || 'ml_default'

    if (!cloudName) {
      return NextResponse.json({ error: 'Cloudinary cloud name is not configured.' }, { status: 500 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file selected.' }, { status: 400 })
    }

    // Pass file directly to Cloudinary upload API
    const cloudinaryFormData = new FormData()
    cloudinaryFormData.append('file', file)
    cloudinaryFormData.append('upload_preset', uploadPreset)

    const cloudinaryRes = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: 'POST',
        body: cloudinaryFormData,
      }
    )

    const text = await cloudinaryRes.text()
    let data: any = {}
    try {
      data = JSON.parse(text)
    } catch {
      console.error('Cloudinary returned non-JSON:', text)
      return NextResponse.json(
        { error: 'Cloudinary returned invalid response. Ensure upload preset is whitelisted for unsigned uploads.' },
        { status: 500 }
      )
    }

    if (!cloudinaryRes.ok || !data.secure_url) {
      const errMsg = data.error?.message || 'Upload to Cloudinary failed.'
      return NextResponse.json({ error: errMsg }, { status: cloudinaryRes.status })
    }

    return NextResponse.json({ url: data.secure_url })
  } catch (err: any) {
    console.error('Cloudinary upload API route error:', err)
    return NextResponse.json(
      { error: err.message || 'Server error during Cloudinary upload.' },
      { status: 500 }
    )
  }
}
