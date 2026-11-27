// Letter-grid naming screen (player name, nicknames). Usable from any scene:
//   const name = await new NameEntryScreen(scene, stack, { title: 'Your name?', initial: 'Arjun', max: 8 }).run()
// Controls: arrows move, A types / runs a command, B deletes, START jumps to OK.

import Phaser from 'phaser'
import { COLORS, FONT, W } from '../../config'
import { controls } from '../../controls'
import { audio } from '../../audio'
import { ensureTexture } from '../../assets'
import { drawPanel, drawStripes } from '../draw'
import { ListMenu } from '../ListMenu'
import { PxText, measure } from '../text'
import { Screen } from './Screen'
import type { WidgetStack } from '../WidgetStack'

export interface NameEntryOptions {
  /** Prompt line, e.g. "Your name?" or "Nickname for Gemma 4?". */
  title: string
  /** Starting text (and the name used if the player confirms an empty field). */
  initial?: string
  /** Max characters (default 8). */
  max?: number
  /** Texture key shown beside the prompt (e.g. 'chars/player', 'mons/gemma_4_icon'). */
  icon?: string
  /** Optional preset names, offered by a "PICK A NAME FOR ME" row. */
  presets?: string[]
}

// 10 columns; the last letter row carries . - ' ! on both pages, the digit row is shared.
const UPPER = ['ABCDEFGHIJ', 'KLMNOPQRST', "UVWXYZ.-'!", '0123456789']
const LOWER = ['abcdefghij', 'klmnopqrst', "uvwxyz.-'!", '0123456789']
const GRID_ROWS = 4
const COLS = 10
type Cmd = 'case' | 'space' | 'del' | 'ok' | 'pick'

const GX = 30 // grid left
const GY = 56 // grid top
const CW = 18 // cell width
const CH = 16 // cell height

export class NameEntryScreen extends Screen<string> {
  private o: Required<Omit<NameEntryOptions, 'icon' | 'presets'>> & Pick<NameEntryOptions, 'icon' | 'presets'>
  private name: string
  private lower = false
  private cx = 0
  private cy = 0
  private letters: PxText[] = []
  private field: PxText
  private count: PxText
  private caret: Phaser.GameObjects.Rectangle
  private cursor: Phaser.GameObjects.Graphics
  private cmds: Array<{ id: Cmd; label: string; x: number; w: number; t?: PxText }> = []
  private busy = false

  constructor(scene: Phaser.Scene, stack: WidgetStack, o: NameEntryOptions) {
    super(scene, stack, 2200)
    this.o = { title: o.title, initial: o.initial ?? '', max: o.max ?? 8, icon: o.icon, presets: o.presets }
    this.name = (o.initial ?? '').slice(0, this.o.max)
    const g = this.gfx()
    drawStripes(g, 240, 160, 0x3a6c8c, 0x426f94 + 0x040404)
    // header: icon + prompt + name field
    drawPanel(g, 4, 4, 232, 46)
    let tx = 12
    if (o.icon) {
      const key = ensureTexture(scene, o.icon, 16, 16)
      const img = this.image(12, 10, key, 0)
      if (img.width > 16) img.setCrop(0, 0, 16, img.height >= 24 ? 24 : 16)
      tx = 34
    }
    this.text(tx, 9, this.o.title)
    g.fillStyle(COLORS.frame[2])
    g.fillRect(tx, 40, this.o.max * 8, 1)
    this.field = this.text(tx, 27, '')
    this.count = this.text(216, 30, '', { font: FONT.mini, shadow: 'drop' })
    this.caret = scene.add.rectangle(0, 37, 6, 2, COLORS.accent[1]).setOrigin(0, 0)
    this.root.add(this.caret)
    // grid panel
    drawPanel(g, 22, 52, 196, 104)
    for (let r = 0; r < GRID_ROWS; r++) for (let c = 0; c < COLS; c++) this.letters.push(this.text(GX + c * CW + 4, GY + r * CH + 3, ''))
    // command row(s)
    const row: Array<[Cmd, string]> = [['case', 'abc'], ['space', 'SPACE'], ['del', 'DEL'], ['ok', 'OK']]
    let x = GX
    for (const [id, label] of row) {
      const w = measure(scene, FONT.dialog, label) + 12
      this.cmds.push({ id, label, x, w, t: this.text(x + 6, GY + GRID_ROWS * CH + 5, label) })
      x += w + 6
    }
    if (o.presets?.length) {
      const label = 'PICK A NAME FOR ME'
      this.cmds.push({ id: 'pick', label, x: GX, w: measure(scene, FONT.dialog, label) + 12, t: this.text(GX + 6, GY + (GRID_ROWS + 1) * CH + 3, label) })
    }
    this.cursor = this.gfx()
    this.renderGrid()
    this.renderField()
  }

  private get rows(): number {
    return this.o.presets?.length ? GRID_ROWS + 2 : GRID_ROWS + 1
  }

