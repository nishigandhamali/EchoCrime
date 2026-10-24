import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Hotspot as HotspotData } from '../types/case'
import type { EvidenceStatus } from '../state/evidence'
import { makeGlowTexture } from './textures'
import { playerSave } from './sceneRefs'

interface Props {
  data: HotspotData
  status: EvidenceStatus | null
  near: boolean
}

/**
 * A subtle highlight, not a beacon: invisible from across the museum, a faint warm glint as the detective
 * gets within a few metres, a clear ring when close enough to inspect. Inspected objects settle to a quiet green.
 */
export default function Hotspot({ data, status, near }: Props) {
  const group = useRef<THREE.Group>(null)
  const halo = useRef<THREE.Sprite>(null)
  const ring = useRef<THREE.Mesh>(null)
  const haloMat = useRef<THREE.SpriteMaterial>(null)
  const ringMat = useRef<THREE.MeshBasicMaterial>(null)
  const glowTex = useMemo(makeGlowTexture, [])
  const done = status === 'discovered' || status === 'confirmed'
  const color = done ? '#7be3b0' : '#ffd27a'

  useFrame(({ clock }, dt) => {
    const dx = playerSave.x - data.position[0]
    const dz = playerSave.z - data.position[2]
    const d = Math.hypot(dx, dz)
    const visible = playerSave.valid ? 1 - THREE.MathUtils.smoothstep(d, 3.5, 7) : 0
    const strength = visible * (done ? 0.35 : 1) * (near ? 1.6 : 1)
    const t = clock.elapsedTime
    if (halo.current && haloMat.current) {
      const s = (near ? 0.9 : 0.55) * (0.92 + 0.08 * Math.sin(t * 3))
      halo.current.scale.setScalar(THREE.MathUtils.lerp(halo.current.scale.x, s, Math.min(1, dt * 8)))
      haloMat.current.opacity = THREE.MathUtils.lerp(haloMat.current.opacity, Math.min(0.85, 0.45 * strength), Math.min(1, dt * 8))
    }
    if (ring.current && ringMat.current) {
      ring.current.visible = near
      const k = (t * 0.8) % 1
      ring.current.scale.setScalar(0.25 + k * 0.45)
      ringMat.current.opacity = near ? (1 - k) * 0.85 : 0
    }
    if (group.current) group.current.visible = strength > 0.02
  })

  return (
    <group ref={group} position={data.position}>
      <sprite ref={halo} scale={[0.55, 0.55, 1]}>
        <spriteMaterial ref={haloMat} map={glowTex} color={color} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
      <mesh ref={ring}>
        <ringGeometry args={[0.9, 1, 40]} />
        <meshBasicMaterial ref={ringMat} color={color} transparent depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}
