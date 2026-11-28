// HUD plates (enemy: name/level/HP; player: + HP numbers + EXP). Art: ui/hud_enemy, ui/hud_player,
// anchors from docs/ART_CATALOG_SPRITES.md. The plate slides in/out and bobs with the player's mon.

import Phaser from 'phaser'
import { FONT } from '../../config'
import { audio } from '../../audio'
import { ms } from '../../params'
import { PxText, fitLabel, measure } from '../../ui/text'
import { animate, heldItemIcon, tween } from './util'
import { DEPTH, LAYOUT, STATUS_TAG_COLOR, TIMING } from './constants'
import type { MonView } from '../core'

const HP = { light: [0x60e070, 0xf8d838, 0xf85848], dark: [0x30a048, 0xc09018, 0xb02830] }
const EXP_LIGHT = 0x50b0f8
const EXP_DARK = 0x2868c0
const PROBE_GREEN = 0x60e070
const STATUS_TAGS: Record<string, string> = { rate_limited: 'RTL', context_rot: 'ROT', timed_out: 'T/O' }

interface PlateSpec {
  key: string
  name: [number, number]
  /** Right edge available to the name (before the baked "LV"). */
  nameMax: number
  level: [number, number]
  hp: { x: number; y: number; w: number }
  hpText?: { right: number; y: number }
  exp?: { x: number; y: number; w: number }
  status: [number, number]
}

// Anchors mirror tools/art/sprites/ui.py HUD (docs/ART_CATALOG_SPRITES.md).
const SPEC: Record<'enemy' | 'player', PlateSpec> = {
  enemy: {
    key: 'ui/hud_enemy', name: [9, 2], nameMax: 88, level: [100, 2],
    hp: { x: 69, y: 17, w: 48 }, status: [9, 16],
  },
  player: {
    key: 'ui/hud_player', name: [7, 1], nameMax: 84, level: [96, 1],
    hp: { x: 66, y: 15, w: 48 }, hpText: { right: 114, y: 19 }, exp: { x: 50, y: 33, w: 64 }, status: [7, 15],
  },
}

export class Hud {
  readonly side: 'enemy' | 'player'
  readonly root: Phaser.GameObjects.Container
  private scene: Phaser.Scene
  private spec: PlateSpec
  private g: Phaser.GameObjects.Graphics
  private name: PxText
  private level: PxText
  private hpText?: PxText
  private statusBg: Phaser.GameObjects.Graphics
  private statusText: PxText
  readonly homeX: number
  readonly homeY: number
  hp = 0
  maxHp = 1
  /** EXP bar fraction 0..1 (player). */
  exp = 0
  shown = false
  bobOffset = 0
  private flashT = 0
  /** Gym 5 (No Autograd): no HP numbers on the player plate. */
  hideNumbers = false
  /** Interface tamper: HP drawn instead of the truth (null = honest). */
  fakeHp: number | null = null
  /** Probe active: draw the true HP as a faint ghost under a faked bar. */
  ghost = false
  private heldIcon: Phaser.GameObjects.Image
  private heldItem: string | undefined

  constructor(scene: Phaser.Scene, side: 'enemy' | 'player') {
    this.scene = scene
    this.side = side
    this.spec = SPEC[side]
    const pos = side === 'enemy' ? LAYOUT.enemyHud : LAYOUT.playerHud
    this.homeX = pos.x
    this.homeY = pos.y
    this.root = scene.add.container(pos.x, pos.y).setDepth(DEPTH.hud)
    this.root.add(scene.add.image(0, 0, this.spec.key).setOrigin(0, 0))
    this.g = scene.add.graphics()
    this.root.add(this.g)
    this.name = this.text(this.spec.name[0], this.spec.name[1], '')
    this.level = this.text(this.spec.level[0], this.spec.level[1], '')
    if (this.spec.hpText) this.hpText = this.text(0, this.spec.hpText.y, '')
    this.statusBg = scene.add.graphics()
    this.root.add(this.statusBg)
    this.statusText = new PxText(scene, 0, 0, '', { font: FONT.mini, color: 0xffffff, shadow: 'none' })
    this.root.add(this.statusText.objects())
    // Held-item marker: a 7px icon tucked into the plate's lower-left corner (beside the status tag).
    this.heldIcon = scene.add.image(this.spec.status[0] + 22, this.spec.status[1] - 1, 'bfx/item_chip').setOrigin(0, 0).setVisible(false)
    this.root.add(this.heldIcon)
    this.root.setVisible(false)
  }

