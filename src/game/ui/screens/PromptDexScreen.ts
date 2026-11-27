// PromptDex: every species in dex order on the left (7 rows, smooth scroll, cursor memory),
// the highlighted species on the device's display (front sprite, or "???" if never seen) and
// a data panel (types; flavour stats once caught). A on a caught entry opens the data page
// (DexDetailScreen) — big sprite with an idle bob, cry, blurb, base stats, where it lives.
// Layout follows ui/dex_bg (docs/ART_CATALOG_SPRITES.md "PromptDex and Model Storage").
//
// Open: `new PromptDexScreen(scene, stack).run()` (start-menu entry 'dex', flag `got_dex`).
// Reads state.seen / state.caught only.

import Phaser from 'phaser'
import { COLORS, FONT } from '../../config'
import { controls } from '../../controls'
import { audio } from '../../audio'
import { state } from '../../state'
import { dexOrder, speciesAreas, speciesDex, speciesName, speciesTypes } from '../../adapters/monInfo'
import { ensureTexture, isPlaceholder } from '../../assets'
import { PxText, measure, type TextStyle } from '../text'
import { Screen } from './Screen'
import { orbFrames, triangle, typeChip, type Adders } from './screenKit'
import type { WidgetStack } from '../WidgetStack'

const ROWS = 7
const ROW_H = 16
const LIST_X = 10
const LIST_Y = 26
const LIST_W = 108
const SCROLL_STEP = 4 // px per frame while scrolling (16px row → 4 frames)

const HEADER_TEXT: TextStyle = { color: 0xffffff, shadowColor: COLORS.accent[0], shadow: 'full' }
const MINI_HEADER: TextStyle = { font: FONT.mini, color: 0xffffff, shadowColor: COLORS.accent[0], shadow: 'drop' }
const MINI_DARK: TextStyle = { font: FONT.mini, color: COLORS.text, shadowColor: COLORS.textShadow, shadow: 'none' }
const PAPER = 0xfcfaf0
const DIVIDER = 0xf0ead4
const HILITE = 0xfce0a8
const MUTED = 0x6880b8

/** Cursor memory across openings (like the GBA dex). */
const memory = { index: 0, top: 0 }

type Status = 'unseen' | 'seen' | 'caught'
function status(id: string): Status {
  if (state.caught.includes(id)) return 'caught'
  if (state.seen.includes(id)) return 'seen'
  return 'unseen'
}

const pad3 = (n: number) => String(n).padStart(3, '0')

/** Named frames on the dex backdrop (panel / glass) for nine-slices and crops on the data page. */
function dexFrames(scene: Phaser.Scene): void {
  const t = scene.textures.get('ui/dex_bg')
  if (!t || t.has('panel')) return
  t.add('panel', 0, 126, 110, 108, 44)
  t.add('glass', 0, 126, 22, 108, 84)
  t.add('header', 0, 0, 0, 240, 22)
}

interface Row {
  icon: Phaser.GameObjects.Image
  badge: Phaser.GameObjects.Image
  name: PxText
}

export class PromptDexScreen extends Screen<void> {
  private ids: string[]
  private index: number
  private top: number
  private scrollPx: number
  private list: Phaser.GameObjects.Container
  private listG: Phaser.GameObjects.Graphics
  private rows: Row[] = []
  private arrows: Phaser.GameObjects.Graphics
  private side: Phaser.GameObjects.Container
  private busy = false

