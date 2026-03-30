import { Redis } from '@upstash/redis'

let redis
function getRedis() {
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  }
  return redis
}

export default async function handler(req, res) {
  const key = req.query.key
  if (!key) return res.status(400).json({ error: 'key required' })

  try {
    const data = await getRedis().get(key)
    return res.status(200).json({ ok: true, data: data || null })
  } catch (e) {
    console.error('Redis read error:', e)
    return res.status(500).json({ error: 'Database error' })
  }
}
