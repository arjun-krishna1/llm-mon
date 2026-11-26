// Two-line message box with typewriter reveal, scroll-up paging, ▼ arrow.
// Text: `\n` forces a line break, `\f` starts a new page, `{player}` is substituted.

import Phaser from 'phaser'
import { FONT, TEXT_FAST_CHARS_PER_FRAME, TEXT_FRAMES_PER_CHAR, W } from '../config'
import { controls } from '../controls'
import { audio } from '../audio'
import { params } from '../params'
import { PxText, expand, measure, wrap, type TextColorName } from './text'
import { Window, type FrameKey } from './Window'
import type { Widget, WidgetStack } from './WidgetStack'

export interface DialogOptions {
  x?: number
  y?: number
  w?: number
  h?: number
  frame?: FrameKey
  depth?: number
}

export interface SayOptions {
  /** Name plate shown above the box. */
  speaker?: string
  color?: TextColorName
  /** Resolve as soon as the last page is fully shown (no A wait, no arrow). Box stays up. */
  keepOpen?: boolean
  /** Auto-advance after N ms on the last page instead of waiting for A. */
  autoMs?: number
  /** Extra {vars} for substitution. */
  vars?: Record<string, string | number>
  /** Disable per-character blips. */
  silent?: boolean
}

type Phase = 'idle' | 'typing' | 'waiting' | 'scrolling' | 'held'

export class DialogBox implements Widget {
  readonly scene: Phaser.Scene
  private stack: WidgetStack
  private win: Window
  private rows: PxText[]
  private arrow: Phaser.GameObjects.Image
  private plate?: Window
  private plateText?: PxText
  private x: number
  private y: number
  private w: number
  private h: number
  private depth: number

  private pages: string[][] = []
  private page = 0
  private top = 0 // index of the line shown on row 0
  private row = 0 // row currently typing (0/1)
  private chars = 0 // characters revealed on that row
  private acc = 0
  private phase: Phase = 'idle'
  private scrollT = 0
  private frame = 0
  private lastBlip = -99
  private opts: SayOptions = {}
  private resolve?: () => void
  private autoTimer = 0
  private closePending = false
  /** Hold-to-speed only counts once A/B was released after the message opened. */
  private holdArmed = false
  /** Full text of the current message (for debug info()). */
  currentText = ''

  constructor(scene: Phaser.Scene, stack: WidgetStack, o: DialogOptions = {}) {
    this.scene = scene
    this.stack = stack
    this.x = o.x ?? 2
    this.w = o.w ?? W - 4
    this.h = o.h ?? 44
    this.y = o.y ?? 160 - this.h - 2
    this.depth = o.depth ?? 1000
    this.win = new Window(scene, this.x, this.y, this.w, this.h, o.frame ?? 'ui/frame_dialog').setDepth(this.depth)
    this.rows = [0, 1].map((i) =>
      new PxText(scene, this.x + 10, this.y + 6 + i * 16, '').setDepth(this.depth + 1).setScrollFactor(0))
    this.arrow = scene.add.image(this.x + this.w - 15, this.y + this.h - 15, 'ui/arrow_down')
      .setOrigin(0, 0).setDepth(this.depth + 2).setScrollFactor(0)
    this.setVisible(false)
  }

  get isOpen(): boolean {
    return this.win.obj.visible
  }

  /** True while text is typing or waiting for the player. */
  get isBusy(): boolean {
    return this.phase !== 'idle' && this.phase !== 'held'
  }

  get textWidth(): number {
    return this.w - 26
  }

  private setVisible(v: boolean): void {
    this.win.setVisible(v)
    for (const r of this.rows) r.setVisible(v)
    this.arrow.setVisible(false)
    if (!v) this.setPlate(undefined)
  }

  private setPlate(name?: string): void {
    if (!name) {
      this.plate?.destroy()
      this.plateText?.destroy()
      this.plate = this.plateText = undefined
      return
    }
    const tw = measure(this.scene, FONT.dialog, name)
    if (!this.plate) {
      this.plate = new Window(this.scene, this.x, this.y - 22, tw + 18, 24, 'ui/frame_dialog').setDepth(this.depth)
      this.plateText = new PxText(this.scene, this.x + 9, this.y - 16, name).setDepth(this.depth + 1).setScrollFactor(0)
    }
    this.plate.setSize(tw + 18, 24)
    this.plateText!.setText(name)
  }

  /** Show a message; resolves after the player dismisses the last page. */
  say(text: string, opts: SayOptions = {}): Promise<void> {
    this.resolve?.()
    this.opts = opts
    const full = expand(text, opts.vars)
    this.currentText = full
    this.pages = full.split('\f').map((p) => wrap(this.scene, FONT.dialog, p, this.textWidth))
    this.page = 0
    this.closePending = false
    this.holdArmed = !controls.isDown('A') && !controls.isDown('B')
    this.setVisible(true)
    this.setPlate(opts.speaker)
    for (const r of this.rows) r.setColorName(opts.color ?? 'default')
    this.startPage()
    if (!this.stack.has(this)) this.stack.push(this)
    return new Promise((res) => (this.resolve = res))
  }

  private startPage(): void {
    this.top = 0
    this.row = 0
    this.chars = 0
    this.acc = 0
    this.rows[0].setText('').setPosition(this.x + 10, this.y + 6)
    this.rows[1].setText('').setPosition(this.x + 10, this.y + 22)
    this.phase = 'typing'
    this.autoTimer = 0
    if (params.fast) this.revealAll()
  }

