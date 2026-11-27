// Model Storage System (the Model Center terminal): box grid (6×5 = 30 per box) on the left,
// party column on the right, a hand cursor that moves between them, and an info bar with
// the hovered mon's name / level / types. A on a mon → WITHDRAW or DEPOSIT, MOVE (box
// mons: grab, then A to drop / swap), SUMMARY, CANCEL. B closes (no confirmation).
//
// Storage model: `state.box` stays one flat array; box k shows entries [30k, 30k+30). The
// array is always compact, so only the last box has free slots and a deposit appends there.
// Rules: the last party member / last conscious party member can't be deposited; nothing
// can be withdrawn into a full party (6); stored mons are fully healed when they go in or
// come out (classic PC behaviour). Everything lives in state.party / state.box, which the
// normal save already persists.
//
// Open: `openStorage(ui)` (fades + pc_on/pc_off) — scripts use `s.storage()`.

import Phaser from 'phaser'
import { COLORS, FONT } from '../../config'
import { controls } from '../../controls'
import { audio } from '../../audio'
import { state } from '../../state'
import { healMon, monName, speciesTypes } from '../../adapters/monInfo'
import { ensureTexture } from '../../assets'
import { DialogBox } from '../DialogBox'
import { ListMenu } from '../ListMenu'
import { PxText, measure, type TextStyle } from '../text'
import { Screen } from './Screen'
import { SummaryScreen } from './SummaryScreen'
import { fitText, handTexture, typePill, type Adders } from './screenKit'
import type { MonInstance } from '../../types'
import type { WidgetStack } from '../WidgetStack'
import type { UIScene } from '../../scenes/UIScene'
import { registerScript } from '../../script/registry'

export const BOX_SIZE = 30
export const MAX_BOXES = 8
const COLS = 6
const ROWS = 5
const GRID_X = 14
const GRID_Y = 36
const PITCH = 20
const PARTY_X = 152
const PARTY_Y = 34
const PARTY_NAME_X = 176
const PARTY_NAME_MAX = 229 - PARTY_NAME_X
const HEADER_TEAL = 0x2a9490

const WHITE: TextStyle = { color: 0xfcfaf0, shadowColor: 0x101a22, shadow: 'drop' }
const BOX_TITLE: TextStyle = { color: 0xffffff, shadowColor: 0x1a5c58, shadow: 'full' }
const PARTY_TITLE: TextStyle = { color: 0xffffff, shadowColor: COLORS.accent[0], shadow: 'full' }

type Area = 'box' | 'party' | 'header'

/** Number of boxes in use (at least one). */
export function boxCount(): number {
  return Math.max(1, Math.ceil(state.box.length / BOX_SIZE))
}

/** Box view k as a fresh array (the mons are the live objects). */
export function boxPage(k: number): MonInstance[] {
  return state.box.slice(k * BOX_SIZE, k * BOX_SIZE + BOX_SIZE)
}

/** Why `party[i]` can't be deposited, or null. */
export function depositRefusal(i: number): string | null {
  const p = state.party
  if (!p[i]) return null
  if (p.length <= 1) return 'That’s your last LLMMON!\nYou can’t deposit it.'
  if (!p.some((m, j) => j !== i && m.hp > 0)) return 'You need at least one LLMMON\nthat can still battle!'
  if (state.box.length >= MAX_BOXES * BOX_SIZE) return 'The Model Storage is full!'
  return null
}

export function withdrawRefusal(): string | null {
  return state.party.length >= 6 ? 'Your party is full!\nDeposit a LLMMON first.' : null
}

/** Deposit party[i] (healed). Returns the box number (1-based) it went to, or null if refused. */
export function depositMon(i: number): number | null {
  if (depositRefusal(i) !== null || !state.party[i]) return null
  const [m] = state.party.splice(i, 1)
  healMon(m)
  state.box.push(m)
  return Math.ceil(state.box.length / BOX_SIZE)
}

/** Withdraw box entry `flat` (healed) into the party. False if refused. */
export function withdrawMon(flat: number): boolean {
  if (withdrawRefusal() !== null || !state.box[flat]) return false
  const [m] = state.box.splice(flat, 1)
  healMon(m)
  state.party.push(m)
  return true
}

/** Fade in the storage screen over whatever is running (UI scene), with the PC sounds. */
export async function openStorage(ui: UIScene): Promise<void> {
  audio.sfx('pc_on')
  await ui.fade(1, 160)
  const p = new StorageScreen(ui, ui.stack).run()
  await ui.fade(0, 160)
  await p
  audio.sfx('pc_off')
  await ui.fade(1, 160)
  await ui.fade(0, 160)
  controls.consumeAll()
}