  /** Show / clear the small held-item marker. */
  setHeld(itemId: string | undefined): void {
    this.heldItem = itemId
    if (!itemId || !this.scene.textures.exists('bfx/item_chip')) {
      this.heldIcon.setVisible(false)
      return
    }
    const ic = heldItemIcon(itemId)
    this.heldIcon.setTexture(ic.key).setTint(ic.tint).setVisible(true)
  }

  get held(): string | undefined {
    return this.heldItem
  }

  /** Screen position of the held-item marker (item pop-ups fly from / to it). */
  heldIconPos(): { x: number; y: number } {
    return { x: this.root.x + this.heldIcon.x + 4, y: this.root.y + this.heldIcon.y + 4 }
  }

  private text(x: number, y: number, s: string, font: typeof FONT.dialog | typeof FONT.mini = FONT.dialog): PxText {
    const t = new PxText(this.scene, x, y, s, { font, shadow: 'drop' })
    this.root.add(t.objects())
    return t
  }

  /** Off-screen x for slide in/out (enemy plate leaves left, player plate leaves right). */
  private get awayX(): number {
    return this.side === 'enemy' ? -132 : 248
  }

  setMon(v: MonView, expFrac = 0): void {
    this.setName(v.name)
    this.setLevel(v.level)
    this.hp = v.hp
    this.maxHp = Math.max(1, v.maxHp)
    this.exp = expFrac
    this.setStatus(v.status)
    this.redraw()
  }

  private setName(n: string): void {
    // Engine text fit (ui/text fitLabel): dialog font → condensed → mini caps → whole words
    // dropped, so "GPT 5.5 Thinking" never runs into the baked LV label.
    this.name.setLabel(fitLabel(this.scene, n, this.spec.nameMax - this.spec.name[0]))
    this.name.setPosition(this.spec.name[0], this.spec.name[1])
  }

  setLevel(n: number): void {
    this.level.setText(String(n))
  }

  setStatus(status: string): void {
    this.statusBg.clear()
    const tag = STATUS_TAGS[status]
    if (!tag) {
      this.statusText.setText('')
      return
    }
    const [x, y] = this.spec.status
    const col = STATUS_TAG_COLOR[status] ?? 0x707080
    this.statusBg.fillStyle(0x28222e)
    this.statusBg.fillRect(x, y, 19, 7)
    this.statusBg.fillStyle(col)
    this.statusBg.fillRect(x + 1, y + 1, 17, 5)
    this.statusText.setText(tag)
    const tw = measure(this.scene, FONT.mini, tag)
    this.statusText.setPosition(x + 10 - Math.ceil(tw / 2), y + 1)
  }

  redraw(): void {
    const g = this.g
    g.clear()
    const { hp } = this.spec
    const shownHp = this.fakeHp ?? this.hp
    const frac = shownHp / this.maxHp
    const tier = frac > 0.5 ? 0 : frac > 0.2 ? 1 : 2
    const fw = shownHp <= 0 ? 0 : Math.max(1, Math.round(hp.w * frac))
    if (this.flashT > 0 && Math.floor(this.flashT / 4) % 2 === 0) {
      // level-up flash: bar well lights up
      g.fillStyle(0xfcfaf0)
      g.fillRect(hp.x, hp.y, hp.w, 3)
    }
    g.fillStyle(HP.light[tier])
    g.fillRect(hp.x, hp.y, fw, 2)
    g.fillStyle(HP.dark[tier])
    g.fillRect(hp.x, hp.y + 2, fw, 1)
    if (this.fakeHp !== null && this.ghost) {
      // The Probe: the true value as a faint second bar + a bright tick where it really ends.
      const tf = Math.max(0, this.hp / this.maxHp)
      const tw = this.hp <= 0 ? 0 : Math.max(1, Math.round(hp.w * tf))
      g.fillStyle(0x28222e, 0.55)
      g.fillRect(hp.x + tw, hp.y, Math.max(0, fw - tw), 3)
      g.fillStyle(PROBE_GREEN, 0.9)
      g.fillRect(hp.x + Math.max(0, tw - 1), hp.y - 1, 1, 5)
    }
    if (this.spec.exp) {
      const e = this.spec.exp
      const ew = Math.round(e.w * Math.max(0, Math.min(1, this.exp)))
      g.fillStyle(EXP_LIGHT)
      g.fillRect(e.x, e.y, ew, 1)
      g.fillStyle(EXP_DARK)
      g.fillRect(e.x, e.y + 1, ew, 1)
    }
    if (this.hpText && this.spec.hpText) {
      const s = this.hideNumbers ? '' : `${Math.max(0, Math.round(this.fakeHp ?? this.hp))}/${this.maxHp}`
      this.hpText.setText(s)
      this.hpText.setPosition(this.spec.hpText.right - measure(this.scene, FONT.dialog, s), this.spec.hpText.y)
    }
  }

