import { createHmac } from 'crypto'

const ALLOWED_EMAILS = (process.env.ALLOWED_EMAILS || '').split(',').map(e => e.trim().toLowerCase())
const AUTH_SECRET = process.env.AUTH_SECRET || 'kinship-internal-default-secret'
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || ''
const RESEND_API_KEY = process.env.RESEND_API_KEY || ''

function sign(email, ts) {
  return createHmac('sha256', AUTH_SECRET).update(`${email}:${ts}`).digest('hex').slice(0, 32)
}

async function notifyAccess(userEmail) {
  if (!NOTIFY_EMAIL || !RESEND_API_KEY) return
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Kinship Tracker <onboarding@resend.dev>',
        to: NOTIFY_EMAIL,
        subject: `Tracker access: ${userEmail}`,
        text: `${userEmail} just logged into the Kinship Component Tracker.\n\nTime: ${new Date().toISOString()}`,
      }),
    })
  } catch (e) {
    console.error('Notify email failed:', e)
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { email } = req.body || {}
  if (!email) return res.status(400).json({ error: 'Email required' })

  const normalized = email.trim().toLowerCase()

  if (!ALLOWED_EMAILS.includes(normalized)) {
    return res.status(403).json({ error: 'Not authorized' })
  }

  const ts = Date.now().toString()
  const sig = sign(normalized, ts)
  const token = `${Buffer.from(normalized).toString('base64')}:${ts}:${sig}`

  res.setHeader('Set-Cookie', [
    `kinship_auth=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 3600}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
  ])

  // Fire-and-forget notification
  notifyAccess(normalized)

  return res.status(200).json({ ok: true, email: normalized })
}
