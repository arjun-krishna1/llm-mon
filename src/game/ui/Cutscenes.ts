// Engine cutscenes drawn procedurally in the UI scene: the badge-get scene and region-travel
// cards (train / plane / ferry). Both honour ?fast=1 (no animation).

import Phaser from 'phaser'
import { COLORS, FONT, H, W } from '../config'
import { audio } from '../audio'
import { params } from '../params'
import type { BadgeDef } from '../systems/badges'
import { skillDef } from '../systems/skills'
import type { UIScene } from '../scenes/UIScene'
import { PxText, measure } from './text'

function tween(scene: Phaser.Scene, cfg: Phaser.Types.Tweens.TweenBuilderConfig): Promise<void> {
  return new Promise((res) => {
    if (params.fast) {
      res()
      return
    }
    scene.tweens.add({ ...cfg, onComplete: () => res() })
  })
}

/**
 * Badge get: the screen dims, light rays turn, the badge spins in from above and lands with
 * a flash and sparkles to the `key_item_get` fanfare, then two lines of text.
 */
export async function badgeGetScene(ui: UIScene, def: BadgeDef, leader?: string): Promise<void> {
  const D = 950 // above HUD/banner, below the dialog box (1000)
  const dim = ui.add.rectangle(0, 0, W, H, 0x101420).setOrigin(0, 0).setDepth(D).setAlpha(0).setScrollFactor(0)
  const rays = ui.add.graphics().setDepth(D + 1).setScrollFactor(0)
  const spark = ui.add.graphics().setDepth(D + 3).setScrollFactor(0)
  const key = ui.textures.exists(`ui/badge_${def.id}_big`) ? `ui/badge_${def.id}_big` : `ui/badge_${def.id}`
  const img = ui.add.image(W / 2, -24, key).setDepth(D + 2).setScrollFactor(0)
  const cx = W / 2
  const cy = 60
  const t = { a: 0, k: 0 }
  const drawRays = () => {
    rays.clear()
    const n = 12
    for (let i = 0; i < n; i++) {
      const a0 = t.a + (i * Math.PI * 2) / n
      const a1 = a0 + Math.PI / n
      const r = 150
      rays.fillStyle(i % 2 ? def.colors[1] : def.colors[2], 0.22 * t.k)
      rays.fillTriangle(cx, cy, cx + Math.cos(a0) * r, cy + Math.sin(a0) * r, cx + Math.cos(a1) * r, cy + Math.sin(a1) * r)
    }
  }
  audio.sfx('key_item_get')
  await tween(ui, { targets: dim, alpha: 0.72, duration: 220 })
  // spin in: y falls with Back.Out while the badge turns (scaleX = cos), slowing to face front
  const spin = { p: 0 }
  await tween(ui, {
    targets: spin, p: 1, duration: 1300, ease: 'Linear',
    onUpdate: () => {
      const p = spin.p
      const fall = Phaser.Math.Easing.Back.Out(Math.min(1, p / 0.7))
      img.setY(Math.round(-24 + (cy + 24) * fall))
      const turns = 3 * (1 - (1 - p) ** 2) // decelerating
      const c = Math.cos(turns * Math.PI * 2)
      img.setScale(Math.abs(c) < 0.12 ? 0.12 : Math.abs(c), 1)
      img.setTint(c < 0 ? 0x9090a0 : 0xffffff)
      t.k = Math.min(1, p * 2)
      t.a += 0.01
      drawRays()
    },
  })
  img.setScale(1).setY(cy).clearTint()
  // landing flash + sparkles
  const flash = ui.add.rectangle(0, 0, W, H, 0xffffff).setOrigin(0, 0).setDepth(D + 4).setAlpha(0.6).setScrollFactor(0)
  await tween(ui, { targets: flash, alpha: 0, duration: 200 })
  flash.destroy()
  let frame = 0
  const sparkle = () => {
    frame++
    spark.clear()
    for (let i = 0; i < 6; i++) {
      const ph = (frame / 6 + i * 1.7) % 6
      if (ph > 3) continue
      const ang = i * 1.05 + 0.4
      const r = 20 + (i % 3) * 4
      const x = Math.round(cx + Math.cos(ang) * r)
      const y = Math.round(cy + Math.sin(ang) * r * 0.8)
      const s = ph < 1 || ph > 2 ? 1 : 2
      spark.fillStyle(0xfcfaf0)
      spark.fillRect(x - s, y, s * 2 + 1, 1)
      spark.fillRect(x, y - s, 1, s * 2 + 1)
    }
    t.a += 0.004
    drawRays()
  }
  ui.events.on('update', sparkle)
  try {
    const from = leader ? ` from ${leader}` : ''
    await ui.say(`{player} received the ${def.name}${from}!`, { silent: true })
    const sk = skillDef(def.skill)
    if (sk) await ui.say(`The ${def.name} lets your team use\n${sk.name} outside of battle.`)
  } finally {
    ui.events.off('update', sparkle)
  }
  await tween(ui, { targets: [dim, img], alpha: 0, duration: 250, onUpdate: () => { t.k = dim.alpha / 0.72; drawRays() } })
  for (const o of [dim, rays, spark, img]) o.destroy()
}

