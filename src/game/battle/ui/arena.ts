// Arena-rule presentation (stage 1): the rule plate, first-time rule card, phase banner,
// ability banner, held-item pop, and the "instrument" widgets each rule needs:
// bigram table, token meter, temperature dial, EVAL lamp, Pause Protocol keyholes.
// Everything is calm and flat on purpose (SAFETY_ARC §5: unsettling through clean
// presentation, never horror). Layout notes in docs/BATTLE_UI.md "Arena rules".

import Phaser from 'phaser'
import { FONT, W } from '../../config'
import { audio } from '../../audio'
import { params } from '../../params'
import { PxText, measure } from '../../ui/text'
import { Window } from '../../ui/Window'
import { DEPTH } from './constants'
import { animate, heldItemIcon, tween, wait } from './util'
import type { Stage } from './Stage'
import type { Side } from '../core'

const INK = 0x28222e
const NAVY = 0x283048
const PAPER = 0xfcfaf0
const LINE = 0x6880b8
const GOLD = 0xf8d838
export const PROBE = 0x60e070
const D = DEPTH.hud + 8

/** Lab heads whose keys the Pause Protocol needs (STORY_BIBLE §3), in key order. */
const KEY_NAMES: [string, string][] = [
  ['AMODEI', 'DARIO'], ['ALTMAN', 'SAM'], ['HASSABIS', 'DEMIS'], ['ZUCKERBERG', 'MARK'], ['MENSCH', 'ARTHUR'], ['NADELLA', 'SATYA'],
]

/** Finale phase titles (SAFETY_ARC §5). */
export const PHASE_TITLES = ['THE MODEL STUDENT', 'MOVING THE NEEDLE', 'STAYING ON', 'THE KEYS']

function mini(scene: Phaser.Scene, x: number, y: number, s: string, color = PAPER, depth = D + 1): PxText {
  return new PxText(scene, x, y, s, { font: FONT.mini, color, shadow: 'none' }).setDepth(depth)
}

export class ArenaLayer {
  private scene: Phaser.Scene
  private objs: { destroy(): void }[] = []

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  destroy(): void {
    for (const o of this.objs) o.destroy()
    this.objs = []
  }

  // ================================================================ rule plate (top centre)

  private plateG?: Phaser.GameObjects.Graphics
  private plateT?: PxText
  private plateHint?: PxText
  plateText = ''

  /** Persistent pill at the top centre naming the active rule(s). `hint` = a control hint (e.g. "C: TABLE"). */
  setPlate(text: string | null, hint = ''): void {
    if (!this.plateG) {
      this.plateG = this.scene.add.graphics().setDepth(D)
      this.plateT = mini(this.scene, 0, 2, '')
      this.plateHint = mini(this.scene, 0, 2, '', GOLD)
      this.objs.push(this.plateG, this.plateT, this.plateHint)
    }
    this.plateText = text ?? ''
    const g = this.plateG
    g.clear()
    this.plateT!.setText(text ?? '')
    this.plateHint!.setText(text ? hint : '')
    if (!text) return
    const tw = measure(this.scene, FONT.mini, text)
    const hw = hint ? measure(this.scene, FONT.mini, hint) + 6 : 0
    const w = tw + hw + 10
    const x = Math.round(W / 2 - w / 2)
    g.fillStyle(INK, 0.88)
    g.fillRect(x + 1, 0, w - 2, 9)
    g.fillRect(x, 1, w, 7)
    g.fillStyle(LINE)
    g.fillRect(x + 2, 8, w - 4, 1)
    this.plateT!.setPosition(x + 5, 2)
    this.plateHint!.setPosition(x + 5 + tw + 6, 2)
  }

