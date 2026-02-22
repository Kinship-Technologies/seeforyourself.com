const CAL_API_KEY = process.env.CAL_API_KEY
const CAL_BASE = 'https://api.cal.com/v1'
const EVENT_TYPE_ID = 4831534

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { start, name, email, notes, guest } = req.body

    if (!start || !name || !email) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const responses = {
      name,
      email,
      notes: notes || '',
    }

    if (guest) {
      responses.guests = [guest]
    }

    const bookingRes = await fetch(`${CAL_BASE}/bookings?apiKey=${CAL_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventTypeId: EVENT_TYPE_ID,
        start,
        responses,
        timeZone: 'America/Los_Angeles',
        language: 'en',
        metadata: {},
      }),
    })

    const bookingData = await bookingRes.json()

    if (!bookingRes.ok) {
      return res.status(bookingRes.status).json({
        error: bookingData?.message || 'Booking failed',
        details: bookingData,
      })
    }

    return res.status(200).json({ success: true, booking: bookingData })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
