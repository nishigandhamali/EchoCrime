import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { SkeletonUtils } from 'three-stdlib'
import { useGame } from '../state/game'

const MODEL = `${import.meta.env.BASE_URL}models/characters/detective.glb`
export const CHARACTER_HEIGHT = 1.75
useGLTF.preload(MODEL)

export type Gait = 'idle' | 'walk' | 'run'
export interface CharacterHandle { setGait: (g: Gait) => void }

/**
 * The visible detective: Quaternius Universal Base Character (CC0) clothed in a trench coat, trousers and shoes
 * (baked into the base-colour map offline from the mesh's bone weights), with a Quaternius hairstyle and the
 * Universal Animation Library's Idle, Walk and Jog loops. Origin at the feet, faces +Z.
 */
const Character = forwardRef<CharacterHandle>(function Character(_, ref) {
  const { scene, animations } = useGLTF(MODEL)
  const mixer = useRef<THREE.AnimationMixer | null>(null)
  const actions = useRef<Record<string, THREE.AnimationAction>>({})
  const gait = useRef<Gait>('idle')
  const interactT = useRef(0)

  const { model, scale } = useMemo(() => {
    const m = SkeletonUtils.clone(scene) as THREE.Group
    m.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      o.castShadow = true
      o.frustumCulled = false
      const mat = mesh.material as THREE.MeshStandardMaterial
      if (mat?.isMeshStandardMaterial) {
        mat.envMapIntensity = 0.6
        if (/hair/i.test(mat.name)) mat.color.set('#4a3022') // the stock hair map is near-white; tint it chestnut
      }
    })
    const box = new THREE.Box3().setFromObject(m)
    return { model: m, scale: CHARACTER_HEIGHT / ((box.max.y - box.min.y) || 1) }
  }, [scene])

  useEffect(() => {
    const mx = new THREE.AnimationMixer(model)
    const make = (name: string, loop: THREE.AnimationActionLoopStyles = THREE.LoopRepeat) => {
      const clip = animations.find((a) => a.name === name)!.clone()
      clip.tracks = clip.tracks.filter((t) => !/^root\.(position|translation)/.test(t.name)) // the physics body moves the character
      const a = mx.clipAction(clip)
      a.setLoop(loop, Infinity)
      a.play()
      a.weight = 0
      return a
    }
    actions.current = { idle: make('Idle_Loop'), walk: make('Walk_Loop'), run: make('Jog_Fwd_Loop'), interact: make('Interact', THREE.LoopOnce) }
    actions.current.interact.clampWhenFinished = true
    actions.current.idle.weight = 1
    actions.current.interact.paused = true
    mixer.current = mx
    const unsub = useGame.subscribe((s, p) => {
      if (s.inspectingId && !p.inspectingId) { actions.current.interact.reset().play(); interactT.current = 2.2 }
    })
    return () => { unsub(); mx.stopAllAction(); mx.uncacheRoot(model) }
  }, [model, animations])

  useImperativeHandle(ref, () => ({ setGait: (g) => { gait.current = g } }), [])

  useFrame((_, dt) => {
    const a = actions.current
    if (!mixer.current || !a.idle) return
    const k = 1 - Math.exp(-dt * 9)
    interactT.current = Math.max(0, interactT.current - dt)
    const interacting = interactT.current > 0
    const target = { idle: 0, walk: 0, run: 0, interact: interacting ? 1 : 0 }
    if (!interacting) target[gait.current] = 1
    else target.idle = 0.0
    for (const key of Object.keys(target) as (keyof typeof target)[]) a[key].weight += (target[key] - a[key].weight) * k
    a.interact.paused = !interacting
    mixer.current.update(dt)
  })

  return (
    <group scale={scale}>
      <primitive object={model} />
    </group>
  )
})

export default Character
