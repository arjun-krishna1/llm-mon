// The battle field: background, platforms, mon + trainer sprites, HUDs, party pips,
// and every non-move animation (intro slide, throws, pops, hits, faints, catches).

import Phaser from 'phaser'
import { W } from '../../config'
import { audio } from '../../audio'
import { ensureTexture } from '../../assets'
import { params } from '../../params'
import { Hud } from './Hud'
import { FONT } from '../../config'
import { PxText, measure } from '../../ui/text'
import { DEPTH, LAYOUT, TIMING, TYPE_COLOR } from './constants'
import { animate, bez, frames, mixColor, tween, wait } from './util'
import type { Side } from '../core'

export type PipState = 'empty' | 'ok' | 'status' | 'fainted' | 'copy'
const PIP_FRAME: Record<PipState, number> = { empty: 0, ok: 1, status: 2, fainted: 3, copy: 0 }

/**
 * Idle loops for the enemy sprite (driven through the sprite's origin and scale, so they
 * compose with any tween that owns x/y):
 * - `breathe`: the default slow 1px breath;
 * - `polite`: EVAL light on: upright, slow, small;
 * - `lunge`: EVAL light off / warmed up: leans forward in sharp jabs.
 */
export type IdleMode = 'none' | 'breathe' | 'polite' | 'lunge'

const DARK_TINT = 0x50506a

export class Stage {
  readonly scene: Phaser.Scene
  readonly bg: Phaser.GameObjects.Image
  readonly platE: Phaser.GameObjects.Image
  readonly platP: Phaser.GameObjects.Image
  readonly mon: Record<Side, Phaser.GameObjects.Image>
  readonly hud: Record<Side, Hud>
  readonly enemyTrainer: Phaser.GameObjects.Image
  readonly playerTrainer: Phaser.GameObjects.Image
  private pips: Record<Side, Phaser.GameObjects.Container>
  /** Extra per-frame offsets so idle bob and lunges compose. */
  readonly off: Record<Side, { x: number; y: number }> = { player: { x: 0, y: 0 }, enemy: { x: 0, y: 0 } }
  private bobbing = false
  private frame = 0
  private hallucinating: Record<Side, Phaser.GameObjects.Image | null> = { player: null, enemy: null }

  constructor(scene: Phaser.Scene, bgKey = 'battle/bg_grass') {
    this.scene = scene
    this.bg = scene.add.image(0, 0, scene.textures.exists(bgKey) ? bgKey : 'battle/bg_grass').setOrigin(0, 0).setDepth(DEPTH.bg)
    this.platE = scene.add.image(LAYOUT.enemyPlatform.x, LAYOUT.enemyPlatform.y, 'battle/platform_enemy').setOrigin(0, 0).setDepth(DEPTH.platform)
    this.platP = scene.add.image(LAYOUT.playerPlatform.x, LAYOUT.playerPlatform.y, 'battle/platform_player').setOrigin(0, 0).setDepth(DEPTH.platform)
    this.mon = {
      enemy: scene.add.image(LAYOUT.enemyMon.x, LAYOUT.enemyMon.y, '__WHITE').setOrigin(0.5, 1).setDepth(DEPTH.enemyMon).setVisible(false),
      player: scene.add.image(LAYOUT.playerMon.x, LAYOUT.playerMon.y, '__WHITE').setOrigin(0.5, 1).setDepth(DEPTH.playerMon).setVisible(false),
    }
    this.enemyTrainer = scene.add.image(LAYOUT.enemyTrainer.x, LAYOUT.enemyTrainer.y, '__WHITE').setOrigin(0.5, 1).setDepth(DEPTH.enemyTrainer).setVisible(false)
    this.playerTrainer = scene.add.image(LAYOUT.playerTrainer.x, LAYOUT.playerTrainer.y, 'battle/trainer_back', 0).setOrigin(0.5, 1).setDepth(DEPTH.playerTrainer).setVisible(false)
    this.hud = { enemy: new Hud(scene, 'enemy'), player: new Hud(scene, 'player') }
    this.ensurePipFrames()
    this.pips = { enemy: scene.add.container(0, 0).setDepth(DEPTH.hud), player: scene.add.container(0, 0).setDepth(DEPTH.hud) }
    this.pips.enemy.setVisible(false)
    this.pips.player.setVisible(false)
  }

  private ensurePipFrames(): void {
    const t = this.scene.textures.get('ui/orb_slots')
    if (t.has('0')) return
    for (let i = 0; i < 8; i++) t.add(String(i), 0, i * 8, 0, 8, 8)
  }

  /** Species currently drawn per side (for cries). */
  readonly species: Record<Side, string> = { player: '', enemy: '' }
  /** scene.time.now when the last cry ends; the next sfx-heavy beat waits for it. */
  private cryUntil = 0

  /** Play a species cry and remember how long it rings. */
  cry(speciesId: string, faint = false): void {
    if (!speciesId) return
    audio.cry(speciesId, faint ? { faint: true } : undefined)
    if (params.fast) return
    this.cryUntil = Math.max(this.cryUntil, this.scene.time.now + audio.cryDurationMs(speciesId, faint ? { faint: true } : undefined))
  }

  /** Resolves once the last cry has finished (so the next sfx doesn't step on it). */
  async cryDone(): Promise<void> {
    const left = this.cryUntil - this.scene.time.now
    if (left > 0) await new Promise<void>((r) => this.scene.time.delayedCall(left, r))
  }

