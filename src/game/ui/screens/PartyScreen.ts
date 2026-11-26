// Party screen: 6 slots with icon, name, level, HP bar. View mode (summary/switch) or choose mode.

import Phaser from 'phaser'
import { COLORS, FONT } from '../../config'
import { controls } from '../../controls'
import { audio } from '../../audio'
import { state } from '../../state'
import { monMaxHp, monName } from '../../adapters/monInfo'
import { ensureTexture } from '../../assets'
import { drawHpBar, drawPanel, drawStripes } from '../draw'
import { ListMenu } from '../ListMenu'
import { Window } from '../Window'
import { PxText } from '../text'
import { Screen } from './Screen'
import { SummaryScreen } from './SummaryScreen'
import type { WidgetStack } from '../WidgetStack'

export interface PartyOptions {
  mode: 'view' | 'choose'
  prompt?: string
}

export class PartyScreen extends Screen<number> {
  private o: PartyOptions
  private index = 0
  private switchFrom = -1
  private g: Phaser.GameObjects.Graphics
  private icons: Phaser.GameObjects.Image[] = []
  private names: PxText[] = []
  private levels: PxText[] = []
  private hps: PxText[] = []
  private msg: PxText
  private busy = false

  constructor(scene: Phaser.Scene, stack: WidgetStack, o: PartyOptions = { mode: 'view' }) {
    super(scene, stack)
    this.o = o
    const bg = this.gfx()
    drawStripes(bg, 240, 160, 0x3a6c8c, 0x426f94 + 0x040404)
    this.g = this.gfx()
    for (let i = 0; i < 6; i++) {
      const y = 2 + i * 22
      const mon = state.party[i]
      const icon = this.image(6, y + 2, mon ? ensureTexture(scene, `mons/${mon.speciesId}_icon`, 32, 16) : '__WHITE', 0)
      icon.setVisible(!!mon)
      if (mon && icon.width > 16) icon.setDisplaySize(16, 16)
      this.icons.push(icon)
      this.names.push(this.text(26, y + 4, ''))
      this.levels.push(this.text(112, y + 8, '', { font: FONT.mini, shadow: 'drop' }))
      this.hps.push(this.text(200, y + 12, '', { font: FONT.mini, shadow: 'drop' }))
    }
    const mw = new Window(scene, 2, 134, 236, 24, 'ui/frame_dialog')
    this.root.add(mw.obj)
    this.msg = this.text(10, 140, '')
    this.setMsg(o.prompt ?? 'Choose a LLMMON.')
    this.redraw()
  }

  private setMsg(s: string): void {
    this.msg.setText(s)
  }

  private redraw(): void {
    const g = this.g
    g.clear()
    for (let i = 0; i < 6; i++) {
      const y = 2 + i * 22
      const mon = state.party[i]
      const sel = i === this.index
      const sw = i === this.switchFrom
      if (!mon) {
        drawPanel(g, 2, y, 236, 21, 0x7c94a8, 0x56627c, 0x6c84a0)
        this.names[i].setText('')
        this.levels[i].setText('')
        this.hps[i].setText('')
        continue
      }
      const fainted = mon.hp <= 0
      const fill = sw ? 0xfce0a8 : fainted ? 0xf4c8c0 : COLORS.paper[2]
      const border = sel ? COLORS.accent[1] : sw ? COLORS.accent[0] : COLORS.frame[1]
      drawPanel(g, 2, y, 236, 21, fill, border, sel ? COLORS.accent[2] : COLORS.paper[0])
      const max = monMaxHp(mon)
      this.names[i].setText(monName(mon))
      this.levels[i].setText(`Lv${mon.level}`)
      g.fillStyle(COLORS.text)
      this.drawHpLabel(g, 140, y + 7)
      drawHpBar(g, 154, y + 7, 48, mon.hp / max, 3)
      const hpText = `${mon.hp}/${max}`
      this.hps[i].setText(hpText)
      this.hps[i].setPosition(203 - hpText.length * 4 + 4, y + 12)
      if (mon.status && mon.status !== 'none') this.levels[i].setText(`Lv${mon.level} ${mon.status.toUpperCase().slice(0, 3)}`)
    }
  }

