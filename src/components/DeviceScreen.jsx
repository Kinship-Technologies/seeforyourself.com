import { useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useFBO } from '@react-three/drei'
import ScreenContent from './ScreenContent'
import { createRoot } from 'react-dom/client'

/**
 * DeviceScreen renders React content to a texture that maps onto
 * the device's screen mesh. Change what's displayed by editing
 * <ScreenContent />.
 *
 * This uses an HTML-to-canvas approach via @react-three/drei's <Html>
 * rendered offscreen, then captured as a texture.
 *
 * For simpler use cases, you can also just use a video texture
 * or a static image texture on the screen mesh.
 */
export default function DeviceScreen() {
  const [videoTexture, setVideoTexture] = useState(null)

  // Simple approach: use a canvas texture we can draw to
  const canvasRef = useRef(document.createElement('canvas'))
  const textureRef = useRef()

  // Initialize canvas
  if (!canvasRef.current._initialized) {
    const canvas = canvasRef.current
    canvas.width = 512
    canvas.height = 910
    canvas._initialized = true

    const ctx = canvas.getContext('2d')

    // Draw a sample screen
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
    gradient.addColorStop(0, '#6366f1')
    gradient.addColorStop(1, '#8b5cf6')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Header
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 36px -apple-system, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Talis', canvas.width / 2, 80)

    // Subheader
    ctx.font = '20px -apple-system, sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.8)'
    ctx.fillText('See for yourself', canvas.width / 2, 120)

    // Placeholder content blocks
    ctx.fillStyle = 'rgba(255,255,255,0.15)'
    ctx.beginPath()
    ctx.roundRect(40, 180, canvas.width - 80, 160, 16)
    ctx.fill()

    ctx.fillStyle = 'rgba(255,255,255,0.15)'
    ctx.beginPath()
    ctx.roundRect(40, 370, canvas.width - 80, 120, 16)
    ctx.fill()

    ctx.fillStyle = 'rgba(255,255,255,0.15)'
    ctx.beginPath()
    ctx.roundRect(40, 520, canvas.width - 80, 120, 16)
    ctx.fill()

    // CTA Button
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.roundRect(80, canvas.height - 120, canvas.width - 160, 56, 28)
    ctx.fill()
    ctx.fillStyle = '#6366f1'
    ctx.font = 'bold 22px -apple-system, sans-serif'
    ctx.fillText('Get Started', canvas.width / 2, canvas.height - 85)
  }

  const texture = new THREE.CanvasTexture(canvasRef.current)
  texture.needsUpdate = true

  return (
    <meshBasicMaterial map={texture} toneMapped={false} />
  )
}
