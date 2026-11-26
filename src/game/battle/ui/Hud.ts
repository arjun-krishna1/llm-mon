// HUD plates (enemy: name/level/HP; player: + HP numbers + EXP). Art: ui/hud_enemy, ui/hud_player,
// anchors from docs/ART_CATALOG_SPRITES.md. The plate slides in/out and bobs with the player's mon.

import Phaser from 'phaser'
import { FONT } from '../../config'
import { audio } from '../../audio'
import { PxText, measure } from '../../ui/text'
import { animate, fitText, tween } from './util'
import { DEPTH, LAYOUT, STATUS_TAG_COLOR, TIMING } from './constants'
import type { MonView } from '../core'

const HP = { light: [0x60e070, 0xf8d838, 0xf85848], dark: [0x30a048, 0xc09018, 0xb02830] }
const EXP_LIGHT = 0x50b0f8
const EXP_DARK = 0x2868c0
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

const SPEC: Record<'enemy' | 'player', PlateSpec> = {
  enemy: {
    key: 'ui/hud_enemy', name: [8, 2], nameMax: 67, level: [78, 2],
    hp: { x: 46, y: 17, w: 48 }, status: [9, 16],
  },
  player: {
    key: 'ui/hud_player', name: [14, 1], nameMax: 73, level: [84, 1],
    hp: { x: 48, y: 14, w: 48 }, hpText: { right: 96, y: 19 }, exp: { x: 34, y: 30, w: 62 }, status: [13, 21],
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
    this.root.setVisible(false)
  }

  private text(x: number, y: number, s: string, font: typeof FONT.dialog | typeof FONT.mini = FONT.dialog): PxText {
    const t = new PxText(this.scene, x, y, s, { font, shadow: 'drop' })
    this.root.add(t.objects())
    return t
  }

  /** Off-screen x for slide in/out (enemy plate leaves left, player plate leaves right). */
  private get awayX(): number {
    return this.side === 'enemy' ? -112 : 248
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
    this.name.setText(n)
    // Long names move left, then condense, rather than overlapping the baked LV label.
    const minX = this.side === 'enemy' ? 6 : 4
    const w = fitText(this.scene, this.name, this.spec.nameMax - minX)
    const x = Math.max(minX, Math.min(this.spec.name[0], this.spec.nameMax - w))
    this.name.setPosition(x, this.spec.name[1])
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

  private redraw(): void {
    const g = this.g
    g.clear()
    const { hp } = this.spec
    const frac = this.hp / this.maxHp
    const tier = frac > 0.5 ? 0 : frac > 0.2 ? 1 : 2
    const fw = this.hp <= 0 ? 0 : Math.max(1, Math.round(hp.w * frac))
    if (this.flashT > 0 && Math.floor(this.flashT / 4) % 2 === 0) {
      // level-up flash: bar well lights up
      g.fillStyle(0xfcfaf0)
      g.fillRect(hp.x, hp.y, hp.w, 3)
    }
    g.fillStyle(HP.light[tier])
    g.fillRect(hp.x, hp.y, fw, 2)
    g.fillStyle(HP.dark[tier])
    g.fillRect(hp.x, hp.y + 2, fw, 1)
    if (this.spec.exp) {
      const e = this.spec.exp
      const ew = Math.round(e.w * Math.max(0, Math.min(1, this.exp)))
      g.fillStyle(EXP_LIGHT)
      g.fillRect(e.x, e.y, ew, 1)
      g.fillStyle(EXP_DARK)
      g.fillRect(e.x, e.y + 1, ew, 1)
    }
    if (this.hpText && this.spec.hpText) {
      const s = `${Math.max(0, Math.round(this.hp))}/ ${this.maxHp}`
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
