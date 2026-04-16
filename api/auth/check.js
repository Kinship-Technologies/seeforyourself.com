import { createHmac } from 'crypto'

const ALLOWED_EMAILS = (process.env.ALLOWED_EMAILS || '').split(',').map(e => e.trim().toLowerCase())
const AUTH_SECRET = process.env.AUTH_SECRET || 'kinship-internal-default-secret'
const MAX_AGE_MS = 30 * 24 * 3600 * 1000

function verify(token) {
  const parts = token.split(':')
  if (parts.length !== 3) return null
  const [b64email, ts, sig] = parts
  const email = Buffer.from(b64email, 'base64').toString()
  const expected = createHmac('sha256', AUTH_SECRET).update(`${email}:${ts}`).digest('hex').slice(0, 32)
  if (sig !== expected) return null
  if (Date.now() - parseInt(ts) > MAX_AGE_MS) return null
  if (!ALLOWED_EMAILS.includes(email)) return null
  return email
}

export default function handler(req, res) {
  const cookies = req.headers.cookie || ''
  const match = cookies.match(/kinship_auth=([^;]+)/)
  if (!match) return res.status(401).json({ error: 'Not authenticated' })

  const email = verify(match[1])
  if (!email) return res.status(401).json({ error: 'Invalid or expired session' })

  return res.status(200).json({ ok: true, email })
}