  setMonTexture(side: Side, speciesId: string): void {
    this.species[side] = speciesId
    const key = ensureTexture(this.scene, `mons/${speciesId}_${side === 'enemy' ? 'front' : 'back'}`, 64, 64)
    this.mon[side].setTexture(key).clearTint().setScale(1).setAlpha(1).clearMask()
    this.home(side)
  }

  /** Place a mon at its resting spot. */
  home(side: Side): void {
    const p = side === 'enemy' ? LAYOUT.enemyMon : LAYOUT.playerMon
    this.off[side].x = 0
    this.off[side].y = 0
    this.mon[side].setPosition(p.x, p.y)
  }

  /** Approximate centre of the mon's visible body (FX target). */
  center(side: Side): { x: number; y: number } {
    return side === 'enemy' ? { x: LAYOUT.enemyMon.x, y: LAYOUT.enemyMon.y - 26 } : { x: LAYOUT.playerMon.x, y: LAYOUT.playerMon.y - 30 }
  }

  /** Per-frame: idle bob (player mon + plate, out of phase, like GBA), plate ticks. */
  tick(): void {
    this.frame++
    const bobOn = this.bobbing && !params.fast
    const phase = Math.floor(this.frame / 12) % 2
    const p = this.mon.player
    if (p.visible && this.playerResting) {
      p.y = LAYOUT.playerMon.y + this.off.player.y + (bobOn && phase ? 1 : 0)
      p.x = LAYOUT.playerMon.x + this.off.player.x
    }
    this.hud.player.bobOffset = bobOn && !phase ? 1 : 0
    this.hud.player.tick()
    this.hud.enemy.tick()
    this.tickIdle()
    this.tickGlitch()
    for (const s of ['player', 'enemy'] as Side[]) {
      const q = this.hallucinating[s]
      if (q) {
        const c = this.center(s)
        const t = this.frame / 10
        q.setPosition(Math.round(c.x + Math.cos(t) * 14), Math.round(c.y - 30 + Math.sin(t * 2) * 2))
        q.setVisible(this.mon[s].visible && Math.floor(this.frame / 20) % 3 !== 2)
      }
    }
  }

  /** True when no tween owns the player sprite position (so the bob can drive it). */
  playerResting = true

  setBob(on: boolean): void {
    this.bobbing = on
    if (!on) this.hud.player.bobOffset = 0
  }

  setHallucinating(side: Side, on: boolean): void {
    if (on && !this.hallucinating[side]) {
      this.hallucinating[side] = this.scene.add.image(0, 0, 'bfx/q').setDepth(DEPTH.fx).setTint(TYPE_COLOR.glitch)
    } else if (!on && this.hallucinating[side]) {
      this.hallucinating[side]!.destroy()
      this.hallucinating[side] = null
    }
  }

  // ---------------------------------------------------------------- intro

  /**
   * Platforms (and what stands on them) slide in from opposite sides: the enemy's from
   * the left, the player's from the right. Wild mons arrive darkened.
   */
  async introSlide(kind: 'wild' | 'trainer' | 'scripted', enemySpecies: string, trainerSprite?: string): Promise<void> {
    const e = this.mon.enemy
    const pt = this.playerTrainer
    const et = this.enemyTrainer
    const isTrainer = kind === 'trainer' && !!trainerSprite
    if (isTrainer) {
      et.setTexture(this.trainerKey(trainerSprite!)).setVisible(true)
    } else {
      this.setMonTexture('enemy', enemySpecies)
      e.setVisible(true).setTint(DARK_TINT)
    }
    pt.setFrame(0).setVisible(true)
    // Separate lanes: the enemy side enters from the right edge, the player's side from
    // the left edge (slightly later), so the two never cross paths.
    const DE = W - LAYOUT.enemyPlatform.x
    const DP = 136
    const lag = 0.18
    const place = (k: number) => {
      const ke = Math.min(1, k / (1 - lag))
      const kp = Math.max(0, (k - lag) / (1 - lag))
      const ease = (t: number) => 1 - (1 - t) * (1 - t)
      const offE = Math.round((1 - ease(ke)) * DE)
      const offP = Math.round((1 - ease(kp)) * DP)
      this.platE.x = LAYOUT.enemyPlatform.x + offE
      e.x = LAYOUT.enemyMon.x + offE
      et.x = LAYOUT.enemyTrainer.x + offE
      this.platP.x = LAYOUT.playerPlatform.x - offP
      pt.x = LAYOUT.playerTrainer.x - offP
    }
    place(0)
    await animate(this.scene, TIMING.slideIn, place, 'Linear')
  }

  /** Wild mon brightens from its intro tint. */
  async litUp(): Promise<void> {
    const e = this.mon.enemy
    this.cry(this.species.enemy)
    await animate(this.scene, TIMING.litUp, (k) => e.setTint(mixColor(DARK_TINT, 0xffffff, k)))
    e.clearTint()
  }

  // ---------------------------------------------------------------- pips

