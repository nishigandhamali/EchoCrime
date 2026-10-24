import { useMemo } from 'react'
import * as THREE from 'three'
import { pbrSet } from './pbr'

/** Marble column with plinth, brass collar and capital; spans the full 3.2 m gallery height. */
export function Column({ x, z }: { x: number; z: number }) {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ ...pbrSet('marble_01', 1, 2), color: '#f4efe6', roughness: 1, envMapIntensity: 0.8 }), [])
  const brass = useMemo(() => new THREE.MeshStandardMaterial({ color: '#c49a45', metalness: 0.9, roughness: 0.32 }), [])
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.15, 0]} material={mat} castShadow receiveShadow><boxGeometry args={[0.8, 0.3, 0.8]} /></mesh>
      <mesh position={[0, 0.34, 0]} material={brass}><cylinderGeometry args={[0.36, 0.38, 0.06, 24]} /></mesh>
      <mesh position={[0, 1.75, 0]} material={mat} castShadow receiveShadow><cylinderGeometry args={[0.27, 0.31, 2.8, 28]} /></mesh>
      <mesh position={[0, 3.1, 0]} material={brass}><cylinderGeometry args={[0.34, 0.29, 0.1, 24]} /></mesh>
      <mesh position={[0, 3.25, 0]} material={mat} castShadow><boxGeometry args={[0.85, 0.2, 0.85]} /></mesh>
    </group>
  )
}
