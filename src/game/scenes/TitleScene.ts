// Title: PRESS START → CONTINUE / NEW GAME.

import Phaser from 'phaser'
import { COLORS, FONT, H, W } from '../config'
import { controls } from '../controls'
import { audio } from '../audio'
import { state } from '../state'
import { ms, params } from '../params'
import { isPlaceholder } from '../assets'
import { PxText, measure } from '../ui/text'
import { Window } from '../ui/Window'
import { ListMenu } from '../ui/ListMenu'
import { getUI } from './UIScene'
import { content } from '../script'

export class TitleScene extends Phaser.Scene {
  private press!: PxText
  private phase: 'intro' | 'press' | 'menu' | 'leaving' = 'intro'
  private frame = 0
  private logo?: Phaser.GameObjects.Image

  constructor() {
    super({ key: 'Title' })
  }

  create(): void {
    this.phase = 'intro'
    this.frame = 0
    const ui = getUI(this.game)
    ui.fade(0, 0)
    if (!isPlaceholder('ui/title_bg')) this.add.image(0, 0, 'ui/title_bg').setOrigin(0, 0)
    else this.drawFallbackBg()
    if (!isPlaceholder('ui/title_logo')) {
      this.logo = this.add.image(W / 2, 46, 'ui/title_logo').setOrigin(0.5, 0.5)
    } else {
      const t = 'LLMMON'
      const tw = measure(this, FONT.dialog, t)
      new PxText(this, Math.round((W - tw) / 2), 30, t, { color: 0xffffff, shadowColor: COLORS.accent[0] })
      const t2 = 'Mythos'
      new PxText(this, Math.round((W - measure(this, FONT.dialog, t2)) / 2), 46, t2, { color: COLORS.accent[2], shadowColor: COLORS.frame[0] })
    }
    const label = 'PRESS START'
    this.press = new PxText(this, Math.round((W - measure(this, FONT.dialog, label)) / 2), 116, label, { color: 0xffffff, shadowColor: COLORS.frame[0] })
    new PxText(this, 4, H - 9, 'VERTICAL SLICE', { font: FONT.mini, color: 0xd4dae6, shadowColor: COLORS.frame[0], shadow: 'drop' })
    this.cameras.main.fadeIn(ms(500), 0, 0, 0)
    audio.playMusic('title')
    this.time.delayedCall(ms(400), () => {
      if (this.phase === 'intro') this.phase = 'press'
    })
    if (params.fast) this.phase = 'press'
  }

  private drawFallbackBg(): void {
    const g = this.add.graphics()
    const sky = [0x78b8f0, 0xa8d8f8, 0xd8f0fc]
    for (let y = 0; y < H; y++) {
      g.fillStyle(sky[Math.min(2, Math.floor((y / H) * 3))])
      g.fillRect(0, y, W, 1)
    }
    g.fillStyle(0x58b257)
    g.fillRect(0, 100, W, 60)
    g.fillStyle(0x3f8f4a)
    for (let x = 0; x < W; x += 4) g.fillRect(x, 100 + ((x / 4) % 2), 2, 2)
  }

  update(): void {
    controls.each(() => this.tick())
  }

  private tick(): void {
    this.frame++
    if (this.logo) this.logo.setY(46 + (Math.floor(this.frame / 30) % 2))
    if (this.phase === 'press') {
      this.press.setVisible(Math.floor(this.frame / 30) % 2 === 0)
      if (controls.justPressed('A') || controls.justPressed('START')) {
        controls.consume('A', 'START')
        audio.unlock()
        audio.sfx('select')
        this.phase = 'menu'
        this.press.setVisible(false)
        void this.menu()
      }
    }
  }

  private async menu(): Promise<void> {
    const ui = getUI(this.game)
    const hasSave = !params.newGame && state.hasSave()
    const items = hasSave ? [{ label: 'CONTINUE' }, { label: 'NEW GAME' }] : [{ label: 'NEW GAME' }]
    let info: Array<{ destroy(): void }> = []
    const showInfo = (i: number) => {
      info.forEach((o) => o.destroy())
      info = []
      if (!hasSave || i !== 0) return
      const save = state.hasSave() ? JSON.parse(localStorage.getItem('llmmon_mythos_save_v1') ?? '{}') : null
      if (!save) return
      const w = new Window(ui, 120, 92, 116, 64, 'ui/frame_menu').setDepth(1200)
      const mins = Math.floor((save.playTimeMs ?? 0) / 60000)
      const rows = [['PLAYER', save.playerName], ['LLMMON', String((save.caught ?? []).length)], ['TIME', `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, '0')}`]]
      info.push(w)
      rows.forEach(([k, v], r) => {
        info.push(new PxText(ui, 128, 102 + r * 15, k, { font: FONT.mini, shadow: 'drop' }).setDepth(1201).setScrollFactor(0))
        const t = new PxText(ui, 0, 99 + r * 15, v).setDepth(1201).setScrollFactor(0)
        t.setPosition(228 - t.width, 99 + r * 15)
        info.push(t)
      })
    }
    for (;;) {
      const m = new ListMenu(ui, ui.stack, items, { x: 4, y: 92, anchor: 'tl', w: 112, cancelIndex: -1, onMove: showInfo })
      showInfo(0)
      const i = await m.result()
      info.forEach((o) => o.destroy())
      if (i < 0) {
        this.phase = 'press'
        return
      }
      const choice = items[i].label
      this.phase = 'leaving'
      audio.stopMusic(400)
      await ui.fade(1, 400)
      if (choice === 'CONTINUE' && state.load()) {
        this.scene.start('Overworld', { map: state.map, x: state.x, y: state.y, facing: state.facing })
      } else {
        state.reset()
        state.setFlag('trainer_id', String(10000 + Math.floor(Math.random() * 89999)))
        if (content.startMoney !== undefined) state.money = content.startMoney
        this.scene.start('Intro')
      }
      return
    }
  }
}