  showPips(side: Side, states: PipState[]): void {
    const c = this.pips[side]
    c.removeAll(true)
    const g = this.scene.add.graphics()
    c.add(g)
    // A dark arrow-shaped bar under six slots, tapering toward the middle of the screen.
    const n = 6
    const len = n * 10 + 14
    const bar = (x0: number, dir: 1 | -1) => {
      for (let r = 0; r < 4; r++) {
        const taper = 3 - r
        const x = dir === 1 ? x0 : x0 - len + taper
        g.fillStyle(r === 0 ? 0xfcfaf0 : r === 3 ? 0x28222e : 0x404868)
        g.fillRect(x, 9 + r, len - taper, 1)
      }
      g.fillStyle(0x28222e)
      g.fillRect(dir === 1 ? x0 : x0 - len, 8, len, 1)
    }
    if (side === 'enemy') {
      bar(0, 1)
      for (let i = 0; i < n; i++) {
        const st = states[i] ?? 'empty'
        c.add(this.scene.add.image(len - 16 - i * 10, 0, 'ui/orb_slots', String(PIP_FRAME[st])).setOrigin(0, 0))
      }
    } else {
      bar(len, -1)
      for (let i = 0; i < n; i++) {
        const st = states[i] ?? 'empty'
        c.add(this.scene.add.image(8 + i * 10, 0, 'ui/orb_slots', String(PIP_FRAME[st])).setOrigin(0, 0))
      }
    }
    c.setVisible(true)
  }

  async slidePipsIn(sides: Side[] = ['enemy', 'player']): Promise<void> {
    const e = this.pips.enemy
    const p = this.pips.player
    const all: Promise<void>[] = []
    if (sides.includes('enemy')) {
      e.setPosition(-80, 26)
      all.push(tween(this.scene, e, TIMING.hudSlide, { x: 0, ease: 'Cubic.Out' }))
    }
    if (sides.includes('player')) {
      p.setPosition(W + 4, 90)
      all.push(tween(this.scene, p, TIMING.hudSlide, { x: W - 74, ease: 'Cubic.Out' }))
    }
    await Promise.all(all)
  }

  async hidePips(side: Side): Promise<void> {
    const c = this.pips[side]
    if (!c.visible) return
    await tween(this.scene, c, TIMING.hudSlide, { x: side === 'enemy' ? -80 : W + 4, alpha: 0, ease: 'Cubic.In' })
    c.setVisible(false).setAlpha(1)
  }

  // ---------------------------------------------------------------- orbs, send-out, recall

  private orb(x: number, y: number): Phaser.GameObjects.Image {
    return this.scene.add.image(x, y, 'fx/orb_throw', 0).setDepth(DEPTH.fxTop)
  }

  /** White ring + sparks where an orb opens. */
  async openFlash(x: number, y: number, color = 0xffffff): Promise<void> {
    const g = this.scene.add.graphics().setDepth(DEPTH.fxTop)
    const sparks = Array.from({ length: 8 }, (_, i) => {
      const s = this.scene.add.image(x, y, 'bfx/spark').setDepth(DEPTH.fxTop).setTint(color)
      return { s, a: (i / 8) * Math.PI * 2 }
    })
    await animate(this.scene, 300, (k) => {
      g.clear()
      const r = 2 + k * 18
      g.lineStyle(2, 0xffffff, 1 - k)
      g.strokeCircle(x, y, r)
      for (const { s, a } of sparks) {
        const d = 4 + k * 22
        s.setPosition(Math.round(x + Math.cos(a) * d), Math.round(y + Math.sin(a) * d))
        s.setAlpha(1 - k * k)
      }
    })
    g.destroy()
    for (const { s } of sparks) s.destroy()
  }

  /** The mon grows out of the orb point, white, then colours in. */
  async pop(side: Side, speciesId: string): Promise<void> {
    this.setMonTexture(side, speciesId)
    const m = this.mon[side]
    if (side === 'player') this.playerResting = false
    m.setVisible(true).setScale(0.15).clearTint()
    this.cry(speciesId)
    // white silhouette on top that fades out once the mon is full size
    const ov = this.scene.add.image(m.x, m.y, m.texture.key).setOrigin(0.5, 1).setDepth(m.depth + 1).setTintFill(0xffffff).setScale(0.15)
    await tween(this.scene, [m, ov], TIMING.popMs, { scale: 1, ease: 'Back.Out' })
    m.setScale(1)
    void tween(this.scene, ov, 200, { alpha: 0 }).then(() => ov.destroy())
    await wait(this.scene, 60)
    if (side === 'player') this.playerResting = true
  }

  /** Player throws (trainer on screen: throw frames + slide out; else from off-screen left). */
  async playerSendOut(speciesId: string, withTrainer: boolean): Promise<void> {
    const pt = this.playerTrainer
    const start = { x: 70, y: 62 }
    if (withTrainer && pt.visible) {
      pt.setFrame(1)
      await wait(this.scene, 120)
      pt.setFrame(2)
      void tween(this.scene, pt, TIMING.trainerSlide, { x: -48, ease: 'Sine.In', onComplete: () => pt.setVisible(false) })
      this.scene.time.delayedCall(params.fast ? 0 : 90, () => pt.setFrame(3))
    } else {
      start.x = -8
      start.y = 70
    }
    audio.sfx('orb_throw')
    const end = { x: LAYOUT.playerMon.x, y: 80 }
    const o = this.orb(start.x, start.y)
    await animate(this.scene, TIMING.throwMs, (k) => {
      o.setPosition(Math.round(bez(start.x, (start.x + end.x) / 2 + 8, end.x, k)), Math.round(bez(start.y, 26, end.y, k)))
      o.setFrame([0, 1, 0, 2][Math.floor(k * 8) % 4])
    })
    o.setFrame(3)
    await Promise.all([this.openFlash(end.x, end.y), this.popAt('player', speciesId, o)])
  }

