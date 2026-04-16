import { useState, useEffect } from 'react'

export default function AuthGate({ children }) {
  const [state, setState] = useState('loading') // loading | login | authed
  const [email, setEmail] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/auth/check')
      .then(r => r.json())
      .then(data => {
        if (data.ok) {
          setUserEmail(data.email)
          setState('authed')
        } else {
          setState('login')
        }
      })
      .catch(() => setState('login'))
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (data.ok) {
        setUserEmail(data.email)
        setState('authed')
      } else {
        setError(data.error || 'Not authorized')
      }
    } catch {
      setError('Connection error')
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout')
    setState('login')
    setUserEmail('')
  }

  if (state === 'loading') {
    return (
      <div className="auth-screen">
        <div className="auth-loading">Loading...</div>
      </div>
    )
  }

  if (state === 'login') {
    return (
      <div className="auth-screen">
        <div className="auth-box">
          <div className="auth-logo">Kinship / Camera</div>
          <h2 className="auth-title">Internal Access</h2>
          <form onSubmit={handleLogin}>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="auth-input"
              autoFocus
              required
            />
            <button type="submit" className="auth-submit">Continue</button>
          </form>
          {error && <div className="auth-error">{error}</div>}
        </div>
      </div>
    )
  }

  return children({ userEmail, onLogout: handleLogout })
}
