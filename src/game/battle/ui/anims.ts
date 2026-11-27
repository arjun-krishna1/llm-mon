// Move animations. One effect per BATTLE-CORE `anim` key, tinted by the move's type
// colour, with a type-specific particle so e.g. a Zhipu beam and a Glitch beam differ.
// Add a bespoke look for a single move in MOVE_OVERRIDES (see docs/BATTLE_UI.md).

import Phaser from 'phaser'
import { params } from '../../params'
import { DEPTH, LAYOUT, TYPE_COLOR } from './constants'
import { animate, bez, mixColor, tween, wait } from './util'
import type { Stage } from './Stage'
import type { Side } from '../core'

export type AnimKey = 'strike' | 'quick' | 'heavy' | 'beam' | 'burst' | 'wave' | 'glitch' | 'buff' | 'debuff' | 'status' | 'heal'

export interface AnimCtx {
  scene: Phaser.Scene
  stage: Stage
  /** Attacker. */
  side: Side
  /** Who the effect lands on (attacker for self-targeting moves). */
  target: Side
  color: number
  particle: string
  moveId: string
}

type AnimFn = (c: AnimCtx) => Promise<void>

/** Particle texture per move type (all white, tinted at runtime). */
export const TYPE_PARTICLE: Record<string, string> = {
  anthropic: 'bfx/spark',
  openai: 'bfx/orb',
  google: 'bfx/spark',
  zhipu: 'bfx/dot',
  deepseek: 'bfx/dot',
  mistral: 'bfx/slash',
  moonshot: 'bfx/orb',
  cohere: 'bfx/note',
  classic: 'bfx/orb',
  glitch: 'bfx/pixel',
}

/** Per-move tweaks: swap the effect, colour or particle for a single move id. */
export const MOVE_OVERRIDES: Record<string, { anim?: AnimKey; color?: number; particle?: string }> = {
  small_talk: { particle: 'bfx/note' },
  warm_nudge: { particle: 'bfx/spark', color: 0xf8c8a0 },
  graph_paw: { color: 0x90d8f8 },
  retry_loop: { color: 0xffffff },
  static_howl: { particle: 'bfx/pixel', color: TYPE_COLOR.glitch },
}

/**
 * Where a projectile/wave first appears: a third of the way from the attacker toward the
 * target, so nothing sparkles on the user's own body (reads as a self-hit otherwise).
 */
function launch(c: AnimCtx, b: { x: number; y: number }): { x: number; y: number } {
  const u = c.stage.center(c.side)
  return { x: Math.round(u.x + (b.x - u.x) * 0.33), y: Math.round(u.y + (b.y - u.y) * 0.33) }
}

function sideSign(side: Side): number {
  return side === 'player' ? 1 : -1
}

function home(side: Side): { x: number; y: number } {
  return side === 'enemy' ? LAYOUT.enemyMon : LAYOUT.playerMon
}

/** Attacker lunges toward the foe and back. `onContact` fires at full extension. */
async function lunge(c: AnimCtx, dist = 14, outMs = 110, backMs = 170, onContact?: () => void): Promise<void> {
  const m = c.stage.mon[c.side]
  const h = home(c.side)
  const s = sideSign(c.side)
  if (c.side === 'player') c.stage.playerResting = false
  await tween(c.scene, m, outMs, { x: h.x + s * dist, y: h.y - s * Math.round(dist * 0.45), ease: 'Quad.Out' })
  onContact?.()
  await tween(c.scene, m, backMs, { x: h.x, y: h.y, ease: 'Quad.InOut' })
  if (c.side === 'player') c.stage.playerResting = true
}

/** Star-shaped impact flash at the target. */
async function impact(c: AnimCtx, n = 2, big = false): Promise<void> {
  const t = c.stage.center(c.target)
  for (let i = 0; i < n; i++) {
    const ox = (i % 2 ? 8 : -6) + (big ? 0 : (i * 5) % 7)
    const oy = i % 2 ? -6 : 4
    const s = c.scene.add.image(t.x + ox, t.y + oy, 'bfx/impact').setDepth(DEPTH.fx).setTint(mixColor(c.color, 0xffffff, 0.4))
    s.setScale(big ? 2 : 1)
    void tween(c.scene, s, 180, { alpha: 0, ease: 'Quad.In', onComplete: () => s.destroy() })
    await wait(c.scene, 70)
  }
}

