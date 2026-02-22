import { useMemo, useRef, useState, useCallback, useEffect, Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ScrollControls, useScroll, Scroll, Environment, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'
import DeviceModel from './components/DeviceModel'

function CameraRig({ variant }) {
  const scroll = useScroll()
  const { camera } = useThree()

  const keyframes = useMemo(() => {
    if (variant === 'demo') {
      // Pull-out happens earlier to leave room for calendar
      return [
        { at: 0.00, pos: [0, 0, 50],      target: [0, 0, 0] },
        { at: 0.06, pos: [0, 0, 50],      target: [0, 0, 0] },
        { at: 0.18, pos: [1, 2.5, 5.5],   target: [0, 0.6, 0] },
        { at: 0.30, pos: [0, 0.3, 5],     target: [0, 0.3, 0] },
        { at: 0.42, pos: [0, 0.3, 4.2],   target: [0, 0, 0] },
        { at: 0.72, pos: [0, 0.3, 4.2],   target: [0, 0, 0] },
        { at: 0.80, pos: [0, 0, 50],      target: [0, 0, 0] },
        { at: 1.00, pos: [0, 0, 50],      target: [0, 0, 0] },
      ]
    }
    return [
      { at: 0.00, pos: [0, 0, 50],      target: [0, 0, 0] },
      { at: 0.08, pos: [0, 0, 50],      target: [0, 0, 0] },
      { at: 0.22, pos: [1, 2.5, 5.5],   target: [0, 0.6, 0] },
      { at: 0.36, pos: [0, 0.3, 5],     target: [0, 0.3, 0] },
      { at: 0.52, pos: [0, 0.3, 4.2],   target: [0, 0, 0] },
      { at: 0.86, pos: [0, 0.3, 4.2],   target: [0, 0, 0] },
      { at: 0.94, pos: [0, 0, 50],      target: [0, 0, 0] },
      { at: 1.00, pos: [0, 0, 50],      target: [0, 0, 0] },
    ]
  }, [variant])

  const smoothPos = useRef(new THREE.Vector3(0, 0, 50))
  const smoothTarget = useRef(new THREE.Vector3(0, 0, 0))
  const tempPos = useMemo(() => new THREE.Vector3(), [])
  const tempTarget = useMemo(() => new THREE.Vector3(), [])

  useFrame(() => {
    const offset = scroll.offset

    let i = 0
    for (let k = 0; k < keyframes.length - 1; k++) {
      if (offset >= keyframes[k].at) i = k
    }
    const a = keyframes[i]
    const b = keyframes[i + 1]

    const range = b.at - a.at
    const segT = range > 0 ? Math.min((offset - a.at) / range, 1) : 0
    const t = segT * segT * (3 - 2 * segT)

    tempPos.set(
      THREE.MathUtils.lerp(a.pos[0], b.pos[0], t),
      THREE.MathUtils.lerp(a.pos[1], b.pos[1], t),
      THREE.MathUtils.lerp(a.pos[2], b.pos[2], t),
    )
    tempTarget.set(
      THREE.MathUtils.lerp(a.target[0], b.target[0], t),
      THREE.MathUtils.lerp(a.target[1], b.target[1], t),
      THREE.MathUtils.lerp(a.target[2], b.target[2], t),
    )

    smoothPos.current.lerp(tempPos, 0.08)
    smoothTarget.current.lerp(tempTarget, 0.08)

    camera.position.copy(smoothPos.current)
    camera.lookAt(smoothTarget.current)
  })

  return null
}

function TextController({ text1Ref, text2Ref, btnRef, calRef, demoBtnRef, variant }) {
  const scroll = useScroll()
  const isDemo = variant === 'demo'
  const demoPhase = useRef('')

  useFrame(() => {
    const offset = scroll.offset

    // Text 1: fades out quickly 0.02–0.07 so model can come in fast
    if (text1Ref.current) {
      const o1 = offset < 0.02 ? 1 : offset < 0.07 ? 1 - (offset - 0.02) / 0.05 : 0
      text1Ref.current.style.opacity = o1
      if (o1 > 0) {
        const p = text1Ref.current.querySelector('p')
        if (p) {
          const rect = text1Ref.current.getBoundingClientRect()
          const shift = (window.innerHeight - p.offsetHeight) / 2 - rect.top
          p.style.transform = `translateY(${shift}px)`
        }
      }
    }

    // Text 2: different timing per variant (demo also fades out before calendar)
    const t2Start = isDemo ? 0.10 : 0.94
    const t2End = isDemo ? 0.20 : 1.00
    const t2OutStart = 0.28
    const t2OutEnd = 0.33
    let o2 = offset < t2Start ? 0 : offset < t2End ? (offset - t2Start) / (t2End - t2Start) : 1
    if (isDemo && offset >= t2OutStart) {
      o2 = offset < t2OutEnd ? 1 - (offset - t2OutStart) / (t2OutEnd - t2OutStart) : 0
    }

    if (text2Ref.current) {
      text2Ref.current.style.opacity = o2
      if (o2 > 0) {
        const p = text2Ref.current.querySelector('p')
        if (p) {
          if (isDemo && offset >= t2OutStart) {
            const fadeProgress = offset < t2OutEnd ? (offset - t2OutStart) / (t2OutEnd - t2OutStart) : 1
            const rect = text2Ref.current.getBoundingClientRect()
            const center = (window.innerHeight - p.offsetHeight) / 2 - rect.top
            p.style.transform = `translateY(${center - fadeProgress * window.innerHeight * 0.15}px)`
          } else {
            const rect = text2Ref.current.getBoundingClientRect()
            const shift = (window.innerHeight - p.offsetHeight) / 2 - rect.top
            p.style.transform = `translateY(${shift}px)`
          }
        }
      }
    }

    // Eden: ? button fades with text2
    if (!isDemo && btnRef.current) {
      btnRef.current.style.opacity = o2
      btnRef.current.style.pointerEvents = o2 > 0.1 ? 'auto' : 'none'
    }

    // Demo: animate bottom ? to center, grow via scale transform
    if (isDemo && demoBtnRef && demoBtnRef.current) {
      const el = demoBtnRef.current
      if (offset < 0.55) {
        el.style.bottom = '4vh'
        el.style.transform = 'translateX(-50%)'
        el.style.opacity = ''
        if (demoPhase.current !== 'pulse') {
          demoPhase.current = 'pulse'
          el.style.animation = 'subtlePulse 2s ease-in-out infinite'
        }
      } else if (offset < 0.72) {
        if (demoPhase.current !== 'transition') {
          demoPhase.current = 'transition'
          el.style.animation = 'none'
        }
        const p = (offset - 0.55) / 0.17
        const t = p * p * (3 - 2 * p)
        el.style.opacity = String(Math.min(0.35 + t * 0.65, 1))
        el.style.bottom = `${4 + t * 54}vh`
        el.style.transform = `translateX(-50%) scale(${1 + t * 0.6})`
      } else {
        if (demoPhase.current !== 'anchored') {
          demoPhase.current = 'anchored'
          el.style.animation = 'none'
        }
        el.style.opacity = '1'
        el.style.bottom = '58vh'
        el.style.transform = 'translateX(-50%) scale(1.6)'
      }
    }

    // Demo: cascade subtext and schedule
    if (isDemo && calRef && calRef.current) {
      const sub1 = calRef.current.querySelector('[data-cal="sub1"]')
      const sub2 = calRef.current.querySelector('[data-cal="sub2"]')
      const sched = calRef.current.querySelector('[data-cal="sched"]')
      if (sub1) {
        const o = offset < 0.74 ? 0 : offset < 0.82 ? (offset - 0.74) / 0.08 : 1
        sub1.style.opacity = o
      }
      if (sub2) {
        const o = offset < 0.82 ? 0 : offset < 0.90 ? (offset - 0.82) / 0.08 : 1
        sub2.style.opacity = o
      }
      if (sched) {
        const o = offset < 0.90 ? 0 : offset < 0.98 ? (offset - 0.90) / 0.08 : 1
        sched.style.opacity = o
        sched.style.pointerEvents = o > 0.5 ? 'auto' : 'none'
      }
    }
  })

  return null
}

const textStyle = {
  fontFamily: "'Times New Roman', Times, serif",
  fontSize: 'clamp(20px, 3.5vw, 54px)',
  fontWeight: 400,
  color: '#111',
  letterSpacing: '-0.02em',
  textAlign: 'center',
  lineHeight: 1.35,
  padding: '0 2rem',
}

function BookingModal({ slot, onClose, onBooked, eventTypeId }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [plusOne, setPlusOne] = useState(false)
  const [guestName, setGuestName] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [status, setStatus] = useState('idle')
  const [errorMsg, setErrorMsg] = useState('')

  if (!slot) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim() || !email.trim()) return
    setStatus('loading')
    setErrorMsg('')
    try {
      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start: slot.slot,
          name: name.trim(),
          email: email.trim(),
          notes: notes.trim(),
          guest: plusOne && guestName.trim() ? guestName.trim() : '',
          guestEmail: plusOne && guestEmail.trim() ? guestEmail.trim() : '',
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setStatus('error')
        setErrorMsg(data.error || 'Booking failed')
        return
      }
      setStatus('success')
      onBooked(slot)
    } catch {
      setStatus('error')
      setErrorMsg('Something went wrong. Please try again.')
    }
  }

  if (status === 'success') {
    return (
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 99999,
          background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <div onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center', padding: '2rem' }}>
          <p style={{ ...textStyle, fontSize: 'clamp(18px, 3vw, 36px)', marginBottom: '1rem' }}>
            See you there.
          </p>
          <p style={{ ...textStyle, fontSize: 'clamp(12px, 1.6vw, 18px)', color: '#666' }}>
            {slot.day} {slot.date} at {slot.label}<br />612 Haight St.
          </p>
        </div>
      </div>
    )
  }

  const inputStyle = {
    fontFamily: "'Times New Roman', Times, serif",
    fontSize: 'clamp(14px, 1.6vw, 18px)',
    color: '#111',
    background: 'none',
    border: 'none',
    borderBottom: '1px solid #999',
    outline: 'none',
    padding: '0.5em 0',
    width: '100%',
    transition: 'border-color 0.2s',
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: '1.5rem', width: '100%', maxWidth: '360px', padding: '2rem',
        }}
      >
        <p style={{ ...textStyle, fontSize: 'clamp(14px, 2vw, 22px)', margin: 0 }}>
          {slot.day} {slot.date} &mdash; {slot.label}
        </p>
        <p style={{ ...textStyle, fontSize: 'clamp(11px, 1.2vw, 14px)', color: '#666', margin: 0 }}>
          15 min &middot; 612 Haight St.
        </p>
        <input
          autoFocus
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          required
          style={inputStyle}
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
          style={inputStyle}
        />
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional)"
          rows={2}
          style={{
            ...inputStyle,
            resize: 'vertical',
            borderBottom: '1px solid #999',
          }}
        />
        <div style={{ width: '100%' }}>
          <button
            type="button"
            onClick={() => setPlusOne(!plusOne)}
            style={{
              fontFamily: "'Times New Roman', Times, serif",
              fontSize: 'clamp(12px, 1.4vw, 16px)',
              color: plusOne ? '#111' : '#999',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              transition: 'color 0.2s',
            }}
          >
            {plusOne ? '− Remove +1' : '+ Bringing a guest?'}
          </button>
          {plusOne && (
            <>
            <input
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Guest name"
              style={{ ...inputStyle, marginTop: '0.75rem' }}
            />
            <input
              type="email"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              placeholder="Guest email"
              style={{ ...inputStyle, marginTop: '0.5rem' }}
            />
            </>
          )}
        </div>
        {errorMsg && (
          <p style={{ ...textStyle, fontSize: 'clamp(11px, 1.2vw, 14px)', color: '#c44', margin: 0 }}>
            {errorMsg}
          </p>
        )}
        <button
          type="submit"
          disabled={status === 'loading'}
          style={{
            fontFamily: "'Times New Roman', Times, serif",
            fontSize: 'clamp(14px, 1.6vw, 18px)',
            fontWeight: 400,
            color: status === 'loading' ? '#999' : '#111',
            background: 'none',
            border: '1px solid #111',
            borderRadius: 0,
            padding: '0.6em 2em',
            cursor: status === 'loading' ? 'default' : 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {status === 'loading' ? 'Booking...' : 'Confirm'}
        </button>
      </form>
    </div>
  )
}

