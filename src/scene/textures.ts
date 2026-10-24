import * as THREE from 'three'
import type { FloorKind } from '../types/case'

function canvas(size: number) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  return { c, g: c.getContext('2d')! }
}

function seeded(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Procedural floor textures. Each covers 4×4 world units, so no image assets are needed. */
export function makeFloorTexture(kind: FloorKind, w: number, d: number): THREE.CanvasTexture {
  const size = 512
  const { c, g } = canvas(size)
  const rnd = seeded(kind.length * 977)

  if (kind === 'marble') {
    for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) {
      g.fillStyle = (x + y) % 2 === 0 ? '#ece7dc' : '#c9c2b2'
      g.fillRect((x * size) / 2, (y * size) / 2, size / 2, size / 2)
    }
    g.strokeStyle = 'rgba(90,100,120,0.22)'
    g.lineWidth = 1.5
    for (let i = 0; i < 18; i++) {
      g.beginPath(); g.moveTo(rnd() * size, rnd() * size)
      g.bezierCurveTo(rnd() * size, rnd() * size, rnd() * size, rnd() * size, rnd() * size, rnd() * size); g.stroke()
    }
    g.strokeStyle = 'rgba(60,55,45,0.5)'; g.lineWidth = 3
    g.strokeRect(0, 0, size, size)
    g.beginPath(); g.moveTo(size / 2, 0); g.lineTo(size / 2, size); g.moveTo(0, size / 2); g.lineTo(size, size / 2); g.stroke()
  } else if (kind === 'wood') {
    const plank = size / 8
    for (let i = 0; i < 8; i++) {
      const l = 36 + rnd() * 12
      g.fillStyle = `hsl(28, ${38 + rnd() * 10}%, ${l}%)`
      g.fillRect(0, i * plank, size, plank)
      g.strokeStyle = 'rgba(30,15,5,0.35)'; g.lineWidth = 1
      for (let k = 0; k < 7; k++) {
        const y = i * plank + rnd() * plank
        g.beginPath(); g.moveTo(0, y); g.lineTo(size, y + (rnd() - 0.5) * 6); g.stroke()
      }
      g.strokeStyle = 'rgba(20,10,0,0.7)'; g.lineWidth = 2
      g.beginPath(); g.moveTo(0, i * plank); g.lineTo(size, i * plank); g.stroke()
      const cut = (rnd() * 0.6 + 0.2) * size
      g.beginPath(); g.moveTo(cut, i * plank); g.lineTo(cut, (i + 1) * plank); g.stroke()
    }
  } else if (kind === 'tile') {
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      g.fillStyle = (x + y) % 2 === 0 ? '#3a4660' : '#334058'
      g.fillRect((x * size) / 4, (y * size) / 4, size / 4, size / 4)
    }
    g.strokeStyle = 'rgba(120,170,230,0.28)'; g.lineWidth = 2
    for (let i = 0; i <= 4; i++) {
      g.beginPath(); g.moveTo((i * size) / 4, 0); g.lineTo((i * size) / 4, size); g.moveTo(0, (i * size) / 4); g.lineTo(size, (i * size) / 4); g.stroke()
    }
  } else {
    g.fillStyle = kind === 'dock' ? '#6f7683' : '#8c919c'
    g.fillRect(0, 0, size, size)
    for (let i = 0; i < 1400; i++) {
      g.fillStyle = `rgba(${rnd() < 0.5 ? '255,255,255' : '0,0,0'},${rnd() * 0.07})`
      g.fillRect(rnd() * size, rnd() * size, 2 + rnd() * 3, 2 + rnd() * 3)
    }
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 2
    g.beginPath(); g.moveTo(size / 2, 0); g.lineTo(size / 2, size); g.moveTo(0, size / 2); g.lineTo(size, size / 2); g.stroke()
  }

  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(w / 4, d / 4)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}

/** Soft radial glow used for hotspot halos. */
export function makeGlowTexture(): THREE.CanvasTexture {
  const { c, g } = canvas(128)
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.25, 'rgba(255,255,255,0.45)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 128, 128)
  return new THREE.CanvasTexture(c)
}
