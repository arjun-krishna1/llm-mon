// On-screen touch controls (D-pad, A, B, START) as DOM elements OUTSIDE the canvas,
// feeding the same input layer as the keyboard (controls.pressCode('V:<btn>')).
// Shown on touch devices (coarse pointer), or with ?touch=1; ?touch=0 forces them off.

import { controls, type Button } from './controls'
import { params } from './params'

export function touchWanted(): boolean {
  if (params.touch !== null) return params.touch
  return typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0 && matchMedia('(pointer: coarse)').matches
}

const CSS = `
#touch { position: fixed; inset: 0; pointer-events: none; z-index: 10; user-select: none; -webkit-user-select: none; touch-action: none; }
#touch .tc { position: absolute; pointer-events: auto; touch-action: none; -webkit-tap-highlight-color: transparent; }
#touch .dpad { border-radius: 50%; }
#touch .dpad .arm { position: absolute; background: #40507c; border: 3px solid #283048; box-shadow: inset 0 3px 0 #6880b8; }
#touch .dpad .arm.h { left: 4%; right: 4%; top: 34%; bottom: 34%; border-radius: 10px; }
#touch .dpad .arm.v { top: 4%; bottom: 4%; left: 34%; right: 34%; border-radius: 10px; }
#touch .dpad .hub { position: absolute; left: 34%; right: 34%; top: 34%; bottom: 34%; background: #40507c; }
#touch .dpad .tri { position: absolute; width: 0; height: 0; border: 8px solid transparent; opacity: .9; }
#touch .dpad.up .tri.u, #touch .dpad.down .tri.d, #touch .dpad.left .tri.l, #touch .dpad.right .tri.r { opacity: 1; filter: brightness(1.6); }
#touch .btn { border-radius: 50%; background: #40507c; border: 3px solid #283048; box-shadow: inset 0 4px 0 #6880b8, 0 3px 0 #283048;
  color: #fcfaf0; font: 700 22px/1 ui-monospace, Menlo, Consolas, monospace; display: flex; align-items: center; justify-content: center; text-shadow: 2px 2px 0 #283048; }
#touch .btn.a { background: #c04820; box-shadow: inset 0 4px 0 #f07830, 0 3px 0 #283048; }
#touch .btn.on, #touch .pill.on { transform: translateY(2px); filter: brightness(1.25); box-shadow: inset 0 2px 0 #6880b8; }
#touch .pill { border-radius: 999px; background: #283048; border: 2px solid #6880b8; color: #d4dae6;
  font: 700 11px/1 ui-monospace, Menlo, Consolas, monospace; letter-spacing: 1px; display: flex; align-items: center; justify-content: center; }
`

type Rect = { x: number; y: number; w: number; h: number }

export class TouchControls {
  readonly root: HTMLDivElement
  private dpad: HTMLDivElement
  private a: HTMLDivElement
  private b: HTMLDivElement
  private start: HTMLDivElement
  private dpadDir = new Map<number, Button | null>()

  constructor() {
    const style = document.createElement('style')
    style.textContent = CSS
    document.head.appendChild(style)
    this.root = document.createElement('div')
    this.root.id = 'touch'
    this.dpad = this.el('tc dpad')
    this.dpad.innerHTML = '<div class="arm h"></div><div class="arm v"></div><div class="hub"></div>'
      + '<div class="tri u"></div><div class="tri d"></div><div class="tri l"></div><div class="tri r"></div>'
    this.a = this.el('tc btn a', 'A')
    this.b = this.el('tc btn b', 'B')
    this.start = this.el('tc pill', 'START')
    document.body.appendChild(this.root)
    this.bindButton(this.a, 'A')
    this.bindButton(this.b, 'B')
    this.bindButton(this.start, 'START')
    this.bindDpad()
    this.root.addEventListener('contextmenu', (e) => e.preventDefault())
  }

  private el(cls: string, text = ''): HTMLDivElement {
    const d = document.createElement('div')
    d.className = cls
    d.textContent = text
    this.root.appendChild(d)
    return d
  }