function PasswordGate({ open, onClose }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)

  const handleSubmit = useCallback((e) => {
    e.preventDefault()
    if (value.toLowerCase().trim() === 'forbidden') {
      onClose()
      window.open('/docs/Kinship_Memo.pdf', '_blank')
    } else {
      setError(true)
      setTimeout(() => setError(false), 1200)
    }
  }, [value, onClose])

  if (!open) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.2rem',
        }}
      >
        <input
          autoFocus
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder=""
          style={{
            fontFamily: "'Times New Roman', Times, serif",
            fontSize: 'clamp(22px, 3vw, 42px)',
            textAlign: 'center',
            background: 'none',
            border: 'none',
            borderBottom: error ? '1px solid #c44' : '1px solid #999',
            outline: 'none',
            color: '#111',
            letterSpacing: '0.1em',
            padding: '0.3em 0',
            width: '8em',
            transition: 'border-color 0.3s',
          }}
        />
      </form>
    </div>
  )
}

function SiteGate({ onUnlock }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)

  const handleSubmit = useCallback((e) => {
    e.preventDefault()
    if (value.toLowerCase().trim() === 'forbidden') {
      sessionStorage.setItem('site_unlocked', '1')
      onUnlock()
    } else {
      setError(true)
      setTimeout(() => setError(false), 1200)
    }
  }, [value, onUnlock])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.2rem',
        }}
      >
        <input
          autoFocus
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder=""
          style={{
            fontFamily: "'Times New Roman', Times, serif",
            fontSize: 'clamp(22px, 3vw, 42px)',
            textAlign: 'center',
            background: 'none',
            border: 'none',
            borderBottom: error ? '1px solid #c44' : '1px solid #999',
            outline: 'none',
            color: '#111',
            letterSpacing: '0.1em',
            padding: '0.3em 0',
            width: '8em',
            transition: 'border-color 0.3s',
          }}
        />
      </form>
    </div>
  )
}

