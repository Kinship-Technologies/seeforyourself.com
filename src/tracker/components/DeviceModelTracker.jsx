import { useEffect, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'

const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/')
useGLTF.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/')
useGLTF.preload('/models/talis_smooth.glb')

export default function DeviceModelTracker() {
  const { scene } = useGLTF('/models/talis_smooth.glb')

  const bodyMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#080808'),
    metalness: 0.02,
    roughness: 0.04,
    clearcoat: 1.0,
    clearcoatRoughness: 0.02,
    reflectivity: 0.5,
    ior: 1.585,
    envMapIntensity: 0.7,
    side: THREE.DoubleSide,
  }), [])

  const glassCap = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#ffffff'),
    metalness: 0,
    roughness: 0.0,
    transmission: 0.95,
    thickness: 0.3,
    ior: 1.52,
    clearcoat: 1.0,
    clearcoatRoughness: 0.005,
    envMapIntensity: 0.5,
    transparent: true,
    side: THREE.FrontSide,
    depthWrite: false,
  }), [])

  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
        child.material = bodyMaterial
      }
    })
  }, [scene, bodyMaterial])

  return (
    <group scale={0.05}>
      <primitive object={scene} />
      <mesh position={[0, 0, -35.3]} rotation={[0, Math.PI, 0]} renderOrder={5}>
        <circleGeometry args={[13, 128]} />
        <primitive object={glassCap} attach="material" />
      </mesh>
    </group>
  )
}
