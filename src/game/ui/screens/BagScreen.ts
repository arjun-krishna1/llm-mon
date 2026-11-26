// Bag: item list with counts + description. View mode (use on party) or choose mode (returns item id).

import Phaser from 'phaser'
import { COLORS } from '../../config'
import { audio } from '../../audio'
import { controls } from '../../controls'
import { state } from '../../state'
import { itemInfo, useFieldItem } from '../../adapters/monInfo'
import { drawPanel, drawStripes } from '../draw'
import { ListMenu, type ListItem } from '../ListMenu'
import { PxText, wrap } from '../text'
import { Window } from '../Window'
import { Screen } from './Screen'
import { PartyScreen } from './PartyScreen'
import type { WidgetStack } from '../WidgetStack'

export interface BagOptions {
  mode: 'view' | 'choose'
  /** In choose mode, only list items passing this filter. */
  filter?: (itemId: string) => boolean
}

export class BagScreen extends Screen<string | null> {
  private o: BagOptions
  private desc: PxText[]
  private list?: ListMenu
  private ids: string[] = []

  constructor(scene: Phaser.Scene, stack: WidgetStack, o: BagOptions = { mode: 'view' }) {
    super(scene, stack)
    this.o = o
    const g = this.gfx()
    drawStripes(g, 240, 160, 0xc89a5c, 0xd0a466)
    drawPanel(g, 2, 2, 76, 106, 0xfce8c0, COLORS.accent[0], 0xf0c890)
    this.text(12, 8, 'ITEMS')
    g.fillStyle(COLORS.accent[1])
    g.fillRect(10, 22, 58, 2)
    {
      // drawn satchel at native scale (palette WOOD ramp + outline)
      const px = (c: number, x: number, y: number, w: number, h: number) => {
        g.fillStyle(c)
        g.fillRect(x, y, w, h)
      }
      const O = COLORS.outline
      px(0x28222e, 20, 86, 40, 2) // ground shadow
      // strap handle
      px(O, 27, 34, 24, 3); px(O, 24, 36, 4, 10); px(O, 50, 36, 4, 10)
      px(0x946240, 28, 35, 22, 1); px(0x946240, 25, 37, 2, 8); px(0x946240, 51, 37, 2, 8)
      // body
      px(O, 17, 45, 44, 41); px(O, 16, 47, 46, 37)
      px(0x946240, 18, 46, 42, 39); px(0x946240, 17, 48, 44, 35)
      px(0x6b4630, 18, 78, 42, 6) // bottom shade
      px(0xbd8654, 19, 62, 4, 15) // left highlight
      // flap
      px(0xbd8654, 18, 46, 42, 15); px(0xe0b078, 19, 47, 40, 2)
      px(O, 18, 61, 42, 1); px(0x6b4630, 18, 62, 42, 1)
      for (let x = 21; x < 58; x += 4) px(0x6b4630, x, 58, 2, 1) // stitching
      // clasp
      px(O, 35, 56, 8, 10); px(0xe8b830, 36, 57, 6, 8); px(0xfce070, 37, 58, 2, 2); px(0xb08018, 36, 63, 6, 2)
    }
    const w = new Window(scene, 2, 110, 236, 48, 'ui/frame_dialog')
    this.root.add(w.obj)
    this.desc = [0, 1].map((i) => this.text(10, 116 + i * 16, ''))
  }

  private items(): ListItem[] {
    this.ids = Object.keys(state.bag).filter((id) => state.bag[id] > 0 && (!this.o.filter || this.o.filter(id)))
    const out: ListItem[] = this.ids.map((id) => ({ label: itemInfo(id).name, right: `×${state.bag[id]}` }))
    out.push({ label: 'CLOSE BAG' })
    return out
  }

  private showDesc(i: number): void {
    const id = this.ids[i]
    const text = id ? itemInfo(id).desc || 'A useful item.' : 'Close the bag.'
    const lines = wrap(this.scene, 'font_dialog', text, 216)
    this.desc[0].setText(lines[0] ?? '')
    this.desc[1].setText(lines[1] ?? '')
  }

  private say(text: string): void {
    const lines = wrap(this.scene, 'font_dialog', text, 216)
    this.desc[0].setText(lines[0] ?? '')
    this.desc[1].setText(lines.slice(1).join(' '))
  }

  run(): Promise<string | null> {
    const p = super.run()
    void this.loop()
    return p
  }

  private async loop(): Promise<void> {
    let initial = 0
    for (;;) {
      const items = this.items()
      this.list = new ListMenu(this.scene, this.stack, items, {
        x: 80, y: 2, w: 158, rows: 6, depth: 2050, initial, persist: false,
        onMove: (i) => this.showDesc(i), cancelIndex: items.length - 1,
      })
      this.showDesc(this.list.selected)
      const i = await this.list.result()
      initial = Math.max(0, i)
      const id = this.ids[i]
      if (!id) return this.close(null)
      if (this.o.mode === 'choose') return this.close(id)
      // view mode: USE / CANCEL
      const info = itemInfo(id)
      const listShadow = new ListMenu(this.scene, this.stack, items, { x: 80, y: 2, w: 158, rows: 6, depth: 2050, initial: i, cancelIndex: null })
      listShadow.setActive(false)
      this.say(`${info.name} is selected.`)
      const sub = new ListMenu(this.scene, this.stack, [{ label: 'USE' }, { label: 'CANCEL' }], { x: 238, y: 108, anchor: 'br', depth: 2100, cancelIndex: 1 })
      const c = await sub.result()
      listShadow.destroy()
      if (c !== 0) continue
      if (info.repelSteps > 0) {
        state.removeItem(id, 1)
        state.setFlag('repel_steps', info.repelSteps)
        audio.sfx('stat_up')
        this.say(`${state.playerName} used the ${info.name}. Weak wild LLMMON will keep away.`)
        await this.waitButton()
        continue
      }
      if (!info.usableOnMon) {
        this.say(info.isBall ? 'There’s nothing to catch here!' : 'This can’t be used right now.')
        audio.sfx('bump')
        await this.waitButton()
        continue
      }
      this.setVisible(false)
      const party = new PartyScreen(this.scene, this.stack, { mode: 'choose', prompt: `Use on which LLMMON?` })
      const mi = await party.run()
      this.setVisible(true)
      if (mi < 0) continue
      const mon = state.party[mi]
      const res = useFieldItem(id, mon)
      if (res.ok) state.removeItem(id, 1)
      const after = this.items()
      const ghost = new ListMenu(this.scene, this.stack, after, { x: 80, y: 2, w: 158, rows: 6, depth: 2050, initial: Math.min(i, after.length - 1), cancelIndex: null })
      ghost.setActive(false)
      audio.sfx(res.ok ? 'heal' : 'bump')
      this.say(res.message.replace(/'/g, '\u2019'))
      await this.waitButton()
      ghost.destroy()
    }
  }

  /** Wait for A or B (message acknowledged), like a dialog page. */
  private waitButton(): Promise<void> {
    return new Promise((res) => {
      let t = 0
      const w = {
        done: false,
        tick: () => {},
        input: () => {
          if (++t < 8) return
          if (controls.justPressed('A') || controls.justPressed('B')) {
            controls.consume('A', 'B')
            audio.sfx('select')
            w.done = true
            res()
          }
        },
      }
      this.stack.push(w)
    })
  }

  input(): void {
    /* list widgets handle input */
  }

  close(r: string | null): void {
    this.list?.destroy()
    super.close(r)
  }
}
