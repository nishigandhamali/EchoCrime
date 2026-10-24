// Generates the case audio with plain DSP (no samples, no AI): ambient room tone, one clip per event, and the
// master "Gallery Mic 3" recording that mixes them on the case timeline. Run: node scripts/make-audio.mjs
// These are synthesised stand-ins for real sound effects, not recordings of real events.
import fs from 'fs'

const SR = 22050
const OUT = new URL('../public/audio/', import.meta.url).pathname
fs.mkdirSync(OUT, { recursive: true })

function rng(seed) { let a = seed; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
const buf = (sec) => new Float32Array(Math.round(sec * SR))
const noise = (r) => r() * 2 - 1
// one-pole filters
function lowpass(x, fc) { const a = 1 - Math.exp(-2 * Math.PI * fc / SR); let y = 0; return x.map((v) => (y += a * (v - y))) }
function highpass(x, fc) { const lp = lowpass(x, fc); return x.map((v, i) => v - lp[i]) }
function bandpass(x, lo, hi) { return lowpass(highpass(x, lo), hi) }
const env = (t, attack, decay) => (t < attack ? t / attack : Math.exp(-(t - attack) / decay))
function add(dst, src, atSec, gain = 1) { const o = Math.round(atSec * SR); for (let i = 0; i < src.length && o + i < dst.length; i++) if (o + i >= 0) dst[o + i] += src[i] * gain }
function scale(x, g) { return x.map((v) => v * g) }

// ---- ambient room tone: low rumble + 50 Hz hum + faint air
function ambient(sec) {
  const r = rng(1)
  const n = buf(sec)
  const rumble = lowpass(Float32Array.from(n, () => noise(r)), 160)
  const air = highpass(lowpass(Float32Array.from(n, () => noise(r)), 3000), 800)
  return n.map((_, i) => (rumble[i] * 0.9 + air[i] * 0.05 + Math.sin(2 * Math.PI * 50 * i / SR) * 0.004 + Math.sin(2 * Math.PI * 100 * i / SR) * 0.0025) * 0.12)
}

// ---- quiet door: latch click, then a soft swing with a faint creak
function door() {
  const r = rng(2); const x = buf(1.1)
  for (let i = 0; i < x.length; i++) { const t = i / SR
    x[i] += noise(r) * env(t, 0.001, 0.006) * 0.9 // latch click
    if (t > 0.07) x[i] += Math.sin(2 * Math.PI * 95 * t) * env(t - 0.07, 0.01, 0.07) * 0.5 // wood thud
  }
  const creakSrc = Float32Array.from(buf(0.8), () => noise(r))
  const creak = bandpass(creakSrc, 500, 1400).map((v, i) => v * Math.sin(Math.PI * i / creakSrc.length) * 0.35 * (0.6 + 0.4 * Math.sin(i / SR * 60)))
  add(x, creak, 0.25)
  return x
}

// ---- breaking window: crack, shower of shards, glass settling
function glass() {
  const r = rng(3); const x = buf(2.4)
  for (let i = 0; i < x.length; i++) { const t = i / SR; x[i] += noise(r) * env(t, 0.0005, 0.03) * 1.0 + Math.sin(2 * Math.PI * 70 * t) * env(t, 0.002, 0.09) * 0.6 }
  const crack = highpass(Float32Array.from(x, () => noise(r)), 1500).map((v, i) => v * env(i / SR, 0.001, 0.18) * 0.7)
  add(x, crack, 0)
  for (let k = 0; k < 90; k++) { // shards: decaying high sines, spread and thinning out over ~1.8 s
    const at = 0.02 + Math.pow(r(), 1.8) * 1.8; const f = 2200 + r() * 6500; const d = 0.02 + r() * 0.09; const g = (0.05 + r() * 0.2) * (1 - at / 2.2)
    const len = Math.round(d * 6 * SR); const s = new Float32Array(len); for (let i = 0; i < len; i++) s[i] = Math.sin(2 * Math.PI * f * i / SR) * Math.exp(-i / SR / d)
    add(x, s, at, g)
  }
  return x
}

// ---- running footsteps: n heel strikes, quicker and louder as the runner nears, then fading
function steps(n = 14, dur = 4.2) {
  const r = rng(4); const x = buf(dur)
  for (let k = 0; k < n; k++) {
    const at = 0.05 + k * 0.27 + (r() - 0.5) * 0.02
    const near = Math.sin(Math.PI * (k + 0.5) / n)
    const s = buf(0.22); for (let i = 0; i < s.length; i++) { const t = i / SR; s[i] = Math.sin(2 * Math.PI * (85 + 20 * r()) * t) * env(t, 0.002, 0.05) * 0.8 + noise(r) * env(t, 0.0008, 0.012) * 0.7 }
    add(x, bandpass(s, 90, 3500), at, 0.25 + 0.75 * near)
  }
  return x
}

// ---- metal bar falling: inharmonic ring, with two smaller bounces
function clang() {
  const r = rng(5); const x = buf(3.0)
  const partials = [[520, 1.0, 1.4], [1380, 0.7, 1.0], [2310, 0.5, 0.7], [3920, 0.35, 0.45], [5600, 0.2, 0.3]]
  for (const [at, g] of [[0, 1], [0.17, 0.45], [0.29, 0.22]]) {
    const s = buf(2.6)
    for (let i = 0; i < s.length; i++) { const t = i / SR; let v = noise(r) * env(t, 0.0005, 0.01) * 0.9
      for (const [f, a, d] of partials) v += Math.sin(2 * Math.PI * f * (1 + 0.004 * Math.sin(t * 30)) * t) * a * env(t, 0.0008, d) * 0.45
      s[i] = v }
    add(x, s, at, g)
  }
  return x
}

// ---- small car starting and pulling away: starter crank, catch, idle, rev, receding
function vehicle() {
  const r = rng(6); const dur = 6.2; const x = buf(dur)
  let ph = 0, ph2 = 0
  for (let i = 0; i < x.length; i++) {
    const t = i / SR
    let v = 0
    if (t < 1.1) { const crank = 0.5 + 0.5 * Math.sin(2 * Math.PI * 5.5 * t); v += (Math.sin(2 * Math.PI * 70 * t) + 0.5 * Math.sin(2 * Math.PI * 140 * t)) * crank * 0.3 * Math.min(1, t * 8) } // starter
    if (t > 1.0) {
      const k = Math.min(1, (t - 1.0) / 0.4) // engine catches
      const rev = t < 3.2 ? 26 + 2 * Math.sin(t * 7) : 26 + (t - 3.2) * 11 // firing frequency idles then climbs
      ph += 2 * Math.PI * rev / SR
      let eng = 0; for (let h = 1; h <= 8; h++) eng += Math.sin(h * ph + h * 0.3) / h
      v += eng * 0.5 * k
      ph2 += 2 * Math.PI * (rev * 3.3) / SR; v += Math.sin(ph2) * 0.08 * k
    }
    const away = t < 3.4 ? 1 : Math.max(0, 1 - (t - 3.4) / 2.8) // drives off: fades with distance
    x[i] = (v + noise(r) * 0.03 * (t > 1 ? 1 : 0)) * away
  }
  return highpass(lowpass(x, 1800), 25)
}

// ---- hidden clue: a faint three-note "check-in" chirp from a two-way radio, with a squelch tail
function radio() {
  const r = rng(7); const x = buf(0.9)
  const tones = [880, 1175, 1568]
  for (let n = 0; n < 3; n++) { const t0 = 0.05 + n * 0.13
    for (let i = 0; i < Math.round(0.1 * SR); i++) { const t = i / SR; const sq = Math.sign(Math.sin(2 * Math.PI * tones[n] * t)); x[Math.round(t0 * SR) + i] += sq * 0.5 * Math.min(1, t * 200) * Math.min(1, (0.1 - t) * 200) } }
  const sq = highpass(Float32Array.from(buf(0.25), () => noise(r)), 2500); add(x, sq.map((v, i) => v * Math.exp(-i / SR / 0.06) * 0.35), 0.45)
  return bandpass(x, 600, 3600)
}

function toWav(x, gain = 1) {
  const pcm = Buffer.alloc(44 + x.length * 2)
  pcm.write('RIFF', 0); pcm.writeUInt32LE(36 + x.length * 2, 4); pcm.write('WAVEfmt ', 8); pcm.writeUInt32LE(16, 16); pcm.writeUInt16LE(1, 20); pcm.writeUInt16LE(1, 22)
  pcm.writeUInt32LE(SR, 24); pcm.writeUInt32LE(SR * 2, 28); pcm.writeUInt16LE(2, 32); pcm.writeUInt16LE(16, 34); pcm.write('data', 36); pcm.writeUInt32LE(x.length * 2, 40)
  for (let i = 0; i < x.length; i++) pcm.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(x[i] * gain * 32767))), 44 + i * 2)
  return pcm
}
const peak = (x) => x.reduce((m, v) => Math.max(m, Math.abs(v)), 1e-9)
const norm = (x, target = 0.8) => scale(x, target / peak(x))