  constructor(scene: Phaser.Scene, stack: WidgetStack) {
    super(scene, stack)
    orbFrames(scene)
    dexFrames(scene)
    this.ids = dexOrder()
    this.index = Math.min(memory.index, this.ids.length - 1)
    this.top = Math.max(0, Math.min(memory.top, this.ids.length - ROWS, this.index))
    if (this.index > this.top + ROWS - 1) this.top = this.index - ROWS + 1
    this.scrollPx = this.top * ROW_H

    this.image(0, 0, 'ui/dex_bg', '__BASE')
    // scrolling list (all rows; covers above/below clip it to the 7 visible rows)
    this.list = scene.add.container(0, 0)
    this.root.add(this.list)
    this.listG = scene.add.graphics()
    this.list.add(this.listG)
    this.ids.forEach((id, i) => this.buildRow(id, i))
    this.image(0, 0, 'ui/dex_bg', '__BASE').setCrop(4, 0, 120, LIST_Y)
    this.image(0, 0, 'ui/dex_bg', '__BASE').setCrop(4, LIST_Y + ROWS * ROW_H, 120, 160 - (LIST_Y + ROWS * ROW_H))
    this.arrows = this.gfx()
    // header
    this.text(22, 6, 'PromptDex', HEADER_TEXT)
    const seen = this.ids.filter((id) => status(id) !== 'unseen').length
    const caught = this.ids.filter((id) => status(id) === 'caught').length
    const counts = `SEEN ${seen}  CAUGHT ${caught}`
    this.text(205 - measure(scene, FONT.mini, counts), 9, counts, MINI_HEADER)
    // right side (display + data panel), rebuilt on every move
    this.side = scene.add.container(0, 0)
    this.root.add(this.side)
    this.refresh()
  }

  // ------------------------------------------------------------------ list

  private buildRow(id: string, i: number): void {
    const y = LIST_Y + i * ROW_H
    const st = status(id)
    const icon = this.scene.add.image(LIST_X, y, ensureTexture(this.scene, `mons/${id}_icon`, 32, 16), 0).setOrigin(0, 0)
    icon.setVisible(st !== 'unseen')
    if (icon.width > 16) icon.setDisplaySize(16, 16)
    // caught: orb mark at the row's right end (names are ≤ 77px, so x 29..106 stays clear)
    const badge = this.scene.add.image(LIST_X + LIST_W - 10, y + 4, 'ui/orb_slots', '1').setOrigin(0, 0).setVisible(st === 'caught')
    const name = new PxText(this.scene, 29, y + 4, st === 'unseen' ? '----------' : speciesName(id))
    if (st === 'seen') name.setColorName('grey')
    if (st === 'unseen') name.setColor(0xa8a29a, 0xe0dccc)
    this.list.add([icon, badge, ...name.objects()])
    this.rows.push({ icon, badge, name })
  }

  private drawList(): void {
    const g = this.listG
    g.clear()
    const first = Math.max(0, this.top - 1)
    const last = Math.min(this.ids.length - 1, this.top + ROWS)
    for (let i = first; i <= last; i++) {
      const y = LIST_Y + i * ROW_H
      g.fillStyle(PAPER)
      g.fillRect(LIST_X, y, LIST_W, ROW_H)
      if (i === this.index) {
        g.fillStyle(COLORS.accent[1])
        g.fillRect(LIST_X, y, LIST_W, ROW_H - 1)
        g.fillStyle(HILITE)
        g.fillRect(LIST_X + 1, y + 1, LIST_W - 2, ROW_H - 3)
      }
      if (i < this.ids.length - 1) {
        g.fillStyle(DIVIDER)
        g.fillRect(LIST_X + 2, y + ROW_H - 1, LIST_W - 4, 1)
      }
    }
  }

  private drawArrows(): void {
    const g = this.arrows
    g.clear()
    const bob = Math.floor(this.frame / 16) % 2
    if (this.top > 0) triangle(g, 60, 18, 'up', COLORS.accent[1], null)
    if (this.top + ROWS < this.ids.length) triangle(g, 60, 141 + bob, 'down')
  }

  // ------------------------------------------------------------------ right side

  private refresh(): void {
    this.drawList()
    this.drawArrows()
    this.buildSide()
  }