/** Ready-made script: point a map prop / sign / npc `script` at it (or `__llmmon.runScript('storage.open')`). */
registerScript('storage.open', async (s) => {
  await s.storage()
})

export class StorageScreen extends Screen<void> {
  private area: Area = 'box'
  private col = 0
  private row = 0
  private pidx = 0
  private box = 0
  /** Flat index of the mon being carried (MOVE), or -1. */
  private held = -1
  private busy = false
  private message: string | null = null

  private sel: Phaser.GameObjects.Image
  private gridIcons: Phaser.GameObjects.Image[] = []
  private partyIcons: Phaser.GameObjects.Image[] = []
  private partyNames: PxText[] = []
  private hand: Phaser.GameObjects.Image
  private carried: Phaser.GameObjects.Image
  private arrowCover: Phaser.GameObjects.Graphics
  private boxTitle: PxText
  private boxCountText: PxText
  private partyCountText: PxText
  private info: Phaser.GameObjects.Container
  private dialog: DialogBox

  constructor(scene: Phaser.Scene, stack: WidgetStack) {
    super(scene, stack)
    handTexture(scene)
    this.image(0, 0, 'ui/storage_bg')
    this.arrowCover = this.gfx()
    this.sel = this.image(0, 0, 'ui/slot_sel')
    for (let i = 0; i < BOX_SIZE; i++) {
      const c = i % COLS
      const r = Math.floor(i / COLS)
      this.gridIcons.push(this.image(GRID_X + c * PITCH + 2, GRID_Y + r * PITCH + 2, '__WHITE').setVisible(false))
    }
    for (let i = 0; i < 6; i++) {
      this.partyIcons.push(this.image(PARTY_X + 2, PARTY_Y + i * PITCH + 2, '__WHITE').setVisible(false))
      this.partyNames.push(this.text(PARTY_NAME_X, PARTY_Y + 4 + i * PITCH, '', WHITE))
    }
    this.boxTitle = this.text(24, 11, '', BOX_TITLE)
    this.boxCountText = this.text(0, 14, '', { font: FONT.mini, color: 0xd8f4ee, shadowColor: 0x1a5c58, shadow: 'drop' })
    this.text(166, 11, 'PARTY', PARTY_TITLE)
    this.partyCountText = this.text(0, 14, '', { font: FONT.mini, color: 0xfce0a8, shadowColor: COLORS.accent[0], shadow: 'drop' })
    this.info = scene.add.container(0, 0)
    this.root.add(this.info)
    this.hand = this.image(0, 0, 'ui/hand_cursor', 0)
    this.carried = this.image(0, 0, '__WHITE').setVisible(false)
    this.dialog = new DialogBox(scene, stack, { depth: 2300 })
    if (!state.party.length) this.area = 'box'
    this.redraw()
  }

  // ------------------------------------------------------------------ helpers

  private flatIndex(): number {
    return this.box * BOX_SIZE + this.row * COLS + this.col
  }

  private hovered(): MonInstance | undefined {
    if (this.area === 'box') return state.box[this.flatIndex()]
    if (this.area === 'party') return state.party[this.pidx]
    return undefined
  }

  private slotPos(): { x: number; y: number } {
    if (this.area === 'box') return { x: GRID_X + this.col * PITCH, y: GRID_Y + this.row * PITCH }
    if (this.area === 'party') return { x: PARTY_X, y: PARTY_Y + this.pidx * PITCH }
    return { x: 64, y: 10 }
  }

  private setIcon(img: Phaser.GameObjects.Image, mon: MonInstance | undefined): void {
    if (!mon) {
      img.setVisible(false)
      return
    }
    const key = ensureTexture(this.scene, `mons/${mon.speciesId}_icon`, 32, 16)
    if (img.texture.key !== key) img.setTexture(key, 0)
    if (img.width > 16) img.setDisplaySize(16, 16)
    img.setVisible(true)
  }

  // ------------------------------------------------------------------ drawing