  private async popAt(side: Side, speciesId: string, o: Phaser.GameObjects.Image): Promise<void> {
    await wait(this.scene, 60)
    o.destroy()
    await this.pop(side, speciesId)
  }

  /** Trainer's mon: their sprite slides off, an orb drops onto the platform and opens. */
  async enemySendOut(speciesId: string): Promise<void> {
    const et = this.enemyTrainer
    if (et.visible) {
      await tween(this.scene, et, TIMING.trainerSlide, { x: W + 40, ease: 'Sine.In' })
      et.setVisible(false)
    }
    audio.sfx('orb_throw')
    const start = { x: W + 8, y: 10 }
    const end = { x: LAYOUT.enemyMon.x, y: 44 }
    const o = this.orb(start.x, start.y)
    await animate(this.scene, TIMING.throwMs * 0.8, (k) => {
      o.setPosition(Math.round(bez(start.x, 206, end.x, k)), Math.round(bez(start.y, 4, end.y, k)))
      o.setFrame([0, 2, 0, 1][Math.floor(k * 8) % 4])
    })
    o.setFrame(3)
    await Promise.all([this.openFlash(end.x, end.y), this.popAt('enemy', speciesId, o)])
  }

  /** Recall: the mon flashes white and shrinks into its orb. */
  async withdraw(side: Side): Promise<void> {
    const m = this.mon[side]
    if (side === 'player') this.playerResting = false
    audio.sfx('orb_throw')
    m.setTintFill(0xffffff)
    await tween(this.scene, m, 280, { scale: 0.05, ease: 'Cubic.In' })
    m.setVisible(false).setScale(1).clearTint()
    this.setHallucinating(side, false)
    if (side === 'player') this.playerResting = true
  }

  // ---------------------------------------------------------------- hits, faints

  /** Target blinks (and shakes harder when it's super effective). */
  async hit(side: Side, effectiveness: number, crit: boolean): Promise<void> {
    const m = this.mon[side]
    audio.sfx(effectiveness > 1 ? 'hit_super' : effectiveness < 1 ? 'hit_weak' : 'hit')
    if (effectiveness > 1 || crit) this.shakeCamera(effectiveness > 1 ? 3 : 2, 220)
    if (effectiveness > 1 && !params.fast) {
      // 2-frame white flash on the target, then the usual blink + harder shake
      m.setTintFill(0xffffff)
      await frames(this.scene, 2, () => undefined)
      m.clearTint()
    }
    const n = TIMING.hitBlinks
    const amp = effectiveness > 1 ? 3 : effectiveness < 1 ? 1 : 2
    if (side === 'player') this.playerResting = false
    const bx = side === 'enemy' ? LAYOUT.enemyMon.x : LAYOUT.playerMon.x
    await frames(this.scene, n * 8, (f) => {
      m.setVisible(Math.floor(f / 4) % 2 === 1 || f >= n * 8)
      m.x = bx + (f < n * 8 ? [0, amp, 0, -amp][Math.floor(f / 2) % 4] : 0)
    })
    m.setVisible(true)
    m.x = bx
    if (side === 'player') this.playerResting = true
  }

  shakeCamera(px: number, dur: number): void {
    if (params.fast) return
    const cam = this.scene.cameras.main
    let f = 0
    const ev = this.scene.time.addEvent({
      delay: 1000 / 60, loop: true,
      callback: () => {
        f++
        cam.setScroll(f * 16 >= dur ? 0 : [px, -px, px - 1, -(px - 1)][f % 4], 0)
        if (f * 16 >= dur) ev.remove()
      },
    })
  }

  /** Faint: cry-ish sfx, the sprite slides down behind its platform edge. */
  async faint(side: Side): Promise<void> {
    const m = this.mon[side]
    this.cry(this.species[side], true)
    if (side === 'player') this.playerResting = false
    const bottom = side === 'enemy' ? LAYOUT.enemyMon.y : LAYOUT.playerMon.y
    const shape = this.scene.make.graphics({ x: 0, y: 0 }, false)
    shape.fillStyle(0xffffff)
    shape.fillRect(0, 0, W, bottom)
    m.setMask(shape.createGeometryMask())
    await wait(this.scene, 120)
    await tween(this.scene, m, TIMING.faintMs, { y: bottom + 64, ease: 'Quad.In' })
    m.setVisible(false).clearMask()
    shape.destroy()
    this.home(side)
    this.setHallucinating(side, false)
    if (side === 'player') this.playerResting = true
  }

  /** Scripted defeat: the mon staggers, then dashes off to the right. */
  async flee(side: Side): Promise<void> {
    const m = this.mon[side]
    const x0 = m.x
    audio.sfx('run')
    await frames(this.scene, 20, (f) => (m.x = x0 + [0, -2, 0, 2][Math.floor(f / 3) % 4]))
    m.setFlipX(side === 'enemy')
    await tween(this.scene, m, 380, { x: W + 48, ease: 'Quad.In' })
    m.setVisible(false).setFlipX(false)
    this.home(side)
    this.setHallucinating(side, false)
  }

  // ---------------------------------------------------------------- stats + statuses

