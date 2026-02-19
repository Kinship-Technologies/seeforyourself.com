import { useRef, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useScroll } from '@react-three/drei'
import * as THREE from 'three'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import useOzTexture from './useOzTexture'

// Configure Draco decoder for compressed GLB
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/')

// Tell drei's useGLTF to use our Draco-enabled loader
useGLTF.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/')

// --------------- Liquid Lens Shader ---------------
const liquidLensVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const liquidLensFragment = /* glsl */ `
uniform sampler2D uTexture;
uniform float uTime;
uniform float uReveal;
uniform float uTilt;
varying vec2 vUv;

void main() {
  vec2 center = vec2(0.5);
  vec2 uv = vUv - center;
  float dist = length(uv);

  if (dist > 0.5) discard;

  // Minimal field curvature
  float r2 = dist * dist;
  float distortion = 1.0 + 0.01 * r2;
  vec2 duv = uv * distortion;

  // Liquid lens breathing
  float breath = 1.0 + 0.003 * sin(uTime * 0.5) + 0.001 * sin(uTime * 1.3);
  duv *= breath;

  // Subtle parallax from tilt
  duv.y -= 0.02 * (1.0 - uTilt);

  duv += center;

  vec3 color = texture2D(uTexture, duv).rgb;

  // Thin glass rim — only the outermost ~3% of radius darkens
  float rimStart = 0.468;
  float rimT = smoothstep(rimStart, 0.5, dist);
  color = mix(color, vec3(0.06), rimT * rimT);

  // Alpha: fully opaque throughout, soft anti-alias at edge
  float alpha = smoothstep(0.5, 0.49, dist);
  alpha *= uReveal;

  gl_FragColor = vec4(color, alpha);
}
`

// --------------- Device Model ---------------
export default function DeviceModel() {
  const groupRef = useRef()
  const { scene } = useGLTF('/models/talis_smooth.glb')
  const scroll = useScroll()

  // Glossy black polycarbonate — black paint interior, polished exterior
  const bodyMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#080808'),
    metalness: 0.02,
    roughness: 0.04,
    clearcoat: 1.0,
    clearcoatRoughness: 0.02,
    reflectivity: 1.0,
    ior: 1.585,
    envMapIntensity: 1.5,
    side: THREE.DoubleSide,
  }), [])

  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
        // Entire device is the same glossy black polycarbonate
        // The glass lens face is handled separately by ScreenFace
        child.material = bodyMaterial
      }
    })
  }, [scene, bodyMaterial])

  useFrame(() => {
    if (!groupRef.current) return
    const offset = scroll.offset

    // Hide model during text frames so they never overlap
    groupRef.current.visible = offset > 0.06 && offset < 0.92

    // Tilt: model starts upright, tilts to show screen (0.45–0.60)
    let targetRotX
    if (offset <= 0.45) {
      targetRotX = Math.PI / 2
    } else if (offset <= 0.60) {
      const t = (offset - 0.45) / 0.15
      const smooth = t * t * (3 - 2 * t)
      targetRotX = THREE.MathUtils.lerp(Math.PI / 2, 0, smooth)
    } else {
      targetRotX = 0
    }

    groupRef.current.rotation.x += (targetRotX - groupRef.current.rotation.x) * 0.08
  })

  return (
    <group ref={groupRef} scale={0.05} rotation={[Math.PI / 2, 0, 0]}>
      <primitive object={scene} />
      <ScreenFace />
    </group>
  )
}

// --------------- Screen Face (liquid lens) ---------------
function ScreenFace() {
  const ozTexture = useOzTexture()
  const scroll = useScroll()
  const meshRef = useRef()

  const shaderMaterial = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      vertexShader: liquidLensVertex,
      fragmentShader: liquidLensFragment,
      uniforms: {
        uTexture: { value: ozTexture },
        uTime: { value: 0 },
        uReveal: { value: 0 },
        uTilt: { value: 0 },
      },
      transparent: true,
      side: THREE.FrontSide,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    })
    mat.toneMapped = false
    return mat
  }, [ozTexture])

  useFrame((state) => {
    shaderMaterial.uniforms.uTime.value = state.clock.elapsedTime

    const offset = scroll.offset

    // Reveal: image appears as screen tilts toward user (0.50–0.62), ramps down 0.86–0.90
    let reveal = offset > 0.50 ? Math.min((offset - 0.50) / 0.12, 1) : 0
    if (offset > 0.86) reveal = Math.max(0, 1 - (offset - 0.86) / 0.04)
    shaderMaterial.uniforms.uReveal.value += (reveal - shaderMaterial.uniforms.uReveal.value) * 0.08

    // Hide the mesh entirely when not revealing to prevent side-view edge artifacts
    if (meshRef.current) {
      meshRef.current.visible = shaderMaterial.uniforms.uReveal.value > 0.01
    }

    // Tilt for image panning (0.45–0.60)
    const tilt = offset > 0.45 ? Math.min((offset - 0.45) / 0.15, 1) : 0
    const smoothTilt = tilt * tilt * (3 - 2 * tilt)
    shaderMaterial.uniforms.uTilt.value += (smoothTilt - shaderMaterial.uniforms.uTilt.value) * 0.06
  })

  return (
    <group>
      <mesh ref={meshRef} position={[0, 0, 6.5]} renderOrder={2} visible={false}>
        <circleGeometry args={[25.5, 128]} />
        <primitive object={shaderMaterial} attach="material" />
      </mesh>
    </group>
  )
}
