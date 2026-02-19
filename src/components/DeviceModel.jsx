import { useRef, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useScroll } from '@react-three/drei'
import * as THREE from 'three'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import useOzTexture from './useOzTexture'

// Configure Draco decoder for compressed GLB
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/')
useGLTF.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/')

// --------------- AR Coating Shader (thin-film on internal lens elements) ---------------
const arVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

// Blue-green AR coating — direct color approach matching camera lens reference
const arFragment = /* glsl */ `
uniform float uTime;
uniform float uColorShift;
varying vec2 vUv;

void main() {
  vec2 center = vec2(0.5);
  vec2 uv = vUv - center;
  float dist = length(uv);

  if (dist > 0.5) discard;

  // Viewing angle proxy (center = head-on, edge = oblique)
  float angle = dist * 2.0;

  // Blue-green AR coating that shifts to purple at edges
  // Matches KeyShot thin-film: blue-green center, purple-magenta at oblique
  vec3 coatingCenter = vec3(0.05, 0.18, 0.22);  // teal/blue-green
  vec3 coatingEdge = vec3(0.12, 0.06, 0.15);     // purple/magenta
  vec3 coating = mix(coatingCenter, coatingEdge, smoothstep(0.2, 0.8, angle));

  // Shift each element slightly for depth variety
  coating = mix(coating, coating.gbr, uColorShift * 0.3);

  // Fresnel: coating is brighter at edges
  float fresnel = pow(angle, 2.0);
  coating *= (0.6 + fresnel * 1.5);

  // Dark interior behind element
  vec3 base = vec3(0.015, 0.02, 0.02);
  vec3 color = base + coating;

  // Subtle specular highlight
  float highlight = exp(-pow(dist - 0.15, 2.0) * 80.0) * 0.06;
  color += vec3(highlight);

  float alpha = smoothstep(0.5, 0.48, dist) * 0.8;
  gl_FragColor = vec4(color, alpha);
}
`

// --------------- Screen Shader (eden painting) ---------------
const screenVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const screenFragment = /* glsl */ `
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

  float r2 = dist * dist;
  float distortion = 1.0 + 0.01 * r2;
  vec2 duv = uv * distortion;
  float breath = 1.0 + 0.003 * sin(uTime * 0.5) + 0.001 * sin(uTime * 1.3);
  duv *= breath;
  duv.y -= 0.02 * (1.0 - uTilt);
  duv += center;

  vec3 color = texture2D(uTexture, duv).rgb;

  float rimT = smoothstep(0.468, 0.5, dist);
  color = mix(color, vec3(0.06), rimT * rimT);

  float alpha = smoothstep(0.5, 0.49, dist);
  alpha *= uReveal;

  gl_FragColor = vec4(color, alpha);
}
`

// --------------- Lens element Z positions & film thicknesses ---------------
// Barrel spans Z = -35.4 to -20.0 in model space
// 5 coated elements inside, front cap is clear glass
const LENS_ELEMENTS = [
  { z: -34.0, shift: 0.0, radius: 12.5 },   // rear element
  { z: -31.5, shift: 0.2, radius: 11.8 },
  { z: -29.0, shift: 0.4, radius: 11.2 },
  { z: -26.5, shift: 0.6, radius: 10.6 },
  { z: -24.0, shift: 0.8, radius: 10.0 },   // front inner element
]

// --------------- Device Model ---------------
export default function DeviceModel() {
  const groupRef = useRef()
  const { scene } = useGLTF('/models/talis_smooth.glb')
  const scroll = useScroll()

  // Glossy black polycarbonate — polished, subtle reflections
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

  // Glass cap on lens front
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

  useFrame(() => {
    if (!groupRef.current) return
    const offset = scroll.offset

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
      <LensStack />
      {/* Transparent glass cap at front of barrel */}
      <mesh position={[0, 0, -35.3]} rotation={[0, Math.PI, 0]} renderOrder={5}>
        <circleGeometry args={[13, 128]} />
        <primitive object={glassCap} attach="material" />
      </mesh>
      <ScreenFace />
    </group>
  )
}

// --------------- Stacked Lens Elements (5 coated discs inside barrel) ---------------
function LensStack() {
  const scroll = useScroll()
  const groupRef = useRef()

  const materials = useMemo(() =>
    LENS_ELEMENTS.map(el => {
      const mat = new THREE.ShaderMaterial({
        vertexShader: arVertex,
        fragmentShader: arFragment,
        uniforms: {
          uTime: { value: 0 },
          uColorShift: { value: el.shift },
        },
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
      mat.toneMapped = false
      return mat
    }),
  [])

  useFrame((state) => {
    materials.forEach(mat => {
      mat.uniforms.uTime.value = state.clock.elapsedTime
    })
    if (groupRef.current) {
      groupRef.current.visible = scroll.offset < 0.50
    }
  })

  return (
    <group ref={groupRef}>
      {LENS_ELEMENTS.map((el, i) => (
        <mesh
          key={i}
          position={[0, 0, el.z]}
          rotation={[0, Math.PI, 0]}
          renderOrder={4}
        >
          <circleGeometry args={[el.radius, 128]} />
          <primitive object={materials[i]} attach="material" />
        </mesh>
      ))}
    </group>
  )
}

// --------------- Screen Face (eden painting on back of device) ---------------
function ScreenFace() {
  const ozTexture = useOzTexture()
  const scroll = useScroll()
  const meshRef = useRef()

  const shaderMaterial = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      vertexShader: screenVertex,
      fragmentShader: screenFragment,
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

    let reveal = offset > 0.50 ? Math.min((offset - 0.50) / 0.12, 1) : 0
    if (offset > 0.86) reveal = Math.max(0, 1 - (offset - 0.86) / 0.04)
    shaderMaterial.uniforms.uReveal.value += (reveal - shaderMaterial.uniforms.uReveal.value) * 0.08

    if (meshRef.current) {
      meshRef.current.visible = shaderMaterial.uniforms.uReveal.value > 0.01
    }

    const tilt = offset > 0.45 ? Math.min((offset - 0.45) / 0.15, 1) : 0
    const smoothTilt = tilt * tilt * (3 - 2 * tilt)
    shaderMaterial.uniforms.uTilt.value += (smoothTilt - shaderMaterial.uniforms.uTilt.value) * 0.06
  })

  return (
    <mesh ref={meshRef} position={[0, 0, 6.5]} renderOrder={2} visible={false}>
      <circleGeometry args={[25.5, 256]} />
      <primitive object={shaderMaterial} attach="material" />
    </mesh>
  )
}
