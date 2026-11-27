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
    this.setupLife()
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

  // ---------------------------------------------------------------- life: logo shine + motes
  private shine?: Phaser.GameObjects.Image
  private shineMask?: Phaser.GameObjects.Graphics
  private motes: Array<{ r: Phaser.GameObjects.Rectangle; x: number; y: number; vx: number; vy: number; t: number; life: number }> = []

  private setupLife(): void {
    if (this.logo) {
      this.shine = this.add.image(this.logo.x, this.logo.y, 'ui/title_logo').setOrigin(0.5, 0.5).setTintFill(0xffffff).setAlpha(0.45).setBlendMode(Phaser.BlendModes.ADD)
      this.shineMask = this.make.graphics({}, false)
      this.shine.setMask(this.shineMask.createGeometryMask())
      this.shine.setVisible(false)
    }
    this.motes = []
  }

  private tickLife(): void {
    // a diagonal shine band sweeps across the logo every ~5 s
    if (this.logo && this.shine && this.shineMask) {
      const period = 300
      const t = this.frame % period
      const dur = 42
      const on = t < dur && !params.fast
      this.shine.setVisible(on)
      if (on) {
        const x0 = this.logo.x - this.logo.width / 2 - 20 + ((this.logo.width + 40) * t) / dur
        const y0 = this.logo.y - this.logo.height / 2
        const g = this.shineMask
        g.clear()
        g.fillStyle(0xffffff)
        g.beginPath()
        g.moveTo(Math.round(x0), y0)
        g.lineTo(Math.round(x0) + 8, y0)
        g.lineTo(Math.round(x0) + 8 - 16, y0 + this.logo.height)
        g.lineTo(Math.round(x0) - 16, y0 + this.logo.height)
        g.closePath()
        g.fillPath()
      }
    }
    // a few warm motes drifting up through the sky, twinkling
    if (this.motes.length < 7 && this.frame % 40 === 0) {
      const x = 8 + Math.random() * (W - 16)
      const y = 70 + Math.random() * 60
      const col = Math.random() < 0.5 ? 0xfcfaf0 : 0xf8dc78
      const r = this.add.rectangle(Math.round(x), Math.round(y), 1, 1, col).setOrigin(0, 0).setAlpha(0)
      this.motes.push({ r, x, y, vx: -0.06 - Math.random() * 0.05, vy: -0.12 - Math.random() * 0.08, t: 0, life: 200 + Math.random() * 120 })
    }
    for (const m of this.motes) {
      m.t++
      m.x += m.vx
      m.y += m.vy
      m.r.setPosition(Math.round(m.x), Math.round(m.y))
      const k = m.t / m.life
      const tw = 0.6 + 0.4 * Math.sin(m.t / 9)
      m.r.setAlpha(Math.max(0, Math.min(1, Math.min(k * 6, (1 - k) * 4)) * tw))
      if (m.t >= m.life) m.r.destroy()
    }
    this.motes = this.motes.filter((m) => m.r.active)
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
    this.tickLife()
    if (this.phase === 'press') {
      // GBA-style cadence: long on, short off
      this.press.setVisible(this.frame % 64 < 46)
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
    const items = hasSave ? [{ label: 'CONTINUE' }, { label: 'NEW GAME' }, { label: 'OPTIONS' }] : [{ label: 'NEW GAME' }, { label: 'OPTIONS' }]
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
    let cursor = 0
    for (;;) {
      const m = new ListMenu(ui, ui.stack, items, { x: 4, y: 92, anchor: 'tl', w: 112, cancelIndex: -1, onMove: showInfo, initial: cursor })
      showInfo(cursor)
      const i = await m.result()
      info.forEach((o) => o.destroy())
      if (i < 0) {
        this.phase = 'press'
        return
      }
      const choice = items[i].label
      if (choice === 'OPTIONS') {
        cursor = i
        await ui.openOptions()
        continue
      }
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