const clips = { door: [door(), 0.5], glass: [glass(), 0.95], steps: [steps(), 0.7], clang: [clang(), 0.9], vehicle: [vehicle(), 0.75], radio: [radio(), 0.16], ambient: [ambient(12), 1] }
const manifest = { sampleRate: SR, note: 'Synthesised with scripts/make-audio.mjs; not recordings of real events.', clips: {}, master: { file: 'gallery_mic_3.wav', duration: 36, events: {} } }
for (const [name, [x, level]] of Object.entries(clips)) {
  const y = name === 'ambient' ? x : scale(norm(x), level)
  fs.writeFileSync(`${OUT}${name}.wav`, toWav(y))
  manifest.clips[name] = { file: `${name}.wav`, duration: +(y.length / SR).toFixed(3) }
}
// master recording on the case timeline
const at = { door: 3.0, glass: 8.0, radio: 11.4, steps: 14.0, clang: 21.0, vehicle: 28.0 }
const master = ambient(36) // the clip file is a 12 s loop of the same room tone
for (const [name, t] of Object.entries(at)) { add(master, scale(norm(clips[name][0]), clips[name][1]), t); manifest.master.events[name] = { start: t, duration: manifest.clips[name]?.duration ?? +(clips[name][0].length / SR).toFixed(3) } }
const m = scale(master, 0.9 / peak(master))
fs.writeFileSync(`${OUT}gallery_mic_3.wav`, toWav(m))
fs.writeFileSync(`${OUT}manifest.json`, JSON.stringify(manifest, null, 2))
// self-check: loudness (RMS dB) in each event window versus plain room tone
const rms = (a, b) => { let s = 0; const i0 = Math.round(a * SR), i1 = Math.round(b * SR); for (let i = i0; i < i1; i++) s += m[i] * m[i]; return 20 * Math.log10(Math.sqrt(s / (i1 - i0)) + 1e-9) }
console.log('room tone 0-2.5 s:', rms(0, 2.5).toFixed(1), 'dB')
for (const [n, t] of Object.entries(at)) console.log(n.padEnd(8), `${t}s`, rms(t, t + Math.min(1, manifest.clips[n].duration)).toFixed(1), 'dB')
console.log('files:', fs.readdirSync(OUT).map((f) => `${f} ${(fs.statSync(OUT + f).size / 1024) | 0}KB`).join(', '))
