const CAL_API_KEY = process.env.CAL_API_KEY
const CAL_BASE = 'https://api.cal.com/v2'
const HEADERS = {
  'Authorization': `Bearer ${CAL_API_KEY}`,
  'cal-api-version': '2024-08-13',
  'Content-Type': 'application/json',
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get event type ID
    const etRes = await fetch(`${CAL_BASE}/event-types`, { headers: HEADERS })
    const etData = await etRes.json()
    const eventTypes = etData?.data?.eventTypeGroups?.[0]?.eventTypes
      || etData?.data?.eventTypes
      || etData?.data
      || []
    const eventType = Array.isArray(eventTypes)
      ? eventTypes.find(et => et.slug === 'see-for-yourself')
      : null

    if (!eventType) {
      return res.status(404).json({ error: 'Event type not found', debug: etData })
    }

    // Fetch available slots
    const startTime = '2026-02-25T00:00:00.000Z'
    const endTime = '2026-02-28T23:59:59.000Z'
    const slotsUrl = `${CAL_BASE}/slots/available?startTime=${startTime}&endTime=${endTime}&eventTypeId=${eventType.id}&eventTypeSlug=see-for-yourself`
    const slotsRes = await fetch(slotsUrl, { headers: HEADERS })
    const slotsData = await slotsRes.json()

    return res.status(200).json({
      eventTypeId: eventType.id,
      slots: slotsData?.data?.slots || slotsData?.data || {},
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
