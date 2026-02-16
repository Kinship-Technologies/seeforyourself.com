import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useScroll } from '@react-three/drei'
import * as THREE from 'three'

const SIZE = 1024

export default function useOzTexture() {
  const canvasRef = useRef(null)
  const textureRef = useRef(null)
  const scroll = useScroll()

  if (!canvasRef.current) {
    const c = document.createElement('canvas')
    c.width = SIZE
    c.height = SIZE
    canvasRef.current = c
  }

  if (!textureRef.current) {
    const tex = new THREE.CanvasTexture(canvasRef.current)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.minFilter = THREE.LinearFilter
    tex.magFilter = THREE.LinearFilter
    textureRef.current = tex
  }

  useFrame(() => {
    const ctx = canvasRef.current.getContext('2d')
    ctx.clearRect(0, 0, SIZE, SIZE)
    textureRef.current.needsUpdate = true
  })

  return textureRef.current
}
