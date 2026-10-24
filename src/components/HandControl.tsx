import { useEffect, useRef, useState } from 'react'
import { Crosshair, Hand, X } from 'lucide-react'
import { disableHand, enableHand, hand, handWasEnabled, recalibrate, trackerVideo, useHand } from '../lib/hand/control'
import { arrowFor, doorsOf, otherSide, roomName, roomShort } from '../lib/hand/nav'
import { playerSave } from '../scene/sceneRefs'
import { useGame } from '../state/game'
import type { Gesture } from '../lib/hand/tracker'

const BONES = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12], [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [0, 17], [17, 18], [18, 19], [19, 20]]
const GESTURE: Record<Gesture, string> = { open: 'Open hand', point: 'Hand', pinch: 'Pinch', fist: 'Fist' }

const GUIDE: [string, string][] = [
  ['Move hand up / down', 'Walk forward / back'],
  ['Move hand left / right', 'Turn'],
  ['Swipe with an open hand', 'Walk through the doorway that way'],
  ['Pinch', 'Inspect the object in front of you'],
  ['Hold a pinch', 'Collect the evidence'],
  ['Make a fist', 'Stop walking / close'],
]

function Preview() {
  const canvas = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    let raf = 0
    const draw = () => {
      raf = requestAnimationFrame(draw)
      const c = canvas.current
      if (!c) return
      const g = c.getContext('2d')!, w = c.width, h = c.height, v = trackerVideo(), f = hand.frame
      g.fillStyle = '#070b17'; g.fillRect(0, 0, w, h)
      if (v && v.readyState >= 2) { g.save(); g.translate(w, 0); g.scale(-1, 1); g.globalAlpha = 0.45; g.drawImage(v, 0, 0, w, h); g.restore() }
      const n = hand.neutral
      if (n) {
        // joystick: centre, dead zone and full-speed ring
        const cx = n.x * w, cy = n.y * h
        g.strokeStyle = 'rgba(125,211,252,.35)'; g.lineWidth = 1
        g.beginPath(); g.arc(cx, cy, 0.045 * w, 0, Math.PI * 2); g.stroke()
        g.setLineDash([3, 4]); g.beginPath(); g.arc(cx, cy, 0.17 * w, 0, Math.PI * 2); g.stroke(); g.setLineDash([])
        g.fillStyle = '#7dd3fc'; g.fillRect(cx - 1, cy - 6, 2, 12); g.fillRect(cx - 6, cy - 1, 12, 2)
        if (f) { g.strokeStyle = 'rgba(125,211,252,.8)'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx, cy); g.lineTo(f.x * w, f.y * h); g.stroke() }
      }
      if (f?.landmarks) {
        const P = (i: number) => [(1 - f.landmarks![i].x) * w, f.landmarks![i].y * h] as const
        g.strokeStyle = 'rgba(232,228,216,.75)'; g.lineWidth = 2; g.lineCap = 'round'
        for (const [a, b] of BONES) { const [x1, y1] = P(a), [x2, y2] = P(b); g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke() }
        g.fillStyle = f.gesture === 'pinch' ? '#fcd34d' : '#ffffff'
        g.beginPath(); g.arc(f.x * w, f.y * h, 6, 0, Math.PI * 2); g.fill()
        if (hand.holdProgress > 0) { g.strokeStyle = '#fcd34d'; g.lineWidth = 4; g.beginPath(); g.arc(f.x * w, f.y * h, 16, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * hand.holdProgress); g.stroke() }
      }
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [])
  return <canvas ref={canvas} width={288} height={216} className="block w-full rounded-lg border border-slate-700/60" aria-label="Camera preview with your tracked hand" />
}

