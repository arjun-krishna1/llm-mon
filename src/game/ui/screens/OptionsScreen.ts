// Options: text speed, auto text, running shoes, music, sound, controls page.
// ←/→ change, ↑/↓ move, A on CONTROLS opens the controls page, B/START close (saves).

import Phaser from 'phaser'
import { COLORS } from '../../config'
import { controls } from '../../controls'
import { audio } from '../../audio'
import { applyOptions, options, saveOptions, type TextSpeed } from '../../options'
import { drawPanel, drawStripes } from '../draw'
import type { PxText } from '../text'
import { Screen } from './Screen'
import { ControlsScreen } from './ControlsScreen'
import type { WidgetStack } from '../WidgetStack'

const SPEEDS: TextSpeed[] = ['slow', 'mid', 'fast']
const ROWS = ['TEXT SPEED', 'AUTO TEXT', 'RUNNING', 'MUSIC', 'SOUND', 'CONTROLS', 'CLOSE'] as const
const Y0 = 38
const RH = 16

export class OptionsScreen extends Screen<void> {
  private row = 0
  private g: Phaser.GameObjects.Graphics
  private choiceTexts: PxText[][] = []
  private sub = false

  constructor(scene: Phaser.Scene, stack: WidgetStack) {
    super(scene, stack, 2200)
    const bg = this.gfx()
    drawStripes(bg, 240, 160, 0x2c4a8c, 0x324f94)
    drawPanel(bg, 12, 8, 216, 146)
    this.text(22, 13, 'OPTIONS', { color: COLORS.frame[1], shadowColor: COLORS.paper[0] })
    bg.fillStyle(COLORS.accent[1])
    bg.fillRect(20, 29, 200, 2)
    this.g = this.gfx()
    ROWS.forEach((r, i) => this.text(32, Y0 + i * RH, r))
    const choices: Array<[number, string[]]> = [[0, SPEEDS.map((s) => s.toUpperCase())], [1, ['OFF', 'ON']], [2, ['HOLD B', 'AUTO']]]
    for (const [row, labels] of choices) {
      let x = 118
      const ts: PxText[] = []
      for (const l of labels) {
        const t = this.text(x, Y0 + row * RH, l)
        ts.push(t)
        x += t.width + 8
      }
      this.choiceTexts[row] = ts
    }
    this.render()
  }

  private render(): void {
    const g = this.g
    g.clear()
    const sel = [SPEEDS.indexOf(options.textSpeed), options.autoText ? 1 : 0, options.run === 'auto' ? 1 : 0]
    this.choiceTexts.forEach((ts, row) => ts.forEach((t, i) => t.setColorName(i === sel[row] ? 'accent' : 'grey')))
    for (const [i, v] of [options.music, options.sfx].entries()) {
      const y = Y0 + (i + 3) * RH
      for (let k = 0; k < 10; k++) {
        g.fillStyle(COLORS.frame[0])
        g.fillRect(118 + k * 8, y + 2, 6, 9)
        g.fillStyle(k < v ? COLORS.accent[1] : COLORS.paper[0])
        g.fillRect(119 + k * 8, y + 3, 4, 7)
      }
    }
    // cursor
    g.fillStyle(COLORS.text)
    const cy = Y0 + this.row * RH + 3
    for (let i = 0; i < 4; i++) g.fillRect(22 + i, cy + i, 1, 7 - i * 2)
  }

  input(): void {
    if (this.sub) return
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
      const r = ROWS[this.row]
      if (r === 'TEXT SPEED') options.textSpeed = SPEEDS[Math.max(0, Math.min(2, SPEEDS.indexOf(options.textSpeed) + d))]
      else if (r === 'AUTO TEXT') options.autoText = d > 0
      else if (r === 'RUNNING') options.run = d > 0 ? 'auto' : 'hold'
      else if (r === 'MUSIC') options.music = Math.max(0, Math.min(10, options.music + d))
      else if (r === 'SOUND') options.sfx = Math.max(0, Math.min(10, options.sfx + d))
      else return
      applyOptions()
      audio.sfx('select')
      this.render()
    } else if (controls.justPressed('A') && ROWS[this.row] === 'CONTROLS') {
      controls.consume('A')
      audio.sfx('select')
      this.sub = true
      void new ControlsScreen(this.scene, this.stack).run().then(() => {
        this.sub = false
      })
    } else if (controls.justPressed('B') || controls.justPressed('START') || (controls.justPressed('A') && ROWS[this.row] === 'CLOSE')) {
      controls.consume('A', 'B', 'START')
      saveOptions()
      audio.sfx('cancel')
      this.close()
    }
  }
}
