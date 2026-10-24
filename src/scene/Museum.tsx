import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, Line } from '@react-three/drei'
import * as THREE from 'three'
import type { Room } from '../types/case'
import { MUSEUM_CENTER, WALLS, wallPieces, type WallDef } from './layout'
import { viewTarget } from './sceneRefs'
import { makeFloorTexture } from './textures'
import { pbrSet } from './pbr'
import { MainGalleryProps } from './GalleryProps'
import { EastGalleryProps, SecurityProps, CorridorProps, LoadingBayProps, Outside } from './Props'

const T = 0.25 // wall thickness
// Poly Haven (CC0) PBR plaster and dark wood; wall UVs are scaled to world size by TiledBox so textures aren't stretched
const outerMat = new THREE.MeshStandardMaterial({ ...pbrSet('painted_plaster_wall'), color: '#d9d3c6', roughness: 1, envMapIntensity: 0.4 })
const innerMat = new THREE.MeshStandardMaterial({ ...pbrSet('painted_plaster_wall'), color: '#e9dcc0', roughness: 1, envMapIntensity: 0.4 })
const panelMat = new THREE.MeshStandardMaterial({ ...pbrSet('dark_wood'), color: '#b08a70', roughness: 1, envMapIntensity: 0.7 }) // wainscot
const TILE = 2.4 // metres per texture repeat

/** BoxGeometry whose UVs are in world units, so a texture tiles at TILE metres however big the slab is. */
function TiledBox({ size }: { size: [number, number, number] }) {
  const geom = useMemo(() => {
    const [w, h, d] = size
    const g = new THREE.BoxGeometry(w, h, d)
    const uv = g.attributes.uv
    const dims: [number, number][] = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]] // +x -x +y -y +z -z
    for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) {
      const k = f * 4 + i
      uv.setXY(k, (uv.getX(k) * dims[f][0]) / TILE, (uv.getY(k) * dims[f][1]) / TILE)
    }
    return g
  }, [size])
  return <primitive object={geom} attach="geometry" />
}
const trimMat = new THREE.MeshStandardMaterial({ color: '#b08a3e', roughness: 0.4, metalness: 0.7 })
const LOW = 0.12 // scale a blocking wall drops to (about 0.4 m): still reads as a partition

const tmp = new THREE.Vector2()

/** True when the camera→target sight line (in plan) crosses the wall's footprint. */
function blocksView(w: WallDef, cx: number, cz: number, tx: number, tz: number) {
  const [ax, az, bx, bz] = w.axis === 'x' ? [w.from, w.fixed, w.to, w.fixed] : [w.fixed, w.from, w.fixed, w.to]
  const d = (px: number, pz: number, qx: number, qz: number, rx: number, rz: number) => (qx - px) * (rz - pz) - (qz - pz) * (rx - px)
  const d1 = d(cx, cz, tx, tz, ax, az)
  const d2 = d(cx, cz, tx, tz, bx, bz)
  const d3 = d(ax, az, bx, bz, cx, cz)
  const d4 = d(ax, az, bx, bz, tx, tz)
  return d1 * d2 < 0 && d3 * d4 < 0
}

function Wall({ def }: { def: WallDef }) {
  const group = useRef<THREE.Group>(null)
  const pieces = useMemo(() => wallPieces(def), [def])
  const mat = def.outward ? outerMat : innerMat

  useFrame(({ camera }, dt) => {
    const g = group.current
    if (!g) return
    const target = viewTarget
    let goal = blocksView(def, camera.position.x, camera.position.z, target.x, target.z) ? LOW : 1
    if (def.outward) {
      // exterior walls on the camera's side of the building also drop so the dollhouse stays visible from outside
      tmp.set(camera.position.x - MUSEUM_CENTER.x, camera.position.z - MUSEUM_CENTER.z)
      const len = tmp.length()
      const facing = len < 1 ? 0 : tmp.dot(new THREE.Vector2(def.outward[0], def.outward[1])) / len
      const t = THREE.MathUtils.smoothstep(facing, 0.1, 0.55) * THREE.MathUtils.smoothstep(camera.position.y, 6, 14)
      goal = Math.min(goal, THREE.MathUtils.lerp(1, LOW, t))
    }
    g.scale.y = THREE.MathUtils.lerp(g.scale.y, goal, Math.min(1, dt * 6))
  })

  return (
    <group ref={group}>
      {pieces.map((p, i) => {
        const len = p.b - p.a
        const mid = (p.a + p.b) / 2
        const h = p.y1 - p.y0
        const pos: [number, number, number] = def.axis === 'x' ? [mid, p.y0 + h / 2, def.fixed] : [def.fixed, p.y0 + h / 2, mid]
        const size: [number, number, number] = def.axis === 'x' ? [len, h, T] : [T, h, len]
        return (
          <group key={i}>
            <mesh position={pos} material={mat} castShadow receiveShadow>
              <TiledBox size={size} />
            </mesh>
            {/* dark wood wainscot and gold crown rail on solid wall sections */}
            {p.y0 === 0 && h > 1.5 && (
              <>
                <mesh position={[pos[0], 0.55, pos[2]]} material={panelMat} receiveShadow>
                  <TiledBox size={def.axis === 'x' ? [len + 0.01, 1.1, T + 0.06] : [T + 0.06, 1.1, len + 0.01]} />
                </mesh>
                <mesh position={[pos[0], 1.12, pos[2]]} material={trimMat}>
                  <boxGeometry args={def.axis === 'x' ? [len + 0.01, 0.05, T + 0.1] : [T + 0.1, 0.05, len + 0.01]} />
                </mesh>
              </>
            )}
          </group>
        )
      })}
      {/* gold threshold plates so doorways read at a glance */}
      {def.openings.filter((o) => !o.bottom).map((o, i) => (
        <mesh
          key={`t${i}`}
          material={trimMat}
          position={def.axis === 'x' ? [o.c, 0.015, def.fixed] : [def.fixed, 0.015, o.c]}
        >
          <boxGeometry args={def.axis === 'x' ? [o.w, 0.03, T + 0.1] : [T + 0.1, 0.03, o.w]} />
        </mesh>
      ))}
    </group>
  )
}