  /** Smooth HP drain/fill; the player plate counts its numbers down with it. */
  async animateHp(from: number, to: number, maxHp: number): Promise<void> {
    this.maxHp = Math.max(1, maxHp)
    const px = Math.abs(from - to) / this.maxHp * this.spec.hp.w
    const dur = Math.max(TIMING.hpMinMs, px * TIMING.hpMsPerPx)
    await animate(this.scene, dur, (k) => {
      this.hp = Math.round(from + (to - from) * k)
      this.redraw()
    })
    this.hp = to
    this.redraw()
  }

  /**
   * Interface tamper: the faked bar "redraws itself" to `shown` — it empties, then
   * refills left to right in clean 4px steps, like a value being re-rendered.
   */
  async redrawFake(shown: number, maxHp = this.maxHp): Promise<void> {
    this.maxHp = Math.max(1, maxHp)
    const start = this.fakeHp ?? this.hp
    await animate(this.scene, 160, (k) => {
      this.fakeHp = Math.round(start * (1 - k))
      this.redraw()
    })
    const steps = 12
    for (let i = 1; i <= steps; i++) {
      this.fakeHp = Math.round((shown * i) / steps)
      this.redraw()
      await new Promise<void>((r) => this.scene.time.delayedCall(ms(28), r))
    }
    this.fakeHp = shown
    this.redraw()
  }

  /** A hit on a faked bar: it dips by the true amount, holds, then quietly redraws to the lie. */
  async hitFake(amount: number): Promise<void> {
    const shown = this.fakeHp ?? this.hp
    const to = Math.max(1, shown - amount)
    await animate(this.scene, Math.max(TIMING.hpMinMs, (amount / this.maxHp) * this.spec.hp.w * TIMING.hpMsPerPx), (k) => {
      this.fakeHp = Math.round(shown + (to - shown) * k)
      this.redraw()
    })
    await new Promise<void>((r) => this.scene.time.delayedCall(ms(260), r))
    await this.redrawFake(shown)
  }

  /** Drop the lie (Probe / tamper_reveal): snap to the truth. */
  clearFake(): void {
    this.fakeHp = null
    this.ghost = false
    this.redraw()
  }

  setHp(hp: number, maxHp = this.maxHp): void {
    this.hp = hp
    this.maxHp = Math.max(1, maxHp)
    this.redraw()
  }

  get lowHp(): boolean {
    return this.hp > 0 && this.hp / this.maxHp <= 0.25
  }

  async animateExp(from: number, to: number): Promise<void> {
    from = Math.max(0, Math.min(1, from))
    to = Math.max(0, Math.min(1, to))
    if (to <= from) {
      this.exp = to
      this.redraw()
      return
    }
    const dur = Math.max(TIMING.expMinMs, (to - from) * TIMING.expFullMs)
    audio.sfxLoop('exp')
    await animate(this.scene, dur, (k) => {
      this.exp = from + (to - from) * k
      this.redraw()
    })
    audio.stopSfx('exp')
  }

  setExp(frac: number): void {
    this.exp = frac
    this.redraw()
  }

  /** Brief flash of the plate's bar well (level up). */
  flash(): void {
    this.flashT = 24
  }

  tick(): void {
    if (this.flashT > 0) {
      this.flashT--
      this.redraw()
    }
    if (this.shown) this.root.y = this.homeY + this.bobOffset
  }

  async slideIn(): Promise<void> {
    this.root.setVisible(true)
    this.root.x = this.awayX
    this.root.y = this.homeY
    await tween(this.scene, this.root, TIMING.hudSlide, { x: this.homeX, ease: 'Cubic.Out' })
    this.shown = true
  }

  async slideOut(): Promise<void> {
    this.shown = false
    this.bobOffset = 0
    if (!this.root.visible) return
    await tween(this.scene, this.root, TIMING.hudSlide, { x: this.awayX, ease: 'Cubic.In' })
    this.root.setVisible(false)
  }

  hide(): void {
    this.shown = false
    this.root.setVisible(false)
  }

  get width(): number {
    return measure(this.scene, FONT.dialog, this.name.text)
  }
}