  private redraw(): void {
    const nBoxes = boxCount()
    this.box = Math.min(this.box, nBoxes - 1)
    // header: box name, count, ◀ ▶ only when there is more than one box
    this.boxTitle.setText(`BOX ${this.box + 1}`)
    const count = `${boxPage(this.box).length}/${BOX_SIZE}`
    this.boxCountText.setText(count).setPosition(128 - measure(this.scene, FONT.mini, count), 14)
    const g = this.arrowCover
    g.clear()
    if (nBoxes < 2) {
      g.fillStyle(HEADER_TEAL)
      g.fillRect(12, 12, 4, 8)
      g.fillRect(134, 12, 4, 8)
    }
    const pc = `${state.party.length}/6`
    this.partyCountText.setText(pc).setPosition(228 - measure(this.scene, FONT.mini, pc), 14)
    // grid
    const page = boxPage(this.box)
    this.gridIcons.forEach((img, i) => {
      const flat = this.box * BOX_SIZE + i
      this.setIcon(img, flat === this.held ? undefined : page[i])
    })
    // party
    for (let i = 0; i < 6; i++) {
      const m = state.party[i]
      this.setIcon(this.partyIcons[i], m)
      const name = m ? fitText(this.scene, FONT.dialog, monName(m), PARTY_NAME_MAX) : ''
      this.partyNames[i].setText(name)
      if (m && m.hp <= 0) this.partyNames[i].setColor(0xf0a8a0, 0x401a1a)
      else this.partyNames[i].setColor(WHITE.color!, WHITE.shadowColor)
    }
    // carried mon
    const heldMon = this.held >= 0 ? state.box[this.held] : undefined
    this.setIcon(this.carried, heldMon)
    this.placeCursor()
    this.drawInfo()
  }

  private placeCursor(): void {
    const { x, y } = this.slotPos()
    const bob = Math.floor(this.frame / 16) % 2
    const onSlot = this.area !== 'header'
    this.sel.setVisible(onSlot).setPosition(x, y)
    if (this.held >= 0) {
      // carried mon floats over the slot, gripped by the closed hand (drawn behind it)
      this.carried.setPosition(x + 2, y - 5 + bob)
      this.hand.setFrame(1).setPosition(x + 6, y - 13 + bob)
    } else if (onSlot) {
      this.hand.setFrame(0).setPosition(x + 6, y - 9 + bob)
    } else {
      // above the box name (fingertip just over the caps)
      this.hand.setFrame(0).setPosition(24 + Math.floor(this.boxTitle.width / 2) - 6, -3 + bob)
    }
  }

  private drawInfo(): void {
    this.info.removeAll(true)
    const t = (x: number, y: number, s: string, style: TextStyle = WHITE) => {
      const p = new PxText(this.scene, x, y, s, style)
      this.info.add(p.objects())
      return p
    }
    if (this.message) {
      t(10, 146, this.message)
      return
    }
    if (this.area === 'header') {
      t(10, 146, boxCount() > 1 ? 'Left/Right: switch box' : 'Model Storage')
      return
    }
    const mon = this.hovered()
    if (!mon) return
    const g = this.scene.add.graphics()
    this.info.add(g)
    const add: Adders = {
      image: (x, y, key) => {
        const im = this.scene.add.image(x, y, key).setOrigin(0, 0)
        this.info.add(im)
        return im
      },
      mini: (x, y, s, color, shadow) => t(x, y, s, { font: FONT.mini, color, shadowColor: shadow, shadow: 'none' }),
    }
    const types = speciesTypes(mon.speciesId).slice(0, 2)
    const pillsW = types.length * 15 + (types.length - 1) * 2
    const lv = `Lv${mon.level}`
    const lvW = measure(this.scene, FONT.dialog, lv)
    const name = fitText(this.scene, FONT.dialog, monName(mon), 139 - pillsW - 4 - lvW - 4 - 10)
    t(10, 146, name)
    t(10 + measure(this.scene, FONT.dialog, name) + 4, 146, lv)
    types.forEach((ty, i) => typePill(g, add, 139 - pillsW + i * 17, 147, ty))
  }

  // ------------------------------------------------------------------ loop

  tick(): void {
    super.tick()
    const hov = this.area === 'box' ? this.row * COLS + this.col : -1
    this.gridIcons.forEach((img, i) => {
      if (img.visible) img.setFrame(Math.floor(this.frame / (i === hov ? 8 : 20)) % 2)
    })
    this.partyIcons.forEach((img, i) => {
      if (img.visible) img.setFrame(Math.floor(this.frame / (this.area === 'party' && i === this.pidx ? 8 : 20)) % 2)
    })
    if (this.carried.visible) this.carried.setFrame(Math.floor(this.frame / 8) % 2)
    if (this.frame % 16 === 0) this.placeCursor()
  }

  input(): void {
    if (this.busy) return
    let moved = false
    if (controls.repeat('up')) moved = this.step(0, -1)
    else if (controls.repeat('down')) moved = this.step(0, 1)
    else if (controls.repeat('left')) moved = this.step(-1, 0)
    else if (controls.repeat('right')) moved = this.step(1, 0)
    if (moved) {
      audio.sfx('select')
      this.message = null
      this.redraw()
      return
    }
    if (controls.justPressed('A')) {
      controls.consume('A')
      void this.confirm()
    } else if (controls.justPressed('B') || controls.justPressed('START')) {
      controls.consume('B', 'START')
      audio.sfx('cancel')
      if (this.held >= 0) {
        this.held = -1
        this.message = null
        this.redraw()
        return
      }
      this.close()
    }
  }

