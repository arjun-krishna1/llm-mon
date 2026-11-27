// Options: text speed, music volume, sound volume. ←/→ change, ↑/↓ move, B/START close (saves).

import Phaser from 'phaser'
import { COLORS } from '../../config'
import { controls } from '../../controls'
import { audio } from '../../audio'
import { applyOptions, options, saveOptions, type TextSpeed } from '../../options'
import { drawPanel, drawStripes } from '../draw'
import type { PxText } from '../text'
import { Screen } from './Screen'
import type { WidgetStack } from '../WidgetStack'

const SPEEDS: TextSpeed[] = ['slow', 'mid', 'fast']
const ROWS = ['TEXT SPEED', 'MUSIC', 'SOUND', 'CLOSE'] as const

export class OptionsScreen extends Screen<void> {
  private row = 0
  private values: PxText[] = []
  private labels: PxText[] = []
  private g: Phaser.GameObjects.Graphics
  private speedTexts: PxText[] = []

  constructor(scene: Phaser.Scene, stack: WidgetStack) {
    super(scene, stack, 2200)
    const bg = this.gfx()
    drawStripes(bg, 240, 160, 0x2c4a8c, 0x324f94)
    drawPanel(bg, 12, 10, 216, 140)
    this.text(22, 16, 'OPTIONS', { color: COLORS.frame[1], shadowColor: COLORS.paper[0] })
    bg.fillStyle(COLORS.accent[1])
    bg.fillRect(20, 32, 200, 2)
    this.g = this.gfx()
    ROWS.forEach((r, i) => {
      this.labels.push(this.text(32, 44 + i * 24, r))
      this.values.push(this.text(122, 44 + i * 24, ''))
    })
    let x = 122
    for (const sp of SPEEDS) {
      const t = this.text(x, 44, sp.toUpperCase())
      this.speedTexts.push(t)
      x += t.width + 8
    }
    this.render()
  }

  private render(): void {
    const g = this.g
    g.clear()
    this.speedTexts.forEach((t, i) => t.setColorName(SPEEDS[i] === options.textSpeed ? 'accent' : 'grey'))
    for (const [i, v] of [options.music, options.sfx].entries()) {
      const y = 44 + (i + 1) * 24
      this.values[i + 1].setText('')
      for (let k = 0; k < 10; k++) {
        g.fillStyle(COLORS.frame[0])
        g.fillRect(122 + k * 8, y + 2, 6, 9)
        g.fillStyle(k < v ? COLORS.accent[1] : COLORS.paper[0])
        g.fillRect(123 + k * 8, y + 3, 4, 7)
      }
    }
    // cursor
    g.fillStyle(COLORS.text)
    const cy = 44 + this.row * 24 + 3
    for (let i = 0; i < 4; i++) g.fillRect(22 + i, cy + i, 1, 7 - i * 2)
  }

  input(): void {
    if (controls.repeat('up')) {
      this.row = (this.row + ROWS.length - 1) % ROWS.length
      audio.sfx('select')
      this.render()
    } else if (controls.repeat('down')) {
      this.row = (this.row + 1) % ROWS.length
      audio.sfx('select')
      this.render()
    } else if (controls.repeat('left') || controls.repeat('right')) {
      const d = controls.isDown('left') ? -1 : 1
      if (this.row === 0) options.textSpeed = SPEEDS[Math.max(0, Math.min(2, SPEEDS.indexOf(options.textSpeed) + d))]
      else if (this.row === 1) options.music = Math.max(0, Math.min(10, options.music + d))
      else if (this.row === 2) options.sfx = Math.max(0, Math.min(10, options.sfx + d))
      applyOptions()
      audio.sfx('select')
      this.render()
    } else if (controls.justPressed('B') || controls.justPressed('START') || (controls.justPressed('A') && this.row === 3)) {
      controls.consume('A', 'B', 'START')
      saveOptions()
      audio.sfx('cancel')
      this.close()
    }
  }
}