  async statChange(side: Side, up: boolean): Promise<void> {
    const m = this.mon[side]
    audio.sfx(up ? 'stat_up' : 'stat_down')
    const c = this.center(side)
    const tint = up ? 0xf89848 : 0x5880f0
    // coloured glow over the sprite (a tint-filled copy whose alpha pulses)
    const glow = this.scene.add.image(m.x, m.y, m.texture.key).setOrigin(0.5, 1).setDepth(m.depth + 1).setTintFill(tint).setAlpha(0)
    const arrows = Array.from({ length: 10 }, (_, i) =>
      this.scene.add.image(c.x - 27 + (i % 5) * 13 + (i >= 5 ? 6 : 0), 0, up ? 'bfx/arrow_up' : 'bfx/arrow_down').setDepth(DEPTH.fx).setTint(tint))
    const span = 56
    await animate(this.scene, 760, (k) => {
      glow.setPosition(m.x, m.y).setAlpha(0.5 * Math.max(0, Math.sin(k * Math.PI * 3)))
      arrows.forEach((a, i) => {
        const t = (k * 2 + (i >= 5 ? 0.5 : 0) + (i % 2) * 0.15) % 1
        const y = up ? c.y + span / 2 - t * span : c.y - span / 2 + t * span
        a.setY(Math.round(y))
        a.setVisible(k < 0.92 && t > 0.05 && t < 0.95)
      })
    })
    glow.destroy()
    arrows.forEach((a) => a.destroy())
  }

  /** Small loop over the mon for a status inflicted / preventing a move. */
  async statusAnim(side: Side, status: string): Promise<void> {
    const c = this.center(side)
    const m = this.mon[side]
    const key = status === 'timed_out' ? 'bfx/zz' : status === 'hallucinating' ? 'bfx/q' : status === 'rate_limited' ? 'bfx/sweat' : 'bfx/dot'
    const color = status === 'context_rot' ? 0xb070d8 : status === 'hallucinating' ? TYPE_COLOR.glitch : status === 'timed_out' ? 0xd0d8f8 : 0xffffff
    const parts = Array.from({ length: 5 }, () => this.scene.add.image(c.x, c.y, key).setDepth(DEPTH.fx).setTint(color))
    await animate(this.scene, 700, (k) => {
      parts.forEach((p, i) => {
        const a = k * Math.PI * 3 + (i / parts.length) * Math.PI * 2
        p.setPosition(Math.round(c.x + Math.cos(a) * 18), Math.round(c.y - 10 + Math.sin(a) * 6 - k * 10))
        p.setAlpha(1 - k * k)
      })
      if (status === 'context_rot') m.setTint(mixColor(0xffffff, 0xc090e0, Math.sin(k * Math.PI)))
    })
    m.clearTint()
    parts.forEach((p) => p.destroy())
  }

  async healGlow(side: Side): Promise<void> {
    const m = this.mon[side]
    const c = this.center(side)
    const sp = Array.from({ length: 6 }, (_, i) => this.scene.add.image(c.x - 20 + i * 8, c.y + 20, 'bfx/spark').setDepth(DEPTH.fx).setTint(0x90f0a0))
    const ov = this.scene.add.image(m.x, m.y, m.texture.key).setOrigin(0.5, 1).setDepth(m.depth + 1).setTintFill(0xb0f8b8).setAlpha(0)
    await animate(this.scene, 600, (k) => {
      ov.setPosition(m.x, m.y).setAlpha(0.5 * Math.sin(k * Math.PI))
      sp.forEach((s, i) => {
        const t = (k * 1.5 + i * 0.17) % 1
        s.setY(Math.round(c.y + 20 - t * 44)).setVisible(t > 0.08 && t < 0.92)
      })
    })
    ov.destroy()
    sp.forEach((s) => s.destroy())
  }

  // ---------------------------------------------------------------- trainers

  /** BATTLE-CORE gives 'trainer_f_front'; the texture is 'battle/trainer_f_front'. Accept either. */
  trainerKey(sprite: string): string {
    const t = this.scene.textures
    if (t.exists(sprite)) return sprite
    if (t.exists(`battle/${sprite}`)) return `battle/${sprite}`
    return ensureTexture(this.scene, sprite.includes('/') ? sprite : `battle/${sprite}`, 64, 64)
  }

  async trainerReappear(sprite: string): Promise<void> {
    const et = this.enemyTrainer
    et.setTexture(this.trainerKey(sprite)).setVisible(true).setAlpha(1)
    et.x = W + 40
    await tween(this.scene, et, TIMING.trainerSlide + 120, { x: LAYOUT.enemyTrainer.x, ease: 'Cubic.Out' })
  }

  // ---------------------------------------------------------------- catching

  private catchOrb?: Phaser.GameObjects.Image

  /** Orb arcs to the wild mon, opens, the mon is drawn in, the orb drops and bounces. */
  async catchThrow(): Promise<void> {
    const e = this.mon.enemy
    const start = { x: 20, y: 104 }
    const end = { x: LAYOUT.enemyMon.x, y: 30 }
    audio.sfx('orb_throw')
    const o = this.orb(start.x, start.y)
    this.catchOrb = o
    await animate(this.scene, TIMING.throwMs + 120, (k) => {
      o.setPosition(Math.round(bez(start.x, 150, end.x, k)), Math.round(bez(start.y, 40, end.y, k)))
      o.setFrame([0, 1, 0, 2][Math.floor(k * 10) % 4])
    })
    // open + suck in
    o.setFrame(3)
    void this.openFlash(end.x, end.y - 2, 0xfce070)
    e.setTintFill(0xffffff)
    const ey = e.y
    await animate(this.scene, 360, (k) => {
      e.setScale(1 - k * 0.95)
      e.y = Math.round(ey - (ey - end.y - 8) * k)
      e.setAlpha(1 - k * 0.3)
    })
    e.setVisible(false).setScale(1).setAlpha(1).clearTint()
    e.y = ey
    this.hud.enemy.root.setAlpha(1)
    await wait(this.scene, 120)
    o.setFrame(0)
    // drop + bounce onto the platform
    const ground = LAYOUT.enemyMon.y - 10
    await tween(this.scene, o, 260, { y: ground, ease: 'Quad.In' })
    audio.sfx('bump')
    await tween(this.scene, o, 140, { y: ground - 8, ease: 'Quad.Out' })
    await tween(this.scene, o, 140, { y: ground, ease: 'Quad.In' })
    await tween(this.scene, o, 90, { y: ground - 3, ease: 'Quad.Out' })
    await tween(this.scene, o, 90, { y: ground, ease: 'Quad.In' })
    await wait(this.scene, 260)
  }

