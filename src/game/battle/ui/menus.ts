// Battle menus: the 2x2 command menu, the move menu (+ PP / type panel), the
// level-up stats window and the forget-a-move screen.

import Phaser from 'phaser'
import { FONT } from '../../config'
import { controls } from '../../controls'
import { audio } from '../../audio'
import { PxText, fitLabel, measure, wrap, type TextColorName } from '../../ui/text'
import { Window } from '../../ui/Window'
import type { Widget, WidgetStack } from '../../ui/WidgetStack'
import { DEPTH, LAYOUT } from './constants'
import { clearShoulders, shoulderPressed, type Shoulder } from './shoulder'
import type { MoveView } from '../core'
import type { Stats } from '../../types'

// ---------------------------------------------------------------- 2x2 grid

export interface GridOptions {
  x: number
  y: number
  w: number
  h: number
  frame?: string
  labels: string[]
  /** Label x offsets (per column) and y offsets (per row) inside the window. */
  cols: [number, number]
  rows: [number, number]
  initial?: number
  /** B returns -1 when true. */
  cancel?: boolean
  onMove?: (i: number) => void
  colors?: (TextColorName | undefined)[]
  /** Max label width per column (long labels are condensed). */
  colW?: [number, number]
  /** Greyed-out entries (still selectable: the caller refuses them with a message). */
  disabled?: boolean[]
  /** Extra buttons while the grid is open: SELECT and the L/R shoulders (battle free actions). */
  onKey?: (k: 'SELECT' | Shoulder) => void
  /** Second-colour caption under a label (the Probe's true move names). */
  captions?: (string | undefined)[]
  captionColor?: number
}

/** A 2x2 cursor grid in a window (index: 0 top-left, 1 top-right, 2 bottom-left, 3 bottom-right). */
export class Grid2x2 implements Widget {
  done = false
  private stack: WidgetStack
  private o: GridOptions
  private win: Window
  private texts: PxText[] = []
  private cursor: Phaser.GameObjects.Image
  index: number
  private resolve?: (i: number) => void
  private frame = 0

  constructor(scene: Phaser.Scene, stack: WidgetStack, o: GridOptions) {
    this.stack = stack
    this.o = o
    this.win = new Window(scene, o.x, o.y, o.w, o.h, o.frame ?? 'ui/frame_menu').setDepth(DEPTH.menu)
    o.labels.forEach((l, i) => {
      const t = new PxText(scene, o.x + o.cols[i % 2], o.y + o.rows[Math.floor(i / 2)], l).setDepth(DEPTH.menu + 1)
      if (o.colW) t.setLabel(fitLabel(scene, l, o.colW[i % 2]))
      const c = o.disabled?.[i] ? 'grey' : o.colors?.[i]
      if (c) t.setColorName(c)
      this.texts.push(t)
      const cap = o.captions?.[i]
      if (cap) {
        const ct = new PxText(scene, o.x + o.cols[i % 2], o.y + o.rows[Math.floor(i / 2)] + 11, cap, { font: FONT.mini, shadow: 'none', color: o.captionColor ?? 0x1c6440 })
          .setDepth(DEPTH.menu + 1)
        if (o.colW) {
          let c2 = cap
          while (c2.length > 1 && measure(scene, FONT.mini, c2) > o.colW[i % 2]) c2 = c2.slice(0, -1)
          ct.setText(c2)
        }
        this.texts.push(ct)
      }
    })
    clearShoulders()
    this.cursor = scene.add.image(0, 0, 'ui/cursor').setOrigin(0, 0).setDepth(DEPTH.menu + 2)
    this.index = Math.max(0, Math.min(o.labels.length - 1, o.initial ?? 0))
    if (!o.labels[this.index]) this.index = 0
    this.place()
    o.onMove?.(this.index)
    stack.push(this)
  }

  result(): Promise<number> {
    return new Promise((r) => (this.resolve = r))
  }

  private place(): void {
    const o = this.o
    this.cursor.setPosition(o.x + o.cols[this.index % 2] - 9, o.y + o.rows[Math.floor(this.index / 2)] + 2)
  }

  tick(): void {
    this.frame++
  }

  /** Grey out / restore entry `i` while the grid is open. */
  setDisabled(i: number, on: boolean): void {
    const t = this.texts.find((x) => x.x === this.o.x + this.o.cols[i % 2] && x.y === this.o.y + this.o.rows[Math.floor(i / 2)])
    t?.setColorName(on ? 'grey' : this.o.colors?.[i] ?? 'default')
  }

