// Cursor list in a window. Used for YES/NO, start menu, bag, shop, any choice.

import Phaser from 'phaser'
import { FONT, H, W } from '../config'
import { controls } from '../controls'
import { audio } from '../audio'
import { PxText, measure, type TextColorName } from './text'
import { Window, type FrameKey } from './Window'
import { tamper } from '../systems/tamper'
import type { Widget, WidgetStack } from './WidgetStack'

export interface ListItem {
  label: string
  /** Right-aligned secondary text (counts, prices). */
  right?: string
  disabled?: boolean
  color?: TextColorName
  /** Stable id (tamper hooks grey out entries by id: `tamper.disable('run')`; falls back to the label). */
  id?: string
}

/** Disabled by the item itself or by interface tampering. */
export function itemDisabled(it: ListItem | undefined): boolean {
  return !!it && (!!it.disabled || tamper.isDisabled(it.id) || tamper.isDisabled(it.label))
}

export interface ListOptions {
  /** Anchor point; see `anchor`. Defaults to bottom-right above the dialog box. */
  x?: number
  y?: number
  anchor?: 'tl' | 'tr' | 'bl' | 'br'
  /** Fixed width (default: fits content). */
  w?: number
  minW?: number
  /** Visible rows (default: all, max 7). Longer lists scroll. */
  rows?: number
  frame?: FrameKey
  initial?: number
  /** Index returned on B. `null` disables B. Default -1. */
  cancelIndex?: number | null
  onMove?: (index: number) => void
  depth?: number
  /** Keep the window on screen after choosing (caller destroys). */
  persist?: boolean
  rowH?: number
  /** START also cancels (start menu). */
  startCancels?: boolean
  /** Play the select sfx on confirm (default true). */
  sfx?: boolean
}

export class ListMenu implements Widget {
  done = false
  readonly scene: Phaser.Scene
  private stack: WidgetStack
  private items: ListItem[]
  private o: ListOptions
  private win: Window
  private labels: PxText[] = []
  private rights: PxText[] = []
  private cursor: Phaser.GameObjects.Image
  private upArrow: PxText
  private downArrow: PxText
  private index: number
  private scrollTop = 0
  private visibleRows: number
  private resolve?: (i: number) => void
  private frame = 0
  private rowH: number
  x = 0
  y = 0
  w = 0
  h = 0
  active = true
  private destroyed = false
  private tamperSeen = 0

  constructor(scene: Phaser.Scene, stack: WidgetStack, items: ListItem[], o: ListOptions = {}) {
    this.scene = scene
    this.stack = stack
    this.items = items
    this.o = o
    this.rowH = o.rowH ?? 16
    this.visibleRows = Math.min(items.length, o.rows ?? 7)
    const depth = o.depth ?? 1100
    const labelW = Math.max(0, ...items.map((i) => measure(scene, FONT.dialog, i.label)))
    const rightW = Math.max(0, ...items.map((i) => (i.right ? measure(scene, FONT.dialog, i.right) + 10 : 0)))
    this.w = o.w ?? Math.max(o.minW ?? 0, labelW + rightW + 30)
    this.h = this.visibleRows * this.rowH + 10
    const ax = o.x ?? W - 2
    const ay = o.y ?? H - 46 - 2
    const anchor = o.anchor ?? (o.x === undefined && o.y === undefined ? 'br' : 'tl')
    this.x = anchor.endsWith('r') ? ax - this.w : ax
    this.y = anchor.startsWith('b') ? ay - this.h : ay
    this.win = new Window(scene, this.x, this.y, this.w, this.h, o.frame ?? 'ui/frame_menu').setDepth(depth)
    for (let r = 0; r < this.visibleRows; r++) {
      this.labels.push(new PxText(scene, this.x + 18, this.y + 5 + r * this.rowH).setDepth(depth + 1).setScrollFactor(0))
      this.rights.push(new PxText(scene, this.x, this.y + 5 + r * this.rowH).setDepth(depth + 1).setScrollFactor(0))
    }
    this.cursor = scene.add.image(this.x + 8, 0, 'ui/cursor').setOrigin(0, 0).setDepth(depth + 2).setScrollFactor(0)
    this.upArrow = new PxText(scene, this.x + this.w - 14, this.y - 1, '', { shadow: 'none' }).setDepth(depth + 2).setScrollFactor(0)
    this.downArrow = new PxText(scene, this.x + this.w - 14, this.y + this.h - 10, '', { shadow: 'none' }).setDepth(depth + 2).setScrollFactor(0)
    this.upArrow.setColorName('accent')
    this.downArrow.setColorName('accent')
    this.index = Math.max(0, Math.min(items.length - 1, o.initial ?? 0))
    this.ensureVisible()
    this.render()
    stack.push(this)
  }

