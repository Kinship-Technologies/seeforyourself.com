import { useRef, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useScroll, useTexture } from '@react-three/drei'
import * as THREE from 'three'

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
uniform float uZoom;
uniform float uReveal;
uniform float uTilt;
varying vec2 vUv;

void main() {
  vec2 center = vec2(0.5);
  vec2 uv = vUv - center;
  float dist = length(uv);

  if (dist > 0.5) discard;

  // Field curvature — subtle, from Zemax data
  float r2 = dist * dist;
  float r4 = r2 * r2;
  float distortion = 1.0 + 0.08 * r2 + 0.02 * r4;
  vec2 duv = uv * distortion;

  // Liquid lens breathing
  float breath = 1.0 + 0.006 * sin(uTime * 0.5) + 0.003 * sin(uTime * 1.3);
  duv *= breath;

  // Zoom into a SECTION of the image — viewfinder crop
  // Only show ~40% of the full image, centered on the subject
  float viewScale = 0.4;
  duv *= viewScale;

  // Aspect ratio correction (image is 1080x1347, portrait)
  duv.x *= 1.247;

  // Pan with device tilt — camera scanning the scene
  // uTilt 0 = just started turning, 1 = fully facing user
  // Starts at top of image, settles to center
  float panRange = 0.3;
  duv.y -= panRange * (1.0 - uTilt);

  duv += center;

  // Zoom control
  duv = center + (duv - center) / (1.0 + uZoom * 0.3);

  // Lateral chromatic aberration — subtle, grows with field height
  float chromaAmount = 0.002 * r2 * 3.0;
  vec2 dir = dist > 0.001 ? normalize(uv) : vec2(0.0);
  float rv = texture2D(uTexture, duv + dir * chromaAmount).r;
  float gv = texture2D(uTexture, duv).g;
  float bv = texture2D(uTexture, duv - dir * chromaAmount * 0.8).b;
  vec3 color = vec3(rv, gv, bv);

  // Analog color — warm, organic
  color = pow(color, vec3(0.97, 1.0, 1.04));
  color.r *= 1.03;
  color.b *= 0.95;

  // Lifted shadows
  color = mix(vec3(0.015, 0.012, 0.02), color, 0.98 + 0.02 * color);

  // Gentle saturation
  float luma = dot(color, vec3(0.299, 0.587, 0.114));
  color = mix(vec3(luma), color, 1.08);

  // Minimal natural vignette — like real optics, barely perceptible
  float vig = 1.0 - 0.08 * r2 * 4.0;
  color *= vig;

  // Clean edge — thin AA, no gradient. Image fills the glass.
  float alpha = smoothstep(0.5, 0.49, dist);

  // Reveal with scroll
  alpha *= uReveal;

  gl_FragColor = vec4(color, alpha);
}
`

// --------------- Lens Texture (for barrel interior) ---------------
function createLensTexture(size = 1024) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  const cx = size / 2
  const cy = size / 2
  const r = size / 2

  ctx.fillStyle = '#010101'
  ctx.fillRect(0, 0, size, size)

  const outerRing = ctx.createRadialGradient(cx, cy, r * 0.75, cx, cy, r)
  outerRing.addColorStop(0, 'rgba(8, 8, 8, 1)')
  outerRing.addColorStop(0.5, 'rgba(3, 3, 3, 1)')
  outerRing.addColorStop(1, 'rgba(0, 0, 0, 1)')
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fillStyle = outerRing
  ctx.fill()

  for (let i = 0; i < 8; i++) {
    const ringR = r * (0.72 - i * 0.04)
    ctx.beginPath()
    ctx.arc(cx, cy, ringR, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(20, 20, 20, ${0.4 - i * 0.04})`
    ctx.lineWidth = 1.5
    ctx.stroke()
  }

  const lensGrad = ctx.createRadialGradient(cx - r * 0.1, cy - r * 0.1, 0, cx, cy, r * 0.65)
  lensGrad.addColorStop(0, 'rgba(20, 60, 80, 0.6)')
  lensGrad.addColorStop(0.3, 'rgba(15, 50, 70, 0.5)')
  lensGrad.addColorStop(0.6, 'rgba(10, 35, 55, 0.3)')
  lensGrad.addColorStop(0.85, 'rgba(5, 15, 25, 0.15)')
  lensGrad.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.beginPath()
  ctx.arc(cx, cy, r * 0.65, 0, Math.PI * 2)
  ctx.fillStyle = lensGrad
  ctx.fill()

  const purpleGrad = ctx.createRadialGradient(cx + r * 0.08, cy + r * 0.05, 0, cx, cy, r * 0.45)
  purpleGrad.addColorStop(0, 'rgba(40, 15, 50, 0.4)')
  purpleGrad.addColorStop(0.4, 'rgba(30, 10, 40, 0.25)')
  purpleGrad.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.beginPath()
  ctx.arc(cx, cy, r * 0.45, 0, Math.PI * 2)
  ctx.fillStyle = purpleGrad
  ctx.fill()

  const apertureGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.28)
  apertureGrad.addColorStop(0, 'rgba(2, 2, 2, 1)')
  apertureGrad.addColorStop(0.7, 'rgba(3, 3, 3, 0.9)')
  apertureGrad.addColorStop(1, 'rgba(5, 5, 5, 0)')
  ctx.beginPath()
  ctx.arc(cx, cy, r * 0.28, 0, Math.PI * 2)
  ctx.fillStyle = apertureGrad
  ctx.fill()

  const specGrad = ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.25, 0, cx - r * 0.25, cy - r * 0.25, r * 0.35)
  specGrad.addColorStop(0, 'rgba(80, 140, 170, 0.35)')
  specGrad.addColorStop(0.3, 'rgba(50, 100, 130, 0.15)')
  specGrad.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.beginPath()
  ctx.arc(cx, cy, r * 0.65, 0, Math.PI * 2)
  ctx.fillStyle = specGrad
  ctx.fill()

  ctx.beginPath()
  ctx.arc(cx, cy, r * 0.67, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(40, 40, 45, 0.6)'
  ctx.lineWidth = 2.5
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(cx, cy, r * 0.30, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(25, 25, 30, 0.5)'
  ctx.lineWidth = 1.5
  ctx.stroke()

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

// --------------- Device Model ---------------
export default function DeviceModel() {
  const groupRef = useRef()
  const { scene } = useGLTF('/models/talis.glb')
  const scroll = useScroll()

  const bodyMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#050505'),
    metalness: 0.05,
    roughness: 0.12,
    clearcoat: 0.6,
    clearcoatRoughness: 0.08,
    reflectivity: 0.6,
    transmission: 0.05,
    thickness: 3.0,
    ior: 1.58,
    envMapIntensity: 1.0,
    transparent: true,
  }), [])

  const lensBarrelMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#080808'),
    metalness: 0.05,
    roughness: 0.03,
    clearcoat: 1.0,
    clearcoatRoughness: 0.02,
    reflectivity: 0.9,
    transmission: 0.35,
    thickness: 2.0,
    ior: 1.58,
    envMapIntensity: 1.6,
    transparent: true,
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

    // Second half: tilt model so screen faces camera
    let targetRotX
    if (offset <= 0.5) {
      targetRotX = Math.PI / 2
    } else {
      const t = (offset - 0.5) / 0.5
      const smooth = t * t * (3 - 2 * t)
      targetRotX = THREE.MathUtils.lerp(Math.PI / 2, 0, smooth)
    }

    groupRef.current.rotation.x += (targetRotX - groupRef.current.rotation.x) * 0.08
  })

  return (
    <group ref={groupRef} scale={0.05} rotation={[Math.PI / 2, 0, 0]}>
      <primitive object={scene} />
      <CameraLens />
      <ScreenFace />
    </group>
  )
}