  input(): void {
    if (this.o.onKey) {
      if (controls.justPressed('SELECT')) {
        controls.consume('SELECT')
        this.o.onKey('SELECT')
        return
      }
      for (const b of ['L', 'R'] as Shoulder[]) {
        if (shoulderPressed(b)) {
          this.o.onKey(b)
          return
        }
      }
    }
    const n = this.o.labels.length
    let ni = this.index
    if (controls.justPressed('left') && this.index % 2 === 1) ni = this.index - 1
    else if (controls.justPressed('right') && this.index % 2 === 0 && this.index + 1 < n) ni = this.index + 1
    else if (controls.justPressed('up') && this.index >= 2) ni = this.index - 2
    else if (controls.justPressed('down') && this.index + 2 < n) ni = this.index + 2
    if (ni !== this.index && this.o.labels[ni]) {
      this.index = ni
      audio.sfx('select')
      this.place()
      this.o.onMove?.(ni)
      return
    }
    if (controls.justPressed('A')) {
      controls.consume('A')
      audio.sfx(this.o.disabled?.[this.index] ? 'bump' : 'select')
      this.finish(this.index)
    } else if (controls.justPressed('B') && this.o.cancel) {
      controls.consume('B')
      audio.sfx('cancel')
      this.finish(-1)
    }
  }

  private finish(i: number): void {
    this.done = true
    this.stack.remove(this)
    this.destroy()
    const r = this.resolve
    this.resolve = undefined
    r?.(i)
  }

  destroy(): void {
    this.win.destroy()
    for (const t of this.texts) t.destroy()
    this.cursor.destroy()
  }
}

export interface CommandMenuOptions {
  /** Greyed-out commands, in grid order FIGHT / BAG / LLMMON / RUN. */
  disabled?: boolean[]
  onKey?: GridOptions['onKey']
  /** Receives the grid once it is built (e.g. to grey an entry while it is open). */
  onOpen?: (g: Grid2x2) => void
}

export const COMMAND_LABELS = ['FIGHT', 'BAG', 'LLMMON', 'RUN']

/** FIGHT / BAG / LLMMON / RUN, bottom-right over the message box. */
export function commandMenu(scene: Phaser.Scene, stack: WidgetStack, initial: number, opts: CommandMenuOptions = {}): Promise<number> {
  const c = LAYOUT.command
  const g = new Grid2x2(scene, stack, {
    ...c, frame: 'ui/frame_dialog', labels: COMMAND_LABELS,
    cols: [18, 72], rows: [8, 24], initial, cancel: false, disabled: opts.disabled, onKey: opts.onKey,
  })
  opts.onOpen?.(g)
  return g.result()
}

// ---------------------------------------------------------------- move menu

export interface MoveMenuOptions {
  /** Labels shown instead of the true names (interface tamper), per slot. */
  shown?: (string | undefined)[]
  /** Probe active: tampered slots also show their true name in a second colour. */
  probe?: boolean
  /** Token cost per slot (Token Budget arena). */
  costs?: (number | undefined)[]
  budget?: { remaining: number; max: number }
  onHover?: (i: number) => void
}

