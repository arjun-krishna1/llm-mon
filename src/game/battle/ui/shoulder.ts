// L / R "shoulder buttons" for the battle's free actions (the temperature dial).
// The engine's `controls` has no L/R, so this listens on its own: Q / E or PageUp /
// PageDown on a keyboard, LB / RB (standard buttons 4 / 5) on a gamepad. Touch players
// use SELECT instead (BattleScene maps SELECT to "next notch" when no other control owns it).

export type Shoulder = 'L' | 'R'

const KEYS: Record<string, Shoulder> = { KeyQ: 'L', PageUp: 'L', KeyE: 'R', PageDown: 'R' }
const down = new Set<string>()
const pressed = new Set<Shoulder>()
let attached = false
let pad = { L: false, R: false }

export function attachShoulders(): void {
  if (attached || typeof window === 'undefined') return
  attached = true
  window.addEventListener('keydown', (e) => {
    const b = KEYS[e.code]
    if (!b) return
    e.preventDefault()
    if (!down.has(e.code)) pressed.add(b)
    down.add(e.code)
  })
  window.addEventListener('keyup', (e) => {
    down.delete(e.code)
  })
  window.addEventListener('blur', () => down.clear())
}

function pollPad(): void {
  const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : []
  const now = { L: false, R: false }
  for (const gp of pads) {
    if (!gp || !gp.connected) continue
    if (gp.buttons[4]?.pressed) now.L = true
    if (gp.buttons[5]?.pressed) now.R = true
  }
  if (now.L && !pad.L) pressed.add('L')
  if (now.R && !pad.R) pressed.add('R')
  pad = now
}

/** True once per press (consumes it). */
export function shoulderPressed(b: Shoulder): boolean {
  pollPad()
  if (!pressed.has(b)) return false
  pressed.delete(b)
  return true
}

/** Forget presses made while nothing was listening (e.g. during playback). */
export function clearShoulders(): void {
  pollPad()
  pressed.clear()
}