// --------------- Camera Lens (barrel interior) ---------------
function CameraLens() {
  const lensTexture = useMemo(() => createLensTexture(1024), [])

  const lensMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    map: lensTexture,
    metalness: 0.3,
    roughness: 0.1,
    envMapIntensity: 1.5,
    side: THREE.DoubleSide,
  }), [lensTexture])

  return (
    <group position={[0, 0, -28]}>
      <mesh position={[0, 0, -1]}>
        <circleGeometry args={[12, 64]} />
        <primitive object={lensMaterial} attach="material" />
      </mesh>
    </group>
  )
}

// --------------- Screen Face (liquid lens view) ---------------
function ScreenFace() {
  const shaderRef = useRef()
  const sceneTexture = useTexture('/images/scene.jpg')
  const scroll = useScroll()

  const shaderMaterial = useMemo(() => {
    sceneTexture.colorSpace = THREE.SRGBColorSpace
    sceneTexture.minFilter = THREE.LinearFilter
    sceneTexture.magFilter = THREE.LinearFilter

    return new THREE.ShaderMaterial({
      vertexShader: liquidLensVertex,
      fragmentShader: liquidLensFragment,
      uniforms: {
        uTexture: { value: sceneTexture },
        uTime: { value: 0 },
        uZoom: { value: 0 },
        uReveal: { value: 0 },
        uTilt: { value: 0 },
      },
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  }, [sceneTexture])

  useFrame((state) => {
    shaderMaterial.uniforms.uTime.value = state.clock.elapsedTime

    const offset = scroll.offset

    // Reveal starts at 50% scroll (when tilt begins), fully visible by 70%
    const reveal = offset > 0.5 ? Math.min((offset - 0.5) / 0.2, 1) : 0
    shaderMaterial.uniforms.uReveal.value += (reveal - shaderMaterial.uniforms.uReveal.value) * 0.08

    // Tilt: 0 = just started turning up, 1 = fully facing user
    // Maps the 0.5–1.0 scroll range to 0–1
    const tilt = offset > 0.5 ? Math.min((offset - 0.5) / 0.5, 1) : 0
    const smoothTilt = tilt * tilt * (3 - 2 * tilt)
    shaderMaterial.uniforms.uTilt.value += (smoothTilt - shaderMaterial.uniforms.uTilt.value) * 0.06
  })

  const glassMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#000000'),
    metalness: 0,
    roughness: 0.02,
    transmission: 0.98,
    thickness: 0.3,
    ior: 1.52,
    clearcoat: 1.0,
    clearcoatRoughness: 0.03,
    envMapIntensity: 0.6,
    transparent: true,
    side: THREE.FrontSide,
    depthWrite: false,
  }), [])

  // Screen disc sits on top face of the device body
  return (
    <group>
      {/* Image layer — sits just above the body surface */}
      <mesh position={[0, 0, 6.5]} renderOrder={2}>
        <circleGeometry args={[25.5, 128]} />
        <primitive ref={shaderRef} object={shaderMaterial} attach="material" />
      </mesh>

      {/* Glass layer — sits on top of image, catches reflections */}
      <mesh position={[0, 0, 6.8]} renderOrder={3}>
        <circleGeometry args={[25.5, 128]} />
        <primitive object={glassMaterial} attach="material" />
      </mesh>
    </group>
  )
}

useGLTF.preload('/models/talis.glb')