  /** Move the hand. Box rows wrap through the header; right of column 5 is the party. */
  private step(dx: number, dy: number): boolean {
    const nBoxes = boxCount()
    if (this.area === 'header') {
      if (dx) {
        if (nBoxes < 2) return false
        this.box = (this.box + dx + nBoxes) % nBoxes
        return true
      }
      this.area = 'box'
      this.row = dy > 0 ? 0 : ROWS - 1
      return true
    }
    if (this.area === 'box') {
      if (dy) {
        const r = this.row + dy
        if (r < 0 || r >= ROWS) this.area = 'header'
        else this.row = r
        return true
      }
      const c = this.col + dx
      if (c < 0) {
        if (this.held >= 0) return false
        this.area = 'party'
        this.pidx = Math.min(this.row, 5)
        return true
      }
      if (c >= COLS) {
        if (this.held >= 0) return false
        this.area = 'party'
        this.pidx = Math.min(this.row, 5)
        return true
      }
      this.col = c
      return true
    }
    // party column
    if (dy) {
      this.pidx = (this.pidx + dy + 6) % 6
      return true
    }
    this.area = 'box'
    this.row = Math.min(this.pidx, ROWS - 1)
    this.col = dx < 0 ? COLS - 1 : 0
    return true
  }

  private async say(text: string): Promise<void> {
    this.busy = true
    await this.dialog.say(text)
    this.dialog.close()
    this.busy = false
  }

  private async confirm(): Promise<void> {
    if (this.held >= 0) return this.drop()
    if (this.area === 'header') return
    const mon = this.hovered()
    if (!mon) return
    audio.sfx('select')
    this.busy = true
    const inBox = this.area === 'box'
    const items = inBox
      ? [{ label: 'WITHDRAW' }, { label: 'MOVE' }, { label: 'SUMMARY' }, { label: 'CANCEL' }]
      : [{ label: 'DEPOSIT' }, { label: 'SUMMARY' }, { label: 'CANCEL' }]
    const menu = inBox
      ? new ListMenu(this.scene, this.stack, items, { x: 238, y: 158, anchor: 'br', depth: 2100, cancelIndex: items.length - 1 })
      : new ListMenu(this.scene, this.stack, items, { x: 144, y: 141, anchor: 'br', depth: 2100, cancelIndex: items.length - 1 })
    const choice = items[await menu.result()]?.label ?? 'CANCEL'
    this.busy = false
    const name = monName(mon)
    if (choice === 'WITHDRAW') {
      const why = withdrawRefusal()
      if (why) {
        audio.sfx('bump')
        return this.say(why)
      }
      withdrawMon(this.flatIndex())
      this.message = fitText(this.scene, FONT.dialog, `${name} joined the party.`, 128)
      this.redraw()
    } else if (choice === 'DEPOSIT') {
      const why = depositRefusal(this.pidx)
      if (why) {
        audio.sfx('bump')
        return this.say(why)
      }
      const k = depositMon(this.pidx)
      this.pidx = Math.min(this.pidx, Math.max(0, state.party.length - 1))
      const msg = `${name} went to BOX ${k}.`
      this.message = measure(this.scene, FONT.dialog, msg) <= 128 ? msg : `Stored in BOX ${k}.`
      this.redraw()
    } else if (choice === 'MOVE') {
      this.held = this.flatIndex()
      this.message = 'Move to where?'
      this.redraw()
    } else if (choice === 'SUMMARY') {
      await this.summary()
    }
  }

  /** Drop the carried mon: swap with a mon, or move to the end of the (compact) list. */
  private async drop(): Promise<void> {
    if (this.area !== 'box') return
    const from = this.held
    const to = this.flatIndex()
    const box = state.box
    if (from < 0 || !box[from]) {
      this.held = -1
      return this.redraw()
    }
    if (to !== from) {
      if (box[to]) [box[from], box[to]] = [box[to], box[from]]
      else {
        const [m] = box.splice(from, 1)
        box.push(m)
      }
    }
    audio.sfx('select')
    this.held = -1
    this.message = null
    this.redraw()
  }

  private async summary(): Promise<void> {
    this.busy = true
    this.setVisible(false)
    if (this.area === 'box') {
      const page = boxPage(this.box)
      const i = await new SummaryScreen(this.scene, this.stack, this.row * COLS + this.col, page).run()
      this.row = Math.floor(i / COLS)
      this.col = i % COLS
    } else {
      this.pidx = await new SummaryScreen(this.scene, this.stack, this.pidx).run()
    }
    this.setVisible(true)
    this.busy = false
    this.redraw()
  }

  close(): void {
    this.dialog.destroy()
    super.close()
  }
}