function particles(c: AnimCtx, n: number, key = c.particle, depth: number = DEPTH.fx): Phaser.GameObjects.Image[] {
  return Array.from({ length: n }, () => c.scene.add.image(-20, -20, key).setDepth(depth).setTint(c.color))
}

const strike: AnimFn = async (c) => {
  await lunge(c, 14, 110, 170, () => void impact(c, 2))
  await wait(c.scene, 120)
}

const quick: AnimFn = async (c) => {
  const m = c.stage.mon[c.side]
  const ghosts = [0.5, 0.25].map((a) => c.scene.add.image(m.x, m.y, m.texture.key).setOrigin(0.5, 1).setDepth(m.depth - 1).setAlpha(a).setTint(c.color))
  const h = home(c.side)
  const s = sideSign(c.side)
  if (c.side === 'player') c.stage.playerResting = false
  await animate(c.scene, 140, (k) => {
    const x = h.x + s * 22 * Math.sin(k * Math.PI)
    m.x = Math.round(x)
    ghosts.forEach((g, i) => (g.x = Math.round(h.x + s * 22 * Math.sin(Math.max(0, k - 0.12 * (i + 1)) * Math.PI))))
  })
  m.x = h.x
  if (c.side === 'player') c.stage.playerResting = true
  ghosts.forEach((g) => g.destroy())
  const t = c.stage.center(c.target)
  for (let i = 0; i < 3; i++) {
    const sl = c.scene.add.image(t.x - 10 + i * 10, t.y - 4 + (i % 2) * 6, 'bfx/slash').setDepth(DEPTH.fx).setTint(mixColor(c.color, 0xffffff, 0.5))
    if (i % 2) sl.setFlipX(true)
    void tween(c.scene, sl, 160, { alpha: 0, onComplete: () => sl.destroy() })
    await wait(c.scene, 60)
  }
  await wait(c.scene, 120)
}

const heavy: AnimFn = async (c) => {
  const m = c.stage.mon[c.side]
  const h = home(c.side)
  if (c.side === 'player') c.stage.playerResting = false
  await tween(c.scene, m, 200, { y: h.y - 10, ease: 'Quad.Out' })
  await wait(c.scene, 80)
  m.y = h.y
  await lunge(c, 18, 90, 200, () => {
    void impact(c, 1, true)
    c.stage.shakeCamera(3, 260)
  })
  await wait(c.scene, 160)
}

const beam: AnimFn = async (c) => {
  const b = c.stage.center(c.target)
  const a = launch(c, b)
  const ps = particles(c, 10)
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy)
  const nx = -dy / len
  const ny = dx / len
  await animate(c.scene, 620, (k) => {
    ps.forEach((p, i) => {
      const t = Math.max(0, Math.min(1, k * 1.8 - i * 0.08))
      const w = Math.sin(t * Math.PI * 3 + i) * 3
      p.setPosition(Math.round(a.x + dx * t + nx * w), Math.round(a.y + dy * t + ny * w))
      p.setVisible(t > 0 && t < 1)
    })
  })
  ps.forEach((p) => p.destroy())
  await impact(c, 2)
  await wait(c.scene, 100)
}