/** Doorways out of the current room, with an arrow for which way to swipe from where the camera faces. */
function Doorways() {
  const room = useGame((s) => s.currentRoomId)
  const [rows, setRows] = useState<{ id: string; arrow: string; name: string }[]>([])
  useEffect(() => {
    const tick = () => {
      if (!room) { setRows([]); return }
      const p = { x: playerSave.x, z: playerSave.z }
      const next = doorsOf(room).map((d) => ({ id: d.id, arrow: arrowFor(p, playerSave.camYaw, d), name: roomShort(otherSide(d, room)) }))
      setRows((old) => (JSON.stringify(old) === JSON.stringify(next) ? old : next))
    }
    tick()
    const id = setInterval(tick, 250)
    return () => clearInterval(id)
  }, [room])
  if (!rows.length) return null
  return (
    <div className="mt-3">
      <p className="text-[11px] text-slate-400">Swipe toward a doorway</p>
      <ul className="mt-1 space-y-1" data-testid="hand-doorways">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center gap-2 text-sm">
            <span className="grid h-6 w-6 place-items-center rounded border border-volt/40 font-mono text-volt-glow">{r.arrow}</span>
            <span className="text-paper">{r.name}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function HandControl() {
  const { enabled, status, error, message, messageAt, calibrated, gesture, walkingTo } = useHand()
  const inspecting = useGame((s) => s.inspectingId !== null)
  const explore = useGame((s) => s.viewMode === 'explore')
  const [, force] = useState(0)
  const [showGuide, setShowGuide] = useState(false)

  useEffect(() => { if (handWasEnabled()) enableHand() }, [])
  // let messages expire without needing another state change
  useEffect(() => { if (!message) return; const t = setTimeout(() => force((n) => n + 1), 4200); return () => clearTimeout(t) }, [messageAt, message])

  if (!explore) return null
  if (!enabled) {
    return (
      <button onClick={enableHand} data-testid="hand-enable"
        className="glass absolute bottom-4 right-4 flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-left text-sm transition-colors hover:border-volt/50">
        <Hand className="h-4 w-4 text-volt" />
        <span><span className="block font-medium text-paper">Use hand control</span><span className="block text-[11px] text-slate-400">Walk with gestures via your webcam</span></span>
      </button>
    )
  }

  const fresh = message && performance.now() - messageAt < 4000
  let line: string
  if (status === 'starting') line = 'Starting the camera and hand model…'
  else if (status === 'error') line = error
  else if (!gesture && !hand.frame) line = 'Raise your hand so the camera can see it.'
  else if (!calibrated) line = 'Hold your hand still for a moment to set the centre.'
  else if (walkingTo) line = `Walking to the ${roomName(walkingTo)}. Make a fist to stop.`
  else line = fresh ? message : inspecting ? 'Hold a pinch to collect. Make a fist to close.' : 'Up to walk, left or right to turn.'

  return (
    <aside className={`glass absolute bottom-4 right-4 rounded-xl p-3 ${inspecting ? 'w-56' : 'w-72'}`} data-testid="hand-panel" aria-label="Hand control">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="eyebrow flex items-center gap-1.5"><Hand className="h-3 w-3" /> Hand control</p>
        <div className="flex items-center gap-1">
          <span className={`rounded-full border px-2 py-px text-[10px] ${gesture ? 'border-volt/50 text-volt-glow' : 'border-slate-600 text-slate-500'}`} aria-live="polite">{gesture ? GESTURE[gesture] : 'No hand'}</span>
          <button onClick={recalibrate} title="Set a new centre" aria-label="Set a new centre" className="rounded p-1 text-slate-400 hover:text-paper"><Crosshair className="h-3.5 w-3.5" /></button>
          <button onClick={disableHand} title="Turn off hand control" aria-label="Turn off hand control" className="rounded p-1 text-slate-400 hover:text-paper"><X className="h-3.5 w-3.5" /></button>
        </div>
      </div>
      <Preview />
      <p className={`mt-2 min-h-[2.5em] text-xs leading-snug ${status === 'error' ? 'text-red-300' : 'text-slate-200'}`} data-testid="hand-status" role="status">{line}</p>
      {!inspecting && status !== 'error' && <Doorways />}
      {!inspecting && (
        <button onClick={() => setShowGuide((v) => !v)} aria-expanded={showGuide} className="mt-3 text-[11px] text-slate-400 underline-offset-2 hover:text-paper hover:underline">
          {showGuide ? 'Hide gestures' : 'Show all gestures'}
        </button>
      )}
      {showGuide && !inspecting && (
        <dl className="mt-2 space-y-1.5 border-t border-slate-700/60 pt-2 text-[11px]">
          {GUIDE.map(([g, d]) => <div key={g}><dt className="text-paper">{g}</dt><dd className="text-slate-400">{d}</dd></div>)}
        </dl>
      )}
    </aside>
  )
}
