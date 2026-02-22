const CAL_API_KEY = process.env.CAL_API_KEY
const CAL_BASE = 'https://api.cal.com/v2'
const HEADERS = {
  'Authorization': `Bearer ${CAL_API_KEY}`,
  'cal-api-version': '2024-08-13',
  'Content-Type': 'application/json',
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { eventTypeId, start, name, email, notes } = req.body

    if (!eventTypeId || !start || !name || !email) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const bookingRes = await fetch(`${CAL_BASE}/bookings`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({
        eventTypeId,
        start,
        attendee: {
          name,
          email,
          timeZone: 'America/Los_Angeles',
        },
        metadata: {
          notes: notes || '',
        },
      }),
    })

    const bookingData = await bookingRes.json()

    if (!bookingRes.ok) {
      return res.status(bookingRes.status).json({
        error: bookingData?.error?.message || bookingData?.message || 'Booking failed',
        details: bookingData,
      })
    }

    return res.status(200).json({ success: true, booking: bookingData?.data })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
