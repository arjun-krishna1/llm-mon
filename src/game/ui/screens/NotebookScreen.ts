// The Notebook: a spiral notebook with two tabs (BUILD lecture pages, SAFETY arc pages).
// List view: page titles with found / not-yet-found state. A opens a found page: title,
// three sentences on ruled lines, credit + source. ←/→ switch tab (list) or flip pages.

import Phaser from 'phaser'
import { COLORS, FONT } from '../../config'
import { controls } from '../../controls'
import { audio } from '../../audio'
import { state } from '../../state'
import { notebookPages, pageFound, type NotebookPage, type NotebookTab } from '../../systems/notebook'
import { wrap } from '../text'
import { triangle } from './screenKit'
import { Screen } from './Screen'
import type { WidgetStack } from '../WidgetStack'

const TABS: Array<{ id: NotebookTab; label: string; color: number; dark: number }> = [
  { id: 'build', label: 'BUILD', color: 0x5c94e0, dark: 0x2c4a8c },
  { id: 'safety', label: 'SAFETY', color: 0xe06c5c, dark: 0x8c2c34 },
]

const PAPER = 0xfcfaf0
const RULE = 0xb4d4ec
const MARGIN = 0xf0a8a0
const X0 = 16
const Y0 = 16
const PW = 214
const PH = 140
const LINE0 = 44 // first ruled line (text baseline row top)
const LH = 14
const TEXT_X = 50
const TEXT_W = 172

let rememberTab = 0
const rememberRow: Record<string, number> = {}

export class NotebookScreen extends Screen<void> {
  private tab = rememberTab
  private row = 0
  private mode: 'list' | 'page' = 'list'
  private g: Phaser.GameObjects.Graphics
  private content: Phaser.GameObjects.Container
  private pages: NotebookPage[] = []

  constructor(scene: Phaser.Scene, stack: WidgetStack) {
    super(scene, stack, 2100)
    const bg = this.gfx()
    // desk
    bg.fillStyle(0x7a5438)
    bg.fillRect(0, 0, 240, 160)
    bg.fillStyle(0x6b4630)
    for (let y = 3; y < 160; y += 7) bg.fillRect(0, y, 240, 1)
    bg.fillStyle(0x946240)
    for (let y = 0; y < 160; y += 23) bg.fillRect((y * 37) % 200, y + 2, 40, 1)
    this.g = this.gfx()
    this.content = scene.add.container(0, 0)
    this.root.add(this.content)
    this.row = rememberRow[TABS[this.tab].id] ?? 0
    this.refresh()
  }

  private refresh(): void {
    this.pages = notebookPages(TABS[this.tab].id)
    this.row = Math.max(0, Math.min(this.row, Math.max(0, this.pages.length - 1)))
    this.render()
  }

  private clearContent(): void {
    this.content.removeAll(true)
  }

  private t(x: number, y: number, s: string, o: { font?: 'mini'; color?: number; shadow?: number } = {}): void {
    const px = this.text(x, y, s, {
      font: o.font === 'mini' ? FONT.mini : FONT.dialog,
      color: o.color ?? COLORS.text,
      shadowColor: o.shadow ?? 0xe8e2cc,
      shadow: o.font === 'mini' ? 'none' : 'drop',
    })
    // move from root into the content container so a re-render clears it
    const objs = px.objects()
    this.root.remove(objs)
    this.content.add(objs)
  }

