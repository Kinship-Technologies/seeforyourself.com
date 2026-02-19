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

// Each element gets a different film thickness via uniform
const arFragment = /* glsl */ `
uniform float uTime;
uniform float uFilmThickness;
varying vec2 vUv;

vec3 wavelengthToRGB(float wl) {
  vec3 c = vec3(0.0);
  if (wl >= 380.0 && wl < 440.0) c = vec3(-(wl - 440.0) / 60.0, 0.0, 1.0);
  else if (wl < 490.0) c = vec3(0.0, (wl - 440.0) / 50.0, 1.0);
  else if (wl < 510.0) c = vec3(0.0, 1.0, -(wl - 510.0) / 20.0);
  else if (wl < 580.0) c = vec3((wl - 510.0) / 70.0, 1.0, 0.0);
  else if (wl < 645.0) c = vec3(1.0, -(wl - 645.0) / 65.0, 0.0);
  else if (wl <= 780.0) c = vec3(1.0, 0.0, 0.0);
  float factor = 1.0;
  if (wl < 420.0) factor = 0.3 + 0.7 * (wl - 380.0) / 40.0;
  else if (wl > 700.0) factor = 0.3 + 0.7 * (780.0 - wl) / 80.0;
  return c * factor;
}

vec3 thinFilmColor(float cosAngle, float thickness) {
  float n = 1.45;
  float sinTheta = sqrt(1.0 - cosAngle * cosAngle);
  float cosThetaT = sqrt(1.0 - (sinTheta * sinTheta) / (n * n));
  float opd = 2.0 * n * thickness * cosThetaT;
  vec3 reflected = vec3(0.0);
  for (float wl = 400.0; wl <= 700.0; wl += 10.0) {
    float phase = 6.2832 * opd / wl;
    float R = sin(phase * 0.5);
    reflected += wavelengthToRGB(wl) * R * R;
  }
  return reflected / 31.0;
}

void main() {
  vec2 center = vec2(0.5);
  vec2 uv = vUv - center;
  float dist = length(uv);

  if (dist > 0.5) discard;

  float cosAngle = clamp(1.0 - dist * 1.4, 0.05, 1.0);
  vec3 arCoating = thinFilmColor(cosAngle, uFilmThickness) * 3.5;

  // Dark interior behind the element
  vec3 base = vec3(0.02, 0.025, 0.02);

  // AR coating: Fresnel-weighted (stronger at edges like real lenses)
  float fresnel = pow(1.0 - cosAngle, 1.5);
  vec3 color = base + arCoating * (0.25 + fresnel * 0.75);

  // Subtle green-blue tint
  color += vec3(0.005, 0.02, 0.015);

  float alpha = smoothstep(0.5, 0.48, dist) * 0.85;
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
  { z: -34.0, thickness: 380, radius: 12.5 },  // rear element
  { z: -31.5, thickness: 450, radius: 11.5 },
  { z: -29.0, thickness: 520, radius: 11.0 },
  { z: -26.5, thickness: 580, radius: 10.5 },
  { z: -24.0, thickness: 650, radius: 10.0 },  // front inner element
]

// --------------- Device Model ---------------
export default function DeviceModel() {
  const groupRef = useRef()
  const { scene } = useGLTF('/models/talis_smooth.glb')
  const scroll = useScroll()

  // Interior: polished black paint (rendered on back faces = inside of shell)
  const interiorMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#050505'),
    metalness: 0.02,
    roughness: 0.04,
    clearcoat: 1.0,
    clearcoatRoughness: 0.02,
    reflectivity: 1.0,
    envMapIntensity: 1.2,
    side: THREE.BackSide,
  }), [])

  // Exterior: clear polycarbonate shell (transparent overlay with reflections)
  const shellMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#cccccc'),
    metalness: 0.0,
    roughness: 0.02,
    clearcoat: 1.0,
    clearcoatRoughness: 0.01,
    ior: 1.585,
    envMapIntensity: 2.0,
    reflectivity: 1.0,
    transparent: true,
    opacity: 0.12,
    depthWrite: false,
    side: THREE.FrontSide,
  }), [])

  // Glass cap on lens front — fully transparent
  const glassCap = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#ffffff'),
    metalness: 0,
    roughness: 0.0,
    transmission: 0.98,
    thickness: 0.3,
    ior: 1.52,
    clearcoat: 1.0,
    clearcoatRoughness: 0.005,
    envMapIntensity: 1.5,
    transparent: true,
    side: THREE.FrontSide,
    depthWrite: false,
  }), [])

  useEffect(() => {
    const clones = []
    scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
        // Original mesh: interior black paint (BackSide)
        child.material = interiorMaterial
        child.renderOrder = 0

        // Clone for transparent shell overlay (FrontSide)
        const shell = child.clone()
        shell.material = shellMaterial
        shell.renderOrder = 1
        shell.castShadow = false
        shell.receiveShadow = false
        child.parent.add(shell)
        clones.push(shell)
      }
    })
    return () => {
      clones.forEach(c => c.parent?.remove(c))
    }
  }, [scene, interiorMaterial, shellMaterial])

  useFrame(() => {
    if (!groupRef.current) return
    const offset = scroll.offset

    groupRef.current.visible = offset > 0.06 && offset < 0.92

    let targetRotX
    if (offset <= 0.30) {
      targetRotX = Math.PI * 0.75
    } else if (offset <= 0.50) {
      const t = (offset - 0.30) / 0.20
      const smooth = t * t * (3 - 2 * t)
      targetRotX = THREE.MathUtils.lerp(Math.PI * 0.75, Math.PI / 2, smooth)
    } else if (offset <= 0.65) {
      const t = (offset - 0.50) / 0.15
      const smooth = t * t * (3 - 2 * t)
      targetRotX = THREE.MathUtils.lerp(Math.PI / 2, 0, smooth)
    } else {
      targetRotX = 0
    }

    groupRef.current.rotation.x += (targetRotX - groupRef.current.rotation.x) * 0.08
  })

  return (
    <group ref={groupRef} scale={0.05} rotation={[Math.PI * 0.75, 0, 0]}>
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
          uFilmThickness: { value: el.thickness },
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
      groupRef.current.visible = scroll.offset < 0.55
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

    let reveal = offset > 0.60 ? Math.min((offset - 0.60) / 0.12, 1) : 0
    if (offset > 0.82) reveal = Math.max(0, 1 - (offset - 0.82) / 0.06)
    shaderMaterial.uniforms.uReveal.value += (reveal - shaderMaterial.uniforms.uReveal.value) * 0.08

    if (meshRef.current) {
      meshRef.current.visible = offset > 0.45
    }

    const tilt = offset > 0.50 ? Math.min((offset - 0.50) / 0.15, 1) : 0
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
