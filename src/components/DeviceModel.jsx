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

  // Subtle field curvature
  float r2 = dist * dist;
  float r4 = r2 * r2;
  float distortion = 1.0 + 0.08 * r2 + 0.02 * r4;
  vec2 duv = uv * distortion;

  // Liquid lens breathing
  float breath = 1.0 + 0.006 * sin(uTime * 0.5) + 0.003 * sin(uTime * 1.3);
  duv *= breath;

  // Viewfinder crop — show a section of the full image
  float viewScale = 0.4;
  duv *= viewScale;

  // Aspect ratio correction (1080x1347 portrait)
  duv.x *= 1.247;

  // Pan with tilt — camera scanning the scene
  float panRange = 0.3;
  duv.y -= panRange * (1.0 - uTilt);

  duv += center;

  // Zoom control
  duv = center + (duv - center) / (1.0 + uZoom * 0.3);

  // Chromatic aberration
  float chromaAmount = 0.002 * r2 * 3.0;
  vec2 dir = dist > 0.001 ? normalize(uv) : vec2(0.0);
  float rv = texture2D(uTexture, duv + dir * chromaAmount).r;
  float gv = texture2D(uTexture, duv).g;
  float bv = texture2D(uTexture, duv - dir * chromaAmount * 0.8).b;
  vec3 color = vec3(rv, gv, bv);

  // Analog color
  color = pow(color, vec3(0.97, 1.0, 1.04));
  color.r *= 1.03;
  color.b *= 0.95;

  // Lifted shadows
  color = mix(vec3(0.015, 0.012, 0.02), color, 0.98 + 0.02 * color);

  // Gentle saturation
  float luma = dot(color, vec3(0.299, 0.587, 0.114));
  color = mix(vec3(luma), color, 1.08);

  // Minimal natural vignette
  float vig = 1.0 - 0.08 * r2 * 4.0;
  color *= vig;

  // Clean edge
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
    roughness: 0.08,
    clearcoat: 0.5,
    clearcoatRoughness: 0.06,
    reflectivity: 0.7,
    transmission: 0.35,
    thickness: 2.0,
    ior: 1.58,
    envMapIntensity: 0.8,
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

    // Model fade: dissolve in 0.08–0.18, visible through sequence, dissolve out 0.83–0.93
    let modelOpacity
    if (offset < 0.08) {
      modelOpacity = 0
    } else if (offset < 0.18) {
      modelOpacity = (offset - 0.08) / 0.1
    } else if (offset < 0.83) {
      modelOpacity = 1
    } else if (offset < 0.93) {
      modelOpacity = 1 - (offset - 0.83) / 0.1
    } else {
      modelOpacity = 0
    }

    bodyMaterial.opacity = modelOpacity
    lensBarrelMaterial.opacity = modelOpacity
    groupRef.current.visible = modelOpacity > 0.001

    // Tilt: model starts upright, tilts to show screen (0.55–0.75)
    let targetRotX
    if (offset <= 0.55) {
      targetRotX = Math.PI / 2
    } else if (offset <= 0.75) {
      const t = (offset - 0.55) / 0.2
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

// --------------- Screen Face (liquid lens + glass) ---------------
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

  useFrame((state) => {
    shaderMaterial.uniforms.uTime.value = state.clock.elapsedTime

    const offset = scroll.offset

    // Reveal: image appears as screen tilts toward user (0.6–0.75)
    const reveal = offset > 0.6 ? Math.min((offset - 0.6) / 0.15, 1) : 0
    shaderMaterial.uniforms.uReveal.value += (reveal - shaderMaterial.uniforms.uReveal.value) * 0.08

    // Tilt for image panning (0.55–0.75)
    const tilt = offset > 0.55 ? Math.min((offset - 0.55) / 0.2, 1) : 0
    const smoothTilt = tilt * tilt * (3 - 2 * tilt)
    shaderMaterial.uniforms.uTilt.value += (smoothTilt - shaderMaterial.uniforms.uTilt.value) * 0.06
  })

  return (
    <group>
      <mesh position={[0, 0, 6.5]} renderOrder={2}>
        <circleGeometry args={[25.5, 128]} />
        <primitive ref={shaderRef} object={shaderMaterial} attach="material" />
      </mesh>

      <mesh position={[0, 0, 6.8]} renderOrder={3}>
        <circleGeometry args={[25.5, 128]} />
        <primitive object={glassMaterial} attach="material" />
      </mesh>
    </group>
  )
}

useGLTF.preload('/models/talis.glb')