  private drawNotebook(): void {
    const g = this.g
    g.clear()
    // tabs (behind the paper top edge)
    TABS.forEach((tb, i) => {
      const x = 134 + i * 46
      const on = i === this.tab
      const y = on ? 4 : 7
      g.fillStyle(COLORS.outline)
      g.fillRect(x, y, 44, 16)
      g.fillStyle(on ? tb.color : tb.dark)
      g.fillRect(x + 1, y + 1, 42, 15)
      g.fillStyle(0xffffff, on ? 0.35 : 0.15)
      g.fillRect(x + 2, y + 2, 40, 1)
    })
    // shadow + cover edge
    g.fillStyle(0x28222e, 0.45)
    g.fillRect(X0 + 3, Y0 + 3, PW, PH)
    g.fillStyle(0x3c3048)
    g.fillRect(X0 - 1, Y0 - 1, PW + 2, PH + 2)
    g.fillStyle(0x24408c)
    g.fillRect(X0, Y0, PW, PH)
    // paper (slightly inset from the cover)
    g.fillStyle(0xd8d0b8)
    g.fillRect(X0 + 2, Y0 + 2, PW - 3, PH - 3)
    g.fillStyle(PAPER)
    g.fillRect(X0 + 2, Y0 + 2, PW - 4, PH - 4)
    // ruled lines + margin
    g.fillStyle(RULE)
    for (let y = LINE0 + 11; y < Y0 + PH - 6; y += LH) g.fillRect(X0 + 16, y, PW - 20, 1)
    g.fillStyle(MARGIN)
    g.fillRect(TEXT_X - 6, Y0 + 3, 1, PH - 6)
    // header rule
    g.fillStyle(TABS[this.tab].color)
    g.fillRect(X0 + 16, LINE0 - 4, PW - 20, 1)
    // spiral binding down the left edge: punched holes + wire rings
    for (let y = Y0 + 8; y < Y0 + PH - 6; y += 12) {
      g.fillStyle(0x7a5438)
      g.fillRect(X0 + 9, y + 1, 4, 4)
      g.fillStyle(0x28222e)
      g.fillRect(X0 + 10, y + 2, 2, 2)
      // ring: dark outline, metal body, highlight
      g.fillStyle(0x4a5262)
      g.fillRect(X0 - 4, y, 16, 3)
      g.fillStyle(0xa8b4c0)
      g.fillRect(X0 - 3, y, 14, 2)
      g.fillStyle(0xdce4ea)
      g.fillRect(X0 - 2, y, 6, 1)
    }
  }

  private render(): void {
    this.drawNotebook()
    this.clearContent()
    const tb = TABS[this.tab]
    TABS.forEach((x, i) => {
      const n = notebookPages(x.id).filter((p) => pageFound(p.id)).length
      this.t(138 + i * 46, i === this.tab ? 6 : 9, x.label, { font: 'mini', color: 0xfcfaf0 })
      this.t(166 + i * 46 + (x.id === 'safety' ? 4 : 0), i === this.tab ? 6 : 9, `${n}`, { font: 'mini', color: 0xfcfaf0 })
    })
    if (this.mode === 'list') this.renderList(tb)
    else this.renderPage(tb)
  }

  private renderList(tb: (typeof TABS)[number]): void {
    const found = this.pages.filter((p) => pageFound(p.id)).length
    this.t(TEXT_X, 22, tb.id === 'build' ? 'Lecture Notes' : 'Safety Notes', { color: tb.dark })
    this.t(TEXT_X + 128, 26, `${found}/${this.pages.length} FOUND`, { font: 'mini', color: 0x989890 })
    if (!this.pages.length) {
      this.t(TEXT_X, LINE0, 'No pages yet.', { color: 0x989890 })
      return
    }
    const rows = 7
    const top = Math.max(0, Math.min(this.row - 3, this.pages.length - rows))
    for (let i = 0; i < Math.min(rows, this.pages.length); i++) {
      const p = this.pages[top + i]
      const y = LINE0 + i * LH
      const has = pageFound(p.id)
      this.t(TEXT_X - 22, y + 2, String(p.order).padStart(2, ' '), { font: 'mini', color: has ? tb.dark : 0xb8b4a4 })
      if (has) {
        this.t(TEXT_X, y - 1, p.title, { color: COLORS.text })
        // check mark
        const g = this.g
        g.fillStyle(0x2c9458)
        const cx = X0 + PW - 18
        const cy = y + 3
        ;[[0, 3], [1, 4], [2, 5], [3, 4], [4, 3], [5, 2], [6, 1], [7, 0]].forEach(([dx, dy]) => g.fillRect(cx + dx, cy + dy, 1, 2))
      } else {
        this.t(TEXT_X, y - 1, '- - - - - - -', { color: 0xc8c4b0 })
        this.t(TEXT_X + 84, y + 3, 'NOT YET FOUND', { font: 'mini', color: 0xb8b4a4 })
      }
      if (top + i === this.row) {
        const g = this.g
        g.fillStyle(tb.dark)
        triangle(g, TEXT_X - 13, y + 1, 'right', tb.color, COLORS.outline)
      }
    }
    if (top > 0) triangle(this.g, X0 + PW - 16, LINE0 - 12, 'up')
    if (top + rows < this.pages.length) triangle(this.g, X0 + PW - 16, Y0 + PH - 10, 'down')
    this.t(TEXT_X, Y0 + PH - 10, 'A:READ  B:CLOSE  L/R:TAB', { font: 'mini', color: 0xa8a49c })
  }

