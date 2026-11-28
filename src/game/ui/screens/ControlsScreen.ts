// In-game controls page (Options → CONTROLS): keyboard, gamepad and touch bindings.

import Phaser from 'phaser'
import { COLORS, FONT } from '../../config'
import { controls } from '../../controls'
import { audio } from '../../audio'
import { drawPanel, drawStripes } from '../draw'
import { Screen } from './Screen'
import type { WidgetStack } from '../WidgetStack'

const ROWS: Array<[string, string, string]> = [
  ['MOVE', 'Arrows / WASD', 'D-PAD / STICK'],
  ['A', 'Z, Space, Enter', 'BUTTON 0'],
  ['B', 'X, Shift, Bksp', 'BUTTON 1'],
  ['START', 'Enter, Esc', 'BUTTON 9'],
  ['SELECT', 'C, Tab', 'BUTTON 8'],
]

export class ControlsScreen extends Screen<void> {
  constructor(scene: Phaser.Scene, stack: WidgetStack) {
    super(scene, stack, 2300)
    const g = this.gfx()
    drawStripes(g, 240, 160, 0x2c4a8c, 0x324f94)
    drawPanel(g, 8, 8, 224, 146)
    this.text(18, 13, 'CONTROLS', { color: COLORS.frame[1], shadowColor: COLORS.paper[0] })
    g.fillStyle(COLORS.accent[1])
    g.fillRect(16, 29, 208, 2)
    this.text(76, 34, 'KEYBOARD', { font: FONT.mini, shadow: 'none', color: COLORS.frame[1] })
    this.text(164, 34, 'GAMEPAD', { font: FONT.mini, shadow: 'none', color: COLORS.frame[1] })
    ROWS.forEach(([k, kb, pad], i) => {
      const y = 42 + i * 15
      g.fillStyle(COLORS.frame[1])
      g.fillRect(16, y + 1, 52, 11)
      this.text(20, y + 4, k, { font: FONT.mini, color: 0xfcfaf0, shadow: 'none' })
      this.text(76, y, kb)
      this.text(164, y + 4, pad, { font: FONT.mini, shadow: 'none' })
    })
    const notes = [
      'HOLD B TO RUN. OPTIONS - RUNNING: AUTO FLIPS IT.',
      'SELECT USES THE SKILL OR ITEM REGISTERED IN FIELD.',
      'TOUCH: ON-SCREEN PAD AND BUTTONS.',
      'THE GAME PAUSES WHEN THE WINDOW LOSES FOCUS.',
    ]
    notes.forEach((n, i) => this.text(18, 118 + i * 9, n, { font: FONT.mini, shadow: 'none', color: 0x6c6c74 }))
  }

  input(): void {
    if (controls.justPressed('A') || controls.justPressed('B') || controls.justPressed('START')) {
      controls.consume('A', 'B', 'START')
      audio.sfx('cancel')
      this.close()
    }
  }
}
