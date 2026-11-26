// Global input: one source of truth for every scene, sampled once per game frame.
// Buttons: up/down/left/right, A (Z/Space/Enter), B (X/Shift/Backspace), START (Enter/Esc).
// Enter maps to both A and START: scenes ask for START only where a menu can open.

import { FRAME_MS, type Dir } from './config'

export type Button = 'up' | 'down' | 'left' | 'right' | 'A' | 'B' | 'START'

const KEYMAP: Record<string, Button[]> = {
  ArrowUp: ['up'], KeyW: ['up'],
  ArrowDown: ['down'], KeyS: ['down'],
  ArrowLeft: ['left'], KeyA: ['left'],
  ArrowRight: ['right'], KeyD: ['right'],
  KeyZ: ['A'], Space: ['A'], Enter: ['A', 'START'], NumpadEnter: ['A', 'START'],
  KeyX: ['B'], ShiftLeft: ['B'], ShiftRight: ['B'], Backspace: ['B'],
  Escape: ['START'],
}

const BUTTONS: Button[] = ['up', 'down', 'left', 'right', 'A', 'B', 'START']

class Controls {
  private down = new Set<string>() // physical codes held
  private pressedRaw = new Set<Button>() // pressed since last sample
  private held: Record<Button, number> = { up: 0, down: 0, left: 0, right: 0, A: 0, B: 0, START: 0 }
  private pressed = new Set<Button>()
  private consumed = new Set<Button>()
  /** Most recently pressed direction still held (for diagonal-free movement). */
  private dirStack: Dir[] = []
  private listeners: Array<() => void> = []
  frame = 0
  /** Logic ticks (60 Hz) to run this render frame; see step(). */
  ticks = 0
  /** Index of the logic tick being run; edges (justPressed/repeat) only fire on sub-tick 0. */
  subTick = 0
  private acc = 0

  attach(): void {
    const kd = (e: KeyboardEvent) => {
      const btns = KEYMAP[e.code]
      if (!btns) return
      e.preventDefault()
      for (const l of this.listeners) l()
      if (this.down.has(e.code)) return // auto-repeat
      this.down.add(e.code)
      for (const b of btns) {
        this.pressedRaw.add(b)
        if (isDir(b)) {
          this.dirStack = this.dirStack.filter((d) => d !== b)
          this.dirStack.push(b)
        }
      }
    }
    const ku = (e: KeyboardEvent) => {
      const btns = KEYMAP[e.code]
      if (!btns) return
      e.preventDefault()
      this.down.delete(e.code)
      for (const b of btns) if (isDir(b) && !this.isPhysDown(b)) this.dirStack = this.dirStack.filter((d) => d !== b)
    }
    window.addEventListener('keydown', kd)
    window.addEventListener('keyup', ku)
    window.addEventListener('blur', () => {
      this.down.clear()
      this.dirStack = []
    })
  }

  /** Called on any key press (used to unlock audio). */
  onAnyKey(fn: () => void): void {
    this.listeners.push(fn)
  }

  private isPhysDown(b: Button): boolean {
    for (const code of this.down) if (KEYMAP[code]?.includes(b)) return true
    return false
  }

  /**
   * Global fixed-step clock. Call once per render frame (Phaser PRE_STEP) with the
   * frame delta. Works out how many 60 Hz logic ticks this frame runs (0..4, with a
   * little slack so display jitter doesn't drop/double frames), and samples input
   * only on frames that run logic (presses during 0-tick frames are kept).
   */
  step(deltaMs: number): void {
    this.acc += Math.min(deltaMs, 100)
    let n = 0
    while (this.acc >= FRAME_MS * 0.85 && n < 4) {
      this.acc -= FRAME_MS
      n++
    }
    if (this.acc > FRAME_MS * 2) this.acc = 0
    this.ticks = n
    this.subTick = 0
    if (n > 0) this.sample(n)
  }

  /** Run `fn` once per logic tick this frame (edges only visible on the first). */
  each(fn: () => void): void {
    for (let i = 0; i < this.ticks; i++) {
      this.subTick = i
      fn()
    }
    this.subTick = 0
  }

  private sample(n: number): void {
    this.frame += n
    this.pressed.clear()
    this.consumed.clear()
    for (const b of BUTTONS) {
      const isDown = this.isPhysDown(b)
      if (this.pressedRaw.has(b)) this.pressed.add(b)
      this.held[b] = isDown ? this.held[b] + n : this.pressedRaw.has(b) ? 1 : 0
    }
    this.pressedRaw.clear()
  }

  /** True on the frame the button went down (unless consumed this frame). */
  justPressed(b: Button): boolean {
    return this.subTick === 0 && this.pressed.has(b) && !this.consumed.has(b)
  }

  isDown(b: Button): boolean {
    return this.held[b] > 0
  }

  /** Frames the button has been held. */
  heldFrames(b: Button): number {
    return this.held[b]
  }

  /** Mark a press as handled so later scenes in the same frame don't also act on it. */
  consume(...b: Button[]): void {
    for (const x of b) this.consumed.add(x)
  }

  consumeAll(): void {
    for (const b of BUTTONS) this.consumed.add(b)
  }

  /** Pressed, or held with key-repeat (menu cursors). */
  repeat(b: Button, delay = 18, rate = 5): boolean {
    if (this.consumed.has(b) || this.subTick > 0) return false
    const h = this.held[b]
    if (this.pressed.has(b)) return true
    return h > delay && (h - delay) % rate === 0
  }

  /** The direction currently held (latest pressed wins), or null. */
  dir(): Dir | null {
    for (let i = this.dirStack.length - 1; i >= 0; i--) {
      if (this.isPhysDown(this.dirStack[i])) return this.dirStack[i]
    }
    return null
  }

  /** Direction pressed this frame, if any. */
  dirPressed(): Dir | null {
    for (const d of ['up', 'down', 'left', 'right'] as Dir[]) if (this.justPressed(d)) return d
    return null
  }
}

function isDir(b: Button): b is Dir {
  return b === 'up' || b === 'down' || b === 'left' || b === 'right'
}

export const controls = new Controls()
