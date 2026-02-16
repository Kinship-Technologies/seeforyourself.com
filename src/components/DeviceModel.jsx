import { useRef, useEffect, useMemo, useContext } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useScroll } from '@react-three/drei'
import * as THREE from 'three'
import useOzTexture from './useOzTexture'
import { VersionContext } from '../App'

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

  // Reduce contrast 20%, brighten 40%
  color = mix(vec3(0.5), color, 0.8);
  color *= 1.4;

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
  const { scene } = useGLTF('/models/talis.glb')
  const scroll = useScroll()
  const version = useContext(VersionContext)

  const bodyMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#080808'),
    metalness: 0.05,
    roughness: 0.15,
    clearcoat: 0.5,
    clearcoatRoughness: 0.1,
    reflectivity: 0.4,
    envMapIntensity: 0.6,
  }), [])

  const lensBarrelMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#080808'),
    metalness: 0.05,
    roughness: 0.08,
    clearcoat: 0.5,
    clearcoatRoughness: 0.06,
    reflectivity: 0.7,
    transmission: 0.35,
    thickness: 2.0,
    ior: 1.58,
    envMapIntensity: 0.8,
    side: THREE.DoubleSide,
  }), [])

  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        child.geometry.computeVertexNormals()
        child.castShadow = true
        child.receiveShadow = true

        if (child.name === 'lens_barrel' || child.name.includes('lens')) {
          child.material = lensBarrelMaterial
          child.renderOrder = 1
        } else {
          child.material = bodyMaterial
        }
      }
    })
  }, [scene, bodyMaterial, lensBarrelMaterial])

  useFrame(() => {
    if (!groupRef.current) return
    const offset = scroll.offset

    if (version === 'V3') {
      // V3: visibility 0.035–0.92
      groupRef.current.visible = offset > 0.035 && offset < 0.92

      // Tilt: model starts upright, tilts face-on (0.26–0.34)
      let targetRotX
      if (offset <= 0.26) {
        targetRotX = Math.PI / 2
      } else if (offset <= 0.34) {
        const t = (offset - 0.26) / 0.08
        const smooth = t * t * (3 - 2 * t)
        targetRotX = THREE.MathUtils.lerp(Math.PI / 2, 0, smooth)
      } else {
        targetRotX = 0
      }
      groupRef.current.rotation.x += (targetRotX - groupRef.current.rotation.x) * 0.08
    } else {
      // V2: original timings
      groupRef.current.visible = offset > 0.06 && offset < 0.92

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
    }
  })

  return (
    <group ref={groupRef} scale={0.05} rotation={[Math.PI / 2, 0, 0]}>
      <primitive object={scene} />
      <ScreenFace />
    </group>
  )
}

// --------------- Screen Face (liquid lens + glass) ---------------
function ScreenFace() {
  const version = useContext(VersionContext)
  const ozTexture = useOzTexture(version)
  const scroll = useScroll()

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
      side: THREE.DoubleSide,
      depthWrite: false,
    })
    mat.toneMapped = false
    return mat
  }, [ozTexture])

  const glassMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#ffffff'),
    metalness: 0,
    roughness: 0.02,
    transmission: 0.99,
    thickness: 0.1,
    ior: 1.45,
    clearcoat: 1.0,
    clearcoatRoughness: 0.03,
    envMapIntensity: 0.3,
    transparent: true,
    side: THREE.FrontSide,
    depthWrite: false,
  }), [])

  useFrame((state) => {
    shaderMaterial.uniforms.uTime.value = state.clock.elapsedTime

    const offset = scroll.offset

    if (version === 'V3') {
      // V3: reveal ramp 0.29–0.33, ramp down 0.86–0.90
      let reveal = offset > 0.29 ? Math.min((offset - 0.29) / 0.04, 1) : 0
      if (offset > 0.86) reveal = Math.max(0, 1 - (offset - 0.86) / 0.04)
      shaderMaterial.uniforms.uReveal.value += (reveal - shaderMaterial.uniforms.uReveal.value) * 0.08

      // Tilt for image panning (0.26–0.34)
      const tilt = offset > 0.26 ? Math.min((offset - 0.26) / 0.08, 1) : 0
      const smoothTilt = tilt * tilt * (3 - 2 * tilt)
      shaderMaterial.uniforms.uTilt.value += (smoothTilt - shaderMaterial.uniforms.uTilt.value) * 0.06
    } else {
      // V2: original timings
      let reveal = offset > 0.50 ? Math.min((offset - 0.50) / 0.12, 1) : 0
      if (offset > 0.86) reveal = Math.max(0, 1 - (offset - 0.86) / 0.04)
      shaderMaterial.uniforms.uReveal.value += (reveal - shaderMaterial.uniforms.uReveal.value) * 0.08

      const tilt = offset > 0.45 ? Math.min((offset - 0.45) / 0.15, 1) : 0
      const smoothTilt = tilt * tilt * (3 - 2 * tilt)
      shaderMaterial.uniforms.uTilt.value += (smoothTilt - shaderMaterial.uniforms.uTilt.value) * 0.06
    }
  })

  return (
    <group>
      <mesh position={[0, 0, 6.5]} renderOrder={2}>
        <circleGeometry args={[25.5, 128]} />
        <primitive object={shaderMaterial} attach="material" />
      </mesh>
    </group>
  )
}

useGLTF.preload('/models/talis.glb')
