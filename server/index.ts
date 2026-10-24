import express from 'express'
import { z } from 'zod'
import { EVENT_IDS, hypothesisSchema, parseHypothesis } from '../src/lib/hypothesis'

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

/** Placeholder for AI sound-effect generation. Not wired to a provider: returns 501 so the client keeps its deterministic clips. */
app.post('/api/sfx', (_req, res) => {
  if (!(process.env.FAL_KEY && process.env.FAL_SFX_ENDPOINT)) return res.status(501).json({ ok: false, error: 'sfx_provider_not_configured' })
  res.status(501).json({ ok: false, error: 'sfx_provider_not_implemented' })
})

app.listen(PORT, () => console.log(`EchoCrime API on http://localhost:${PORT} (llm: ${!!process.env.ANTHROPIC_API_KEY})`))