export default function App({ variant = 'eden' }) {
  const isDemo = variant === 'demo'

  const [siteUnlocked, setSiteUnlocked] = useState(
    () => isDemo || sessionStorage.getItem('site_unlocked') === '1'
  )
  const text1Ref = useRef()
  const text2Ref = useRef()
  const btnRef = useRef()
  const calRef = useRef()
  const demoBtnRef = useRef()
  const [gateOpen, setGateOpen] = useState(false)
  const [bookedSlots, setBookedSlots] = useState(new Set())
  const [bookingSlot, setBookingSlot] = useState(null)
  const [eventTypeId, setEventTypeId] = useState(null)
  const audioRef = useRef(null)
  const audioStarted = useRef(false)

  const schedule = useMemo(() => [
    { day: 'Wednesday', date: '2/25', iso: '2026-02-25', times: [
      { label: '4:00 PM', hour: '16:00', slot: '2026-02-26T00:00:00.000Z' },
      { label: '6:00 PM', hour: '18:00', slot: '2026-02-26T02:00:00.000Z' },
      { label: '8:00 PM', hour: '20:00', slot: '2026-02-26T04:00:00.000Z' },
    ]},
    { day: 'Thursday', date: '2/26', iso: '2026-02-26', times: [
      { label: '10:00 AM', hour: '10:00', slot: '2026-02-26T18:00:00.000Z' },
      { label: '1:00 PM', hour: '13:00', slot: '2026-02-26T21:00:00.000Z' },
      { label: '6:00 PM', hour: '18:00', slot: '2026-02-27T02:00:00.000Z' },
    ]},
    { day: 'Friday', date: '2/27', iso: '2026-02-27', times: [
      { label: '10:00 AM', hour: '10:00', slot: '2026-02-27T18:00:00.000Z' },
      { label: '1:00 PM', hour: '13:00', slot: '2026-02-27T21:00:00.000Z' },
      { label: '6:00 PM', hour: '18:00', slot: '2026-02-28T02:00:00.000Z' },
    ]},
  ], [])

  useEffect(() => {
    if (!isDemo) return
    fetch('/api/slots')
      .then(r => r.json())
      .then(data => {
        if (data.eventTypeId) setEventTypeId(data.eventTypeId)
      })
      .catch(() => {})
  }, [isDemo])

  useEffect(() => {
    if (!siteUnlocked || isDemo) return
    const tryPlay = () => {
      if (audioStarted.current || !audioRef.current) return
      audioRef.current.play().then(() => { audioStarted.current = true }).catch(() => {})
    }
    const events = ['wheel', 'touchstart', 'pointerdown', 'keydown']
    events.forEach(e => document.addEventListener(e, tryPlay, { once: true, capture: true, passive: true }))
    return () => events.forEach(e => document.removeEventListener(e, tryPlay, { capture: true }))
  }, [siteUnlocked, isDemo])

  if (!siteUnlocked) {
    return <SiteGate onUnlock={() => setSiteUnlocked(true)} />
  }

  return (
    <>
    {!isDemo && (
      <audio
        ref={audioRef}
        src="/audio/windowlicker.mp3"
        loop
        preload="none"
        style={{ display: 'none' }}
      />
    )}
    <style>{`
      @keyframes subtlePulse {
        0%, 100% { opacity: 0.35; }
        50% { opacity: 1; }
      }
    `}</style>
    {!isDemo && (
      <>
      <PasswordGate open={gateOpen} onClose={() => setGateOpen(false)} />
      <button
        ref={btnRef}
        onClick={() => setGateOpen(true)}
        style={{
          position: 'fixed',
          bottom: '4vh',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 100,
          fontFamily: "'Times New Roman', Times, serif",
          fontSize: 'clamp(22px, 2.5vw, 36px)',
          fontWeight: 400,
          color: '#111',
          background: 'none',
          border: '1px solid #111',
          borderRadius: '50%',
          width: '2.4em',
          height: '2.4em',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          animation: 'subtlePulse 2s ease-in-out infinite',
          padding: 0,
          lineHeight: 1,
          opacity: 0,
          pointerEvents: 'none',
        }}
      >
        ?
      </button>
      </>
    )}
    {isDemo && (
      <div
        ref={demoBtnRef}
        style={{
          position: 'fixed',
          bottom: '4vh',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 100,
          fontFamily: "'Times New Roman', Times, serif",
          fontSize: 'clamp(22px, 2.5vw, 36px)',
          fontWeight: 400,
          color: '#111',
          background: 'none',
          border: '1px solid #111',
          borderRadius: '50%',
          width: '2.4em',
          height: '2.4em',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'subtlePulse 2s ease-in-out infinite',
          padding: 0,
          lineHeight: 1,
          pointerEvents: 'none',
        }}
      >
        ?
      </div>
    )}
    <Canvas
      camera={{ position: [0, 0, 50], fov: 45 }}
      gl={{ antialias: true, toneMapping: 3 }}
      dpr={[1, 2]}
      style={{ background: '#ffffff' }}
    >
      <ScrollControls pages={isDemo ? 3 : 5} damping={0.2}>
        {!isDemo && <CameraRig variant={variant} />}
        <TextController
          text1Ref={text1Ref}
          text2Ref={text2Ref}
          btnRef={btnRef}
          calRef={isDemo ? calRef : undefined}
          demoBtnRef={isDemo ? demoBtnRef : undefined}
          variant={variant}
        />

        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={0.6} castShadow />
        <directionalLight position={[-5, 5, -5]} intensity={0.2} />

        {!isDemo && (
          <Suspense fallback={null}>
            <DeviceModel />
          </Suspense>
        )}

        {!isDemo && (
          <ContactShadows
            position={[0, -1.5, 0]}
            opacity={0.4}
            scale={10}
            blur={2.5}
          />
        )}
        <Environment preset="studio" background={false} />

        <Scroll html style={{ width: '100%' }}>
          <div
            ref={text1Ref}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100vh',
              pointerEvents: 'none',
              boxSizing: 'border-box',
            }}
          >
            <p style={isDemo ? { ...textStyle, fontSize: 'clamp(32px, 4.5vw, 62px)' } : textStyle}>
              {isDemo
                ? 'Vision for a New World.'
                : 'The forbidden fruit was never the apple.'}
            </p>
          </div>

          <div
            ref={text2Ref}
            style={{
              position: 'absolute',
              top: isDemo ? '100vh' : '400vh',
              left: 0,
              width: '100%',
              height: '100vh',
              pointerEvents: 'none',
              boxSizing: 'border-box',
              opacity: 0,
            }}
          >
            <p style={isDemo ? { ...textStyle, fontSize: 'clamp(32px, 4.5vw, 62px)' } : textStyle}>
              {isDemo
                ? 'See for Yourself.'
                : <>A camera with no name.<br />For everything you want to remember.</>}
            </p>
          </div>

          {isDemo && (
            <div
              ref={calRef}
              style={{
                position: 'absolute',
                top: '200vh',
                left: 0,
                width: '100%',
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-start',
                paddingTop: 'calc(30vh + 10vw)',
                boxSizing: 'border-box',
              }}
            >
              <p data-cal="sub1" style={{
                ...textStyle,
                fontSize: 'clamp(18px, 3vw, 42px)',
                marginBottom: '0.3rem',
                opacity: 0,
              }}>
                For 3 days on Haight St.
              </p>
              <p data-cal="sub2" style={{
                ...textStyle,
                fontSize: 'clamp(18px, 3vw, 42px)',
                marginBottom: '3rem',
                opacity: 0,
              }}>
                15 minutes of Magic.
              </p>
              <div data-cal="sched" style={{
                width: '100%',
                maxWidth: '680px',
                padding: '0 1.5rem',
                boxSizing: 'border-box',
                display: 'flex',
                gap: 'clamp(1rem, 3vw, 3rem)',
                justifyContent: 'center',
                opacity: 0,
              }}>
                {schedule.map(({ day, date, iso, times }) => (
                  <div key={day} style={{ flex: 1, textAlign: 'center' }}>
                    <p style={{
                      fontFamily: "'Times New Roman', Times, serif",
                      fontSize: 'clamp(12px, 1.6vw, 18px)',
                      fontWeight: 400,
                      color: '#111',
                      marginBottom: '0.75rem',
                    }}>
                      {day} {date}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {times.map(({ label, hour, slot }) => {
                        const isBooked = bookedSlots.has(`${iso}-${hour}`)
                        return (
                          <button
                            key={label}
                            disabled={isBooked}
                            onClick={() => {
                              if (!isBooked) {
                                setBookingSlot({ day, date, iso, label, hour, slot })
                              }
                            }}
                            style={{
                              fontFamily: "'Times New Roman', Times, serif",
                              fontSize: 'clamp(12px, 1.4vw, 18px)',
                              fontWeight: 400,
                              color: isBooked ? '#bbb' : '#333',
                              background: 'none',
                              border: 'none',
                              borderBottom: isBooked ? '1px solid #ddd' : '1px solid #999',
                              borderRadius: 0,
                              padding: '0.5em 0',
                              cursor: isBooked ? 'default' : 'pointer',
                              textAlign: 'center',
                              width: '100%',
                              transition: 'all 0.2s ease',
                              textDecoration: isBooked ? 'line-through' : 'none',
                              position: 'relative',
                            }}
                            onMouseEnter={(e) => {
                              if (!isBooked) {
                                e.currentTarget.style.borderBottomColor = '#111'
                                e.currentTarget.style.color = '#111'
                                e.currentTarget.style.transform = 'scale(1.08)'
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isBooked) {
                                e.currentTarget.style.borderBottomColor = '#999'
                                e.currentTarget.style.color = '#333'
                                e.currentTarget.style.transform = 'scale(1)'
                              }
                            }}
                          >
                            {label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Scroll>
      </ScrollControls>
    </Canvas>
    {isDemo && (
      <BookingModal
        slot={bookingSlot}
        onClose={() => setBookingSlot(null)}
        onBooked={(s) => {
          setBookedSlots(prev => new Set([...prev, `${s.iso}-${s.hour}`]))
          setTimeout(() => setBookingSlot(null), 2500)
        }}
        eventTypeId={eventTypeId}
      />
    )}
    </>
  )
}