  /** Resolves with the chosen index (or cancelIndex on B). */
  result(): Promise<number> {
    return new Promise((res) => (this.resolve = res))
  }

  get selected(): number {
    return this.index
  }

  setItems(items: ListItem[]): void {
    this.items = items
    this.index = Math.min(this.index, items.length - 1)
    this.ensureVisible()
    this.render()
  }

  private ensureVisible(): void {
    if (this.index < this.scrollTop) this.scrollTop = this.index
    if (this.index >= this.scrollTop + this.visibleRows) this.scrollTop = this.index - this.visibleRows + 1
  }

  private render(): void {
    for (let r = 0; r < this.visibleRows; r++) {
      const it = this.items[this.scrollTop + r]
      const lab = this.labels[r]
      const rt = this.rights[r]
      lab.setText(it?.label ?? '')
      const off = itemDisabled(it)
      lab.setColorName(off ? 'grey' : (it?.color ?? 'default'))
      rt.setText(it?.right ?? '')
      rt.setPosition(this.x + this.w - 10 - rt.width, this.y + 5 + r * this.rowH)
      rt.setColorName(off ? 'grey' : 'default')
    }
    this.cursor.setY(this.y + 7 + (this.index - this.scrollTop) * this.rowH)
    this.cursor.setVisible(this.active)
    this.upArrow.setText(this.scrollTop > 0 ? '\u25b2' : '')
    this.downArrow.setText(this.scrollTop + this.visibleRows < this.items.length ? '▼' : '')
  }

  tick(): void {
    this.frame++
    if (this.tamperSeen !== tamper.disabled.size) {
      this.tamperSeen = tamper.disabled.size
      this.render()
    }
    const b = Math.floor(this.frame / 10) % 2
    this.downArrow.setPosition(this.x + this.w - 14, this.y + this.h - 11 + b)
    this.upArrow.setPosition(this.x + this.w - 14, this.y - 1 - b)
  }

  input(): void {
    if (!this.active) return
    const n = this.items.length
    if (controls.repeat('up') && n > 1) {
      this.index = (this.index - 1 + n) % n
      this.moved()
    } else if (controls.repeat('down') && n > 1) {
      this.index = (this.index + 1) % n
      this.moved()
    } else if (controls.justPressed('A')) {
      controls.consume('A', 'START')
      if (itemDisabled(this.items[this.index])) {
        audio.sfx('bump')
        return
      }
      if (this.o.sfx !== false) audio.sfx('select')
      this.finish(this.index)
    } else if ((controls.justPressed('B') || (this.o.startCancels && controls.justPressed('START'))) && this.o.cancelIndex !== null) {
      controls.consume('B', 'START')
      audio.sfx('cancel')
      this.finish(this.o.cancelIndex ?? -1)
    }
  }

  private moved(): void {
    audio.sfx('select')
    this.ensureVisible()
    this.render()
    this.o.onMove?.(this.index)
  }

  private finish(i: number): void {
    const r = this.resolve
    this.resolve = undefined
    if (!this.o.persist) this.destroy()
    else {
      this.stack.remove(this)
    }
    r?.(i)
  }

  /** Re-attach a persisted menu to the stack for another choice. */
  reopen(): Promise<number> {
    this.done = false
    this.active = true
    this.render()
    if (!this.stack.has(this)) this.stack.push(this)
    return this.result()
  }

  /** Show cursor as hollow/inactive while a submenu is open. */
  setActive(a: boolean): void {
    this.active = a
    this.render()
  }

  destroy(): void {
    if (this.destroyed) return
    this.destroyed = true
    this.done = true
    this.stack.remove(this)
    this.win.destroy()
    for (const t of [...this.labels, ...this.rights, this.upArrow, this.downArrow]) t.destroy()
    this.cursor.destroy()
  }
}

/** YES/NO or short choice next to the dialog box. Resolves to the index (B = last option unless cancelIndex given). */
export function choice(scene: Phaser.Scene, stack: WidgetStack, options: string[], o: ListOptions = {}): Promise<number> {
  const m = new ListMenu(scene, stack, options.map((label) => ({ label })), {
    cancelIndex: options.length - 1,
    minW: 48,
    ...o,
  })
  return m.result()
}
