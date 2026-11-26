// STUB battle scene (ENGINE, wave 1). BATTLE-UI replaces this in wave 2.
// Contract (§4.6): launched with `scene.launch('Battle', { request, onDone })`;
// mutates state.party/state.bag; calls onDone(result) after its own fade-out.

import Phaser from 'phaser'
import { H, W } from '../config'
import type { BattleRequest, BattleResult } from '../types'
import { ms } from '../params'
import { audio } from '../audio'
import { speciesName } from '../adapters/monInfo'
import { ensureTexture } from '../assets'
import { DialogBox } from '../ui/DialogBox'
import { controls } from '../controls'
import { state } from '../state'
import { WidgetStack } from '../ui/WidgetStack'

export interface BattleSceneData {
  request: BattleRequest
  onDone: (r: BattleResult) => void
}

export class BattleScene extends Phaser.Scene {
  private data0!: BattleSceneData
  private stack = new WidgetStack()

  constructor() {
    super({ key: 'Battle' })
  }

  init(d: BattleSceneData): void {
    this.data0 = d
    this.stack = new WidgetStack()
  }

  create(): void {
    const req = this.data0.request
    this.cameras.main.setBackgroundColor(0x000000)
    this.add.image(0, 0, 'battle/bg_grass').setOrigin(0, 0)
    this.add.rectangle(0, 112, W, H - 112, 0x283048).setOrigin(0, 0)
    this.add.image(176, 76, 'battle/platform_enemy').setOrigin(0.5, 0.5)
    this.add.image(64, 108, 'battle/platform_player').setOrigin(0.5, 0.5)
    const enemy = req.enemyParty[0]
    const front = this.add.image(-40, 74, ensureTexture(this, `mons/${enemy?.speciesId}_front`)).setOrigin(0.5, 1)
    const back = this.add.image(W + 40, 112, 'battle/trainer_back', 0).setOrigin(0.5, 1)
    const box = new DialogBox(this, this.stack, { frame: 'ui/frame_battle' })
    this.cameras.main.fadeIn(ms(300), 0, 0, 0)
    void (async () => {
      await new Promise<void>((r) => this.tweens.add({ targets: front, x: 176, duration: ms(700) || 1, onComplete: () => r() }))
      await new Promise<void>((r) => this.tweens.add({ targets: back, x: 64, duration: ms(300) || 1, onComplete: () => r() }))
      const name = speciesName(enemy?.speciesId ?? 'missingno')
      if (req.kind === 'trainer' && req.trainer) await box.say(`${req.trainer.name} would like to battle!`)
      else await box.say(req.introText ?? `A wild ${name} appeared!`)
      await box.say('(Battle stub) You won!')
      audio.playMusic('victory')
      await new Promise<void>((r) => {
        this.cameras.main.fadeOut(ms(300), 0, 0, 0)
        this.time.delayedCall(ms(320), r)
      })
      // Per docs/BATTLE_API.md the battle scene applies prize money / caught mons before onDone.
      if (req.trainer?.prize) state.addMoney(req.trainer.prize)
      this.data0.onDone({ outcome: 'win', prize: req.trainer?.prize })
      this.scene.stop()
    })()
  }

  update(): void {
    controls.each(() => this.stack.update())
  }
}
