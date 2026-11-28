// Overworld atmosphere: dark-room lighting (map/zone `dark`, Dilate) and weather overlays
// (`weather`: snow | rain | fog | leaves). Both draw in screen space above the map.

import Phaser from 'phaser'
import { DEPTH, H, TILE, W } from '../config'
import { audio } from '../audio'
import { makePlaceholder } from '../assets'
import { params } from '../params'

const DARK = 0x06060c

/**
 * Darkness with a round hole around the player. The hole is a small cached texture per
 * radius (dithered rim); four plain rectangles cover the rest of the screen.
 */
export class Lighting {
  private scene: Phaser.Scene
  private hole: Phaser.GameObjects.Image
  private rects: Phaser.GameObjects.Rectangle[]
  /** Current / target radius in px. */
  r = 0
  target = 0
  on = false

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    const d = DEPTH.over + 900
    this.hole = scene.add.image(0, 0, this.tex(24)).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(d).setVisible(false)
    this.rects = [0, 1, 2, 3].map(() => scene.add.rectangle(0, 0, 1, 1, DARK).setOrigin(0, 0).setScrollFactor(0).setDepth(d).setVisible(false))
  }

  /** Radius in tiles (the lit area is the player's tile ± radius, softened). */
  set(dark: boolean, tiles: number, instant = false): void {
    this.on = dark
    this.target = Math.round(tiles * TILE + 8)
    if (instant || !this.r || params.fast) this.r = this.target
  }

  private tex(r: number): string {
    const key = `kit/light_${r}`
    if (this.scene.textures.exists(key)) return key
    const s = r * 2 + 8
    makePlaceholder(this.scene.textures, key, s, s, (c) => {
      const img = c.createImageData(s, s)
      const cx = s / 2
      for (let y = 0; y < s; y++) {
        for (let x = 0; x < s; x++) {
          const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cx)
          // inside: clear; 6px rim: 2×2 checker dither at two densities; outside: dark
          let a = 1
          if (d < r - 6) a = 0
          else if (d < r - 3) a = ((x >> 1) + (y >> 1)) % 2 === 0 ? 0 : 0.55
          else if (d < r) a = ((x >> 1) + (y >> 1)) % 2 === 0 ? 0.55 : 1
          const i = (y * s + x) * 4
          img.data[i] = 6
          img.data[i + 1] = 6
          img.data[i + 2] = 12
          img.data[i + 3] = Math.round(a * 255)
        }
      }
      c.putImageData(img, 0, 0)
    })
    return key
  }

  /** Per frame: (sx, sy) = the light centre on screen. */
  update(sx: number, sy: number): void {
    const vis = this.on
    this.hole.setVisible(vis)
    for (const r of this.rects) r.setVisible(vis)
    if (!vis) return
    if (this.r !== this.target) this.r += Math.sign(this.target - this.r) * Math.min(2, Math.abs(this.target - this.r))
    const q = Math.max(8, Math.round(this.r / 4) * 4)
    const key = this.tex(q)
    if (this.hole.texture.key !== key) this.hole.setTexture(key)
    const s = q * 2 + 8
    const x0 = Math.round(sx - s / 2)
    const y0 = Math.round(sy - s / 2)
    this.hole.setPosition(x0 + s / 2, y0 + s / 2)
    const [top, bottom, left, right] = this.rects
    top.setPosition(0, 0).setSize(W, Math.max(0, y0))
    bottom.setPosition(0, y0 + s).setSize(W, Math.max(0, H - y0 - s))
    left.setPosition(0, y0).setSize(Math.max(0, x0), s)
    right.setPosition(x0 + s, y0).setSize(Math.max(0, W - x0 - s), s)
  }

  /** Is the world pixel (relative to the light centre) inside the lit radius? */
  litTiles(): number {
    return this.on ? Math.max(0, (this.r - 8) / TILE) : 99
  }

  destroy(): void {
    this.hole.destroy()
    for (const r of this.rects) r.destroy()
  }
}

export type WeatherKind = 'snow' | 'rain' | 'fog' | 'leaves' | ''

interface P { x: number; y: number; vx: number; vy: number; s: number; c: number; ph: number }

