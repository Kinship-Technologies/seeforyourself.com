import { useMemo, useRef, useState, useCallback, createContext, useContext } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ScrollControls, useScroll, Scroll, Environment, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'
import DeviceModel from './components/DeviceModel'

export const VersionContext = createContext('V3')

// V2 camera keyframes (original)
const V2_KEYFRAMES = [
  { at: 0.00, pos: [0, 0, 50],      target: [0, 0, 0] },
  { at: 0.08, pos: [0, 0, 50],      target: [0, 0, 0] },
  { at: 0.22, pos: [1, 2.5, 5.5],   target: [0, 0.6, 0] },
  { at: 0.36, pos: [0, 0.3, 5],     target: [0, 0.3, 0] },
  { at: 0.52, pos: [0, 0.3, 4.2],   target: [0, 0, 0] },
  { at: 0.86, pos: [0, 0.3, 4.2],   target: [0, 0, 0] },
  { at: 0.94, pos: [0, 0, 50],      target: [0, 0, 0] },
  { at: 1.00, pos: [0, 0, 50],      target: [0, 0, 0] },
]

// V3 camera keyframes (9-page timeline)
const V3_KEYFRAMES = [
  { at: 0.00, pos: [0, 0, 50],      target: [0, 0, 0] },        // text1 far
  { at: 0.04, pos: [0, 0, 50],      target: [0, 0, 0] },        // text1 fade done
  { at: 0.045, pos: [0, 0, 50],     target: [0, 0, 0] },        // model appears
  { at: 0.13, pos: [1, 2.5, 5.5],   target: [0, 0.6, 0] },      // zoom in done
  { at: 0.21, pos: [0, 0.3, 5],     target: [0, 0.3, 0] },      // orbit done
  { at: 0.30, pos: [0, 0.3, 4.2],   target: [0, 0, 0] },        // settle: close, face-on
  { at: 0.83, pos: [0, 0.3, 4.2],   target: [0, 0, 0] },        // hold close through phases
  { at: 0.91, pos: [0, 0, 50],      target: [0, 0, 0] },        // zoom out
  { at: 1.00, pos: [0, 0, 50],      target: [0, 0, 0] },        // text2
]

function CameraRig() {
  const scroll = useScroll()
  const { camera } = useThree()
  const version = useContext(VersionContext)

  const smoothPos = useRef(new THREE.Vector3(0, 0, 50))
  const smoothTarget = useRef(new THREE.Vector3(0, 0, 0))
  const tempPos = useMemo(() => new THREE.Vector3(), [])
  const tempTarget = useMemo(() => new THREE.Vector3(), [])

  useFrame(() => {
    const offset = scroll.offset
    const keyframes = version === 'V3' ? V3_KEYFRAMES : V2_KEYFRAMES

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

function TextController({ text1Ref, text2Ref }) {
  const scroll = useScroll()
  const version = useContext(VersionContext)

  useFrame(() => {
    const offset = scroll.offset

    if (version === 'V3') {
      // Text 1: fades out 0.00–0.04
      if (text1Ref.current) {
        const o1 = offset < 0.005 ? 1 : offset < 0.04 ? 1 - (offset - 0.005) / 0.035 : 0
        text1Ref.current.style.opacity = o1
      }
      // Text 2: fades in 0.94–1.00
      if (text2Ref.current) {
        const o2 = offset < 0.94 ? 0 : offset < 1.00 ? (offset - 0.94) / 0.06 : 1
        text2Ref.current.style.opacity = o2
      }
    } else {
      // V2: original timings
      if (text1Ref.current) {
        const o1 = offset < 0.02 ? 1 : offset < 0.07 ? 1 - (offset - 0.02) / 0.05 : 0
        text1Ref.current.style.opacity = o1
      }
      if (text2Ref.current) {
        const o2 = offset < 0.94 ? 0 : offset < 1.00 ? (offset - 0.94) / 0.06 : 1
        text2Ref.current.style.opacity = o2
      }
    }
  })

  return null
}

const textStyle = {
  fontFamily: "'Times New Roman', Times, serif",
  fontSize: 'clamp(28px, 3.5vw, 54px)',
  fontWeight: 400,
  color: '#111',
  letterSpacing: '-0.02em',
  textAlign: 'center',
  lineHeight: 1.35,
  padding: '0 2rem',
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

function VersionToggle({ version, setVersion }) {
  const btnBase = {
    fontFamily: "'Times New Roman', Times, serif",
    fontSize: '14px',
    fontWeight: 400,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px 10px',
    transition: 'opacity 0.3s',
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: '1rem',
        right: '1rem',
        zIndex: 100,
        display: 'flex',
        gap: '2px',
        background: 'rgba(255,255,255,0.6)',
        backdropFilter: 'blur(4px)',
        borderRadius: '4px',
        padding: '2px',
      }}
    >
      <button
        onClick={() => setVersion('V2')}
        style={{
          ...btnBase,
          color: version === 'V2' ? '#111' : '#999',
          borderBottom: version === 'V2' ? '1px solid #111' : '1px solid transparent',
        }}
      >
        V2
      </button>
      <button
        onClick={() => setVersion('V3')}
        style={{
          ...btnBase,
          color: version === 'V3' ? '#111' : '#999',
          borderBottom: version === 'V3' ? '1px solid #111' : '1px solid transparent',
        }}
      >
        V3
      </button>
    </div>
  )
}

export default function App() {
  const text1Ref = useRef()
  const text2Ref = useRef()
  const [gateOpen, setGateOpen] = useState(false)
  const [version, setVersion] = useState('V3')

  return (
    <>
    <style>{`
      @keyframes subtlePulse {
        0%, 100% { opacity: 0.35; }
        50% { opacity: 1; }
      }
    `}</style>
    <PasswordGate open={gateOpen} onClose={() => setGateOpen(false)} />
    <VersionToggle version={version} setVersion={setVersion} />
    <VersionContext.Provider value={version}>
      <Canvas
        camera={{ position: [0, 0, 50], fov: 45 }}
        gl={{ antialias: true, toneMapping: 3 }}
        dpr={[1, 2]}
        style={{ background: '#ffffff' }}
      >
        <ScrollControls pages={9} damping={0.2}>
          <CameraRig />
          <TextController text1Ref={text1Ref} text2Ref={text2Ref} />

          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={0.6} castShadow />
          <directionalLight position={[-5, 5, -5]} intensity={0.2} />

          <DeviceModel />

          <ContactShadows
            position={[0, -1.5, 0]}
            opacity={0.4}
            scale={10}
            blur={2.5}
          />
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
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
              }}
            >
              <p style={textStyle}>The forbidden fruit was never the apple.</p>
            </div>

            <div
              ref={text2Ref}
              style={{
                position: 'absolute',
                top: '800vh',
                left: 0,
                width: '100%',
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
                opacity: 0,
              }}
            >
              <p style={textStyle}>A camera with no name.<br />For everything you want to remember.</p>
              <button
                onClick={() => setGateOpen(true)}
                style={{
                  marginTop: '3rem',
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
                  pointerEvents: 'auto',
                  animation: 'subtlePulse 2s ease-in-out infinite',
                  padding: 0,
                  lineHeight: 1,
                }}
              >
                ?
              </button>
            </div>
          </Scroll>
        </ScrollControls>
      </Canvas>
    </VersionContext.Provider>
    </>
  )
}
