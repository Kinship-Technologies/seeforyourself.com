import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'

export default function Hotspot({ component, isSelected, onSelect }) {
  const meshRef = useRef()
  const [hovered, setHovered] = useState(false)

  useFrame((state) => {
    if (!meshRef.current) return
    if (isSelected) {
      const s = 1 + 0.15 * Math.sin(state.clock.elapsedTime * 3)
      meshRef.current.scale.setScalar(s)
    } else {
      meshRef.current.scale.setScalar(hovered ? 1.3 : 1)
    }
  })

  const hasItems = component.questions?.length > 0 || component.openItems?.length > 0

  return (
    <group position={component.hotspot}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation()
          onSelect(component.id)
        }}
        onPointerEnter={(e) => {
          e.stopPropagation()
          setHovered(true)
          document.body.style.cursor = 'pointer'
        }}
        onPointerLeave={() => {
          setHovered(false)
          document.body.style.cursor = 'auto'
        }}
      >
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshBasicMaterial
          color={isSelected ? '#c44' : hasItems ? '#666' : '#111'}
          transparent
          opacity={isSelected ? 1 : 0.8}
        />
      </mesh>
      {(hovered || isSelected) && (
        <Html
          position={[0, 0.18, 0]}
          center
          style={{
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            fontFamily: "'Inter', sans-serif",
            fontSize: '10px',
            fontWeight: 500,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: '#111',
            background: '#fff',
            border: '0.5px solid #ddd',
            padding: '3px 8px',
          }}
        >
          {component.name}
        </Html>
      )}
    </group>
  )
}
