// Small drawing helpers shared by menus and (wave 2) the battle UI.

import Phaser from 'phaser'
import { COLORS } from '../config'

/** HP bar: 1px outline, two-tone fill, green → yellow (≤50%) → red (≤20%). */
export function drawHpBar(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, frac: number, h = 4): void {
  frac = Math.max(0, Math.min(1, frac))
  g.fillStyle(COLORS.outline)
  g.fillRect(x - 1, y - 1, w + 2, h + 2)
  g.fillStyle(0x545a70)
  g.fillRect(x, y, w, h)
  const ramp = frac > 0.5 ? COLORS.hpGreen : frac > 0.2 ? COLORS.hpYellow : COLORS.hpRed
  const fw = frac > 0 ? Math.max(1, Math.round(w * frac)) : 0
  g.fillStyle(ramp[0])
  g.fillRect(x, y, fw, h)
  g.fillStyle(ramp[1])
  g.fillRect(x, y, fw, Math.max(1, h - 2))
}

export function drawExpBar(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, frac: number): void {
  frac = Math.max(0, Math.min(1, frac))
  g.fillStyle(COLORS.outline)
  g.fillRect(x - 1, y - 1, w + 2, 4)
  g.fillStyle(0x545a70)
  g.fillRect(x, y, w, 2)
  g.fillStyle(COLORS.expBlue[1])
  g.fillRect(x, y, Math.round(w * frac), 2)
}

/** Flat panel with a 1px dark outline, light inner bevel and paper fill. */
export function drawPanel(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number,
  fill: number = COLORS.paper[2], border: number = COLORS.frame[1], bevel: number = COLORS.paper[0]): void {
  g.fillStyle(COLORS.frame[0])
  g.fillRect(x + 1, y, w - 2, h)
  g.fillRect(x, y + 1, w, h - 2)
  g.fillStyle(border)
  g.fillRect(x + 1, y + 1, w - 2, h - 2)
  g.fillStyle(bevel)
  g.fillRect(x + 2, y + 2, w - 4, h - 4)
  g.fillStyle(fill)
  g.fillRect(x + 3, y + 3, w - 5, h - 5)
}

/** Diagonal-stripe background (menu screens). */
export function drawStripes(g: Phaser.GameObjects.Graphics, w: number, h: number, a: number, b: number, period = 16): void {
  g.fillStyle(a)
  g.fillRect(0, 0, w, h)
  g.fillStyle(b)
  for (let y = 0; y < h; y++) {
    for (let x = -h; x < w; x += period) {
      g.fillRect(x + y, y, period / 2, 1)
    }
  }
}