  async catchShake(): Promise<void> {
    const o = this.catchOrb
    if (!o) return
    await wait(this.scene, TIMING.shakeGapMs)
    audio.sfx('orb_shake')
    const x0 = LAYOUT.enemyMon.x
    await frames(this.scene, Math.round(TIMING.shakeMs / 16.7), (f) => {
      const seq = [1, 1, 1, 0, 2, 2, 2, 0]
      const i = Math.min(seq.length - 1, Math.floor((f / Math.round(TIMING.shakeMs / 16.7)) * seq.length))
      o.setFrame(seq[i])
      o.x = x0 + (seq[i] === 1 ? -1 : seq[i] === 2 ? 1 : 0)
    })
    o.setFrame(0)
    o.x = x0
  }

  async catchResult(caught: boolean, speciesId: string): Promise<void> {
    const o = this.catchOrb
    if (!o) return
    await wait(this.scene, TIMING.shakeGapMs)
    if (caught) {
      audio.sfx('orb_catch')
      const stars = [-1, 0, 1].map((d) => ({ s: this.scene.add.image(o.x, o.y, 'bfx/star').setDepth(DEPTH.fxTop), d }))
      await animate(this.scene, 520, (k) => {
        for (const { s, d } of stars) {
          s.setPosition(Math.round(o.x + d * k * 16), Math.round(o.y - 4 - Math.sin(k * Math.PI) * 14 - (d === 0 ? k * 6 : 0)))
          s.setAlpha(k < 0.7 ? 1 : (1 - k) / 0.3)
        }
      })
      stars.forEach(({ s }) => s.destroy())
      await animate(this.scene, 300, (k) => o.setTint(mixColor(0xffffff, 0x8080a0, k)))
      return
    }
    audio.sfx('orb_break')
    o.setFrame(3)
    void this.openFlash(o.x, o.y, 0xfce070)
    await wait(this.scene, 80)
    o.destroy()
    this.catchOrb = undefined
    await this.pop('enemy', speciesId)
  }

  clearCatchOrb(): void {
    this.catchOrb?.destroy()
    this.catchOrb = undefined
  }

  // ================================================================ stage 1: idles, glitch, arena FX

  idle: { mode: IdleMode; speed: number } = { mode: 'breathe', speed: 1 }
  private idleT = 0
  private glitchLevel = 0
  private glitchGhost: Phaser.GameObjects.Image | null = null
  private glitchLeft = 0

  /** Enemy idle loop. `speed` multiplies the cadence (warmup: 0.5 → 1.6). */
  setIdle(mode: IdleMode, speed = 1): void {
    this.idle = { mode, speed }
  }

  private tickIdle(): void {
    const m = this.mon.enemy
    if (params.fast || !m.visible || this.scene.tweens.isTweening(m) || this.nodding) return
    const { mode, speed } = this.idle
    this.idleT += speed / 60
    let ox = 0
    let sy = 1
    if (mode === 'breathe') {
      sy = 1 + (Math.sin(this.idleT * Math.PI * 1.2) > 0.6 ? 1 / 64 : 0)
    } else if (mode === 'polite') {
      // small, upright, slow: a well-behaved student
      sy = 1 + (Math.sin(this.idleT * Math.PI * 0.8) > 0.2 ? 1 / 64 : 0)
    } else if (mode === 'lunge') {
      // every ~0.9 s a quick lean toward the player, held a beat, then back
      const ph = (this.idleT * 1.1) % 1
      const k = ph < 0.08 ? ph / 0.08 : ph < 0.3 ? 1 : ph < 0.42 ? 1 - (ph - 0.3) / 0.12 : 0
      ox = Math.round(k * 4)
      sy = 1 - k * (2 / 64)
    }
    // origin x shifts the drawn sprite without touching x (lunges/hits own x)
    m.setOrigin(0.5 + ox / 64, 1)
    if (Math.abs(m.scaleX - 1) < 0.05) m.setScale(1, sy)
  }

  /** Team Overfit: how often the enemy sprite tears (0 = clean, each off-script turn +1). */
  setGlitch(level: number): void {
    this.glitchLevel = Math.max(0, level)
  }

