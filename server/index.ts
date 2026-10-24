import express from 'express'
import { z } from 'zod'
import { EVENT_IDS, hypothesisSchema, parseHypothesis } from '../src/lib/hypothesis'
import { CASE_AGAINST, LINKS, MISLEADING, SOLUTION } from './solution'

const PORT = Number(process.env.PORT ?? 8787)
const app = express()
app.use(express.json({ limit: '16kb' }))

const body = z.object({ text: z.string().min(1).max(300), known: z.array(z.enum(EVENT_IDS)).max(6) })

/** Optional LLM translation of a sentence into the same validated edit structure. Needs ANTHROPIC_API_KEY; untested without one. */
async function askLlm(text: string, known: string[]) {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return null
  const system = `You convert a detective game player's "what if" about the order of sounds on an audio tape into JSON. Reply with JSON only: {"edits":[...]} where each edit is one of {"op":"before"|"after"|"swap","event":E,"other":E}, {"op":"first"|"last"|"remove","event":E}, {"op":"shift","event":E,"seconds":number}. E must be one of ${known.join(', ')}. If the request is anything else, reply {"edits":[]}.`
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-5-5', max_tokens: 300, system, messages: [{ role: 'user', content: text }] }),
  })
  if (!res.ok) throw new Error(`llm ${res.status}`)
  const data = (await res.json()) as { content?: { type: string; text?: string }[] }
  const raw = data.content?.find((c) => c.type === 'text')?.text ?? ''
  return hypothesisSchema.parse(JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)))
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, llm: !!process.env.ANTHROPIC_API_KEY, sfx: !!(process.env.FAL_KEY && process.env.FAL_SFX_ENDPOINT) })
})

app.post('/api/hypothesis', async (req, res) => {
  const parsed = body.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ ok: false, error: 'invalid_request' })
  const { text, known } = parsed.data
  // the rule parser always runs first: it enforces "only sounds the player has identified"
  const rules = parseHypothesis(text, known)
  if (!rules.ok) return res.json({ ok: false, edits: [], reason: rules.reason, source: 'rules' })
  try {
    const llm = await askLlm(text, known)
    if (llm && llm.edits.every((e) => known.includes(e.event) && (!('other' in e) || known.includes(e.other)))) return res.json({ ok: true, edits: llm.edits, source: 'llm' })
  } catch (err) {
    console.warn('LLM parse failed, using rules:', (err as Error).message)
  }
  res.json({ ok: true, edits: rules.edits, source: 'rules' })
})

const linkBody = z.object({ statementId: z.string().max(40), evidenceId: z.string().max(40) })
/** Does this piece of evidence contradict or support this statement? Answered server-side so the answer key never ships to the browser. */
app.post('/api/check-link', (req, res) => {
  const b = linkBody.safeParse(req.body)
  if (!b.success) return res.status(400).json({ ok: false, error: 'invalid_request' })
  const hit = LINKS[b.data.statementId]?.[b.data.evidenceId]
  res.json({ ok: true, relation: hit?.relation ?? 'none', note: hit?.note ?? 'Nothing here bears on that statement.' })
})

const accuseBody = z.object({ suspectId: z.enum(['alex', 'morgan', 'jordan']), evidenceIds: z.array(z.string().max(40)).max(12), theory: z.string().max(1200).default(''), attempt: z.number().int().min(1).max(20) })
const MAX_ATTEMPTS = 3
/** Judges an accusation against the hidden solution. The full story is revealed only on a solve or when attempts run out. */
app.post('/api/accuse', (req, res) => {
  const b = accuseBody.safeParse(req.body)
  if (!b.success) return res.status(400).json({ ok: false, error: 'invalid_request' })
  const { suspectId, evidenceIds, theory, attempt } = b.data
  const ids = [...new Set(evidenceIds)]
  const strong = ids.filter((id) => CASE_AGAINST[id])
  const lines = new Set(strong.map((id) => CASE_AGAINST[id].line))
  const misleading = ids.filter((id) => MISLEADING.has(id))
  const feedback: string[] = []
  let verdict: 'solved' | 'partial' | 'wrong'
  if (suspectId !== SOLUTION.culprit) {
    verdict = 'wrong'
    feedback.push(`The evidence you gathered does not hold up against ${suspectId === 'morgan' ? 'Morgan Lee' : 'Jordan Mills'}. Re-check each suspect's statements against what you found.`)
  } else if (strong.length >= 3 && lines.size >= 2) {
    verdict = 'solved'
    feedback.push(...strong.map((id) => CASE_AGAINST[id].why))
  } else {
    verdict = 'partial'
    feedback.push('Your suspect is right, but the case is not strong enough to convict: you need at least three pieces of evidence from at least two independent lines (access, ownership, presence, elimination).')
    if (strong.length) feedback.push(...strong.map((id) => `Good: ${CASE_AGAINST[id].why}`))
  }
  if (misleading.length) feedback.push('Some of the evidence you attached is consistent with a staged break-in but does not point at anyone in particular.')
  if (theory.trim().length < 20 && verdict !== 'wrong') feedback.push('Your written theory is very short: explain how the pieces fit together.')
  const reveal = verdict === 'solved' || attempt >= MAX_ATTEMPTS
  res.json({ ok: true, verdict, feedback, strongCount: strong.length, lines: lines.size, attemptsLeft: Math.max(0, MAX_ATTEMPTS - attempt), reveal: reveal ? { culprit: SOLUTION.culprit, motive: SOLUTION.motive, entry: SOLUTION.entry, escape: SOLUTION.escape, sequence: SOLUTION.sequence, truth: SOLUTION.truth } : null })
})

/** Placeholder for AI sound-effect generation. Not wired to a provider: returns 501 so the client keeps its deterministic clips. */
app.post('/api/sfx', (_req, res) => {
  if (!(process.env.FAL_KEY && process.env.FAL_SFX_ENDPOINT)) return res.status(501).json({ ok: false, error: 'sfx_provider_not_configured' })
  res.status(501).json({ ok: false, error: 'sfx_provider_not_implemented' })
})

app.listen(PORT, () => console.log(`EchoCrime API on http://localhost:${PORT} (llm: ${!!process.env.ANTHROPIC_API_KEY})`))
