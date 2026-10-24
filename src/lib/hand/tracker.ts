import { FilesetResolver, HandLandmarker, type NormalizedLandmark } from '@mediapipe/tasks-vision'

export type Gesture = 'open' | 'point' | 'pinch' | 'fist'
/** One camera frame of hand data, mirrored so moving your hand right moves x right. */
export interface HandFrame { t: number; x: number; y: number; gesture: Gesture; landmarks: NormalizedLandmark[] | null }
export type TrackerStatus = 'off' | 'starting' | 'ready' | 'error'

const WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm'
const MODEL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'
const d2 = (a: NormalizedLandmark, b: NormalizedLandmark) => Math.hypot(a.x - b.x, a.y - b.y)

export function classify(lm: NormalizedLandmark[], wasPinching: boolean): Gesture {
  const wrist = lm[0]
  const size = Math.max(1e-4, d2(wrist, lm[9]))
  const curled = [[8, 6], [12, 10], [16, 14], [20, 18]].map(([tip, pip]) => d2(lm[tip], wrist) < d2(lm[pip], wrist) * 1.02)
  if (curled.every(Boolean)) return 'fist'
  const pinch = d2(lm[4], lm[8]) / size
  if (pinch < (wasPinching ? 0.46 : 0.32)) return 'pinch'
  if (curled.every((c) => !c)) return 'open'
  return 'point'
}

/** Webcam + MediaPipe hand landmarker. Emits one HandFrame (or null when no hand) per new video frame. */
export class HandTracker {
  status: TrackerStatus = 'off'
  error = ''
  readonly video = Object.assign(document.createElement('video'), { playsInline: true, muted: true })
  private landmarker: HandLandmarker | null = null
  private stream: MediaStream | null = null
  private raf = 0
  private lastVideoTime = -1
  private pinching = false
  private onStatus: () => void
  private onFrame: (f: HandFrame | null) => void

  constructor(onFrame: (f: HandFrame | null) => void, onStatus: () => void) { this.onFrame = onFrame; this.onStatus = onStatus }

  async start() {
    if (this.status === 'starting' || this.status === 'ready') return
    this.status = 'starting'; this.error = ''; this.onStatus()
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('NotSupported')
      this.stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' }, audio: false })
      this.video.srcObject = this.stream
      await this.video.play()
      if (!this.landmarker) {
        const vision = await FilesetResolver.forVisionTasks(WASM)
        const opts = (delegate: 'GPU' | 'CPU') => ({ baseOptions: { modelAssetPath: MODEL, delegate }, runningMode: 'VIDEO' as const, numHands: 1 })
        this.landmarker = await HandLandmarker.createFromOptions(vision, opts('GPU')).catch(() => HandLandmarker.createFromOptions(vision, opts('CPU')))
      }
      if (this.status !== 'starting') return // stopped while loading
      this.status = 'ready'; this.onStatus()
      this.raf = requestAnimationFrame(this.loop)
    } catch (e) {
      const m = e instanceof Error ? `${e.name} ${e.message}` : String(e)
      this.error = /NotAllowed|denied/i.test(m) ? 'Camera permission was blocked. Allow the camera in your browser’s site settings.'
        : /NotFound|NotSupported|not supported|Requested device/i.test(m) ? 'No camera was found. Connect a webcam and try again.'
        : /NotReadable|in use|Could not start/i.test(m) ? 'The camera is in use by another app. Close it (Zoom, Teams, another tab) and try again.'
        : `Hand tracking could not start: ${m}`
      this.stopStream()
      this.status = 'error'; this.onStatus()
    }
  }

  stop() {
    cancelAnimationFrame(this.raf)
    this.stopStream()
    this.status = 'off'; this.onStatus()
    this.onFrame(null)
  }

  private stopStream() { this.stream?.getTracks().forEach((t) => t.stop()); this.stream = null; this.video.srcObject = null }

  private loop = (now: number) => {
    this.raf = requestAnimationFrame(this.loop)
    const v = this.video
    if (!this.landmarker || v.readyState < 2 || v.currentTime === this.lastVideoTime) return
    this.lastVideoTime = v.currentTime
    let lm: NormalizedLandmark[] | undefined
    try { lm = this.landmarker.detectForVideo(v, now).landmarks[0] } catch (e) { console.error('Hand tracking frame failed:', e) }
    if (!lm) { this.pinching = false; this.onFrame(null); return }
    const gesture = classify(lm, this.pinching)
    this.pinching = gesture === 'pinch'
    // Palm centre (wrist + knuckles) barely moves when you pinch or curl your fingers, so it makes a steady joystick.
    const palm = [0, 5, 9, 13, 17]
    const x = 1 - palm.reduce((a, i) => a + lm![i].x, 0) / palm.length
    const y = palm.reduce((a, i) => a + lm![i].y, 0) / palm.length
    this.onFrame({ t: now, x, y, gesture, landmarks: lm })
  }
}
