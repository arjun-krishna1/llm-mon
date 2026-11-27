// End card: "to be continued" card with play time + caught count, then a short credit
// roll (lines from content.endCredits), music `ending` (or `title`), back to the title.
// Started by the script call `s.endCard()`; the save is left untouched.

import Phaser from 'phaser'
import { COLORS, FONT, H, W } from '../config'
import { controls } from '../controls'
import { audio } from '../audio'
import { state } from '../state'
import { ms, params } from '../params'
import { content } from '../script'
import { PxText, measure } from '../ui/text'
import { getUI } from './UIScene'

export interface EndCardData {
  onDone?: () => void
}

export class EndCardScene extends Phaser.Scene {
  private onDone?: () => void
  private texts: PxText[] = []
  private phase: 'card' | 'roll' | 'end' = 'card'
  private t = 0
  private roll: PxText[] = []
  private hint!: PxText

  constructor() {
    super({ key: 'EndCard' })
  }

  init(d: EndCardData): void {
    this.onDone = d?.onDone
    this.texts = []
    this.roll = []
    this.phase = 'card'
    this.t = 0
  }

  private center(y: number, s: string, color: number = COLORS.white, font: string = FONT.dialog): PxText {
    const t = new PxText(this, Math.round((W - measure(this, font, s)) / 2), y, s, {
      font: font as typeof FONT.dialog, color, shadowColor: COLORS.frame[0], shadow: font === FONT.mini ? 'drop' : 'full',
    })
    this.texts.push(t)
    return t
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x000000)
    const ui = getUI(this.game)
    ui.fade(0, 0)
    const g = this.add.graphics()
    g.fillStyle(0x10131f)
    g.fillRect(0, 0, W, H)
    // letterbox bands above the rolling credits (credits scroll underneath them)
    const bands = this.add.graphics().setDepth(10)
    bands.fillStyle(0x10131f)
    bands.fillRect(0, 0, W, 20)
    bands.fillRect(0, H - 20, W, 20)
    bands.fillStyle(COLORS.frame[0])
    bands.fillRect(0, 20, W, 1)
    bands.fillRect(0, H - 21, W, 1)
    const ec = content.endCard ?? {}
    this.center(30, ec.title ?? 'LLMMON MYTHOS', COLORS.accent[2])
    this.center(46, ec.subtitle ?? 'Vertical Slice', 0xd4dae6)
    this.center(76, ec.continued ?? 'To be continued…', COLORS.white)
    this.center(104, `PLAY TIME ${state.playTimeText()}`, 0xd4dae6, FONT.mini)
    this.center(114, `LLMMON CAUGHT ${state.caught.length}`, 0xd4dae6, FONT.mini)
    this.hint = this.center(H - 14, 'PRESS A', COLORS.frame[3], FONT.mini).setVisible(false).setDepth(11)
    const music = audio.musicIds.includes('ending') ? 'ending' : 'title'
    audio.playMusic(music, { fadeMs: 600 })
    this.cameras.main.fadeIn(ms(900), 0, 0, 0)
  }

  update(): void {
    controls.each(() => this.tick())
  }

  private tick(): void {
    this.t++
    const skip = controls.justPressed('A') || controls.justPressed('START')
    if (this.phase === 'card' && (this.t > (params.fast ? 10 : 330) || (skip && this.t > 30))) {
      controls.consume('A', 'START')
      this.startRoll()
    } else if (this.phase === 'roll') {
      for (const t of this.roll) t.setPosition(t.x, t.y - (this.t % 2 === 0 ? 1 : 0))
      const last = this.roll[this.roll.length - 1]
      if (!last || last.y < 28) {
        this.phase = 'end'
        this.hint.setVisible(true)
        this.t = 0
      }
      if (skip) {
        controls.consume('A', 'START')
        for (const r of this.roll) r.destroy()
        this.roll = []
      }
    } else if (this.phase === 'end') {
      this.hint.setVisible(Math.floor(this.t / 32) % 2 === 0)
      if (skip || params.fast) {
        controls.consume('A', 'START')
        void this.finish()
      }
    }
  }

  private startRoll(): void {
    this.phase = 'roll'
    this.t = 0
    for (const t of this.texts) if (t !== this.hint) t.setVisible(false)
    const lines = content.endCard?.credits ?? [
      'LLMMON MYTHOS', '', 'An original handheld-style RPG slice', '', 'Thank you for playing!',
    ]
    let y = H + 4
    for (const line of lines) {
      if (line) {
        const heading = line === line.toUpperCase() && /[A-Z]/.test(line)
        const t = new PxText(this, Math.round((W - measure(this, FONT.dialog, line)) / 2), y, line, {
          color: heading ? COLORS.accent[2] : COLORS.white, shadowColor: COLORS.frame[0],
        })
        this.roll.push(t)
      }
      y += 16
    }
  }

  private async finish(): Promise<void> {
    this.phase = 'card'
    this.t = -100000
    audio.stopMusic(800)
    await new Promise<void>((r) => {
      this.cameras.main.fadeOut(ms(800), 0, 0, 0)
      this.time.delayedCall(ms(820), r)
    })
    this.onDone?.()
    this.scene.start('Title')
  }
}