/** Pixel-particle weather in screen space; particles shift against camera motion (parallax). */
export class Weather {
  private scene: Phaser.Scene
  private g: Phaser.GameObjects.Graphics
  private fog?: Phaser.GameObjects.TileSprite[]
  kind: WeatherKind = ''
  private ps: P[] = []
  private lastCam = { x: 0, y: 0 }
  private loop = ''
  private t = 0

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.g = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH.over + 800)
  }

  set(kind: WeatherKind, intensity = 1): void {
    if (kind === this.kind) return
    this.kind = kind
    this.ps = []
    this.fog?.forEach((f) => f.destroy())
    this.fog = undefined
    const n = Math.round((kind === 'rain' ? 70 : kind === 'snow' ? 60 : kind === 'leaves' ? 14 : 0) * intensity)
    for (let i = 0; i < n; i++) this.ps.push(this.spawn(true))
    if (kind === 'fog') {
      const key = this.fogTex()
      this.fog = [0, 1].map((i) => this.scene.add.tileSprite(0, 0, W, H, key).setOrigin(0, 0).setScrollFactor(0)
        .setDepth(DEPTH.over + 799).setAlpha(i ? 0.28 : 0.38).setTileScale(1, 1))
    }
    // ambience loop if AUDIO provides one (amb_rain, amb_snow, ...)
    if (this.loop) audio.stopSfx(this.loop)
    this.loop = ''
    const amb = `amb_${kind}`
    if (kind && audio.sfxIds.includes(amb)) {
      audio.sfxLoop(amb)
      this.loop = amb
    }
  }

  private fogTex(): string {
    const key = 'kit/fog'
    if (this.scene.textures.exists(key)) return key
    makePlaceholder(this.scene.textures, key, 128, 64, (c) => {
      c.fillStyle = '#eef0f4'
      for (let i = 0; i < 26; i++) {
        const x = (i * 37) % 128
        const y = (i * 23) % 64
        const r = 6 + (i % 4) * 3
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r * 2; dx <= r * 2; dx++) {
            if ((dx / 2) ** 2 + dy ** 2 > r * r) continue
            if ((dx + dy + 64) % 2) continue // 50% dither
            c.fillRect((x + dx + 128) % 128, (y + dy + 64) % 64, 1, 1)
          }
        }
      }
    })
    return key
  }

  private spawn(anywhere: boolean): P {
    const r = Math.random
    const k = this.kind
    const p: P = { x: r() * (W + 40) - 20, y: anywhere ? r() * H : -6, vx: 0, vy: 1, s: 1, c: 0xffffff, ph: r() * 6.28 }
    if (k === 'snow') {
      p.vy = 0.25 + r() * 0.45
      p.s = r() < 0.3 ? 2 : 1
      p.c = r() < 0.2 ? 0xd4dae6 : 0xffffff
    } else if (k === 'rain') {
      p.vy = 3.2 + r() * 1.2
      p.vx = -0.9
      p.c = r() < 0.5 ? 0xa8c8e8 : 0xd4e4f4
    } else if (k === 'leaves') {
      p.vy = 0.35 + r() * 0.35
      p.vx = 0.3 + r() * 0.3
      p.c = [0xe07028, 0xc04444, 0xe8b830, 0xbd8654][Math.floor(r() * 4)]
    }
    return p
  }

  update(camX: number, camY: number): void {
    const dx = camX - this.lastCam.x
    const dy = camY - this.lastCam.y
    this.lastCam = { x: camX, y: camY }
    const g = this.g
    g.clear()
    if (!this.kind) return
    this.t++
    if (this.fog) {
      this.fog[0].tilePositionX = camX * 0.9 + this.t * 0.15
      this.fog[0].tilePositionY = camY * 0.9
      this.fog[1].tilePositionX = camX * 1.1 - this.t * 0.1 + 40
      this.fog[1].tilePositionY = camY * 1.1 + 20
      return
    }
    const big = Math.abs(dx) > 40 || Math.abs(dy) > 40 // warps / connections: don't smear
    for (const p of this.ps) {
      p.ph += 0.05
      p.x += p.vx + (this.kind === 'snow' ? Math.sin(p.ph) * 0.3 : this.kind === 'leaves' ? Math.sin(p.ph) * 0.6 : 0) - (big ? 0 : dx)
      p.y += p.vy - (big ? 0 : dy)
      if (p.y > H + 4 || p.x < -24 || p.x > W + 24 || p.y < -10) {
        const n = this.spawn(false)
        if (p.y > H + 4) Object.assign(p, n)
        else Object.assign(p, { ...n, y: Math.random() * H, x: p.x < -24 ? W + 10 : p.x > W + 24 ? -10 : n.x })
        // rain: a splash tick where the drop lands
        if (this.kind === 'rain' && Math.random() < 0.5) {
          g.fillStyle(0xd4e4f4, 0.8)
          const sx = Math.random() * W
          const sy = 40 + Math.random() * (H - 40)
          g.fillRect(sx - 1, sy, 1, 1)
          g.fillRect(sx + 1, sy, 1, 1)
        }
      }
      const x = Math.round(p.x)
      const y = Math.round(p.y)
      g.fillStyle(p.c, this.kind === 'rain' ? 0.75 : 1)
      if (this.kind === 'rain') {
        g.fillRect(x, y, 1, 2)
        g.fillRect(x - 1, y + 2, 1, 2)
      } else if (this.kind === 'leaves') {
        if (Math.sin(p.ph * 2) > 0) g.fillRect(x, y, 2, 1)
        else g.fillRect(x, y, 1, 2)
      } else g.fillRect(x, y, p.s, p.s)
    }
  }

  destroy(): void {
    if (this.loop) audio.stopSfx(this.loop)
    this.g.destroy()
    this.fog?.forEach((f) => f.destroy())
  }
}