  private buildSide(): void {
    this.side.removeAll(true)
    const id = this.ids[this.index]
    const st = status(id)
    const g = this.scene.add.graphics()
    this.side.add(g)
    const add: Adders = {
      image: (x, y, key, frame) => {
        const im = this.scene.add.image(x, y, key, frame).setOrigin(0, 0)
        this.side.add(im)
        return im
      },
      mini: (x, y, s, color, shadow) => this.sideText(x, y, s, { font: FONT.mini, color, shadowColor: shadow, shadow: 'none' }),
    }
    // display: dex number readout + sprite (or ???)
    this.sideText(133, 28, `NO.${pad3(speciesDex(id).no)}`, { font: FONT.mini, color: MUTED, shadow: 'none' })
    if (st === 'unseen') {
      const w = measure(this.scene, FONT.dialog, '???')
      this.sideText(180 - Math.floor(w / 2), 56, '???', { color: MUTED, shadowColor: 0xc8e4f4 })
    } else {
      const key = ensureTexture(this.scene, `mons/${id}_front`)
      const im = add.image(148, 32, key)
      if (isPlaceholder(key)) im.setAlpha(0.8)
    }
    // data panel: inner (130,114,100,36) → name / types / two mini lines
    if (st === 'unseen') {
      this.sideText(132, 114, '-----', { color: 0xa8a29a, shadowColor: 0xe0dccc })
      this.sideText(132, 139, 'NO DATA', { font: FONT.mini, color: 0xa8a29a, shadow: 'none' })
      return
    }
    this.sideText(132, 114, speciesName(id))
    speciesTypes(id).slice(0, 2).forEach((t, i) => typeChip(g, add, this.scene, 132 + i * 34, 126, t))
    if (st === 'seen') {
      ['CATCH IT TO RECORD', 'MORE DATA.'].forEach((l, i) => this.sideText(132, 139 + i * 6, l, { font: FONT.mini, color: 0x989890, shadow: 'none' }))
      return
    }
    const rows = speciesDex(id).flavour.slice(0, 2)
    const labelW = Math.max(0, ...rows.map((r) => measure(this.scene, FONT.mini, r.label.toUpperCase())))
    rows.forEach((r, i) => {
      this.sideText(132, 139 + i * 6, r.label.toUpperCase(), { font: FONT.mini, color: MUTED, shadow: 'none' })
      this.sideText(132 + labelW + 4, 139 + i * 6, r.value.toUpperCase(), MINI_DARK)
    })
  }

  private sideText(x: number, y: number, s: string, style?: TextStyle): PxText {
    const t = new PxText(this.scene, x, y, s, style)
    this.side.add(t.objects())
    return t
  }

  // ------------------------------------------------------------------ loop

  tick(): void {
    super.tick()
    const target = this.top * ROW_H
    if (this.scrollPx !== target) {
      const d = target - this.scrollPx
      this.scrollPx += Math.sign(d) * Math.min(Math.abs(d), Math.max(SCROLL_STEP, Math.abs(d) >= ROW_H * 3 ? Math.ceil(Math.abs(d) / 4) : SCROLL_STEP))
      this.list.y = -this.scrollPx
      this.drawList()
    }
    const sel = this.rows[this.index]
    if (sel?.icon.visible) {
      sel.icon.setFrame(Math.floor(this.frame / 10) % 2)
      if (sel.icon.width > 16) sel.icon.setDisplaySize(16, 16)
    }
    if (this.frame % 16 === 0) this.drawArrows()
  }

  private move(to: number): void {
    to = Math.max(0, Math.min(this.ids.length - 1, to))
    if (to === this.index) return
    const prev = this.rows[this.index]
    if (prev?.icon.visible) prev.icon.setFrame(0)
    this.index = to
    if (this.index < this.top) this.top = this.index
    if (this.index > this.top + ROWS - 1) this.top = this.index - ROWS + 1
    this.top = Math.max(0, Math.min(this.top, Math.max(0, this.ids.length - ROWS)))
    audio.sfx('select')
    this.refresh()
  }

  input(): void {
    if (this.busy) return
    if (controls.repeat('up')) this.move(this.index - 1)
    else if (controls.repeat('down')) this.move(this.index + 1)
    else if (controls.repeat('left')) this.page(-1)
    else if (controls.repeat('right')) this.page(1)
    else if (controls.justPressed('A')) {
      controls.consume('A')
      const id = this.ids[this.index]
      if (status(id) !== 'caught') {
        audio.sfx('bump')
        return
      }
      audio.sfx('select')
      void this.openDetail()
    } else if (controls.justPressed('B') || controls.justPressed('START')) {
      controls.consume('B', 'START')
      audio.sfx('cancel')
      memory.index = this.index
      memory.top = this.top
      this.close()
    }
  }