  /** Tiny "HP" tag drawn with rects (sits left of the bar). */
  private drawHpLabel(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
    g.fillStyle(COLORS.accent[0])
    g.fillRect(x - 1, y - 2, 13, 7)
    g.fillStyle(0xffffff)
    // H
    g.fillRect(x + 1, y - 1, 1, 5); g.fillRect(x + 3, y - 1, 1, 5); g.fillRect(x + 2, y + 1, 1, 1)
    // P
    g.fillRect(x + 6, y - 1, 1, 5); g.fillRect(x + 7, y - 1, 2, 1); g.fillRect(x + 9, y, 1, 1); g.fillRect(x + 7, y + 1, 2, 1)
  }

  tick(): void {
    super.tick()
    for (let i = 0; i < this.icons.length; i++) {
      const icon = this.icons[i]
      if (!icon.visible) continue
      const rate = i === this.index ? 8 : 20
      icon.setFrame(Math.floor(this.frame / rate) % 2)
      if (icon.width > 16) icon.setDisplaySize(16, 16)
      icon.setY(4 + i * 22 + (i === this.index && Math.floor(this.frame / 8) % 2 ? -1 : 0))
    }
  }

  input(): void {
    if (this.busy) return
    const n = Math.max(1, state.party.length)
    if (controls.repeat('up')) {
      this.index = (this.index - 1 + n) % n
      audio.sfx('select')
      this.redraw()
    } else if (controls.repeat('down')) {
      this.index = (this.index + 1) % n
      audio.sfx('select')
      this.redraw()
    } else if (controls.justPressed('A')) {
      controls.consume('A', 'START')
      if (!state.party.length) return
      audio.sfx('select')
      if (this.switchFrom >= 0) return this.doSwitch()
      if (this.o.mode === 'choose') return this.close(this.index)
      void this.submenu()
    } else if (controls.justPressed('B')) {
      controls.consume('B')
      audio.sfx('cancel')
      if (this.switchFrom >= 0) {
        this.switchFrom = -1
        this.setMsg(this.o.prompt ?? 'Choose a LLMMON.')
        this.redraw()
        return
      }
      this.close(-1)
    }
  }

  private doSwitch(): void {
    const a = this.switchFrom
    const b = this.index
    if (a !== b) {
      const p = state.party
      ;[p[a], p[b]] = [p[b], p[a]]
      const ia = this.icons[a]
      const ib = this.icons[b]
      const ka = ia.texture.key
      ia.setTexture(ib.texture.key, 0)
      ib.setTexture(ka, 0)
    }
    this.switchFrom = -1
    this.setMsg(this.o.prompt ?? 'Choose a LLMMON.')
    this.redraw()
  }

  private async submenu(): Promise<void> {
    this.busy = true
    const mon = state.party[this.index]
    this.setMsg(`Do what with ${monName(mon)}?`)
    const items = [{ label: 'SUMMARY' }, { label: 'SWITCH' }, { label: 'CANCEL' }]
    const m = new ListMenu(this.scene, this.stack, items, { x: 238, y: 132, anchor: 'br', depth: 2100, cancelIndex: 2 })
    const c = await m.result()
    this.busy = false
    this.setMsg(this.o.prompt ?? 'Choose a LLMMON.')
    if (c === 0) {
      this.busy = true
      this.setVisible(false)
      this.index = await new SummaryScreen(this.scene, this.stack, this.index).run()
      this.setVisible(true)
      this.busy = false
      this.redraw()
    } else if (c === 1) {
      if (state.party.length < 2) return
      this.switchFrom = this.index
      this.setMsg('Move to where?')
      this.redraw()
    }
  }
}