const burst: AnimFn = async (c) => {
  const b = c.stage.center(c.target)
  const a = launch(c, b)
  // shot
  const orb = c.scene.add.image(a.x, a.y, 'bfx/orb').setDepth(DEPTH.fx).setTint(c.color)
  await animate(c.scene, 240, (k) => {
    orb.setPosition(Math.round(bez(a.x, (a.x + b.x) / 2, b.x, k)), Math.round(bez(a.y, Math.min(a.y, b.y) - 16, b.y, k)))
  })
  orb.destroy()
  // explosion
  const g = c.scene.add.graphics().setDepth(DEPTH.fx)
  const ex = particles(c, 12)
  await animate(c.scene, 380, (k) => {
    g.clear()
    g.lineStyle(4, 0x382840, 1 - k)
    g.strokeCircle(b.x, b.y, 4 + k * 24)
    g.lineStyle(2, c.color, 1 - k)
    g.strokeCircle(b.x, b.y, 4 + k * 24)
    g.fillStyle(0xffffff, Math.max(0, 0.6 - k * 2))
    g.fillCircle(b.x, b.y, 10 + k * 6)
    ex.forEach((p, i) => {
      const ang = (i / 12) * Math.PI * 2
      const r = 4 + k * 26
      p.setPosition(Math.round(b.x + Math.cos(ang) * r), Math.round(b.y + Math.sin(ang) * r * 0.8))
      p.setAlpha(1 - k)
    })
  })
  g.destroy()
  ex.forEach((p) => p.destroy())
  await wait(c.scene, 80)
}

const wave: AnimFn = async (c) => {
  const b = c.stage.center(c.target)
  const a = launch(c, b)
  const g = c.scene.add.graphics().setDepth(DEPTH.fx)
  const tm = c.stage.mon[c.target]
  const th = home(c.target)
  const ps = particles(c, 6)
  await animate(c.scene, 760, (k) => {
    g.clear()
    for (let i = 0; i < 3; i++) {
      const t = Math.max(0, Math.min(1, k * 1.6 - i * 0.22))
      if (t <= 0 || t >= 1) continue
      const x = a.x + (b.x - a.x) * t
      const y = a.y + (b.y - a.y) * t
      const r = 6 + t * 14
      const ang = Math.atan2(b.y - a.y, b.x - a.x)
      for (const [lw, col] of [[4, 0x382840], [2, c.color]] as const) {
        g.lineStyle(lw, col, 1 - t * 0.5)
        g.beginPath()
        g.arc(x, y, r, ang - 0.9, ang + 0.9)
        g.strokePath()
      }
    }
    ps.forEach((p, i) => {
      const t = Math.max(0, Math.min(1, k * 1.4 - i * 0.07))
      p.setPosition(Math.round(a.x + (b.x - a.x) * t), Math.round(a.y + (b.y - a.y) * t + Math.sin(t * 12 + i) * 6))
      p.setVisible(t > 0 && t < 1)
    })
    if (k > 0.55) tm.x = th.x + Math.round(Math.sin(k * 40) * 2)
  })
  tm.x = th.x
  g.destroy()
  ps.forEach((p) => p.destroy())
  await wait(c.scene, 80)
}

const glitch: AnimFn = async (c) => {
  const m = c.stage.mon[c.target]
  const slices: Phaser.GameObjects.Image[] = []
  const n = 8
  for (let i = 0; i < n; i++) {
    const s = c.scene.add.image(m.x, m.y, m.texture.key).setOrigin(0.5, 1).setDepth(m.depth + 1)
    s.setCrop(0, i * 8, 64, 8)
    slices.push(s)
  }
  m.setVisible(false)
  if (c.side !== c.target) void lunge(c, 10, 90, 150)
  let f = 0
  await animate(c.scene, 560, () => {
    f++
    if (f % 3) return
    slices.forEach((s, i) => {
      const r = Math.sin(f * 1.7 + i * 2.3)
      s.x = m.x + (Math.abs(r) > 0.55 ? Math.round(r * 6) : 0)
      s.setTint(Math.abs(r) > 0.8 ? (i % 2 ? 0x60f0f0 : c.color) : 0xffffff)
    })
  })
  slices.forEach((s) => s.destroy())
  m.setVisible(true)
  await wait(c.scene, 60)
}

/** Tint-filled copy of a mon sprite used as a colour glow (alpha driven by the caller). */
export function overlay(scene: Phaser.Scene, m: Phaser.GameObjects.Image, color: number): Phaser.GameObjects.Image {
  return scene.add.image(m.x, m.y, m.texture.key).setOrigin(0.5, 1).setDepth(m.depth + 1).setTintFill(color).setAlpha(0)
}