interface RoomFloorProps {
  room: Room
  focused: boolean
  hasFocus: boolean
  onSelect: (id: string) => void
}

function RoomFloor({ room, focused, hasFocus, onSelect }: RoomFloorProps) {
  const [x0, x1, z0, z1] = room.bounds
  const w = x1 - x0
  const d = z1 - z0
  const tex = useMemo(() => (room.floor === 'marble' ? null : makeFloorTexture(room.floor, w, d)), [room.floor, w, d])
  const marble = useMemo(() => (room.floor === 'marble' ? pbrSet('marble_01', w / 3, d / 3) : null), [room.floor, w, d])
  const mat = useRef<THREE.MeshStandardMaterial>(null)
  const [hover, setHover] = useState(false)
  const outline = useMemo(
    () => [[x0 + 0.08, 0.04, z0 + 0.08], [x1 - 0.08, 0.04, z0 + 0.08], [x1 - 0.08, 0.04, z1 - 0.08], [x0 + 0.08, 0.04, z1 - 0.08], [x0 + 0.08, 0.04, z0 + 0.08]] as [number, number, number][],
    [x0, x1, z0, z1],
  )

  useFrame(({ clock }, dt) => {
    if (!mat.current) return
    const pulse = 0.5 + 0.5 * Math.sin(clock.elapsedTime * 2.4)
    const goal = focused ? 0.22 + 0.1 * pulse : hover ? 0.16 : 0
    mat.current.emissiveIntensity = THREE.MathUtils.lerp(mat.current.emissiveIntensity, goal, Math.min(1, dt * 8))
  })

  return (
    <group>
      <mesh
        position={[(x0 + x1) / 2, 0, (z0 + z1) / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        onPointerOver={(e) => { e.stopPropagation(); setHover(true); if (!focused) document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { setHover(false); document.body.style.cursor = '' }}
        onClick={(e) => { if (!focused) { e.stopPropagation(); onSelect(room.id) } }}
      >
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial ref={mat} {...(marble ?? { map: tex })} roughness={marble ? 0.9 : 0.35} metalness={marble ? 0 : 0.15} envMapIntensity={marble ? 1.3 : 0.6} emissive="#38bdf8" emissiveIntensity={0} />
      </mesh>
      {(focused || hover) && <Line points={outline} color={focused ? '#38bdf8' : '#7dd3fc'} lineWidth={focused ? 3.5 : 2} transparent opacity={focused ? 1 : 0.7} />}
      {/* overview name tag */}
      {/* always mounted (unmounting drei <Html> mid-render breaks React 19); hidden via opacity instead */}
      <Html position={[(x0 + x1) / 2, 2.6, (z0 + z1) / 2]} center style={{ pointerEvents: 'none' }} zIndexRange={[10, 0]}>
        <div className={`whitespace-nowrap rounded-md border px-2.5 py-1 font-display text-sm tracking-wide shadow-lg backdrop-blur transition-all duration-300 ${hasFocus ? 'scale-90 opacity-0' : 'opacity-100'} ${hover ? 'border-volt/80 bg-ink-950/90 text-volt-glow' : 'border-slate-500/50 bg-ink-950/75 text-paper'}`}>
          {room.name}
        </div>
      </Html>
    </group>
  )
}

interface Props {
  rooms: Room[]
  focusRoomId: string | null
  onSelectRoom: (id: string) => void
}

export default function Museum({ rooms, focusRoomId, onSelectRoom }: Props) {
  return (
    <group>
      <Outside />
      {rooms.map((r) => (
        <RoomFloor key={r.id} room={r} focused={r.id === focusRoomId} hasFocus={focusRoomId !== null} onSelect={onSelectRoom} />
      ))}
      {WALLS.map((w) => <Wall key={w.id} def={w} />)}
      <MainGalleryProps />
      <EastGalleryProps />
      <SecurityProps />
      <CorridorProps />
      <LoadingBayProps />
      <RoomLights />
    </group>
  )
}

/** One warm point light per room plus a spot on the empty display case; the rest is ambient to keep draw cost low. */
function RoomLights() {
  const lights: { p: [number, number, number]; c: string; i: number }[] = [
    { p: [-2, 3.2, -6.5], c: '#ffd9a0', i: 13 },
    { p: [-2, 3.2, -2.5], c: '#ffd9a0', i: 10 },
    { p: [5.5, 3.2, -4.5], c: '#ffe2b8', i: 16 },
    { p: [-4.5, 3, 1.5], c: '#9fd0ff', i: 13 },
    { p: [4, 2.8, 0.25], c: '#fff0c8', i: 11 },
    { p: [0.5, 3, 0.25], c: '#fff0c8', i: 8 },
    { p: [4, 3.2, 4.25], c: '#ffe0a8', i: 16 },
  ]
  return (
    <group>
      {lights.map((l, i) => <pointLight key={i} position={l.p} color={l.c} intensity={l.i} distance={12} decay={1.5} />)}
      <spotLight position={[-2, 3.4, -4.5]} angle={0.5} penumbra={0.7} intensity={90} color="#fff2d8" distance={8} decay={1.6} castShadow shadow-mapSize={[1024, 1024]} target-position={[-2, 1, -4.5]} />
    </group>
  )
}
