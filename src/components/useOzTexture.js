import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useScroll } from '@react-three/drei'
import * as THREE from 'three'
import memories from './memoryData'

const SIZE = 2048
const C = SIZE / 2
const PI2 = Math.PI * 2

function loadImage(src) {
  const img = new Image()
  img.src = src
  return img
}

function smoothstep(t) {
  const c = Math.max(0, Math.min(1, t))
  return c * c * (3 - 2 * c)
}

// Clock geometry constants
const TICK_COUNT = 12
const TICK_ANGLE = PI2 / TICK_COUNT  // 30°
// Memory positions: indices 0,1,2,3,4,5 → hours 12,2,4,6,8,10 → tick indices 0,2,4,6,8,10
const MEMORY_TICK_INDICES = [0, 2, 4, 6, 8, 10]
const OUTER_R = C * 0.92
const INNER_MAJOR = C * 0.76
const INNER_MINOR = C * 0.82
const TICK_W_MAJOR = 6
const TICK_W_MINOR = 3
const RING_R = C * 0.95

// Cover-fit helper: draws image filling the circle
function drawCoverFit(ctx, img, x, y, w, h) {
  const iw = img.naturalWidth
  const ih = img.naturalHeight
  const scale = Math.max(w / iw, h / ih)
  const dw = iw * scale
  const dh = ih * scale
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
}

// ========== V2 draw (original eden-only) ==========
function drawV2(ctx, offset, edenImg) {
  ctx.clearRect(0, 0, SIZE, SIZE)

  if (offset < 0.50 || offset >= 0.82 || !edenImg || !edenImg.complete || !edenImg.naturalWidth) {
    return
  }

  let alpha = 1.0
  if (offset < 0.56) alpha = smoothstep((offset - 0.50) / 0.06)
  else if (offset > 0.76) alpha = 1.0 - smoothstep((offset - 0.76) / 0.06)

  ctx.save()
  ctx.globalAlpha = alpha
  ctx.beginPath()
  ctx.arc(C, C, C, 0, PI2)
  ctx.clip()
  drawCoverFit(ctx, edenImg, 0, 0, SIZE, SIZE)
  ctx.restore()
}

// ========== V3 draw (4-phase engine) ==========

// Glass-embossed tick: dark shadow underneath, bright highlight on top edge, translucent body
function drawGlassTick(ctx, x1, y1, x2, y2, w, alpha) {
  ctx.globalAlpha = alpha
  ctx.lineCap = 'round'

  // Perpendicular offset for highlight/shadow (light from top-left)
  const dx = x2 - x1, dy = y2 - y1
  const len = Math.sqrt(dx * dx + dy * dy)
  const nx = -dy / len, ny = dx / len
  const off = w * 0.4

  // Layer 1: dark shadow (offset down-right)
  ctx.beginPath()
  ctx.moveTo(x1 + off * 0.7, y1 + off * 0.7)
  ctx.lineTo(x2 + off * 0.7, y2 + off * 0.7)
  ctx.strokeStyle = 'rgba(0,0,0,0.5)'
  ctx.lineWidth = w + 1
  ctx.stroke()

  // Layer 2: translucent glass body
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'
  ctx.lineWidth = w
  ctx.stroke()

  // Layer 3: bright highlight edge (offset toward light, top-left)
  ctx.beginPath()
  ctx.moveTo(x1 - off * 0.5, y1 - off * 0.5)
  ctx.lineTo(x2 - off * 0.5, y2 - off * 0.5)
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'
  ctx.lineWidth = Math.max(1, w * 0.4)
  ctx.stroke()
}

