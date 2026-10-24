import { useMemo } from 'react'
import { Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import { pbrSet } from './pbr'
import { mulberry } from './Props'

const CX = -2
const CZ = -4.5

/** The empty vitrine at the heart of the crime: marble dais, brass-framed glass with the front pane smashed out. */
export default function DisplayCase() {
  const m = useMemo(() => ({
    marble: new THREE.MeshStandardMaterial({ ...pbrSet('marble_01', 1, 1), color: '#5b5d6a', roughness: 1, envMapIntensity: 1 }),
    lacquer: new THREE.MeshStandardMaterial({ color: '#15171f', roughness: 0.28, metalness: 0.5, envMapIntensity: 1.2 }),
    brass: new THREE.MeshStandardMaterial({ color: '#dcb45e', metalness: 0.85, roughness: 0.36, envMapIntensity: 2.2 }),
    velvet: new THREE.MeshStandardMaterial({ color: '#5a0f24', roughness: 1, metalness: 0 }),
    glass: new THREE.MeshPhysicalMaterial({ color: '#d6ecff', transparent: true, opacity: 0.16, roughness: 0.02, metalness: 0, envMapIntensity: 2.2, depthWrite: false, side: THREE.DoubleSide }),
    shard: new THREE.MeshPhysicalMaterial({ color: '#e6f4ff', transparent: true, opacity: 0.5, roughness: 0.02, envMapIntensity: 2.4, side: THREE.DoubleSide, depthWrite: false }),
    shaft: new THREE.MeshBasicMaterial({ color: '#ffe3b0', transparent: true, opacity: 0.045, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
  }), [])

  // jagged teeth left in the frame where the front pane was smashed
  const teeth = useMemo(() => {
    const rnd = mulberry(5)
    const out: { x: number; y: number; w: number; h: number; down: boolean; rz: number }[] = []
    for (let i = 0; i < 7; i++) out.push({ x: -0.5 + i * 0.17 + rnd() * 0.04, y: 1.25, w: 0.02 + rnd() * 0.035, h: 0.05 + rnd() * 0.16, down: false, rz: (rnd() - 0.5) * 0.4 })
    for (let i = 0; i < 6; i++) out.push({ x: -0.5 + i * 0.2 + rnd() * 0.05, y: 2.25, w: 0.02 + rnd() * 0.04, h: 0.04 + rnd() * 0.12, down: true, rz: (rnd() - 0.5) * 0.4 })
    return out
  }, [])

  const posts: [number, number][] = [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]
  return (
    <group position={[CX, 0, CZ]}>
      {/* dais, pedestal, brass cap */}
      <mesh position={[0, 0.1, 0]} material={m.marble} receiveShadow castShadow><cylinderGeometry args={[1.55, 1.6, 0.2, 48]} /></mesh>
      <mesh position={[0, 0.215, 0]} material={m.brass}><cylinderGeometry args={[1.56, 1.56, 0.03, 48]} /></mesh>
      <mesh position={[0, 0.72, 0]} material={m.lacquer} castShadow receiveShadow><boxGeometry args={[1.1, 1.0, 1.1]} /></mesh>
      <mesh position={[0, 1.22, 0]} material={m.brass} castShadow><boxGeometry args={[1.26, 0.06, 1.26]} /></mesh>
      {/* empty velvet cushion with a dent and a clean alarm contact */}
      <mesh position={[0, 1.28, 0]} material={m.velvet}><cylinderGeometry args={[0.38, 0.4, 0.05, 36]} /></mesh>
      <mesh position={[0, 1.307, 0]} material={m.velvet}><torusGeometry args={[0.18, 0.04, 10, 28]} /></mesh>
      <mesh position={[0.46, 1.27, 0.5]} castShadow><boxGeometry args={[0.1, 0.05, 0.06]} /><meshStandardMaterial color="#0a0b10" roughness={0.5} /></mesh>
      {/* brass-framed vitrine */}
      {posts.map(([x, z], i) => <mesh key={i} position={[x, 1.75, z]} material={m.brass} castShadow><boxGeometry args={[0.05, 1.05, 0.05]} /></mesh>)}
      {[1.25, 2.27].map((y) => (
        <group key={y}>
          {[-0.6, 0.6].map((z) => <mesh key={z} position={[0, y, z]} material={m.brass}><boxGeometry args={[1.25, 0.05, 0.05]} /></mesh>)}
          {[-0.6, 0.6].map((x) => <mesh key={x} position={[x, y, 0]} material={m.brass}><boxGeometry args={[0.05, 0.05, 1.25]} /></mesh>)}
        </group>
      ))}
      {/* intact panes: back, both sides, top */}
      <mesh position={[0, 1.76, -0.6]} material={m.glass}><planeGeometry args={[1.2, 1.0]} /></mesh>
      <mesh position={[-0.6, 1.76, 0]} rotation={[0, Math.PI / 2, 0]} material={m.glass}><planeGeometry args={[1.2, 1.0]} /></mesh>
      <mesh position={[0.6, 1.76, 0]} rotation={[0, Math.PI / 2, 0]} material={m.glass}><planeGeometry args={[1.2, 1.0]} /></mesh>
      <mesh position={[0, 2.27, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.glass}><planeGeometry args={[1.2, 1.2]} /></mesh>
      {/* the smashed front: teeth still in the frame */}
      {teeth.map((t, i) => (
        <mesh key={i} position={[t.x, t.down ? t.y - t.h / 2 : t.y + t.h / 2, 0.6]} rotation={[0, 0, t.rz + (t.down ? Math.PI : 0)]} scale={[1, 1, 0.18]} material={m.shard}>
          <coneGeometry args={[t.w, t.h, 3]} />
        </mesh>
      ))}
      {/* museum label on the dais */}
      <mesh position={[0, 0.5, 0.57]} material={m.brass}><boxGeometry args={[0.32, 0.12, 0.012]} /></mesh>
      {/* faint light shaft from the display spot, and dust drifting through it */}
      <mesh position={[0, 1.9, 0]} material={m.shaft}><cylinderGeometry args={[0.55, 1.5, 3.1, 24, 1, true]} /></mesh>
      <Sparkles count={45} scale={[2.6, 2.6, 2.6]} position={[0, 1.7, 0]} size={2.4} speed={0.18} opacity={0.5} color="#ffe6bd" />
    </group>
  )
}
