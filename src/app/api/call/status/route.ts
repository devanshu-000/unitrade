import { NextRequest, NextResponse } from 'next/server'

// Twilio posts call status updates here (initiated, ringing, in-progress, completed, failed, etc.)
// We just acknowledge — future enhancement: persist call logs to Supabase if needed.

export async function POST(req: NextRequest) {
  // Read status if you want to log it
  // const body = await req.formData()
  // const status = body.get('CallStatus')
  // console.log('Call status:', status)

  return new NextResponse('OK', { status: 200 })
}