  private renderPage(tb: (typeof TABS)[number]): void {
    const p = this.pages[this.row]
    if (!p) return
    this.t(TEXT_X, 22, p.title, { color: tb.dark })
    this.t(X0 + PW - 30, 26, `P.${p.order}`, { font: 'mini', color: 0x989890 })
    // sentences, each starting on a fresh ruled line
    let line = 0
    const maxLines = 6
    for (const s of p.lines) {
      for (const l of wrap(this.scene, FONT.dialog, s, TEXT_W)) {
        if (line >= maxLines) break
        this.t(TEXT_X, LINE0 + line * LH - 2, l)
        line++
      }
    }
    const cy = LINE0 + maxLines * LH + 1
    if (p.credit) this.t(TEXT_X, cy, `CREDIT: ${p.credit}`.slice(0, 44), { font: 'mini', color: tb.dark })
    if (p.source) this.t(TEXT_X, cy + 8, `SOURCE: ${p.source}`.slice(0, 44), { font: 'mini', color: 0x989890 })
    // flip hints
    const found = this.pages.map((q, i) => (pageFound(q.id) ? i : -1)).filter((i) => i >= 0)
    const k = found.indexOf(this.row)
    if (k > 0) triangle(this.g, X0 + 18, Y0 + PH - 11, 'left', tb.color)
    if (k >= 0 && k < found.length - 1) triangle(this.g, X0 + PW - 12, Y0 + PH - 11, 'right', tb.color)
  }

  input(): void {
    if (this.mode === 'list') {
      if (controls.repeat('up') && this.pages.length) {
        this.row = (this.row - 1 + this.pages.length) % this.pages.length
        audio.sfx('select')
        this.render()
      } else if (controls.repeat('down') && this.pages.length) {
        this.row = (this.row + 1) % this.pages.length
        audio.sfx('select')
        this.render()
      } else if (controls.justPressed('left') || controls.justPressed('right')) {
        rememberRow[TABS[this.tab].id] = this.row
        this.tab = (this.tab + 1) % TABS.length
        rememberTab = this.tab
        this.row = rememberRow[TABS[this.tab].id] ?? 0
        audio.sfx('select')
        this.refresh()
      } else if (controls.justPressed('A')) {
        controls.consume('A')
        const p = this.pages[this.row]
        if (p && pageFound(p.id)) {
          audio.sfx('select')
          this.mode = 'page'
          state.setFlag(`nb_read_${p.id}`)
          this.render()
        } else audio.sfx('bump')
      } else if (controls.justPressed('B') || controls.justPressed('START')) {
        controls.consume('A', 'B', 'START')
        rememberRow[TABS[this.tab].id] = this.row
        audio.sfx('cancel')
        this.close()
      }
      return
    }
    // page view
    const found = this.pages.map((q, i) => (pageFound(q.id) ? i : -1)).filter((i) => i >= 0)
    const k = found.indexOf(this.row)
    if ((controls.justPressed('left') || controls.justPressed('up')) && k > 0) {
      this.row = found[k - 1]
      audio.sfx('select')
      this.render()
    } else if ((controls.justPressed('right') || controls.justPressed('down')) && k >= 0 && k < found.length - 1) {
      this.row = found[k + 1]
      audio.sfx('select')
      this.render()
    } else if (controls.justPressed('A') || controls.justPressed('B')) {
      controls.consume('A', 'B')
      audio.sfx('cancel')
      this.mode = 'list'
      this.render()
    }
  }
}