  /** Left/right: jump a page (7 entries), keeping the cursor's row. */
  private page(dir: number): void {
    const n = this.ids.length
    if ((dir < 0 && this.index === 0) || (dir > 0 && this.index === n - 1)) return
    const row = this.index - this.top
    const maxTop = Math.max(0, n - ROWS)
    const top = Math.max(0, Math.min(maxTop, this.top + dir * ROWS))
    let to = top + row
    if (top === this.top) to = dir < 0 ? 0 : n - 1
    this.top = top
    const prev = this.rows[this.index]
    if (prev?.icon.visible) prev.icon.setFrame(0)
    this.index = Math.max(0, Math.min(n - 1, to))
    audio.sfx('select')
    this.refresh()
  }

  private async openDetail(): Promise<void> {
    this.busy = true
    const caught = this.ids.filter((id) => status(id) === 'caught')
    this.setVisible(false)
    const id = await new DexDetailScreen(this.scene, this.stack, caught, caught.indexOf(this.ids[this.index])).run()
    this.setVisible(true)
    this.busy = false
    const i = this.ids.indexOf(id)
    if (i >= 0 && i !== this.index) {
      this.index = i
      if (this.index < this.top) this.top = this.index
      if (this.index > this.top + ROWS - 1) this.top = this.index - ROWS + 1
      this.scrollPx = this.top * ROW_H
      this.list.y = -this.scrollPx
    }
    this.refresh()
  }

  close(): void {
    memory.index = this.index
    memory.top = this.top
    super.close()
  }
}

// ===================================================================== data page

const STAT_ROWS: Array<[string, 'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe']> = [
  ['HP', 'hp'], ['ATK', 'atk'], ['DEF', 'def'], ['SPA', 'spa'], ['SPD', 'spd'], ['SPE', 'spe'],
]
const STAT_MAX = 140

/**
 * Data page for one caught species. ←/→ (and ↑/↓) page through the caught entries, A/B
 * close. Resolves with the species id shown last (the list cursor follows it).
 */
export class DexDetailScreen extends Screen<string> {
  private ids: string[]
  private index: number
  private dyn: Phaser.GameObjects.Container
  private sprite?: Phaser.GameObjects.Image
  private arrows: Phaser.GameObjects.Graphics

  constructor(scene: Phaser.Scene, stack: WidgetStack, ids: string[], index: number) {
    super(scene, stack, 2010)
    dexFrames(scene)
    this.ids = ids
    this.index = Math.max(0, index)
    // shell: backdrop header + plain dotted body, then our own panels
    this.image(0, 0, 'ui/dex_bg', '__BASE')
    const g = this.gfx()
    g.fillStyle(0x283048)
    g.fillRect(4, 18, 232, 138)
    g.fillStyle(0x20263a)
    for (let y = 18; y < 156; y++) for (let x = 4; x < 236; x++) {
      const m = `${x % 8},${y % 8}`
      if (m === '2,3' || m === '4,6' || m === '6,5') g.fillRect(x, y, 1, 1)
    }
    this.image(6, 22, 'ui/dex_bg', 'glass')
    this.root.add(scene.add.nineslice(118, 22, 'ui/dex_bg', 'panel', 116, 84, 8, 8, 8, 8).setOrigin(0, 0))
    this.root.add(scene.add.nineslice(6, 110, 'ui/dex_bg', 'panel', 228, 44, 8, 8, 8, 8).setOrigin(0, 0))
    this.dyn = scene.add.container(0, 0)
    this.root.add(this.dyn)
    this.arrows = this.gfx()
    this.build()
  }

  private t(x: number, y: number, s: string, style?: TextStyle): PxText {
    const t = new PxText(this.scene, x, y, s, style)
    this.dyn.add(t.objects())
    return t
  }

