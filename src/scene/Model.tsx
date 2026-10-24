import { Suspense, useMemo } from 'react'
import type { ReactNode } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

type V3 = [number, number, number]

export const MODEL_NAMES = [
  'bench', 'benchCushion', 'desk', 'deskCorner', 'chairDesk', 'computerScreen', 'computerKeyboard', 'televisionModern',
  'cardboardBoxClosed', 'cardboardBoxOpen', 'lampSquareFloor', 'lampRoundFloor', 'pottedPlant', 'plantSmall1',
  'bookcaseClosed', 'rugRectangle', 'coatRack', 'trashcan', 'radio', 'loungeSofa', 'speaker',
  // Poly Haven (CC0), optimised to webp 512 textures
  'gallery/marble_bust_01', 'gallery/horse_statue_01', 'gallery/antique_ceramic_vase_01', 'gallery/fancy_picture_frame_02',
  'gallery/hanging_picture_frame_02', 'gallery/hanging_picture_frame_03', 'gallery/ornate_mirror_01', 'gallery/Ottoman_01',
  'gallery/potted_plant_04', 'gallery/ClassicConsole_01',
] as const
export type ModelName = (typeof MODEL_NAMES)[number]

const url = (n: string) => `${import.meta.env.BASE_URL}models/${n}.glb`
MODEL_NAMES.forEach((n) => useGLTF.preload(url(n)))

interface Props {
  name: ModelName
  at: V3
  /** Uniform scale, or per-axis. Kenney models are roughly half real-world size. */
  scale?: number | V3
  /** Yaw in radians. */
  yaw?: number
  /** Normalise the model to this real-world size and sit it on the floor, centred on `at`. Overrides `scale`. */
  fit?: { height?: number; width?: number }
  /** Called with the cloned scene's materials (by name) once, e.g. to swap an artwork texture. */
  onMaterials?: (mats: Record<string, THREE.Material>, root: THREE.Object3D) => void
}

/** A cloned GLB instance that casts and receives shadows. Cloning lets one file back many props. */
export function Model({ name, at, scale = 1, yaw = 0, fit, onMaterials }: Props) {
  const { scene } = useGLTF(url(name))
  const { clone, k, off } = useMemo(() => {
    const c = scene.clone(true)
    const mats: Record<string, THREE.Material> = {}
    c.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      o.castShadow = true
      o.receiveShadow = true
      // materials are shared between clones; give each instance its own so edits don't leak
      if (Array.isArray(mesh.material)) return
      mesh.material = mesh.material.clone()
      mats[mesh.material.name] = mesh.material
    })
    let k = 1
    let off: V3 = [0, 0, 0]
    if (fit) {
      const box = new THREE.Box3().setFromObject(c)
      const size = box.getSize(new THREE.Vector3())
      k = fit.height ? fit.height / size.y : (fit.width ?? 1) / size.x
      off = [-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2]
    }
    onMaterials?.(mats, c)
    return { clone: c, k, off }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene])
  const s = fit ? k : scale
  return (
    <group position={at} rotation={[0, yaw, 0]} scale={s}>
      <primitive object={clone} position={off} />
    </group>
  )
}

/** Local boundary: props load in without hiding the rest of the scene (or the drei <Html> labels). */
export function Loads({ children }: { children: ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>
}