function drawClockFace(ctx, tickRevealProgress) {
  // Black background circle
  ctx.save()
  ctx.beginPath()
  ctx.arc(C, C, C, 0, PI2)
  ctx.clip()
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, SIZE, SIZE)

  // Outer ring — glass style
  ctx.globalAlpha = 1
  // Shadow ring
  ctx.beginPath()
  ctx.arc(C + 1, C + 1, RING_R, 0, PI2)
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'
  ctx.lineWidth = 2
  ctx.stroke()
  // Highlight ring
  ctx.beginPath()
  ctx.arc(C, C, RING_R, 0, PI2)
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'
  ctx.lineWidth = 1.5
  ctx.stroke()

  // 12 ticks with glass embossing
  for (let i = 0; i < TICK_COUNT; i++) {
    const tickT = Math.max(0, Math.min(1, tickRevealProgress * TICK_COUNT - i))
    if (tickT <= 0) continue

    const angle = -Math.PI / 2 + i * TICK_ANGLE
    const isMajor = MEMORY_TICK_INDICES.includes(i)
    const innerR = isMajor ? INNER_MAJOR : INNER_MINOR
    const w = isMajor ? TICK_W_MAJOR : TICK_W_MINOR

    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    const x1 = C + innerR * cos
    const y1 = C + innerR * sin
    const x2 = C + OUTER_R * cos
    const y2 = C + OUTER_R * sin

    drawGlassTick(ctx, x1, y1, x2, y2, w, tickT)
  }

  ctx.restore()
}

function drawCrosshair(ctx, alpha) {
  ctx.save()
  ctx.globalAlpha = alpha

  const r = C * 0.78

  // Circle
  ctx.beginPath()
  ctx.arc(C, C, r, 0, PI2)
  ctx.strokeStyle = 'rgba(255,255,255,0.9)'
  ctx.lineWidth = 1.5
  ctx.stroke()

  // 4 cardinal ticks
  const tickLen = C * 0.08
  const dirs = [
    [0, -1], [0, 1], [-1, 0], [1, 0]
  ]
  for (const [dx, dy] of dirs) {
    ctx.beginPath()
    ctx.moveTo(C + dx * (r - tickLen), C + dy * (r - tickLen))
    ctx.lineTo(C + dx * (r + tickLen), C + dy * (r + tickLen))
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'
    ctx.lineWidth = 1.5
    ctx.stroke()
  }

  // Center dot
  ctx.beginPath()
  ctx.arc(C, C, 3, 0, PI2)
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  ctx.fill()

  ctx.restore()
}