/** Move names (2x2) on the left, PP + type chip on the right. Resolves move index or -1. */
export function moveMenu(scene: Phaser.Scene, stack: WidgetStack, moves: MoveView[], initial: number, opts: MoveMenuOptions = {}): Promise<number> {
  const m = LAYOUT.moves
  const info = LAYOUT.moveInfo
  const win = new Window(scene, info.x, info.y, info.w, info.h, 'ui/frame_dialog').setDepth(DEPTH.menu)
  const hasCost = !!opts.costs
  const ppLabel = new PxText(scene, info.x + 8, info.y + 8, 'PP').setDepth(DEPTH.menu + 1)
  const ppVal = new PxText(scene, info.x + 30, info.y + 8, '').setDepth(DEPTH.menu + 1)
  const costText = hasCost ? new PxText(scene, info.x + 8, info.y + 21, '', { font: FONT.mini, shadow: 'none' }).setDepth(DEPTH.menu + 1) : null
  const chip = scene.add.image(info.x + info.w / 2, info.y + (hasCost ? 35 : 31), 'ui/type_classic').setOrigin(0.5, 0.5).setDepth(DEPTH.menu + 1)
  const labels = [0, 1, 2, 3].map((i) => opts.shown?.[i] ?? moves[i]?.name ?? '')
  const captions = [0, 1, 2, 3].map((i) => (opts.probe && opts.shown?.[i] && opts.shown[i] !== moves[i]?.name ? moves[i]?.name : undefined))
  const colors = labels.map((_, i) => (moves[i] ? undefined : 'grey') as TextColorName | undefined)
  const onMove = (i: number) => {
    const mv = moves[i]
    if (!mv) return
    const s = `${mv.pp}/${mv.maxPp}`
    ppVal.setText(s).setPosition(info.x + info.w - 8 - measure(scene, FONT.dialog, s), info.y + 8)
    const frac = mv.pp / Math.max(1, mv.maxPp)
    ppVal.setColorName(mv.pp === 0 ? 'red' : frac <= 0.25 ? 'accent' : 'default')
    chip.setTexture(`ui/type_${mv.type}`)
    if (costText) {
      const c = opts.costs?.[i] ?? 0
      const over = !!opts.budget && c > opts.budget.max
      costText.setText(`COST ${c} TOK`).setColorName(over ? 'red' : 'default')
    }
    opts.onHover?.(i)
  }
  const grid = new Grid2x2(scene, stack, {
    ...m, frame: 'ui/frame_dialog', labels: labels.map((l, i) => (moves[i] ? l : '')), colors,
    cols: [14, 95], rows: [8, 24], colW: [70, 74], initial, cancel: true, onMove, captions, captionColor: 0x1c6440,
  })
  return grid.result().then((i) => {
    win.destroy()
    ppLabel.destroy()
    ppVal.destroy()
    costText?.destroy()
    chip.destroy()
    return i
  })
}

// ---------------------------------------------------------------- level-up window

const STAT_ORDER: (keyof Stats)[] = ['hp', 'atk', 'def', 'spa', 'spd', 'spe']
const STAT_LABEL: Record<keyof Stats, string> = { hp: 'Max. HP', atk: 'Attack', def: 'Defense', spa: 'Sp. Atk', spd: 'Sp. Def', spe: 'Speed' }

/** Waits for A (or B), with the advance arrow implied by the window. */
class WaitA implements Widget {
  done = false
  private res?: () => void
  private stack: WidgetStack
  constructor(stack: WidgetStack) {
    this.stack = stack
    stack.push(this)
  }
  result(): Promise<void> {
    return new Promise((r) => (this.res = r))
  }
  tick(): void {}
  input(): void {
    if (controls.justPressed('A') || controls.justPressed('B')) {
      controls.consume('A', 'B')
      audio.sfx('select')
      this.done = true
      this.stack.remove(this)
      this.res?.()
    }
  }
}

export function waitA(stack: WidgetStack): Promise<void> {
  return new WaitA(stack).result()
}

/** "+N" deltas, A, then totals, A. */
export async function levelUpWindow(scene: Phaser.Scene, stack: WidgetStack, before: Stats, after: Stats): Promise<void> {
  const x = 134
  const y = 6
  const w = 104
  const h = 104
  const win = new Window(scene, x, y, w, h, 'ui/frame_menu').setDepth(DEPTH.window)
  const rows = STAT_ORDER.map((k, i) => {
    const l = new PxText(scene, x + 9, y + 5 + i * 16, STAT_LABEL[k]).setDepth(DEPTH.window + 1)
    const v = new PxText(scene, x, y + 5 + i * 16, '').setDepth(DEPTH.window + 1)
    return { k, l, v }
  })
  const show = (fn: (k: keyof Stats) => string) => {
    for (const r of rows) {
      const s = fn(r.k)
      r.v.setText(s).setPosition(x + w - 9 - measure(scene, FONT.dialog, s), r.v.y)
    }
  }
  show((k) => `+${after[k] - before[k]}`)
  await waitA(stack)
  show((k) => String(after[k]))
  await waitA(stack)
  win.destroy()
  for (const r of rows) {
    r.l.destroy()
    r.v.destroy()
  }
}

// ---------------------------------------------------------------- forget-a-move screen

export interface MoveInfo {
  id: string
  name: string
  type: string
  category: string
  power: number
  accuracy: number | null
  pp: number
  maxPp: number
  description: string
}

/**
 * List of the four known moves plus the new one (last, marked). Resolves the slot to
 * forget (0-3), or 4 / -1 when the player backs out (caller confirms giving up).
 */
export class ForgetMoveScreen implements Widget {
  done = false
  private scene: Phaser.Scene
  private stack: WidgetStack
  private objs: { destroy(): void }[] = []
  private names: PxText[] = []
  private cursor: Phaser.GameObjects.Image
  private chip: Phaser.GameObjects.Image
  private pow: PxText
  private acc: PxText
  private pp: PxText
  private desc: PxText[]
  private index = 0
  private res?: (i: number) => void
  private moves: MoveInfo[]