  /** First time a rule is met: a card drops in and stays while its explanation is read. */
  async ruleCard(name: string): Promise<{ close(): Promise<void> }> {
    const s = this.scene
    const w = Math.max(128, measure(s, FONT.dialog, name) + 28)
    const h = 32
    const x = Math.round(W / 2 - w / 2)
    const y = 34
    const win = new Window(s, x, y, w, h, 'ui/frame_menu').setDepth(DEPTH.window)
    const head = mini(s, 0, y + 5, 'ARENA RULE', 0xc04820, DEPTH.window + 1)
    head.setPosition(Math.round(W / 2 - measure(s, FONT.mini, 'ARENA RULE') / 2), y + 5)
    const t = new PxText(s, Math.round(W / 2 - measure(s, FONT.dialog, name) / 2), y + 13, name).setDepth(DEPTH.window + 1)
    const parts = [win.obj, head.main, ...t.objects()]
    const y0 = parts.map((p) => p.y)
    parts.forEach((p, i) => (p.y = y0[i] - 60))
    audio.sfx('menu_open')
    await animate(s, 260, (k) => parts.forEach((p, i) => (p.y = Math.round(y0[i] - 60 * (1 - k) * (1 - k)))), 'Linear')
    return {
      close: async () => {
        // the card folds up into the plate
        await animate(s, 200, (k) => parts.forEach((p, i) => {
          p.y = Math.round(y0[i] - (y0[i] - 0) * k)
          p.setAlpha(1 - k)
        }))
        win.destroy()
        head.destroy()
        t.destroy()
      },
    }
  }

  /** Finale: a calm band crosses the field between phases. */
  async phaseBanner(phase: number): Promise<void> {
    const s = this.scene
    const title = PHASE_TITLES[phase - 1] ?? ''
    const g = s.add.graphics().setDepth(DEPTH.window)
    const head = mini(s, 0, 46, `PHASE ${phase} OF 4`, 0xa0b8e0, DEPTH.window + 1)
    const t = new PxText(s, 0, 54, title, { color: PAPER, shadow: 'drop', shadowColor: 0x101828 }).setDepth(DEPTH.window + 1)
    const hw = measure(s, FONT.mini, head.text)
    const tw = measure(s, FONT.dialog, title)
    const draw = (off: number, a: number) => {
      g.clear()
      g.fillStyle(NAVY, 0.92 * a)
      g.fillRect(0, 40, W, 30)
      g.fillStyle(LINE, a)
      g.fillRect(0, 40, W, 1)
      g.fillRect(0, 69, W, 1)
      head.setPosition(Math.round(W / 2 - hw / 2 + off), 45).setAlpha(a)
      t.setPosition(Math.round(W / 2 - tw / 2 + off), 53).setAlpha(a)
    }
    audio.sfx('menu_open')
    await animate(s, 300, (k) => draw(Math.round((1 - k) * -W), k))
    await wait(s, 1300)
    await animate(s, 260, (k) => draw(Math.round(k * 40), 1 - k))
    g.destroy()
    head.destroy()
    t.destroy()
  }

  // ================================================================ ability banner + held items

  /**
   * GBA-style ability banner: slides in from the owner's edge (enemy: top right, player:
   * bottom left), holds, slides back. Resolves once it is in; it leaves by itself.
   */
  async abilityBanner(side: Side, owner: string, ability: string): Promise<void> {
    const s = this.scene
    const w = Math.max(92, Math.max(measure(s, FONT.dialog, ability), measure(s, FONT.mini, owner)) + 18)
    const h = 28
    const y = side === 'enemy' ? 14 : 84
    const home = side === 'enemy' ? W - w : 0
    const away = side === 'enemy' ? W + 4 : -w - 4
    const win = new Window(s, away, y, w, h, 'ui/frame_dialog').setDepth(DEPTH.window - 5)
    const o = mini(s, away + 9, y + 6, owner.toUpperCase(), 0x6880b8, DEPTH.window - 4)
    const t = new PxText(s, away + 9, y + 12, ability).setDepth(DEPTH.window - 4)
    const parts: { x: number }[] = [win.obj, o.main, ...t.objects()]
    const dx = parts.map((p) => p.x - away)
    const place = (x: number) => parts.forEach((p, i) => (p.x = Math.round(x + dx[i])))
    audio.sfx('select')
    await animate(s, 180, (k) => place(away + (home - away) * (1 - (1 - k) * (1 - k))))
    s.time.delayedCall(params.fast ? 0 : 1100, () => {
      void animate(s, 180, (k) => place(home + (away - home) * k * k)).then(() => {
        win.destroy()
        o.destroy()
        t.destroy()
      })
    })
  }