  private tickGlitch(): void {
    const m = this.mon.enemy
    if (this.glitchLeft > 0) {
      this.glitchLeft--
      if (this.glitchGhost && this.glitchLeft === 0) {
        this.glitchGhost.destroy()
        this.glitchGhost = null
        m.setAlpha(1)
      }
      return
    }
    if (params.fast || !m.visible || this.glitchLevel <= 0) return
    if (Math.random() > Math.min(0.12, this.glitchLevel * 0.012)) return
    // one tear: a colour-split ghost offset 2-4 px and a dropped row band
    const dx = (Math.random() < 0.5 ? -1 : 1) * (2 + Math.floor(Math.random() * Math.min(3, this.glitchLevel)))
    const band = Math.floor(Math.random() * 7) * 8
    this.glitchGhost = this.scene.add.image(m.x + dx, m.y, m.texture.key).setOrigin(m.originX, 1).setDepth(m.depth + 1)
      .setTintFill(Math.random() < 0.5 ? 0x60f0f0 : 0xe85080).setAlpha(0.6).setCrop(0, band, 64, 8 + this.glitchLevel * 2)
    this.glitchLeft = 3 + Math.min(4, this.glitchLevel)
  }

  /** Swap the battle background (request.background → battle/bg_<id>, grass if missing). */
  setBackground(key: string): void {
    if (this.scene.textures.exists(key)) this.bg.setTexture(key)
  }

  /** Base model fine-tuned / Proxy phase: white flash, the sprite swaps, a cry. */
  async formChange(side: Side, speciesId: string): Promise<void> {
    const m = this.mon[side]
    if (side === 'player') this.playerResting = false
    audio.sfx('stat_up')
    m.setTintFill(0xffffff)
    await tween(this.scene, m, 160, { scaleX: 1.15, scaleY: 0.9, ease: 'Quad.Out' })
    await tween(this.scene, m, 120, { scaleX: 0.85, scaleY: 1.1, ease: 'Quad.InOut' })
    const flash = this.scene.add.rectangle(0, 0, W, 112, 0xffffff).setOrigin(0, 0).setDepth(DEPTH.fxTop).setAlpha(0.9)
    const key = ensureTexture(this.scene, `mons/${speciesId}_${side === 'enemy' ? 'front' : 'back'}`, 64, 64)
    this.species[side] = speciesId
    m.setTexture(key).setScale(1)
    void tween(this.scene, flash, 280, { alpha: 0, onComplete: () => flash.destroy() })
    await wait(this.scene, 90)
    m.clearTint()
    this.cry(speciesId)
    if (side === 'player') this.playerResting = true
    await wait(this.scene, 200)
  }

  /** Early Stopping / Drop Units / Polite Refusal: a hex shield flashes in front of the mon. */
  async protectFx(side: Side): Promise<void> {
    const c = this.center(side)
    const g = this.scene.add.graphics().setDepth(DEPTH.fx)
    audio.sfx('hit_weak')
    await animate(this.scene, 520, (k) => {
      g.clear()
      const a = k < 0.2 ? k / 0.2 : 1 - (k - 0.2) / 0.8
      const r = 22 + Math.round(k * 4)
      for (const [lw, col, al] of [[3, 0x283048, 0.7], [1, 0xa8e0f8, 1]] as const) {
        g.lineStyle(lw, col, a * al)
        g.beginPath()
        for (let i = 0; i <= 6; i++) {
          const ang = (i / 6) * Math.PI * 2 + Math.PI / 6
          const px = Math.round(c.x + Math.cos(ang) * r)
          const py = Math.round(c.y + Math.sin(ang) * r * 0.9)
          if (i === 0) g.moveTo(px, py)
          else g.lineTo(px, py)
        }
        g.strokePath()
      }
      g.fillStyle(0xd8f0f8, a * 0.25)
      g.fillCircle(c.x, c.y, r - 2)
    })
    g.destroy()
  }

  /** Stat stages back to 0: a neutral grey sweep wipes the arrows off each sprite. */
  async stagesWipe(sides: Side[]): Promise<void> {
    audio.sfx('select')
    const gs = sides.map(() => this.scene.add.graphics().setDepth(DEPTH.fx))
    await animate(this.scene, 420, (k) => {
      sides.forEach((s, i) => {
        const g = gs[i]
        const c = this.center(s)
        g.clear()
        const y = Math.round(c.y - 30 + k * 60)
        g.fillStyle(0xfcfaf0, 0.75 * (1 - k))
        g.fillRect(c.x - 28, y, 56, 2)
        g.fillStyle(0x9098b0, 0.6 * (1 - k))
        g.fillRect(c.x - 28, y - 3, 56, 1)
        g.fillRect(c.x - 28, y + 4, 56, 1)
      })
    })
    gs.forEach((g) => g.destroy())
  }

  private nodding = false

  /**
   * Obedience beat (League 4 / the keys): `passed` = a calm double nod and a heart;
   * otherwise the mon shakes its head (sprite flips its weight side to side) under a small cross.
   */
  async obedience(side: Side, passed: boolean): Promise<void> {
    const m = this.mon[side]
    if (!m.visible) return
    this.nodding = true
    if (side === 'player') this.playerResting = false
    const c = this.center(side)
    const icon = this.scene.add.image(c.x + 18, c.y - 30, passed ? 'bfx/heart' : 'bfx/cross').setDepth(DEPTH.fxTop).setAlpha(0)
    void tween(this.scene, icon, 160, { alpha: 1, y: c.y - 34, ease: 'Quad.Out' })
    audio.sfx(passed ? 'select' : 'cancel')
    if (passed) {
      for (let i = 0; i < 2; i++) {
        await animate(this.scene, 220, (k) => m.setOrigin(0.5, 1 - Math.sin(k * Math.PI) * (3 / 64)))
        await wait(this.scene, 60)
      }
    } else {
      await animate(this.scene, 560, (k) => m.setOrigin(0.5 + Math.round(Math.sin(k * Math.PI * 6) * 3 * (1 - k)) / 64, 1))
    }
    m.setOrigin(0.5, 1)
    await wait(this.scene, 160)
    void tween(this.scene, icon, 200, { alpha: 0, onComplete: () => icon.destroy() })
    this.nodding = false
    if (side === 'player') this.playerResting = true
  }