export type TravelKind = 'train' | 'plane' | 'ferry'

/** Region travel card: sky, a vehicle crossing, FROM ▶ TO, a progress dot. Leaves the screen black. */
export async function travelCard(ui: UIScene, kind: TravelKind, from: string, to: string): Promise<void> {
  await ui.fade(1, 300)
  const D = 2450
  const g = ui.add.graphics().setDepth(D).setScrollFactor(0)
  const v = ui.add.graphics().setDepth(D + 1).setScrollFactor(0)
  const label = `${from.toUpperCase()}  ▶  ${to.toUpperCase()}`
  const lw = measure(ui, FONT.dialog, label)
  const txt = new PxText(ui, Math.round((W - lw) / 2), 8, label, { color: 0xffffff, shadowColor: COLORS.frame[0] }).setDepth(D + 2).setScrollFactor(0)
  const p = { t: 0 }
  const draw = () => {
    const k = p.t
    g.clear()
    // sky bands (dusk for planes)
    const sky = kind === 'plane' ? [0x3c64c8, 0x6c98ec, 0xa8d8f8, 0xd8f0fc, 0xf4f6fa] : [0x78b8f0, 0xa8d8f8, 0xd8f0fc, 0xf4f6fa]
    g.fillStyle(sky[sky.length - 1])
    g.fillRect(0, 0, W, H)
    sky.forEach((c, i) => {
      g.fillStyle(c)
      g.fillRect(0, i * 22, W, 22)
    })
    // clouds scrolling
    g.fillStyle(0xffffff, 0.9)
    for (let i = 0; i < 5; i++) {
      const cx = ((i * 61 - k * (kind === 'plane' ? 400 : 120)) % 300 + 300) % 300 - 30
      const cy = 30 + (i * 17) % 50
      g.fillRect(cx, cy, 22, 4)
      g.fillRect(cx + 4, cy - 3, 12, 3)
    }
    if (kind === 'train') {
      g.fillStyle(0x58b257)
      g.fillRect(0, 88, W, 72)
      g.fillStyle(0x3f8f4a)
      for (let x = (-k * 600) % 40; x < W; x += 40) g.fillRect(Math.round(x), 92, 18, 3)
      // track: sleepers scrolling + rails
      g.fillStyle(0x7a5438)
      for (let x = (-k * 900) % 10; x < W; x += 10) g.fillRect(Math.round(x), 116, 4, 8)
      g.fillStyle(0x84808e)
      g.fillRect(0, 117, W, 2)
      g.fillRect(0, 122, W, 2)
    } else if (kind === 'ferry') {
      g.fillStyle(0x4a94dc)
      g.fillRect(0, 92, W, 68)
      g.fillStyle(0x72b8ee)
      for (let y = 96; y < 136; y += 6) for (let x = ((-k * 200 + y * 7) % 24) - 24; x < W; x += 24) g.fillRect(Math.round(x), y, 8, 1)
      g.fillStyle(0x6d8f5a)
      g.fillRect(0, 86, W, 6)
    } else {
      g.fillStyle(0x2f6fc0)
      g.fillRect(0, 112, W, 48)
      g.fillStyle(0x4a94dc)
      for (let x = (-k * 300) % 30; x < W; x += 30) g.fillRect(Math.round(x), 120 + (Math.round(x) % 3) * 6, 12, 1)
    }
    // route bar
    g.fillStyle(COLORS.frame[0], 0.85)
    g.fillRect(16, 140, W - 32, 12)
    g.fillStyle(0xfcfaf0)
    for (let x = 28; x < W - 28; x += 4) g.fillRect(x, 146, 2, 1)
    g.fillRect(24, 144, 4, 4)
    g.fillRect(W - 28, 144, 4, 4)
    g.fillStyle(COLORS.accent[1])
    g.fillRect(Math.round(24 + (W - 52) * k), 143, 5, 6)
    // vehicle
    v.clear()
    const vx = Math.round(-80 + (W + 100) * k)
    if (kind === 'train') {
      for (let c = 0; c < 3; c++) {
        const x = vx - c * 40
        v.fillStyle(COLORS.outline)
        v.fillRect(x - 1, 95, 38, 22)
        v.fillStyle(c === 0 ? 0xc83c44 : 0xdcdcdc)
        v.fillRect(x, 96, 36, 18)
        v.fillStyle(0x3c6c9c)
        for (let w = 0; w < 4; w++) v.fillRect(x + 4 + w * 8, 99, 5, 6)
        v.fillStyle(0xc83c44)
        v.fillRect(x, 108, 36, 2)
        v.fillStyle(COLORS.outline)
        v.fillRect(x + 4, 114, 6, 4)
        v.fillRect(x + 26, 114, 6, 4)
      }
    } else if (kind === 'ferry') {
      const bob = Math.round(Math.sin(k * 30) * 1)
      v.fillStyle(COLORS.outline)
      v.fillRect(vx - 1, 99 + bob, 62, 14)
      v.fillStyle(0xfcfaf0)
      v.fillRect(vx, 100 + bob, 60, 6)
      v.fillStyle(0x2c4a8c)
      v.fillRect(vx + 2, 106 + bob, 56, 6)
      v.fillStyle(0xfcfaf0)
      v.fillRect(vx + 14, 90 + bob, 30, 10)
      v.fillStyle(0x3c6c9c)
      for (let w = 0; w < 4; w++) v.fillRect(vx + 17 + w * 7, 93 + bob, 4, 3)
      v.fillStyle(0x40a050)
      v.fillRect(vx + 36, 84 + bob, 5, 6)
    } else {
      const y = 70 - Math.round(Math.sin(k * Math.PI) * 18)
      v.fillStyle(COLORS.outline)
      v.fillRect(vx - 1, y - 1, 52, 9)
      v.fillStyle(0xf4f6fa)
      v.fillRect(vx, y, 50, 7)
      v.fillRect(vx + 50, y + 2, 4, 3)
      v.fillStyle(0x3c64c8)
      v.fillRect(vx + 2, y - 8, 8, 8)
      for (let w = 0; w < 6; w++) v.fillRect(vx + 14 + w * 5, y + 2, 2, 2)
      v.fillStyle(0xa8b0c4)
      v.fillRect(vx + 18, y + 6, 18, 3)
      v.fillRect(vx + 24, y + 9, 10, 2)
    }
  }
  draw()
  await ui.fade(0, 300)
  const sfx = kind === 'train' ? 'truck' : kind === 'plane' ? 'battle_start' : 'heal'
  if (!params.fast) audio.sfx(sfx)
  await tween(ui, { targets: p, t: 1, duration: 2800, ease: 'Linear', onUpdate: draw })
  await ui.fade(1, 300)
  g.destroy()
  v.destroy()
  txt.destroy()
}
