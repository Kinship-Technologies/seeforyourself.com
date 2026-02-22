const CAL_API_KEY = process.env.CAL_API_KEY
const CAL_BASE = 'https://api.cal.com/v1'
const EVENT_TYPE_ID = 4831534

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const startTime = '2026-02-25T00:00:00.000Z'
    const endTime = '2026-02-28T23:59:59.000Z'
    const slotsUrl = `${CAL_BASE}/slots?apiKey=${CAL_API_KEY}&eventTypeId=${EVENT_TYPE_ID}&startTime=${startTime}&endTime=${endTime}`
    const slotsRes = await fetch(slotsUrl)
    const slotsData = await slotsRes.json()

    return res.status(200).json({
      eventTypeId: EVENT_TYPE_ID,
      slots: slotsData?.slots || {},
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