  private lines(): string[] {
    return this.pages[this.page] ?? []
  }

  private revealAll(): void {
    const L = this.lines()
    this.rows[0].setText(L[this.top] ?? '')
    this.rows[1].setText(L[this.top + 1] ?? '')
    this.row = 1
    this.chars = (L[this.top + 1] ?? '').length
    this.finishReveal()
  }

  private finishReveal(): void {
    const L = this.lines()
    const moreLines = this.top + 2 < L.length
    const morePages = this.page + 1 < this.pages.length
    if (!moreLines && !morePages && this.opts.keepOpen) {
      this.phase = 'held'
      this.arrow.setVisible(false)
      const r = this.resolve
      this.resolve = undefined
      this.stack.remove(this)
      r?.()
      return
    }
    this.phase = 'waiting'
    this.arrow.setVisible(!(this.opts.autoMs && !moreLines && !morePages))
  }

  /** Let a held (keepOpen) box close at the end of the frame unless another say() follows. */
  release(): void {
    if (this.phase !== 'held') return
    this.phase = 'idle'
    this.closePending = true
    this.currentText = ''
  }

  /** Close immediately (e.g. after a held prompt's choice). */
  close(): void {
    this.phase = 'idle'
    this.closePending = false
    this.setVisible(false)
    this.stack.remove(this)
    this.currentText = ''
    const r = this.resolve
    this.resolve = undefined
    r?.()
  }

  tick(): void {
    this.frame++
    if (this.closePending) {
      // Nobody queued another message during the last frame: hide the box.
      this.closePending = false
      if (this.phase === 'idle') this.setVisible(false)
    }
    if (this.phase === 'typing') this.type()
    else if (this.phase === 'scrolling') this.scroll()
    if (this.arrow.visible) {
      const b = [0, 1, 2, 1][Math.floor(this.frame / 8) % 4]
      this.arrow.setY(this.y + this.h - 16 + b)
    }
    if (this.phase === 'waiting' && this.opts.autoMs) {
      this.autoTimer += 1000 / 60
      if (this.autoTimer >= this.opts.autoMs && this.isLastPageEnd()) this.advance()
    }
  }

  input(): void {
    if (this.phase === 'typing' && this.holdArmed && controls.justPressed('A')) {
      // a fresh tap finishes the two visible lines
      controls.consume('A')
      const L = this.lines()
      if (this.row === 0) this.rows[0].setText(L[this.top] ?? '')
      this.rows[1].setText(L[this.top + 1] ?? '')
      this.row = 1
      this.chars = (L[this.top + 1] ?? '').length
      this.finishReveal()
      return
    }
    if (this.phase === 'waiting' && (controls.justPressed('A') || controls.justPressed('B'))) {
      controls.consume('A', 'B')
      this.advance()
    }
  }

  private isLastPageEnd(): boolean {
    return this.top + 2 >= this.lines().length && this.page + 1 >= this.pages.length
  }

  private type(): void {
    const L = this.lines()
    const held = controls.isDown('A') || controls.isDown('B')
    if (!held) this.holdArmed = true
    const fast = held && this.holdArmed
    let n: number
    if (fast) n = TEXT_FAST_CHARS_PER_FRAME
    else {
      this.acc++
      n = this.acc >= TEXT_FRAMES_PER_CHAR ? 1 : 0
      if (n) this.acc = 0
    }
    while (n-- > 0 && this.phase === 'typing') {
      const line = L[this.top + this.row] ?? ''
      if (this.chars < line.length) {
        this.chars++
        this.rows[this.row].setText(line.slice(0, this.chars))
        const ch = line[this.chars - 1]
        if (!this.opts.silent && ch !== ' ' && this.frame - this.lastBlip >= 4) {
          audio.sfx('text')
          this.lastBlip = this.frame
        }
      }
      if (this.chars >= line.length) {
        if (this.row === 0 && this.top + 1 < L.length) {
          this.row = 1
          this.chars = 0
        } else {
          this.finishReveal()
        }
      }
    }
  }

  private advance(): void {
    this.arrow.setVisible(false)
    const L = this.lines()
    if (this.top + 2 < L.length) {
      // scroll: row1 slides up to row0, then a new line types on row1
      this.phase = 'scrolling'
      this.scrollT = 0
      this.rows[0].setText('')
      return
    }
    if (this.page + 1 < this.pages.length) {
      this.page++
      this.startPage()
      return
    }
    // finished: keep the frame up one frame in case another say() follows
    this.phase = 'idle'
    this.closePending = true
    for (const r of this.rows) r.setText('')
    this.setPlate(undefined)
    this.stack.remove(this)
    this.currentText = ''
    const r = this.resolve
    this.resolve = undefined
    r?.()
  }

  private scroll(): void {
    this.scrollT++
    const steps = params.fast ? 1 : 4
    const dy = Math.round((16 * this.scrollT) / steps)
    this.rows[1].setPosition(this.x + 10, this.y + 22 - dy)
    if (this.scrollT >= steps) {
      this.top++
      this.rows[0].setText(this.lines()[this.top]).setPosition(this.x + 10, this.y + 6)
      this.rows[1].setText('').setPosition(this.x + 10, this.y + 22)
      this.row = 1
      this.chars = 0
      this.phase = 'typing'
      if (params.fast) this.revealAll()
    }
  }

  destroy(): void {
    this.win.destroy()
    for (const r of this.rows) r.destroy()
    this.arrow.destroy()
    this.setPlate(undefined)
    this.stack.remove(this)
  }
}
