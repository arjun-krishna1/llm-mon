// Overworld HUD (lives in the UI scene, under banners/dialogs): EVAL lamp, puzzle counters
// ("SURPRISE 12/20"), puzzle timers, the carried puzzle key, and toasts ("New Notebook page!").
// Hidden whenever the overworld is not the active scene (battles, title, screens cover it).

import Phaser from 'phaser'
import { COLORS, FONT, H, W } from '../config'
import { params } from '../params'
import { PxText, measure } from './text'
import { drawPanel } from './draw'

export interface HudCounter {
  id: string
  label: string
  value: number
  max?: number
  /** 'budget' turns red when value > max; 'goal' turns green when value >= max. */
  style?: 'budget' | 'goal' | 'plain'
}

export interface HudTimer {
  id: string
  label: string
  ms: number
}

interface Toast {
  text: string
  icon?: string
  t: number
  life: number
}

const DEPTH = 800

export class Hud {
  private scene: Phaser.Scene
  private g: Phaser.GameObjects.Graphics
  private texts: PxText[] = []
  private icons: Phaser.GameObjects.Image[] = []
  /** EVAL lamp: shown when `lampShown`, lit when `lampOn`. */
  lampShown = false
  lampOn = false
  counters: HudCounter[] = []
  timers: HudTimer[] = []
  carry = ''
  visible = true
  private toasts: Toast[] = []
  private frame = 0
  private dirty = true
  private sig = ''

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.g = scene.add.graphics().setDepth(DEPTH).setScrollFactor(0)
  }

  toast(text: string, icon?: string): void {
    this.toasts.push({ text, icon, t: 0, life: params.fast ? 30 : 150 })
    this.dirty = true
  }

  get toastText(): string {
    return this.toasts[0]?.text ?? ''
  }

  private txt(x: number, y: number, s: string, font: string, color: number, shadow: number): PxText {
    const t = new PxText(this.scene, x, y, s, { font: font as typeof FONT.mini, color, shadowColor: shadow, shadow: font === FONT.mini ? 'drop' : 'full' })
    t.setDepth(DEPTH + 1).setScrollFactor(0)
    this.texts.push(t)
    return t
  }

  tick(): void {
    this.frame++
    const t0 = this.toasts[0]
    if (t0) {
      t0.t++
      if (t0.t >= t0.life) {
        this.toasts.shift()
        this.dirty = true
      }
    }
    // lamp pulses; toasts slide: redraw those frames only
    const sig = JSON.stringify([this.visible, this.lampShown, this.lampOn, this.counters, this.timers.map((t) => Math.floor(t.ms / 100)), this.carry])
    if (sig !== this.sig) {
      this.sig = sig
      this.dirty = true
    }
    if (this.dirty || (this.lampOn && this.lampShown && this.frame % 8 === 0) || (t0 && (t0.t < 10 || t0.t > t0.life - 10))) this.render()
  }

  private render(): void {
    this.dirty = false
    const g = this.g
    g.clear()
    for (const t of this.texts) t.destroy()
    this.texts = []
    for (const i of this.icons) i.destroy()
    this.icons = []
    if (!this.visible) return
    let right = W - 2
    // ---- EVAL lamp (top-right)
    if (this.lampShown) {
      const x = W - 34
      const y = 2
      drawPanel(g, x, y, 32, 16, COLORS.frame[0], COLORS.frame[2], COLORS.frame[1])
      const pulse = this.lampOn ? 0.5 + 0.5 * Math.sin(this.frame / 9) : 0
      // bulb
      const on = this.lampOn
      g.fillStyle(COLORS.outline)
      g.fillRect(x + 5, y + 4, 8, 8)
      g.fillStyle(on ? 0xc83c44 : 0x545a70)
      g.fillRect(x + 6, y + 5, 6, 6)
      g.fillStyle(on ? (pulse > 0.5 ? 0xf8d838 : 0xf85848) : 0x7c8296)
      g.fillRect(x + 7, y + 6, 2, 2)
      if (on) {
        g.fillStyle(0xf85848, 0.35 + 0.3 * pulse)
        g.fillRect(x + 4, y + 3, 10, 1)
        g.fillRect(x + 4, y + 12, 10, 1)
        g.fillRect(x + 4, y + 4, 1, 8)
        g.fillRect(x + 13, y + 4, 1, 8)
      }
      this.txt(x + 15, y + 6, 'EVAL', FONT.mini, on ? 0xfcfaf0 : 0x989890, COLORS.frame[0])
      right = x - 2
    }
    // ---- counters + timers (right-aligned row under / beside the lamp)
    let y = this.lampShown ? 20 : 2
    const rows: Array<{ label: string; color: number }> = []
    for (const c of this.counters) {
      const over = c.style !== 'goal' && c.style !== 'plain' && c.max !== undefined && c.value > c.max
      const met = c.style === 'goal' && c.max !== undefined && c.value >= c.max
      rows.push({ label: `${c.label} ${c.value}${c.max !== undefined ? `/${c.max}` : ''}`, color: over ? 0xf85848 : met ? 0x60e070 : 0xfcfaf0 })
    }
    for (const t of this.timers) {
      const s = Math.floor(t.ms / 1000)
      rows.push({ label: `${t.label} ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`, color: 0xfcfaf0 })
    }
    for (const r of rows) {
      const w = measure(this.scene, FONT.mini, r.label) + 9
      const x = W - 2 - w
      drawPanel(g, x, y, w, 12, COLORS.frame[0], COLORS.frame[2], COLORS.frame[1])
      this.txt(x + 4, y + 4, r.label, FONT.mini, r.color, COLORS.frame[0])
      y += 13
    }
    void right
    // ---- carried key (bottom-left chip)
    if (this.carry) {
      const label = `KEY: ${this.carry}`
      const w = measure(this.scene, FONT.mini, label) + 10
      drawPanel(g, 2, H - 16, w, 13, 0x7c5c2e, 0xe8b830, 0xb08018)
      this.txt(7, H - 12, label, FONT.mini, 0xfcfaf0, 0x6b4630)
    }
    // ---- toast (slides in above the dialog area, bottom-right)
    const t = this.toasts[0]
    if (t) {
      const tw = measure(this.scene, FONT.dialog, t.text) + (t.icon ? 22 : 0) + 16
      const k = Math.min(1, t.t / 8, (t.life - t.t) / 8)
      const x = Math.round(W - 2 - tw * Math.max(0, k))
      const ty = H - 46 - 26
      drawPanel(g, x, ty, tw, 22)
      let tx = x + 8
      if (t.icon && this.scene.textures.exists(t.icon)) {
        const img = this.scene.add.image(tx, ty + 3, t.icon).setOrigin(0, 0).setDepth(DEPTH + 1).setScrollFactor(0)
        this.icons.push(img)
        tx += 20
      }
      this.txt(tx, ty + 3, t.text, FONT.dialog, COLORS.text, COLORS.textShadow)
    }
  }
}
