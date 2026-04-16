import { Redis } from '@upstash/redis'
import { createHmac } from 'crypto'

const ALLOWED_EMAILS = (process.env.ALLOWED_EMAILS || '').split(',').map(e => e.trim().toLowerCase())
const AUTH_SECRET = process.env.AUTH_SECRET || 'kinship-internal-default-secret'
const MAX_AGE_MS = 30 * 24 * 3600 * 1000

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

function verifyAuth(req) {
  const cookies = req.headers.cookie || ''
  const match = cookies.match(/kinship_auth=([^;]+)/)
  if (!match) return null
  const parts = match[1].split(':')
  if (parts.length !== 3) return null
  const [b64email, ts, sig] = parts
  const email = Buffer.from(b64email, 'base64').toString()
  const expected = createHmac('sha256', AUTH_SECRET).update(`${email}:${ts}`).digest('hex').slice(0, 32)
  if (sig !== expected) return null
  if (Date.now() - parseInt(ts) > MAX_AGE_MS) return null
  if (!ALLOWED_EMAILS.includes(email)) return null
  return email
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const email = verifyAuth(req)
  if (!email) return res.status(401).json({ error: 'Not authenticated' })

  const { key, data } = req.body || {}
  if (!key || data === undefined) return res.status(400).json({ error: 'key and data required' })

  try {
    await getRedis().set(key, JSON.stringify(data))
    return res.status(200).json({ ok: true })
  } catch (e) {
    console.error('Redis write error:', e)
    return res.status(500).json({ error: 'Database error' })
  }
}
