import { Suspense, useEffect, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Lightformer, OrbitControls } from '@react-three/drei'
import { CuboidCollider, CylinderCollider, Physics, RigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import type { Hotspot as HotspotData, Room } from '../types/case'
import Museum from './Museum'
import Hotspot from './Hotspot'
import { useEvidence } from '../state/evidence'
import { useGame } from '../state/game'
import Player from './Player'
import { FURNITURE, wallBoxes } from './colliders'
import { viewTarget } from './sceneRefs'
import type { ViewMode } from '../state/game'
import { OVERVIEW_CAMERA, OVERVIEW_TARGET, TARGET_MAX, TARGET_MIN, roomView } from './layout'

interface Props {
  rooms: Room[]
  hotspots: HotspotData[]
  mode: ViewMode
  focusRoomId: string | null
  /** Bumped by "Reset camera" to re-apply the current view. */
  resetSignal: number
  onSelectRoom: (id: string) => void
}

interface RigProps {
  rooms: Room[]
  focusRoomId: string | null
  resetSignal: number
  controls: React.RefObject<OrbitControlsImpl | null>
}

/**
 * Eases camera + orbit target toward the goal view. The ease is cancelled as soon as the
 * player grabs the controls, and the pan target is clamped so the museum can't be lost.
 */
function CameraRig({ rooms, focusRoomId, resetSignal, controls }: RigProps) {
  const goal = useRef({ pos: OVERVIEW_CAMERA.clone(), target: OVERVIEW_TARGET.clone() })
  const animating = useRef(false)
  const delta = useRef(new THREE.Vector3())

  useEffect(() => {
    const room = rooms.find((r) => r.id === focusRoomId)
    if (room) {
      const v = roomView(room.bounds)
      goal.current = { pos: v.pos, target: v.target }
    } else {
      goal.current = { pos: OVERVIEW_CAMERA.clone(), target: OVERVIEW_TARGET.clone() }
    }
    animating.current = true
  }, [rooms, focusRoomId, resetSignal])

  useEffect(() => {
    const c = controls.current
    if (!c) return
    const stop = () => { animating.current = false }
    c.addEventListener('start', stop)
    return () => c.removeEventListener('start', stop)
  }, [controls])

  useFrame(({ camera }, dt) => {
    const c = controls.current
    if (!c) return
    if (animating.current) {
      const k = 1 - Math.exp(-Math.min(dt, 0.05) * 3.6) // dt capped so a hitch can't teleport the camera
      camera.position.lerp(goal.current.pos, k)
      c.target.lerp(goal.current.target, k)
      if (camera.position.distanceTo(goal.current.pos) < 0.05 && c.target.distanceTo(goal.current.target) < 0.05) animating.current = false
    }
    // keep the pan target inside the museum; move the camera by the same offset so the view doesn't swing
    delta.current.copy(c.target).clamp(TARGET_MIN, TARGET_MAX).sub(c.target)
    if (delta.current.lengthSq() > 0) {
      c.target.add(delta.current)
      camera.position.add(delta.current)
    }
    c.update()
    viewTarget.copy(c.target)
    // dev-only hook so automated tests can sample the camera path
    if (import.meta.env.DEV) (window as unknown as { __cam?: THREE.Vector3 }).__cam = camera.position
  })
  return null
}

const WALL_BOXES = wallBoxes()

/** Invisible solid geometry: floor, every wall section, and furniture footprints. */
function StaticColliders() {
  return (
    <RigidBody type="fixed" colliders={false}>
      <CuboidCollider args={[11, 0.25, 9]} position={[1.5, -0.25, -0.5]} />
      {WALL_BOXES.map((w) => <CuboidCollider key={w.id} args={[w.size[0] / 2, w.size[1] / 2, w.size[2] / 2]} position={w.pos} />)}
      {FURNITURE.map((f, i) => f.kind === 'box'
        ? <CuboidCollider key={i} args={[f.w / 2, f.h / 2, f.d / 2]} position={[f.x, f.h / 2, f.z]} />
        : <CylinderCollider key={i} args={[f.h / 2, f.r]} position={[f.x, f.h / 2, f.z]} />)}
    </RigidBody>
  )
}

const noop = () => {}

function HotspotMarker({ data }: { data: HotspotData }) {
  const status = useEvidence((s) => (data.evidenceId ? s.status[data.evidenceId] : null))
  const near = useGame((s) => s.nearbyId === data.id)
  return <Hotspot data={data} status={status} near={near} />
}

export default function CrimeScene({ rooms, hotspots, mode, focusRoomId, resetSignal, onSelectRoom }: Props) {
  const controls = useRef<OrbitControlsImpl>(null)
  return (
    <Canvas
      shadows="soft"
      dpr={[1, 1.75]}
      camera={{ position: OVERVIEW_CAMERA.toArray(), fov: 45, near: 0.1, far: 140 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl, scene }) => { if (import.meta.env.DEV) Object.assign(window, { __gl: gl, __scene: scene }) }}
      onPointerMissed={() => { document.body.style.cursor = '' }}
      aria-label="Interactive 3D Riverside Museum"
    >
      <color attach="background" args={['#0b1326']} />
      <fog attach="fog" args={['#0b1326', 55, 110]} />
      {/* reflections for marble, brass and glass: a tiny procedural studio, no HDR download */}
      <Environment resolution={128} frames={1} environmentIntensity={0.9}>
        <Lightformer form="rect" intensity={3} color="#ffe2b8" position={[0, 6, -2]} rotation-x={Math.PI / 2} scale={[10, 6, 1]} />
        <Lightformer form="rect" intensity={1.6} color="#ffd9a0" position={[-6, 3, 0]} rotation-y={Math.PI / 2} scale={[6, 3, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#bcd4ff" position={[6, 3, 2]} rotation-y={-Math.PI / 2} scale={[6, 3, 1]} />
      </Environment>
      <ambientLight intensity={0.3} color="#dfe6ff" />
      <hemisphereLight args={['#fff4e0', '#4a5580', 0.45]} />
      <directionalLight position={[8, 18, 12]} intensity={0.9} color="#fff1dc" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-16} shadow-camera-right={16} shadow-camera-top={14} shadow-camera-bottom={-14} shadow-camera-near={1} shadow-camera-far={50} shadow-bias={-0.0005} />
      {/* no <Suspense>: hiding it re-runs layout-effect cleanups and breaks drei <Html> under React 19 */}
      <>
        <Museum rooms={rooms} focusRoomId={focusRoomId} onSelectRoom={mode === 'overview' ? onSelectRoom : noop} />
        {mode === 'explore' && hotspots.map((h) => <HotspotMarker key={h.id} data={h} />)}
      </>
      <Suspense fallback={null}>
        <Physics gravity={[0, 0, 0]}>
          <StaticColliders />
          {mode === 'explore' && <Player rooms={rooms} hotspots={hotspots} />}
        </Physics>
      </Suspense>
      {mode === 'overview' && (
      <OrbitControls
        ref={controls}
        makeDefault
        enablePan
        screenSpacePanning={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={3}
        maxDistance={40}
        minPolarAngle={0.15}
        maxPolarAngle={1.5}
        target={OVERVIEW_TARGET.toArray()}
      />
      )}
      {mode === 'overview' && <CameraRig rooms={rooms} focusRoomId={focusRoomId} resetSignal={resetSignal} controls={controls} />}
    </Canvas>
  )
}
