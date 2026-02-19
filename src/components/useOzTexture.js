import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useScroll } from '@react-three/drei'
import * as THREE from 'three'

const SIZE = Math.min(1024, window.innerWidth > 768 ? 1024 : 512)
const C = SIZE / 2
const PI2 = Math.PI * 2

function loadImage(src) {
  const img = new Image()
  img.src = src
  return img
}

export default function useOzTexture() {
  const canvasRef = useRef(null)
  const textureRef = useRef(null)
  const imageRef = useRef(null)
  const wasDrawing = useRef(false)
  const scroll = useScroll()

  if (!canvasRef.current) {
    const c = document.createElement('canvas')
    c.width = SIZE
    c.height = SIZE
    canvasRef.current = c
  }

  if (!textureRef.current) {
    const tex = new THREE.CanvasTexture(canvasRef.current)
    tex.minFilter = THREE.LinearFilter
    tex.magFilter = THREE.LinearFilter
    textureRef.current = tex
  }

  if (!imageRef.current) {
    imageRef.current = loadImage('/images/eden.jpg')
  }

  useFrame(() => {
    const offset = scroll.offset
    const img = imageRef.current

    // Skip all canvas work when image shouldn't be visible
    if (offset < 0.50 || offset >= 0.82 || !img || !img.complete || !img.naturalWidth) {
      if (wasDrawing.current) {
        // Clear once when transitioning out, then stop updating
        const ctx = canvasRef.current.getContext('2d')
        ctx.clearRect(0, 0, SIZE, SIZE)
        textureRef.current.needsUpdate = true
        wasDrawing.current = false
      }
      return
    }

    const ctx = canvasRef.current.getContext('2d')
    ctx.clearRect(0, 0, SIZE, SIZE)

    let alpha = 1.0
    if (offset < 0.56) alpha = smoothstep((offset - 0.50) / 0.06)
    else if (offset > 0.76) alpha = 1.0 - smoothstep((offset - 0.76) / 0.06)

    ctx.save()
    ctx.globalAlpha = alpha
    ctx.beginPath()
    ctx.arc(C, C, C, 0, PI2)
    ctx.clip()

    const iw = img.naturalWidth
    const ih = img.naturalHeight
    const scale = Math.max(SIZE / iw, SIZE / ih)
    const dw = iw * scale
    const dh = ih * scale
    ctx.drawImage(img, (SIZE - dw) / 2, (SIZE - dh) / 2, dw, dh)

    ctx.restore()

    textureRef.current.needsUpdate = true
    wasDrawing.current = true
  })

  return textureRef.current
}

function smoothstep(t) {
  const c = Math.max(0, Math.min(1, t))
  return c * c * (3 - 2 * c)
}