  private build(): void {
    this.dyn.removeAll(true)
    const id = this.ids[this.index]
    if (!id) return
    const dex = speciesDex(id)
    const g = this.scene.add.graphics()
    this.dyn.add(g)
    const add: Adders = {
      image: (x, y, key, frame) => {
        const im = this.scene.add.image(x, y, key, frame).setOrigin(0, 0)
        this.dyn.add(im)
        return im
      },
      mini: (x, y, s, color, shadow) => this.t(x, y, s, { font: FONT.mini, color, shadowColor: shadow, shadow: 'none' }),
    }
    // header
    this.t(22, 6, `No.${pad3(dex.no)}  ${speciesName(id)}`, HEADER_TEXT)
    // display
    const key = ensureTexture(this.scene, `mons/${id}_front`)
    this.sprite = add.image(28, 32, key)
    if (isPlaceholder(key)) this.sprite.setAlpha(0.8)
    // flavour rows (+ area) — right panel inner ≈ (122,26)-(229,101)
    const flav = [...dex.flavour.slice(0, 2)]
    const areas = speciesAreas(id)
    flav.push({ label: 'Area', value: areas.length ? areas.join(', ') : 'Unknown' })
    const labelW = Math.max(...flav.map((r) => measure(this.scene, FONT.mini, r.label.toUpperCase())))
    flav.forEach((r, i) => {
      const y = 29 + i * 8
      this.t(123, y, r.label.toUpperCase(), { font: FONT.mini, color: MUTED, shadow: 'none' })
      this.t(123 + labelW + 4, y, r.value.toUpperCase(), MINI_DARK)
    })
    g.fillStyle(COLORS.paper[0])
    g.fillRect(123, 53, 106, 1)
    STAT_ROWS.forEach(([label, k], i) => {
      const y = 57 + i * 7
      const v = dex.baseStats[k]
      this.t(123, y, label, { font: FONT.mini, color: MUTED, shadow: 'none' })
      const s = String(v)
      this.t(155 - measure(this.scene, FONT.mini, s), y, s, MINI_DARK)
      const bw = 70
      const fw = Math.max(v > 0 ? 1 : 0, Math.round((Math.min(v, STAT_MAX) / STAT_MAX) * bw))
      g.fillStyle(COLORS.paper[0])
      g.fillRect(158, y + 1, bw, 3)
      const col = [0x1e6e6a, 0x48bcae]
      g.fillStyle(col[0])
      g.fillRect(158, y + 1, fw, 3)
      g.fillStyle(col[1])
      g.fillRect(158, y + 1, fw, 2)
    })
    // bottom panel: category + chips, then the two blurb lines
    this.t(12, 114, dex.category ? `${dex.category} LLMMON` : 'LLMMON')
    const types = speciesTypes(id).slice(0, 2)
    types.forEach((t, i) => typeChip(g, add, this.scene, 228 - 32 - (types.length - 1 - i) * 34, 115, t))
    dex.lines.forEach((l, i) => this.t(12, 127 + i * 12, l))
    audio.cry(id)
  }

  private drawArrows(): void {
    const g = this.arrows
    g.clear()
    if (this.ids.length < 2) return
    const bob = Math.floor(this.frame / 16) % 2
    triangle(g, 9 - bob, 58, 'left')
    triangle(g, 105 + bob, 58, 'right')
  }

  tick(): void {
    super.tick()
    if (this.sprite) this.sprite.y = 32 - (Math.floor(this.frame / 24) % 2)
    if (this.frame % 16 === 1) this.drawArrows()
  }

  input(): void {
    if (controls.justPressed('A') || controls.justPressed('B') || controls.justPressed('START')) {
      controls.consume('A', 'B', 'START')
      audio.sfx('cancel')
      this.close(this.ids[this.index])
      return
    }
    if (this.ids.length < 2) return
    let d = 0
    if (controls.repeat('right') || controls.repeat('down')) d = 1
    else if (controls.repeat('left') || controls.repeat('up')) d = -1
    if (!d) return
    this.index = (this.index + d + this.ids.length) % this.ids.length
    audio.sfx('select')
    this.build()
  }
}
