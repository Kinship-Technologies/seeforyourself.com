import { useState, useEffect, useCallback, useRef } from 'react'

export default function usePersistedState(key, initialValue) {
  const [value, setValue] = useState(initialValue)
  const [loaded, setLoaded] = useState(false)
  const saveTimer = useRef(null)

  // Load from backend on mount
  useEffect(() => {
    fetch(`/api/data/read?key=${encodeURIComponent(key)}`)
      .then(r => r.json())
      .then(res => {
        if (res.ok && res.data != null) {
          try {
            setValue(typeof res.data === 'string' ? JSON.parse(res.data) : res.data)
          } catch {
            setValue(res.data)
          }
        }
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [key])

  // Debounced save to backend
  const persist = useCallback((newValue) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      fetch('/api/data/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, data: newValue }),
      }).catch(console.error)
    }, 500)
  }, [key])

  const setAndPersist = useCallback((updater) => {
    setValue(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      persist(next)
      return next
    })
  }, [persist])

  return [value, setAndPersist, loaded]
}