  private rowCmds(r: number): typeof this.cmds {
    return r === GRID_ROWS ? this.cmds.filter((c) => c.id !== 'pick') : this.cmds.filter((c) => c.id === 'pick')
  }

  private renderGrid(): void {
    const set = this.lower ? LOWER : UPPER
    for (let r = 0; r < GRID_ROWS; r++) for (let c = 0; c < COLS; c++) this.letters[r * COLS + c].setText(set[r][c])
    const caseCmd = this.cmds.find((c) => c.id === 'case')!
    caseCmd.t?.setText(this.lower ? 'ABC' : 'abc')
  }

  private renderField(): void {
    this.field.setText(this.name)
    this.count.setText(`${this.name.length}/${this.o.max}`)
    this.caret.setX(this.field.x + (this.name ? this.field.width + 1 : 0))
    this.caret.setVisible(this.name.length < this.o.max)
  }

  private renderCursor(): void {
    const g = this.cursor
    g.clear()
    g.lineStyle(1, COLORS.accent[0])
    if (this.cy < GRID_ROWS) {
      g.strokeRect(GX + this.cx * CW + 0.5, GY + this.cy * CH + 0.5, CW - 3, CH - 1)
    } else {
      const c = this.rowCmds(this.cy)[this.cx]
      const y = GY + this.cy * CH + (this.cy === GRID_ROWS ? 2.5 : 0.5)
      if (c) g.strokeRect(c.x + 0.5, y, c.w, CH - 1)
    }
  }

  tick(): void {
    super.tick()
    this.caret.setAlpha(Math.floor(this.frame / 16) % 2 ? 0.35 : 1)
    this.renderCursor()
  }

  private move(dx: number, dy: number): void {
    const prevRow = this.cy
    this.cy = (this.cy + dy + this.rows) % this.rows
    const width = (r: number) => (r < GRID_ROWS ? COLS : this.rowCmds(r).length)
    if (dy !== 0 && prevRow !== this.cy) {
      // keep roughly the same horizontal position between grid and command rows
      const px = prevRow < GRID_ROWS ? GX + this.cx * CW : (this.rowCmds(prevRow)[this.cx]?.x ?? GX)
      if (this.cy < GRID_ROWS) this.cx = Math.max(0, Math.min(COLS - 1, Math.round((px - GX) / CW)))
      else {
        const cs = this.rowCmds(this.cy)
        let best = 0
        cs.forEach((c, i) => { if (Math.abs(c.x - px) < Math.abs(cs[best].x - px)) best = i })
        this.cx = best
      }
    }
    this.cx = (this.cx + dx + width(this.cy)) % width(this.cy)
    audio.sfx('select')
  }

  private jumpToOk(): void {
    this.cy = GRID_ROWS
    this.cx = this.rowCmds(GRID_ROWS).findIndex((c) => c.id === 'ok')
  }

  private type(ch: string): void {
    if (this.name.length >= this.o.max) {
      audio.sfx('bump')
      return
    }
    this.name += ch
    audio.sfx('select')
    this.renderField()
    if (this.name.length >= this.o.max) this.jumpToOk()
  }

  private del(): void {
    if (!this.name) {
      audio.sfx('bump')
      return
    }
    this.name = this.name.slice(0, -1)
    audio.sfx('cancel')
    this.renderField()
  }

  private finish(): void {
    const n = this.name.trim() || this.o.initial.trim()
    if (!n) {
      audio.sfx('bump')
      return
    }
    audio.sfx('save')
    this.close(n)
  }

  input(): void {
    if (this.busy) return
    if (controls.repeat('left')) this.move(-1, 0)
    else if (controls.repeat('right')) this.move(1, 0)
    else if (controls.repeat('up')) this.move(0, -1)
    else if (controls.repeat('down')) this.move(0, 1)
    else if (controls.justPressed('START')) {
      controls.consume('START', 'A')
      this.jumpToOk()
      audio.sfx('select')
    } else if (controls.justPressed('A')) {
      controls.consume('A')
      if (this.cy < GRID_ROWS) return this.type((this.lower ? LOWER : UPPER)[this.cy][this.cx])
      const c = this.rowCmds(this.cy)[this.cx]
      if (c?.id === 'case') {
        this.lower = !this.lower
        audio.sfx('select')
        this.renderGrid()
      } else if (c?.id === 'space') this.type(' ')
      else if (c?.id === 'del') this.del()
      else if (c?.id === 'ok') this.finish()
      else if (c?.id === 'pick') void this.pick()
    } else if (controls.justPressed('B')) {
      controls.consume('B')
      this.del()
    }
  }

  private async pick(): Promise<void> {
    const presets = this.o.presets ?? []
    this.busy = true
    audio.sfx('select')
    const i = await new ListMenu(this.scene, this.stack, presets.map((label) => ({ label })), {
      x: W - 6, y: 54, anchor: 'tr', depth: 2300, cancelIndex: -1, rows: 5,
    }).result()
    this.busy = false
    if (i >= 0) {
      this.name = presets[i].slice(0, this.o.max)
      this.renderField()
      this.jumpToOk()
    }
  }
}
