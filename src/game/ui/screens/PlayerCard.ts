// Trainer card: name, money, dex counts, play time.

import Phaser from 'phaser'
import { COLORS, FONT } from '../../config'
import { controls } from '../../controls'
import { audio } from '../../audio'
import { state } from '../../state'
import { drawPanel, drawStripes } from '../draw'
import { Screen } from './Screen'
import type { WidgetStack } from '../WidgetStack'

export class PlayerCard extends Screen<void> {
  constructor(scene: Phaser.Scene, stack: WidgetStack) {
    super(scene, stack)
    const g = this.gfx()
    drawStripes(g, 240, 160, 0x2c4a8c, 0x3052 * 0 + 0x324f94)
    drawPanel(g, 12, 14, 216, 132, 0xfcfaf0, COLORS.frame[1])
    g.fillStyle(COLORS.accent[1])
    g.fillRect(15, 17, 211, 18)
    g.fillStyle(COLORS.accent[0])
    g.fillRect(15, 35, 211, 1)
    this.text(22, 20, 'TRAINER CARD', { color: 0xffffff, shadowColor: COLORS.accent[0] })
    const id = String(state.getFlag('trainer_id') ?? '00000')
    this.text(168, 24, `ID ${id}`, { font: FONT.mini, shadow: 'drop' })
    const rows: Array<[string, string]> = [
      ['NAME', state.playerName],
      ['MONEY', `$${state.money}`],
      ['LLMMON', `${state.caught.length} caught / ${state.seen.length} seen`],
      ['TIME', state.playTimeText()],
    ]
    rows.forEach(([k, v], i) => {
      const y = 44 + i * 22
      this.text(24, y, k, { color: COLORS.frame[1], shadowColor: COLORS.paper[0] })
      this.text(84, y, v)
      g.fillStyle(COLORS.paper[0])
      g.fillRect(22, y + 15, 196, 1)
    })
    // player portrait: the overworld sprite at 1x in a small photo frame (no mixed pixel scales)
    drawPanel(g, 180, 60, 36, 44, 0xd8eef8, COLORS.frame[2], 0xa8d8f8)
    this.image(190, 70, 'chars/player', 0)
  }

  input(): void {
    if (controls.justPressed('A') || controls.justPressed('B')) {
      controls.consume('A', 'B', 'START')
      audio.sfx('cancel')
      this.close()
    }
  }
}
