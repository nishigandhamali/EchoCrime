/** Keyboard state for the detective. Keys typed into any text field never reach the game. */
const down = new Set<string>()
let installed = false

export function isTypingTarget(t: EventTarget | null) {
  const el = t as HTMLElement | null
  if (!el || !el.tagName) return false
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable
}

export function installInput() {
  if (installed) return
  installed = true
  window.addEventListener('keydown', (e) => {
    if (isTypingTarget(e.target)) return
    down.add(e.code)
    if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault()
  })
  window.addEventListener('keyup', (e) => { down.delete(e.code) })
  // a key released while the tab was hidden must not stay "held"
  window.addEventListener('blur', () => down.clear())
  document.addEventListener('focusin', (e) => { if (isTypingTarget(e.target)) down.clear() })
}

export const isDown = (...codes: string[]) => codes.some((c) => down.has(c))
export const clearInput = () => down.clear()
