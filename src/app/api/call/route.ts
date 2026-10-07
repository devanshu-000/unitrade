import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import twilio from 'twilio'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { receiver_id } = await req.json()
  if (!receiver_id) {
    return NextResponse.json({ error: 'receiver_id is required' }, { status: 400 })
  }
  if (receiver_id === userId) {
    return NextResponse.json({ error: 'Cannot call yourself' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  // Fetch both users' phone numbers
  const { data: users, error } = await supabase
    .from('users')
    .select('id, full_name, phone_number')
    .in('id', [userId, receiver_id])

  if (error || !users || users.length < 2) {
    return NextResponse.json({ error: 'Could not fetch user data' }, { status: 500 })
  }

  const caller = users.find(u => u.id === userId)
  const receiver = users.find(u => u.id === receiver_id)

  if (!caller?.phone_number) {
    return NextResponse.json(
      { error: 'You need to add your phone number before making calls' },
      { status: 400 }
    )
  }
  if (!receiver?.phone_number) {
    return NextResponse.json(
      { error: `${receiver?.full_name ?? 'This user'} has not added their phone number yet` },
      { status: 400 }
    )
  }

  // Validate env vars
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const twilioPhone = process.env.TWILIO_PHONE_NUMBER
  const appUrl = process.env.NEXT_PUBLIC_APP_URL

  if (!accountSid || !authToken || !twilioPhone || !appUrl) {
    return NextResponse.json({ error: 'Call service not configured' }, { status: 500 })
  }

  const client = twilio(accountSid, authToken)

  try {
    // Twilio masked call:
    // - Caller sees: Twilio proxy number (their real number is never exposed to receiver)
    // - Receiver sees: Twilio proxy number (not the caller's real number)
    // - The call bridges: caller's phone → Twilio → receiver's phone
    //
    // Flow: Twilio calls the CALLER first (from twilioPhone).
    //       When caller picks up, Twilio then dials the RECEIVER.
    //       Neither party sees the other's real number.

    const twimlUrl = `${appUrl}/api/call/twiml?to=${encodeURIComponent(receiver.phone_number)}`

    const call = await client.calls.create({
      from: twilioPhone,
      to: caller.phone_number,
      url: twimlUrl,
      statusCallback: `${appUrl}/api/call/status`,
      statusCallbackMethod: 'POST',
    })

    return NextResponse.json({
      success: true,
      call_sid: call.sid,
      message: `Calling you now… Answer your phone to connect with ${receiver.full_name}`,
    })
  } catch (err: any) {
    console.error('Twilio call error:', err)
    return NextResponse.json(
      { error: err.message ?? 'Failed to initiate call' },
      { status: 500 }
    )
  }
}
