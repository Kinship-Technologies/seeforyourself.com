export default function handler(req, res) {
  res.setHeader('Set-Cookie', [
    'kinship_auth=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'
  ])
  return res.status(200).json({ ok: true })
}