const buff: AnimFn = async (c) => {
  const m = c.stage.mon[c.target]
  const t = c.stage.center(c.target)
  const ps = particles(c, 8)
  const ov = overlay(c.scene, m, c.color)
  await animate(c.scene, 700, (k) => {
    ov.setPosition(m.x, m.y).setAlpha(0.55 * Math.sin(k * Math.PI))
    ps.forEach((p, i) => {
      const tt = (k * 1.6 + i * 0.13) % 1
      const ang = i * 0.8 + k * 6
      p.setPosition(Math.round(t.x + Math.cos(ang) * 22), Math.round(t.y + 22 - tt * 48))
      p.setVisible(tt > 0.08 && tt < 0.92)
    })
  })
  ov.destroy()
  ps.forEach((p) => p.destroy())
}

const debuff: AnimFn = async (c) => {
  const b = c.stage.center(c.target)
  const a = launch(c, b)
  const g = c.scene.add.graphics().setDepth(DEPTH.fx)
  const tm = c.stage.mon[c.target]
  const ps = particles(c, 6)
  const ov = overlay(c.scene, tm, c.color)
  await animate(c.scene, 700, (k) => {
    g.clear()
    // rings close in on the target
    for (let i = 0; i < 2; i++) {
      const t = Math.max(0, Math.min(1, k * 1.5 - i * 0.3))
      if (t <= 0 || t >= 1) continue
      g.lineStyle(3, 0x382840, 0.8)
      g.strokeEllipse(b.x, b.y, (1 - t) * 64 + 6, (1 - t) * 40 + 4)
      g.lineStyle(1, c.color, 1)
      g.strokeEllipse(b.x, b.y, (1 - t) * 64 + 6, (1 - t) * 40 + 4)
    }
    ps.forEach((p, i) => {
      const t = Math.max(0, Math.min(1, k * 1.3 - i * 0.08))
      p.setPosition(Math.round(bez(a.x, (a.x + b.x) / 2, b.x + (i - 3) * 4, t)), Math.round(bez(a.y, Math.min(a.y, b.y) - 20, b.y, t)))
      p.setVisible(t > 0 && t < 1)
    })
    ov.setPosition(tm.x, tm.y).setAlpha(0.45 * Math.max(0, Math.sin((k - 0.4) * Math.PI * 1.6)))
  })
  ov.destroy()
  g.destroy()
  ps.forEach((p) => p.destroy())
}

const status: AnimFn = async (c) => {
  const t = c.stage.center(c.target)
  const ps = particles(c, 8)
  await animate(c.scene, 720, (k) => {
    ps.forEach((p, i) => {
      const ang = k * Math.PI * 4 + (i / 8) * Math.PI * 2
      const r = 24 * (1 - k * 0.6)
      p.setPosition(Math.round(t.x + Math.cos(ang) * r), Math.round(t.y + Math.sin(ang) * r * 0.4 - 6))
      p.setAlpha(1 - k * 0.5)
    })
  })
  ps.forEach((p) => p.destroy())
}

const heal: AnimFn = async (c) => {
  await c.stage.healGlow(c.target)
}

export const MOVE_ANIMS: Record<AnimKey, AnimFn> = { strike, quick, heavy, beam, burst, wave, glitch, buff, debuff, status, heal }

export async function playMoveAnim(scene: Phaser.Scene, stage: Stage, e: {
  side: Side; moveId: string; anim: string; moveType: string; targetSelf: boolean
}): Promise<void> {
  if (params.fast) return
  const ov = MOVE_OVERRIDES[e.moveId] ?? {}
  const key = (ov.anim ?? e.anim) as AnimKey
  const fn = MOVE_ANIMS[key] ?? strike
  const color = ov.color ?? TYPE_COLOR[e.moveType] ?? 0xffffff
  const particle = ov.particle ?? TYPE_PARTICLE[e.moveType] ?? 'bfx/orb'
  const target: Side = e.targetSelf || key === 'buff' || key === 'heal' ? e.side : e.side === 'player' ? 'enemy' : 'player'
  await fn({ scene, stage, side: e.side, target, color, particle, moveId: e.moveId })
}