  constructor(scene: Phaser.Scene, stack: WidgetStack, moves: MoveInfo[], monName: string) {
    this.moves = moves
    this.scene = scene
    this.stack = stack
    const D = DEPTH.screen
    const bg = scene.add.rectangle(0, 0, 240, 160, 0x3a6c8c).setOrigin(0, 0).setDepth(D)
    this.objs.push(bg)
    const head = new Window(scene, 0, 0, 240, 24, 'ui/frame_dialog').setDepth(D + 1)
    this.objs.push(head)
    this.objs.push(new PxText(scene, 9, 5, `${monName}: forget which move?`).setDepth(D + 2))
    const list = new Window(scene, 0, 24, 138, 88, 'ui/frame_menu').setDepth(D + 1)
    this.objs.push(list)
    moves.forEach((m, i) => {
      const y = 24 + 5 + i * 16
      const t = new PxText(scene, 18, y + (i === 4 ? 1 : 0), m.name).setDepth(D + 2)
      if (i === 4) t.setColorName('blue')
      this.names.push(t)
      this.objs.push(t)
    })
    const sep = scene.add.rectangle(8, 24 + 5 + 4 * 16 - 1, 122, 1, 0x9098b0).setOrigin(0, 0).setDepth(D + 2)
    this.objs.push(sep)
    const info = new Window(scene, 138, 24, 102, 88, 'ui/frame_menu').setDepth(D + 1)
    this.objs.push(info)
    this.chip = scene.add.image(146, 32, 'ui/type_classic').setOrigin(0, 0).setDepth(D + 2)
    const lab = (y: number, s: string) => {
      const t = new PxText(scene, 146, y, s).setDepth(D + 2)
      this.objs.push(t)
    }
    lab(48, 'Power')
    lab(64, 'Accuracy')
    lab(80, 'PP')
    this.pow = new PxText(scene, 0, 48, '').setDepth(D + 2)
    this.acc = new PxText(scene, 0, 64, '').setDepth(D + 2)
    this.pp = new PxText(scene, 0, 80, '').setDepth(D + 2)
    const box = new Window(scene, 0, 112, 240, 48, 'ui/frame_battle').setDepth(D + 1)
    this.objs.push(box)
    this.desc = [0, 1].map((i) => new PxText(scene, 10, 118 + i * 16, '').setDepth(D + 2))
    this.objs.push(this.chip, this.pow, this.acc, this.pp, ...this.desc)
    this.cursor = scene.add.image(0, 0, 'ui/cursor').setOrigin(0, 0).setDepth(D + 3)
    this.objs.push(this.cursor)
    this.render()
    stack.push(this)
  }

  result(): Promise<number> {
    return new Promise((r) => (this.res = r))
  }

  private render(): void {
    const m = this.moves[this.index]
    this.cursor.setPosition(9, 24 + 7 + this.index * 16 + (this.index === 4 ? 1 : 0))
    this.chip.setTexture(`ui/type_${m.type}`)
    const right = (t: PxText, s: string) => t.setText(s).setPosition(231 - measure(this.scene, FONT.dialog, s), t.y)
    right(this.pow, m.power > 0 ? String(m.power) : '---')
    right(this.acc, m.accuracy === null ? '---' : String(m.accuracy))
    right(this.pp, `${m.pp}/${m.maxPp}`)
    const lines = wrap(this.scene, FONT.dialog, m.description, 216)
    this.desc[0].setText(lines[0] ?? '')
    this.desc[1].setText(lines.slice(1).join(' '))
  }

  tick(): void {}

  input(): void {
    if (controls.repeat('up')) {
      this.index = (this.index + this.moves.length - 1) % this.moves.length
      audio.sfx('select')
      this.render()
    } else if (controls.repeat('down')) {
      this.index = (this.index + 1) % this.moves.length
      audio.sfx('select')
      this.render()
    } else if (controls.justPressed('A')) {
      controls.consume('A')
      audio.sfx('select')
      this.finish(this.index)
    } else if (controls.justPressed('B')) {
      controls.consume('B')
      audio.sfx('cancel')
      this.finish(-1)
    }
  }

  private finish(i: number): void {
    this.done = true
    this.stack.remove(this)
    for (const o of this.objs) o.destroy()
    const r = this.res
    this.res = undefined
    r?.(i)
  }
}