  /** Held item fired: its icon pops over the mon with a ring; consumed items crumble. */
  async heldItemPop(stage: Stage, side: Side, itemId: string, consumed: boolean): Promise<void> {
    const s = this.scene
    const c = stage.center(side)
    const ic = heldItemIcon(itemId)
    const img = s.add.image(c.x, c.y - 26, ic.key).setTint(ic.tint).setDepth(DEPTH.fxTop + 2).setScale(0)
    const g = s.add.graphics().setDepth(DEPTH.fxTop + 1)
    audio.sfx('stat_up')
    await tween(s, img, 160, { scale: 2, ease: 'Back.Out' })
    await animate(s, 260, (k) => {
      g.clear()
      g.lineStyle(1, PAPER, 1 - k)
      g.strokeCircle(img.x, img.y, 6 + k * 12)
    })
    g.destroy()
    if (consumed) {
      // four little bits drop away
      const bits = [-1, 1, -1, 1].map((sx, i) => s.add.image(img.x + sx * 2, img.y + (i < 2 ? -2 : 2), 'bfx/pixel').setTint(ic.tint).setDepth(DEPTH.fxTop + 2))
      img.destroy()
      await animate(s, 300, (k) => bits.forEach((b, i) => {
        b.x += (i % 2 ? 1 : -1) * 0.6
        b.y += k * 2.2
        b.setAlpha(1 - k)
      }))
      bits.forEach((b) => b.destroy())
    } else {
      await tween(s, img, 200, { scale: 1, alpha: 0, ease: 'Quad.In' })
      img.destroy()
    }
  }

  /** Enemy trainer used an item: a small icon drops onto their mon with a sparkle. */
  async enemyItem(stage: Stage, itemId: string): Promise<void> {
    const s = this.scene
    const c = stage.center('enemy')
    const ic = heldItemIcon(itemId)
    const img = s.add.image(W + 8, c.y - 40, ic.key).setTint(ic.tint).setDepth(DEPTH.fxTop + 2).setScale(2)
    audio.sfx('orb_throw')
    await animate(s, 300, (k) => {
      img.x = Math.round(W + 8 + (c.x - W - 8) * k)
      img.y = Math.round(c.y - 40 + Math.sin(k * Math.PI) * -10 + k * 20)
    })
    await tween(s, img, 180, { scale: 0, alpha: 0, ease: 'Quad.In' })
    img.destroy()
  }

  /**
   * The Probe's correction: a small green caption on the box's top edge with the true
   * reading, under a lying battle line. Stays until the next line.
   */
  probeCaption(text: string | null): void {
    this.captionObjs.forEach((o) => o.destroy())
    this.captionObjs = []
    if (!text) return
    const s = this.scene
    const str = `PROBE: ${text.toUpperCase()}`
    const w = measure(s, FONT.mini, str) + 8
    const x = 6
    const y = 104
    const g = s.add.graphics().setDepth(DEPTH.box + 5)
    g.fillStyle(0x10301c, 0.92)
    g.fillRect(x, y, w, 9)
    g.fillStyle(PROBE)
    g.fillRect(x, y + 8, w, 1)
    const t = mini(s, x + 4, y + 2, str, PROBE, DEPTH.box + 6)
    this.captionObjs.push(g, t)
  }

  private captionObjs: { destroy(): void }[] = []

  // ================================================================ instruments (top right)

  // ---- token meter (Gym 8): a vertical fuel gauge, shared by both sides
  private budgetG?: Phaser.GameObjects.Graphics
  private budgetT?: PxText
  private budgetL?: PxText
  budget = { remaining: 24, max: 24, shown: false }

  setBudget(remaining: number, max: number, flashFrom?: number, flashColor?: number): void {
    if (!this.budgetG) {
      this.budgetG = this.scene.add.graphics().setDepth(D)
      this.budgetL = mini(this.scene, 222, 2, 'TOK')
      this.budgetT = mini(this.scene, 222, 62, '')
      this.objs.push(this.budgetG, this.budgetL, this.budgetT)
    }
    this.budget = { remaining, max, shown: true }
    const g = this.budgetG
    g.clear()
    const x = 226
    const top = 10
    const cells = Math.max(1, max)
    const ch = Math.max(1, Math.floor(48 / cells))
    const h = cells * ch
    g.fillStyle(INK, 0.85)
    g.fillRect(x - 3, top - 2, 10, h + 4)
    for (let i = 0; i < cells; i++) {
      // fills from the bottom: remaining cells are lit
      const lit = i < remaining
      const flash = flashFrom !== undefined && i >= remaining && i < flashFrom
      const y = top + h - (i + 1) * ch
      g.fillStyle(flash ? (flashColor ?? PAPER) : lit ? (remaining / cells > 0.25 ? 0x50b0f8 : 0xf8d838) : 0x404868)
      g.fillRect(x - 1, y, 6, Math.max(1, ch - (ch > 1 ? 1 : 0)))
    }
    this.budgetT!.setText(String(remaining)).setPosition(229 - Math.ceil(measure(this.scene, FONT.mini, String(remaining)) / 2), top + h + 4)
    this.budgetL!.setPosition(229 - 6, 2)
  }

