// Professor intro: black stage + spotlight, prof sprite, a LLMMON, name choice.
// Driven by `content.introScript` (a registered script using `s.stage`), or the default below.

import Phaser from 'phaser'
import { W } from '../config'
import { audio } from '../audio'
import { state } from '../state'
import { ms } from '../params'
import { ensureTexture } from '../assets'
import { content, runScript, type IntroStage, type ScriptApi } from '../script'
import { getUI } from './UIScene'

export class IntroScene extends Phaser.Scene implements IntroStage {
  private prof!: Phaser.GameObjects.Image
  private mon!: Phaser.GameObjects.Image
  private playerImg!: Phaser.GameObjects.Image
  private light!: Phaser.GameObjects.Graphics

  constructor() {
    super({ key: 'Intro' })
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x000000)
    this.light = this.add.graphics().setAlpha(0)
    this.drawSpotlight()
    this.prof = this.add.image(W / 2, 18, ensureTexture(this, 'battle/prof_front', 64, 96)).setOrigin(0.5, 0).setAlpha(0)
    this.mon = this.add.image(W / 2 + 56, 50, '__WHITE').setOrigin(0.5, 0).setVisible(false)
    // player portrait (64x96, same scale/placement as the professor), not the overworld sprite
    this.playerImg = this.add.image(W / 2, 18, ensureTexture(this, 'battle/player_front', 64, 96)).setOrigin(0.5, 0).setAlpha(0)
    audio.playMusic('intro')
    void this.play()
  }

  /** Dithered elliptical pool of light on the stage floor. */
  private drawSpotlight(): void {
    const g = this.light
    const cx = W / 2
    const cy = 102
    const rings: Array<[number, number, number]> = [[78, 20, 0x283048], [64, 16, 0x40507c], [48, 12, 0x6880b8]]
    for (const [rx, ry, col] of rings) {
      g.fillStyle(col)
      for (let y = -ry; y <= ry; y++) {
        const w = Math.round(rx * Math.sqrt(1 - (y / ry) ** 2))
        g.fillRect(cx - w, cy + y, w * 2, 1)
      }
    }
    // soft cone from above
    g.fillStyle(0x283048, 0.35)
    g.beginPath()
    g.moveTo(cx - 20, 0)
    g.lineTo(cx + 20, 0)
    g.lineTo(cx + 78, cy)
    g.lineTo(cx - 78, cy)
    g.closePath()
    g.fillPath()
  }

  private tween(targets: object, props: Record<string, number>, duration: number): Promise<void> {
    const d = ms(duration)
    if (!d) {
      Object.assign(targets, props)
      return Promise.resolve()
    }
    return new Promise((r) => this.tweens.add({ targets, ...props, duration: d, onComplete: () => r() }))
  }

  // ---------------------------------------------------------------- IntroStage
  spotlight(on: boolean): Promise<void> {
    return this.tween(this.light, { alpha: on ? 1 : 0 }, 500)
  }
  async showProf(): Promise<void> {
    this.prof.setY(26)
    await this.tween(this.prof, { alpha: 1, y: 18 }, 500)
  }
  hideProf(): Promise<void> {
    return this.tween(this.prof, { alpha: 0 }, 400)
  }
  async showMon(speciesId: string): Promise<void> {
    this.mon.setTexture(ensureTexture(this, `mons/${speciesId}_front`)).setVisible(true).setAlpha(0)
    this.mon.setX(W / 2 + 72)
    await Promise.all([this.tween(this.prof, { x: W / 2 - 36 }, 400), this.tween(this.mon, { alpha: 1, x: W / 2 + 40 }, 400)])
    audio.sfx('orb_catch')
  }
  async hideMon(): Promise<void> {
    await Promise.all([this.tween(this.mon, { alpha: 0 }, 300), this.tween(this.prof, { x: W / 2 }, 400)])
    this.mon.setVisible(false)
  }
  showPlayer(): Promise<void> {
    return this.tween(this.playerImg, { alpha: 1 }, 400)
  }
  hidePlayer(): Promise<void> {
    return this.tween(this.playerImg, { alpha: 0 }, 400)
  }

  private async play(): Promise<void> {
    const ui = getUI(this.game)
    await ui.fade(0, 0)
    const id = content.introScript
    await runScript(this.game, id ?? defaultIntro, { stage: this })
    await ui.fade(1, 500)
    audio.stopMusic(300)
    if (content.healPoint) state.healPoint = { ...content.healPoint }
    this.scene.start('Overworld', {
      map: content.startMap ?? '_test',
      spawn: content.startSpawn ?? 'start',
      facing: content.startFacing ?? 'down',
      newGame: true,
    })
  }
}

/** Built-in intro used until CONTENT provides `introScript`. */
async function defaultIntro(s: ScriptApi): Promise<void> {
  const st = s.stage!
  await s.wait(300)
  await st.spotlight(true)
  await st.showProf()
  await s.say('Hello there! Welcome to the world\nof LLMMON!')
  await s.say('My name is Karpathy. Everyone calls\nme the LLMMON Professor.')
  await st.showMon('claude_fable')
  await s.say('This world is inhabited by creatures\ncalled LLMMON: language models that\fgrew minds of their own somewhere\nbetween pretraining and production.')
  await st.hideMon()
  await s.say('And you are…? Remind me, what’s your\nname again?')
  await s.chooseName('Your name?', content.namePresets ?? ['Arjun', 'Maya', 'Kai', 'Noor'])
  await s.say('Right! So your name is {player}!')
  await st.hideProf()
  await st.showPlayer()
  await s.say('{player}! Your very own LLMMON story\nis about to unfold!')
  await st.spotlight(false)
}
