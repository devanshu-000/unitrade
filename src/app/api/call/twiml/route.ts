import { NextRequest, NextResponse } from 'next/server'

// Twilio fetches this URL once the CALLER picks up.
// We respond with TwiML instructing Twilio to dial the receiver.
// This is what creates the masked bridge: caller ↔ Twilio ↔ receiver.

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const to = searchParams.get('to')

  if (!to) {
    return new NextResponse('<Response><Say>Configuration error.</Say></Response>', {
      headers: { 'Content-Type': 'text/xml' },
    })
  }

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Connecting your call. Please hold.</Say>
  <Dial callerId="${process.env.TWILIO_PHONE_NUMBER}" timeout="30">
    <Number>${to}</Number>
  </Dial>
  <Say voice="alice">The call has ended. Goodbye.</Say>
</Response>`

  return new NextResponse(twiml, {
    headers: { 'Content-Type': 'text/xml' },
  })
}

export async function POST(req: NextRequest) {
  // Twilio may POST to this URL too depending on config
  return GET(req)
}