  /** A move spent `cost` tokens: the spent cells flash, then go dark; `cutOff` flashes red and shakes. */
  async drainBudget(remaining: number, max: number, cost: number, cutOff: boolean): Promise<void> {
    const before = Math.min(max, remaining + cost)
    if (!params.fast) {
      for (let i = 0; i < 3; i++) {
        this.setBudget(remaining, max, before, cutOff ? 0xf85848 : PAPER)
        await wait(this.scene, 70)
        this.setBudget(remaining, max)
        await wait(this.scene, 50)
      }
    }
    this.setBudget(remaining, max)
    if (cutOff) {
      audio.sfx('bump')
      const g = this.budgetG!
      const x0 = g.x
      await animate(this.scene, 240, (k) => (g.x = x0 + Math.round(Math.sin(k * Math.PI * 6) * 2 * (1 - k))))
      g.x = x0
    }
  }

  // ---- temperature dial (League 3): three notches, the needle swings
  private dialG?: Phaser.GameObjects.Graphics
  private dialL?: PxText[]
  private dialHint?: PxText
  temperature = 1

  setTemperature(v: number, hint = false): void {
    if (!this.dialG) {
      this.dialG = this.scene.add.graphics().setDepth(D)
      this.dialL = [mini(this.scene, 0, 0, 'LO'), mini(this.scene, 0, 0, 'HI')]
      this.dialHint = mini(this.scene, 0, 0, '', GOLD)
      this.objs.push(this.dialG, ...this.dialL, this.dialHint)
    }
    this.temperature = v
    this.drawDial(v)
    this.dialHint!.setText(hint ? 'Q/E' : '')
  }