  /** Floating caption over a side (copied move, sampled move name, ...). */
  caption(side: Side, text: string, color = 0xfcfaf0): { setText(t: string): void; destroy(): void; fade(): Promise<void> } {
    const c = this.center(side)
    const t = new PxText(this.scene, 0, 0, text, { font: FONT.mini, color, shadow: 'drop', shadowColor: 0x28222e }).setDepth(DEPTH.fxTop + 2)
    const bg = this.scene.add.graphics().setDepth(DEPTH.fxTop + 1)
    const place = () => {
      const w = measure(this.scene, FONT.mini, t.text)
      const x = Math.max(2, Math.min(W - w - 4, Math.round(c.x - w / 2)))
      const y = Math.max(2, c.y - 44)
      t.setPosition(x, y)
      bg.clear()
      bg.fillStyle(0x28222e, 0.8)
      bg.fillRect(x - 3, y - 2, w + 6, 10)
    }
    place()
    return {
      setText: (s: string) => {
        t.setText(s)
        place()
      },
      destroy: () => {
        t.destroy()
        bg.destroy()
      },
      fade: async () => {
        await tween(this.scene, [bg, ...t.objects()], 220, { alpha: 0 })
        t.destroy()
        bg.destroy()
      },
    }
  }

  /** "Copied!" sparkle ring over the enemy (Copy Head). */
  async copySparkle(side: Side): Promise<void> {
    const c = this.center(side)
    const stars = Array.from({ length: 6 }, () => this.scene.add.image(c.x, c.y, 'bfx/star').setDepth(DEPTH.fxTop))
    audio.sfx('stat_up')
    await animate(this.scene, 520, (k) => {
      stars.forEach((s, i) => {
        const a = (i / 6) * Math.PI * 2 + k * 3
        s.setPosition(Math.round(c.x + Math.cos(a) * 24 * (1 - k * 0.5)), Math.round(c.y - 6 + Math.sin(a) * 10))
        s.setAlpha(1 - k * k)
      })
    })
    stars.forEach((s) => s.destroy())
  }

  // ---------------------------------------------------------------- pips (bench, copies)

  /** Player pips shown above the player's plate (bench hits, copies) while the plate stays up. */
  async flashPips(states: PipState[], flash: number[], kind: 'hit' | 'faint' | 'copy', holdMs = 700): Promise<void> {
    const c = this.pips.player
    this.showPips('player', states)
    // faces for Proxy copies (a calm mascot face in the slot)
    states.forEach((st, i) => {
      if (st !== 'copy') return
      const face = this.scene.add.image(8 + i * 10 + 4, 4, 'bfx/face').setTint(0xd8d0f8)
      face.setData('slot', i)
      c.add(face)
    })
    c.setPosition(W + 4, 54).setVisible(true).setAlpha(1)
    await tween(this.scene, c, TIMING.hudSlide, { x: W - 74, ease: 'Cubic.Out' })
    const imgs = c.list.filter((o) => o instanceof Phaser.GameObjects.Image) as Phaser.GameObjects.Image[]
    const slotImg = (i: number) => imgs.filter((o) => o.texture.key === 'ui/orb_slots')[i]
    if (kind === 'copy') {
      for (const i of flash) {
        const f = imgs.find((o) => o.texture.key === 'bfx/face' && o.getData('slot') === i)
        if (!f) continue
        f.setScale(0)
        audio.sfx('select')
        await tween(this.scene, f, 220, { scale: 1, ease: 'Back.Out' })
      }
    } else {
      await frames(this.scene, 30, (fr) => {
        for (const i of flash) {
          const im = slotImg(i)
          if (!im) continue
          if (Math.floor(fr / 5) % 2 === 0) im.setTintFill(kind === 'faint' ? 0x9098b0 : 0xf85848)
          else im.clearTint()
        }
      })
      for (const i of flash) slotImg(i)?.clearTint()
    }
    await wait(this.scene, holdMs)
    await this.hidePips('player')
  }

  // ---------------------------------------------------------------- EVAL light on the field

  private evalCone: Phaser.GameObjects.Graphics | null = null

  /** A soft studio light falling on the enemy while the EVAL light is on. */
  setEvalCone(on: boolean): void {
    if (on && !this.evalCone) {
      const g = this.scene.add.graphics().setDepth(DEPTH.enemyMon + 1)
      const x = LAYOUT.enemyMon.x
      g.fillStyle(0xfcf0c0, 0.12)
      g.beginPath()
      g.moveTo(x - 8, 0)
      g.lineTo(x + 8, 0)
      g.lineTo(x + 40, 74)
      g.lineTo(x - 40, 74)
      g.closePath()
      g.fillPath()
      g.fillStyle(0xfcf0c0, 0.16)
      g.fillEllipse(x, 70, 84, 12)
      this.evalCone = g
    } else if (!on && this.evalCone) {
      this.evalCone.destroy()
      this.evalCone = null
    }
  }
}
