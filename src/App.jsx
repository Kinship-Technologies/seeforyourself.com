import { useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ScrollControls, useScroll, Environment, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'
import DeviceModel from './components/DeviceModel'

function CameraRig() {
  const scroll = useScroll()
  const { camera } = useThree()

  // All anchored to center — opacity handles dissolves
  // 0.0–0.1: "Vision" text, model invisible
  // 0.1–0.2: model fades in at medium distance
  // 0.2–0.35: push in to lens hero
  // 0.35–0.55: side profile
  // 0.55–0.75: screen tilt + reveal
  // 0.75–0.83: hold screen view
  // 0.83–0.93: model fades out, "See for Yourself" fades in
  // 0.93–1.0: text visible
  const keyframes = useMemo(() => [
    { at: 0.00, pos: [0, 0.3, 7],     target: [0, 0.3, 0] },
    { at: 0.15, pos: [0, 0.3, 7],     target: [0, 0.3, 0] },
    { at: 0.30, pos: [1, 2.5, 4.5],   target: [0, 0.6, 0] },
    { at: 0.50, pos: [0, 0.3, 5.5],   target: [0, 0.3, 0] },
    { at: 0.70, pos: [0, 0.3, 4.5],   target: [0, 0, 0] },
    { at: 0.80, pos: [0, 0.3, 4.5],   target: [0, 0, 0] },
    { at: 1.00, pos: [0, 0.3, 4.5],   target: [0, 0, 0] },
  ], [])

  const smoothPos = useRef(new THREE.Vector3(0, 0.3, 7))
  const smoothTarget = useRef(new THREE.Vector3(0, 0, 0))
  const tempPos = useMemo(() => new THREE.Vector3(), [])
  const tempTarget = useMemo(() => new THREE.Vector3(), [])

  useFrame(() => {
    const offset = scroll.offset

    // Find which two keyframes we're between
    let i = 0
    for (let k = 0; k < keyframes.length - 1; k++) {
      if (offset >= keyframes[k].at) i = k
    }
    const a = keyframes[i]
    const b = keyframes[i + 1]

    // Local t within this segment
    const range = b.at - a.at
    const segT = range > 0 ? Math.min((offset - a.at) / range, 1) : 0
    const t = segT * segT * (3 - 2 * segT) // smoothstep

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

    smoothPos.current.lerp(tempPos, 0.18)
    smoothTarget.current.lerp(tempTarget, 0.18)

    camera.position.copy(smoothPos.current)
    camera.lookAt(smoothTarget.current)
  })

  return null
}

// Controls text fade based on scroll position
function TextController({ text1Ref, text2Ref }) {
  const scroll = useScroll()

  useFrame(() => {
    const offset = scroll.offset

    if (text1Ref.current) {
      // "Vision" — visible at start, dissolves out as model appears (0.08–0.16)
      const o1 = offset < 0.08 ? 1 : offset < 0.16 ? 1 - (offset - 0.08) / 0.08 : 0
      text1Ref.current.style.opacity = o1
    }

    if (text2Ref.current) {
      // "See for Yourself" — dissolves in as model pulls away (0.85–0.93)
      const o2 = offset < 0.85 ? 0 : offset < 0.93 ? (offset - 0.85) / 0.08 : 1
      text2Ref.current.style.opacity = o2
    }
  })

  return null
}

const textStyle = {
  fontFamily: "'Times New Roman', Times, serif",
  fontSize: 'clamp(36px, 4.5vw, 64px)',
  fontWeight: 400,
  color: '#111',
  letterSpacing: '0.01em',
  textAlign: 'center',
  padding: '0 2rem',
}

export default function App() {
  const text1Ref = useRef()
  const text2Ref = useRef()

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Text overlays — outside Canvas so fixed positioning works */}
      <div
        ref={text1Ref}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          zIndex: 10,
        }}
      >
        <p style={textStyle}>Vision for a New World.</p>
      </div>

      <div
        ref={text2Ref}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          zIndex: 10,
          opacity: 0,
        }}
      >
        <p style={textStyle}>See for Yourself.</p>
      </div>

      <Canvas
        camera={{ position: [0, 0.3, 7], fov: 45 }}
        gl={{ antialias: true, toneMapping: 3 }}
        dpr={[1, 2]}
        style={{ background: '#ffffff' }}
      >
        <ScrollControls pages={5} damping={0.2}>
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
        </ScrollControls>
      </Canvas>
    </div>
  )
}
