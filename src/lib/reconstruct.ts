import type { Reconstruction, EventId } from './hypothesis'
import { TAPE_SECONDS } from './hypothesis'

const base = import.meta.env.BASE_URL
const cache = new Map<string, ArrayBuffer>()

async function bytes(file: string) {
  let b = cache.get(file)
  if (!b) {
    const res = await fetch(`${base}audio/${file}`)
    if (!res.ok) throw new Error(`Could not load ${file} (${res.status})`)
    b = await res.arrayBuffer()
    cache.set(file, b)
  }
  return b.slice(0) // decodeAudioData detaches its input
}

function toWav(buf: AudioBuffer): Blob {
  const x = buf.getChannelData(0)
  const out = new DataView(new ArrayBuffer(44 + x.length * 2))
  const w = (o: number, s: string) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)) }
  w(0, 'RIFF'); out.setUint32(4, 36 + x.length * 2, true); w(8, 'WAVEfmt '); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 1, true)
  out.setUint32(24, buf.sampleRate, true); out.setUint32(28, buf.sampleRate * 2, true); out.setUint16(32, 2, true); out.setUint16(34, 16, true); w(36, 'data'); out.setUint32(40, x.length * 2, true)
  for (let i = 0; i < x.length; i++) out.setInt16(44 + i * 2, Math.max(-32768, Math.min(32767, Math.round(x[i] * 32767))), true)
  return new Blob([out], { type: 'audio/wav' })
}

export interface RenderedTape { blob: Blob; url: string; samples: Float32Array; sampleRate: number }

/**
 * Deterministically assembles the alternative recording: the bundled clips for each sound, placed at the
 * reconstruction's start times over looping room tone. No randomness, no network; the same edits always give the same samples.
 * @param generated optional AI-generated clips (by event id) that replace the bundled ones when a provider is configured
 */
export async function renderReconstruction(recon: Reconstruction, generated: Partial<Record<EventId, ArrayBuffer>> = {}): Promise<RenderedTape> {
  const SR = 22050
  const ctx = new OfflineAudioContext(1, TAPE_SECONDS * SR, SR)
  const decode = async (file: string, override?: ArrayBuffer) => ctx.decodeAudioData(override ? override.slice(0) : await bytes(file))
  const amb = await decode('ambient.wav')
  for (let t = 0; t < TAPE_SECONDS; t += amb.duration) { const s = ctx.createBufferSource(); s.buffer = amb; s.connect(ctx.destination); s.start(t) }
  const clips = await Promise.all(recon.events.map(async (e) => ({ e, buf: await decode(`${e.id}.wav`, generated[e.id]) })))
  for (const { e, buf } of clips) { const s = ctx.createBufferSource(); s.buffer = buf; s.connect(ctx.destination); s.start(e.start) }
  const rendered = await ctx.startRendering()
  const blob = toWav(rendered)
  return { blob, url: URL.createObjectURL(blob), samples: rendered.getChannelData(0), sampleRate: SR }
}
