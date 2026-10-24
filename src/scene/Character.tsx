import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react'
import { useFBX } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { SkeletonUtils } from 'three-stdlib'

const base = import.meta.env.BASE_URL
const MODEL = `${base}models/characters/characterMedium.fbx`
const IDLE = `${base}models/characters/idle.fbx`
const RUN = `${base}models/characters/run.fbx`
const SKIN = `${base}models/characters/skaterMaleA.png`
export const CHARACTER_HEIGHT = 1.75

useFBX.preload(MODEL)
useFBX.preload(IDLE)
useFBX.preload(RUN)

export type Gait = 'idle' | 'walk' | 'run'
export interface CharacterHandle { setGait: (g: Gait) => void }

/**
 * Re-tints Kenney's "skater" skin atlas into a detective: tan trench coat, slate trousers, brown shoes.
 * Done on a canvas at load time so the shipped PNG stays the original CC0 file.
 */
function makeDetectiveSkin(img: HTMLImageElement) {
  const c = document.createElement('canvas')
  c.width = img.width
  c.height = img.height
  const g = c.getContext('2d')!
  g.drawImage(img, 0, 0)
  const d = g.getImageData(0, 0, c.width, c.height)
  const px = d.data
  const hsv = (r: number, gg: number, b: number) => {
    const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), df = mx - mn
    let h = 0
    if (df) h = mx === r ? ((gg - b) / df + 6) % 6 : mx === gg ? (b - r) / df + 2 : (r - gg) / df + 4
    return [h / 6, mx ? df / mx : 0, mx]
  }
  const rgb = (h: number, s: number, v: number) => {
    const f = (n: number) => { const k = (n + h * 6) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)) }
    return [f(5), f(3), f(1)]
  }
  for (let i = 0; i < px.length; i += 4) {
    const y = Math.floor(i / 4 / c.width)
    if (px[i + 3] === 0) continue
    const [h, s, v] = hsv(px[i] / 255, px[i + 1] / 255, px[i + 2] / 255)
    let out: number[] | null = null
    if (y > 490 && s > 0.5 && (h < 0.04 || h > 0.95)) out = rgb(0.08, 0.5, v * 0.62) // red shirt -> tan coat
    else if (y > 490 && s < 0.1 && v > 0.9) out = rgb(0.08, 0.4, 0.58) // white sleeves -> coat sleeves
    else if (h > 0.5 && h < 0.62 && s > 0.4) out = rgb(0.62, 0.25, v * 0.5) // blue trousers -> slate
    else if (h > 0.4 && h < 0.5 && s > 0.4) out = rgb(0.07, 0.6, v * 0.55) // teal shoe trim -> brown
    if (out) { px[i] = out[0] * 255; px[i + 1] = out[1] * 255; px[i + 2] = out[2] * 255 }
  }
  g.putImageData(d, 0, 0)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function loadSkin(): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(makeDetectiveSkin(img))
    img.onerror = () => reject(new Error('detective skin failed to load'))
    img.src = SKIN
  })
}

/**
 * The visible detective. Origin is at the feet; faces +Z. Kenney supplies idle and run clips only,
 * so "walk" is the run clip played slower; there is no separate walk animation.
 */
const Character = forwardRef<CharacterHandle>(function Character(_, ref) {
  const src = useFBX(MODEL)
  const idle = useFBX(IDLE)
  const run = useFBX(RUN)
  const group = useRef<THREE.Group>(null)
  const mixer = useRef<THREE.AnimationMixer | null>(null)
  const actions = useRef<Record<'idle' | 'run', THREE.AnimationAction> | null>(null)
  const gait = useRef<Gait>('idle')

  const { model, scale } = useMemo(() => {
    const m = SkeletonUtils.clone(src) as THREE.Group
    m.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = false; o.frustumCulled = false } })
    const box = new THREE.Box3().setFromObject(m)
    const h = box.max.y - box.min.y
    return { model: m, scale: CHARACTER_HEIGHT / (h || 1) }
  }, [src])

  useEffect(() => {
    let cancelled = false
    loadSkin().then((tex) => {
      if (cancelled) return
      model.traverse((o) => {
        const mesh = o as THREE.Mesh
        if (!mesh.isMesh) return
        mesh.material = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, metalness: 0 })
      })
    }).catch(() => { /* keeps the FBX's own materials if the skin can't load */ })
    return () => { cancelled = true }
  }, [model])

  useEffect(() => {
    const mx = new THREE.AnimationMixer(model)
    // drop root-motion position tracks: the physics body moves the character, not the clip
    const strip = (clip: THREE.AnimationClip) => {
      const c = clip.clone()
      c.tracks = c.tracks.filter((t) => !t.name.endsWith('.position'))
      return c
    }
    const a = { idle: mx.clipAction(strip(idle.animations[0])), run: mx.clipAction(strip(run.animations[0])) }
    a.idle.play()
    a.run.play()
    a.run.weight = 0
    mixer.current = mx
    actions.current = a
    return () => { mx.stopAllAction(); mx.uncacheRoot(model) }
  }, [model, idle, run])

  useImperativeHandle(ref, () => ({ setGait: (g) => { gait.current = g } }), [])

  useFrame((_, dt) => {
    const a = actions.current
    if (!a || !mixer.current) return
    const moving = gait.current !== 'idle'
    const k = 1 - Math.exp(-dt * 10)
    a.run.weight += ((moving ? 1 : 0) - a.run.weight) * k
    a.idle.weight += ((moving ? 0 : 1) - a.idle.weight) * k
    a.run.timeScale = gait.current === 'run' ? 1.15 : 0.62
    mixer.current.update(dt)
  })

  return (
    <group ref={group} scale={scale}>
      <primitive object={model} />
    </group>
  )
})

export default Character
