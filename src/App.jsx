import { useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ScrollControls, useScroll, Environment, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'
import DeviceModel from './components/DeviceModel'

function BackgroundController({ bgRef }) {
  const scroll = useScroll()

  useFrame(() => {
    if (!bgRef.current) return
    const offset = scroll.offset
    // Background fades in at 60% — as screen starts tilting toward user
    const opacity = offset > 0.6 ? Math.min((offset - 0.6) / 0.2, 1) : 0
    bgRef.current.style.opacity = opacity
  })

  return null
}

function CameraRig() {
  const scroll = useScroll()
  const { camera } = useThree()

  const keyframes = useMemo(() => ({
    positions: [
      new THREE.Vector3(1, 2.5, 4.5),
      new THREE.Vector3(0, 0.3, 5.5),
      new THREE.Vector3(0, 0.3, 4.5),
    ],
    targets: [
      new THREE.Vector3(0, 0.6, 0),
      new THREE.Vector3(0, 0.3, 0),
      new THREE.Vector3(0, 0, 0),
    ],
  }), [])

  const smoothPos = useRef(new THREE.Vector3(1, 2.5, 4.5))
  const smoothTarget = useRef(new THREE.Vector3(0, 0.6, 0))
  const tempPos = useMemo(() => new THREE.Vector3(), [])
  const tempTarget = useMemo(() => new THREE.Vector3(), [])

  useFrame(() => {
    const offset = scroll.offset

    let segIndex, segT
    if (offset <= 0.5) {
      segIndex = 0
      segT = offset / 0.5
    } else {
      segIndex = 1
      segT = (offset - 0.5) / 0.5
    }

    const t = segT * segT * (3 - 2 * segT)

    tempPos.lerpVectors(keyframes.positions[segIndex], keyframes.positions[segIndex + 1], t)
    tempTarget.lerpVectors(keyframes.targets[segIndex], keyframes.targets[segIndex + 1], t)

    smoothPos.current.lerp(tempPos, 0.08)
    smoothTarget.current.lerp(tempTarget, 0.08)

    camera.position.copy(smoothPos.current)
    camera.lookAt(smoothTarget.current)
  })

  return null
}

export default function App() {
  const bgRef = useRef()

  return (
    <>
      <div
        ref={bgRef}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          opacity: 0,
          pointerEvents: 'none',
        }}
      >
        <img
          src="/images/scene.jpg"
          alt=""
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      </div>

      <Canvas
        camera={{ position: [1, 2.5, 4.5], fov: 45 }}
        gl={{ antialias: true, toneMapping: 3, alpha: true }}
        dpr={[1, 2]}
        style={{ position: 'relative', zIndex: 1 }}
      >
        <ScrollControls pages={3} damping={0.15}>
          <BackgroundController bgRef={bgRef} />
          <CameraRig />
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={0.6} castShadow />
          <directionalLight position={[-5, 5, -5]} intensity={0.2} />
          <DeviceModel />
          <ContactShadows
            position={[0, -1.5, 0]}
            opacity={0.5}
            scale={10}
            blur={2.5}
          />
          <Environment preset="studio" background={false} />
        </ScrollControls>
      </Canvas>
    </>
  )
}