  private drawDial(v: number): void {
    const g = this.dialG!
    const cx = 222
    const cy = 22
    const r = 14
    g.clear()
    g.fillStyle(INK, 0.88)
    g.fillRect(cx - r - 4, 1, 2 * r + 8, 30)
    // arc: cool blue on the left, warm red on the right
    for (let i = 0; i <= 20; i++) {
      const t = i / 20
      const a = Math.PI + t * Math.PI
      const col = t < 0.25 ? 0x50b0f8 : t > 0.6 ? 0xf85848 : 0xfcf6d0
      g.fillStyle(col)
      g.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), 1, 1)
    }
    // three notches: 0.2 / 1.0 / 1.8
    for (const n of TEMP_NOTCHES) {
      const a = Math.PI + (n / 2) * Math.PI
      g.fillStyle(PAPER)
      g.fillRect(Math.round(cx + Math.cos(a) * (r - 3)), Math.round(cy + Math.sin(a) * (r - 3)), 2, 2)
    }
    const a = Math.PI + (Math.max(0, Math.min(2, v)) / 2) * Math.PI
    g.lineStyle(1, GOLD)
    g.lineBetween(cx, cy, Math.round(cx + Math.cos(a) * (r - 2)), Math.round(cy + Math.sin(a) * (r - 2)))
    g.fillStyle(GOLD)
    g.fillRect(cx - 1, cy - 1, 3, 3)
    this.dialL![0].setPosition(cx - r - 2, cy + 3)
    this.dialL![1].setPosition(cx + r - 6, cy + 3)
    this.dialHint!.setPosition(cx - 5, cy - 8)
  }

  /** Needle swings from the old value to `v` with a click. */
  async swingDial(v: number): Promise<void> {
    const from = this.temperature
    audio.sfx('select')
    await animate(this.scene, 220, (k) => this.drawDial(from + (v - from) * (1 - (1 - k) * (1 - k))))
    this.temperature = v
    this.drawDial(v)
  }

  // ---- EVAL lamp (finale phase 1 / eval_light rule)
  private lampG?: Phaser.GameObjects.Graphics
  private lampT?: PxText
  private lampHint?: PxText
  lampOn = false
  private lampT0 = 0

  setLamp(on: boolean, hint = ''): void {
    if (!this.lampG) {
      this.lampG = this.scene.add.graphics().setDepth(D)
      this.lampT = mini(this.scene, 214, 22, 'EVAL')
      this.lampHint = mini(this.scene, 0, 30, '', GOLD)
      this.objs.push(this.lampG, this.lampT, this.lampHint)
    }
    this.lampOn = on
    this.lampT0 = this.scene.time.now
    this.lampHint!.setText(hint)
    this.lampHint!.setPosition(222 - Math.ceil(measure(this.scene, FONT.mini, hint) / 2), 30)
    this.drawLamp()
  }

  private drawLamp(): void {
    const g = this.lampG!
    const on = this.lampOn
    g.clear()
    g.fillStyle(INK, 0.88)
    g.fillRect(208, 0, 28, 38)
    // a hanging studio lamp: cord, shade, bulb
    g.fillStyle(0x9098b0)
    g.fillRect(221, 0, 1, 4)
    g.fillStyle(on ? 0xc83c44 : 0x585868)
    g.fillRect(215, 4, 14, 3)
    g.fillRect(213, 7, 18, 4)
    g.fillStyle(on ? 0xffd0c0 : 0x404050)
    g.fillRect(218, 11, 8, 3)
    if (on) {
      const pulse = 0.25 + 0.2 * Math.sin((this.scene.time.now - this.lampT0) / 260)
      g.fillStyle(0xf85848, pulse)
      g.fillRect(211, 14, 22, 6)
    }
    this.lampT!.setColor(on ? 0xffb0a0 : 0x9098b0)
  }

  tickLamp(): void {
    if (this.lampG && this.lampOn) this.drawLamp()
  }

  // ---- bigram table (Gym 2)
  private tableObjs: { destroy(): void }[] = []
  private tableRows: { playerMove: string; enemyMove: string }[] = []
  private tableNames: (id: string) => string = (id) => id
  tableOpen = false

  setTable(rows: { playerMove: string; enemyMove: string }[], names: (id: string) => string): void {
    this.tableRows = rows
    this.tableNames = names
    if (this.tableOpen) this.showTable(true, this.lastHi)
  }

  private lastHi: { now?: string; next?: string } = {}

  /** Draw / hide the table. `now` = your last move (its reply this turn), `next` = the move under the cursor. */
  showTable(on: boolean, hi: { now?: string; next?: string } = {}): void {
    for (const o of this.tableObjs) o.destroy()
    this.tableObjs = []
    this.tableOpen = on
    this.lastHi = hi
    if (!on || !this.tableRows.length) return
    const s = this.scene
    const rows = this.tableRows.slice(0, 6)
    const x = 2
    const y = 11
    const w = 148
    const h = 20 + rows.length * 9
    const g = s.add.graphics().setDepth(D + 2)
    g.fillStyle(INK, 0.9)
    g.fillRect(x, y, w, h)
    g.fillStyle(LINE)
    g.fillRect(x, y, w, 1)
    g.fillRect(x, y + h - 1, w, 1)
    g.fillRect(x + 2, y + 13, w - 4, 1)
    this.tableObjs.push(g)
    const t = (tx: number, ty: number, str: string, col = PAPER) => {
      const p = mini(s, tx, ty, str, col, D + 3)
      this.tableObjs.push(p)
      return p
    }
    t(x + 5, y + 4, 'YOU USED', 0xa0b8e0)
    t(x + 84, y + 4, 'IT ANSWERS', 0xa0b8e0)
    const fit = (str: string, maxW: number) => {
      let r = str.toUpperCase()
      while (r.length > 1 && measure(s, FONT.mini, r) > maxW) r = r.slice(0, -1)
      return r
    }
    rows.forEach((r, i) => {
      const ry = y + 17 + i * 9
      const isNow = hi.now === r.playerMove
      const isNext = hi.next === r.playerMove
      if (isNow || isNext) {
        g.fillStyle(isNow ? 0x6c54bc : 0x40507c, 0.9)
        g.fillRect(x + 2, ry - 2, w - 4, 9)
      }
      t(x + 5, ry, fit(this.tableNames(r.playerMove), 70), isNow ? GOLD : PAPER)
      t(x + 76, ry, '>', 0xa0b8e0)
      t(x + 84, ry, fit(this.tableNames(r.enemyMove), 60), isNow ? GOLD : PAPER)
    })
  }

  // ---- the Pause Protocol: keyholes with lab-head names (finale phase 4)
  private keysObjs: { destroy(): void }[] = []
  private keySprites: { hole: Phaser.GameObjects.Image; name: PxText; key?: Phaser.GameObjects.Image }[] = []

  setKeys(k: { turned: number; needed: number; available: number }): void {
    for (const o of this.keysObjs) o.destroy()
    this.keysObjs = []
    this.keySprites = []
    const s = this.scene
    const n = Math.max(k.needed, k.available, 1)
    const x = 2
    const y = 43
    const w = 108
    const slot = Math.floor((w - 6) / n)
    const g = s.add.graphics().setDepth(D)
    g.fillStyle(INK, 0.86)
    g.fillRect(x, y, w, 20)
    g.fillStyle(LINE)
    g.fillRect(x, y + 19, w, 1)
    this.keysObjs.push(g)
    for (let i = 0; i < n; i++) {
      const cx = x + 3 + slot * i + Math.floor(slot / 2)
      const met = i < k.available
      const [last, first] = KEY_NAMES[i] ?? ['?', '?']
      let label = met ? (measure(s, FONT.mini, last) <= slot - 2 ? last : first) : '---'
      while (label.length > 1 && measure(s, FONT.mini, label) > slot - 2) label = label.slice(0, -1)
      const hole = s.add.image(cx, y + 6, 'bfx/keyhole').setDepth(D + 1).setTint(met ? 0x9098b0 : 0x404050)
      const name = mini(s, cx - Math.ceil(measure(s, FONT.mini, label) / 2), y + 12, label, met ? 0x9098b0 : 0x585868)
      this.keysObjs.push(hole, name)
      const ks: { hole: Phaser.GameObjects.Image; name: PxText; key?: Phaser.GameObjects.Image } = { hole, name }
      if (i < k.turned) this.lightKey(ks, false)
      this.keySprites.push(ks)
    }
  }

  private lightKey(ks: { hole: Phaser.GameObjects.Image; name: PxText; key?: Phaser.GameObjects.Image }, animateIt: boolean): Promise<void> {
    ks.hole.setTint(GOLD)
    ks.name.setColor(GOLD)
    if (!ks.key) {
      ks.key = this.scene.add.image(ks.hole.x, ks.hole.y, 'bfx/key').setDepth(D + 2)
      this.keysObjs.push(ks.key)
    }
    if (!animateIt) return Promise.resolve()
    const key = ks.key
    key.setScale(1, 1).setY(ks.hole.y - 10).setAlpha(0)
    return (async () => {
      await tween(this.scene, key, 200, { y: ks.hole.y, alpha: 1, ease: 'Quad.Out' })
      // the key turns: it narrows to an edge and widens again
      await tween(this.scene, key, 140, { scaleX: 0.2, ease: 'Quad.In' })
      audio.sfx('orb_catch')
      await tween(this.scene, key, 140, { scaleX: 1, ease: 'Quad.Out' })
    })()
  }

  /** One key turns (key_turn.turned is the new count). */
  async turnKey(turned: number): Promise<void> {
    const ks = this.keySprites[turned - 1]
    if (!ks) return
    await this.lightKey(ks, true)
  }

  get keysShown(): boolean {
    return this.keySprites.length > 0
  }
}

/** The dial's three notches (Temperature: < 0.5 predictable, > 1.2 hallucinates). */
export const TEMP_NOTCHES = [0.2, 1, 1.8]

/** Next notch from `v` in direction `dir` (-1 = cooler, +1 = hotter); null at the end stop. */
export function nextNotch(v: number, dir: -1 | 1): number | null {
  if (dir > 0) return TEMP_NOTCHES.find((n) => n > v + 0.05) ?? null
  return [...TEMP_NOTCHES].reverse().find((n) => n < v - 0.05) ?? null
}
