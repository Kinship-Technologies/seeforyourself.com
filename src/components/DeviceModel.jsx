import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox, Html } from '@react-three/drei'
import DeviceScreen from './DeviceScreen'

/**
 * Placeholder device model.
 * Replace this with your actual GLTF/GLB model using:
 *   import { useGLTF } from '@react-three/drei'
 *   const { nodes, materials } = useGLTF('/models/talis.glb')
 *
 * The key concept: one mesh in your model is the "screen".
 * We swap its material with a dynamic texture rendered via <DeviceScreen />.
 */
export default function DeviceModel() {
  const groupRef = useRef()

  // Gentle idle rotation
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y =
        Math.sin(state.clock.elapsedTime * 0.3) * 0.15
    }
  })

  return (
    <group ref={groupRef}>
      {/* Device body — replace with your GLTF model */}
      <RoundedBox args={[1.8, 3.2, 0.15]} radius={0.1} smoothness={4}>
        <meshPhysicalMaterial
          color="#1a1a1a"
          metalness={0.8}
          roughness={0.2}
          clearcoat={1}
          clearcoatRoughness={0.1}
        />
      </RoundedBox>

      {/* Screen surface — this is where dynamic content renders */}
      <mesh position={[0, 0.1, 0.08]}>
        <planeGeometry args={[1.5, 2.7]} />
        <DeviceScreen />
      </mesh>
    </group>
  )
}