  private bindButton(el: HTMLDivElement, btn: Button): void {
    const ids = new Set<number>()
    const down = (e: PointerEvent) => {
      e.preventDefault()
      el.setPointerCapture?.(e.pointerId)
      ids.add(e.pointerId)
      el.classList.add('on')
      controls.pressCode(`V:${btn}`)
    }
    const up = (e: PointerEvent) => {
      if (!ids.delete(e.pointerId)) return
      if (ids.size) return
      el.classList.remove('on')
      controls.releaseCode(`V:${btn}`)
    }
    el.addEventListener('pointerdown', down)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
    el.addEventListener('lostpointercapture', up)
  }

  private bindDpad(): void {
    const el = this.dpad
    const dirAt = (e: PointerEvent): Button | null => {
      const r = el.getBoundingClientRect()
      const dx = e.clientX - (r.left + r.width / 2)
      const dy = e.clientY - (r.top + r.height / 2)
      if (Math.hypot(dx, dy) < r.width * 0.1) return null
      return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up'
    }
    const set = (id: number, d: Button | null) => {
      const prev = this.dpadDir.get(id) ?? null
      if (prev === d) return
      if (prev) controls.releaseCode(`V:${prev}`)
      if (d) controls.pressCode(`V:${d}`)
      if (d) this.dpadDir.set(id, d)
      else this.dpadDir.delete(id)
      el.classList.remove('up', 'down', 'left', 'right')
      for (const v of this.dpadDir.values()) if (v) el.classList.add(v)
    }
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault()
      el.setPointerCapture?.(e.pointerId)
      set(e.pointerId, dirAt(e))
    })
    el.addEventListener('pointermove', (e) => {
      if (this.dpadDir.has(e.pointerId) || e.pressure > 0 || e.buttons) set(e.pointerId, dirAt(e))
    })
    const end = (e: PointerEvent) => set(e.pointerId, null)
    el.addEventListener('pointerup', end)
    el.addEventListener('pointercancel', end)
    el.addEventListener('lostpointercapture', end)
  }

  /** Place the controls. `left`/`right` are the zones beside or below the canvas. */
  layout(mode: 'side' | 'below', left: Rect, right: Rect): void {
    const place = (el: HTMLElement, cx: number, cy: number, w: number, h: number) => {
      Object.assign(el.style, { left: `${Math.round(cx - w / 2)}px`, top: `${Math.round(cy - h / 2)}px`, width: `${Math.round(w)}px`, height: `${Math.round(h)}px` })
    }
    const d = Math.max(96, Math.min(190, left.w * 0.86, left.h * 0.8))
    place(this.dpad, left.x + left.w / 2, left.y + left.h / 2, d, d)
    // triangles on the arms
    const t = Math.round(d * 0.07)
    const tri = (cls: string, css: Partial<CSSStyleDeclaration>) => Object.assign((this.dpad.querySelector(`.tri.${cls}`) as HTMLElement).style, css)
    const c = '#fcfaf0'
    tri('u', { left: `${d / 2 - t}px`, top: `${d * 0.12}px`, borderWidth: `${t}px`, borderBottomColor: c })
    tri('d', { left: `${d / 2 - t}px`, bottom: `${d * 0.12}px`, borderWidth: `${t}px`, borderTopColor: c })
    tri('l', { top: `${d / 2 - t}px`, left: `${d * 0.12}px`, borderWidth: `${t}px`, borderRightColor: c })
    tri('r', { top: `${d / 2 - t}px`, right: `${d * 0.12}px`, borderWidth: `${t}px`, borderLeftColor: c })
    const bs = Math.max(54, Math.min(84, right.w * 0.36, right.h * 0.34))
    const cx = right.x + right.w / 2
    const cy = right.y + right.h / 2 - (mode === 'below' ? bs * 0.25 : 0)
    // GBA-style diagonal: B lower-left, A upper-right
    place(this.b, cx - bs * 0.62, cy + bs * 0.32, bs, bs)
    place(this.a, cx + bs * 0.62, cy - bs * 0.32, bs, bs)
    const pw = Math.max(64, bs * 1.1)
    const startY = mode === 'below' ? Math.min(right.y + right.h - 22, cy + bs * 1.3) : cy + bs * 1.5
    const startX = mode === 'below' ? (left.x + left.w + right.x) / 2 : cx
    place(this.start, startX, startY, pw, 26)
  }
}