function drawV3(ctx, offset, images) {
  ctx.clearRect(0, 0, SIZE, SIZE)

  const edenImg = images[0]
  const edenReady = edenImg && edenImg.complete && edenImg.naturalWidth

  // Phase A: Eden reveal (0.30–0.36)
  if (offset >= 0.30 && offset < 0.42) {
    if (!edenReady) return

    const fadeIn = smoothstep((offset - 0.30) / 0.06)

    ctx.save()
    ctx.globalAlpha = fadeIn
    ctx.beginPath()
    ctx.arc(C, C, C, 0, PI2)
    ctx.clip()
    drawCoverFit(ctx, edenImg, 0, 0, SIZE, SIZE)
    ctx.restore()

    // Phase B: Crosshair overlay (0.36–0.42)
    if (offset >= 0.36) {
      const crossAlpha = smoothstep((offset - 0.36) / 0.04)
      drawCrosshair(ctx, crossAlpha)
    }
    return
  }

  // Phase C: Clock transition (0.42–0.50)
  if (offset >= 0.42 && offset < 0.50) {
    // Eden shrinks to 12 o'clock thumbnail (0.42–0.46)
    const shrinkT = smoothstep((offset - 0.42) / 0.04)
    // Crosshair fades out
    const crossFade = 1.0 - smoothstep((offset - 0.42) / 0.03)

    // Black bg fills in
    ctx.save()
    ctx.beginPath()
    ctx.arc(C, C, C, 0, PI2)
    ctx.clip()
    ctx.fillStyle = '#000'
    ctx.globalAlpha = shrinkT
    ctx.fillRect(0, 0, SIZE, SIZE)
    ctx.restore()

    if (edenReady) {
      // Eden shrinks from full to thumbnail at 12 o'clock
      const thumbSize = C * 0.28
      const angle12 = -Math.PI / 2
      const thumbCX = C + (OUTER_R - thumbSize * 0.7) * Math.cos(angle12)
      const thumbCY = C + (OUTER_R - thumbSize * 0.7) * Math.sin(angle12)

      const fullSize = SIZE
      const currentSize = fullSize + (thumbSize - fullSize) * shrinkT
      const currentX = 0 + (thumbCX - thumbSize / 2 - 0) * shrinkT
      const currentY = 0 + (thumbCY - thumbSize / 2 - 0) * shrinkT

      ctx.save()
      ctx.beginPath()
      ctx.arc(C, C, C, 0, PI2)
      ctx.clip()
      ctx.globalAlpha = 1
      ctx.beginPath()
      ctx.arc(
        currentX + currentSize / 2,
        currentY + currentSize / 2,
        currentSize / 2,
        0, PI2
      )
      ctx.clip()
      drawCoverFit(ctx, edenImg, currentX, currentY, currentSize, currentSize)
      ctx.restore()
    }

    // Crosshair fading
    if (crossFade > 0.01) {
      drawCrosshair(ctx, crossFade)
    }

    // Remaining ticks reveal clockwise (0.46–0.50)
    if (offset >= 0.46) {
      const tickProgress = smoothstep((offset - 0.46) / 0.04)
      // Draw 12 o'clock tick always, then others progressively
      // tick index 0 is at 12 o'clock, already shown with eden
      // Reveal ticks 1-11 progressively
      ctx.save()
      ctx.beginPath()
      ctx.arc(C, C, C, 0, PI2)
      ctx.clip()

      // Outer ring — glass style
      ctx.globalAlpha = tickProgress
      ctx.beginPath()
      ctx.arc(C + 1, C + 1, RING_R, 0, PI2)
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(C, C, RING_R, 0, PI2)
      ctx.strokeStyle = 'rgba(255,255,255,0.12)'
      ctx.lineWidth = 1.5
      ctx.stroke()

      for (let i = 0; i < TICK_COUNT; i++) {
        let tickAlpha
        if (i === 0) {
          tickAlpha = 1 // 12 o'clock always visible during this phase
        } else {
          tickAlpha = Math.max(0, Math.min(1, tickProgress * 11 - (i - 1)))
        }
        if (tickAlpha <= 0) continue

        const angle = -Math.PI / 2 + i * TICK_ANGLE
        const isMajor = MEMORY_TICK_INDICES.includes(i)
        const innerR = isMajor ? INNER_MAJOR : INNER_MINOR
        const w = isMajor ? TICK_W_MAJOR : TICK_W_MINOR

        const cos = Math.cos(angle)
        const sin = Math.sin(angle)
        const x1 = C + innerR * cos
        const y1 = C + innerR * sin
        const x2 = C + OUTER_R * cos
        const y2 = C + OUTER_R * sin

        drawGlassTick(ctx, x1, y1, x2, y2, w, tickAlpha)
      }
      ctx.restore()
    }

    return
  }

  // Phase D: Memory carousel (0.50–0.83)
  // Each memory gets 0.055 scroll. Within that:
  //   0–0.15  : clock face with tick glow building
  //   0.15–0.30: image fades in over clock (full bleed)
  //   0.30–0.70: image holds full bleed, full opacity
  //   0.70–0.85: image fades out back to clock
  //   0.85–1.0 : clock face (brief pause before next)
  if (offset >= 0.50 && offset < 0.83) {
    const CYCLE_START = 0.50
    const CYCLE_EACH = 0.055
    const localT = offset - CYCLE_START
    const memIndex = Math.min(5, Math.floor(localT / CYCLE_EACH))
    const memLocalT = (localT - memIndex * CYCLE_EACH) / CYCLE_EACH

    // Image alpha: 0 during clock, ramps to 1 for full bleed, back to 0
    let imgAlpha = 0
    if (memLocalT < 0.15) {
      imgAlpha = 0 // clock with glow
    } else if (memLocalT < 0.30) {
      imgAlpha = smoothstep((memLocalT - 0.15) / 0.15) // fade in
    } else if (memLocalT < 0.70) {
      imgAlpha = 1.0 // full bleed hold
    } else if (memLocalT < 0.85) {
      imgAlpha = 1.0 - smoothstep((memLocalT - 0.70) / 0.15) // fade out
    } else {
      imgAlpha = 0 // back to clock
    }

    // Last memory holds instead of fading out
    if (memIndex === 5 && memLocalT >= 0.70) imgAlpha = 1.0

    // Glow intensity: builds during clock phase, stays during image
    let glowAlpha = 0
    if (memLocalT < 0.15) {
      glowAlpha = smoothstep(memLocalT / 0.15)
    } else if (memLocalT < 0.85) {
      glowAlpha = 1.0
    } else {
      glowAlpha = 1.0 - smoothstep((memLocalT - 0.85) / 0.15)
    }

    const activeTick = MEMORY_TICK_INDICES[memIndex]
    const angle = -Math.PI / 2 + activeTick * TICK_ANGLE
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    const glowX = C + OUTER_R * 0.88 * cos
    const glowY = C + OUTER_R * 0.88 * sin

    // Layer 1: Clock face (visible when image isn't covering it)
    const clockAlpha = 1.0 - imgAlpha
    if (clockAlpha > 0.01) {
      ctx.save()
      ctx.globalAlpha = clockAlpha
      ctx.beginPath()
      ctx.arc(C, C, C, 0, PI2)
      ctx.clip()

      // Draw full clock
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, SIZE, SIZE)

      // Outer ring — glass style
      ctx.globalAlpha = clockAlpha
      ctx.beginPath()
      ctx.arc(C + 1, C + 1, RING_R, 0, PI2)
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(C, C, RING_R, 0, PI2)
      ctx.strokeStyle = 'rgba(255,255,255,0.12)'
      ctx.lineWidth = 1.5
      ctx.stroke()

      // All 12 ticks — glass embossed
      for (let i = 0; i < TICK_COUNT; i++) {
        const a = -Math.PI / 2 + i * TICK_ANGLE
        const isMajor = MEMORY_TICK_INDICES.includes(i)
        const innerR = isMajor ? INNER_MAJOR : INNER_MINOR
        const w = isMajor ? TICK_W_MAJOR : TICK_W_MINOR
        const cx = Math.cos(a), sx = Math.sin(a)
        const x1 = C + innerR * cx, y1 = C + innerR * sx
        const x2 = C + OUTER_R * cx, y2 = C + OUTER_R * sx

        const tickW = i === activeTick ? w + 2 : w
        drawGlassTick(ctx, x1, y1, x2, y2, tickW, clockAlpha)
      }

      // Active tick glow
      if (glowAlpha > 0.01) {
        const gradient = ctx.createRadialGradient(glowX, glowY, 0, glowX, glowY, 40)
        gradient.addColorStop(0, `rgba(255,255,255,${0.5 * glowAlpha * clockAlpha})`)
        gradient.addColorStop(1, 'rgba(255,255,255,0)')
        ctx.globalAlpha = 1
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, SIZE, SIZE)
      }

      ctx.restore()
    }

    // Layer 2: Full-bleed memory image
    if (imgAlpha > 0.01) {
      const memImg = images[memIndex]
      if (memImg && memImg.complete && memImg.naturalWidth) {
        ctx.save()
        ctx.globalAlpha = imgAlpha
        ctx.beginPath()
        ctx.arc(C, C, C, 0, PI2)
        ctx.clip()
        drawCoverFit(ctx, memImg, 0, 0, SIZE, SIZE)
        ctx.restore()
      }
    }

    return
  }

  // Outside all phases — clear
}

// ========== Main hook ==========
export default function useOzTexture(version = 'V3') {
  const canvasRef = useRef(null)
  const textureRef = useRef(null)
  const imagesRef = useRef(null)
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

  if (!imagesRef.current) {
    imagesRef.current = memories.map(m => loadImage(m.src))
  }

  useFrame(() => {
    const ctx = canvasRef.current.getContext('2d')
    const offset = scroll.offset

    if (version === 'V2') {
      drawV2(ctx, offset, imagesRef.current[0])
    } else {
      drawV3(ctx, offset, imagesRef.current)
    }

    textureRef.current.needsUpdate = true
  })

  return textureRef.current
}
