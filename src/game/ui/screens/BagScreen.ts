// Bag: item list with counts + description. View mode (use on party) or choose mode (returns item id).

import Phaser from 'phaser'
import { COLORS } from '../../config'
import { audio } from '../../audio'
import { state } from '../../state'
import { itemInfo, monName, useFieldItem } from '../../adapters/monInfo'
import { isPlaceholder } from '../../assets'
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
  private bagIcon: Phaser.GameObjects.Image | null = null

  constructor(scene: Phaser.Scene, stack: WidgetStack, o: BagOptions = { mode: 'view' }) {
    super(scene, stack)
    this.o = o
    const g = this.gfx()
    drawStripes(g, 240, 160, 0xc89a5c, 0xd0a466)
    drawPanel(g, 2, 2, 76, 106, 0xfce8c0, COLORS.accent[0], 0xf0c890)
    this.text(12, 8, 'ITEMS')
    g.fillStyle(COLORS.accent[1])
    g.fillRect(10, 22, 58, 2)
    if (scene.textures.exists('fx/satchel') && !isPlaceholder('fx/satchel')) {
      this.bagIcon = this.image(16, 36, 'fx/satchel').setScale(3)
    } else {
      // simple drawn satchel
      g.fillStyle(COLORS.outline)
      g.fillRect(17, 45, 44, 40)
      g.fillStyle(0xa0744a)
      g.fillRect(18, 46, 42, 38)
      g.fillStyle(0xbd8654)
      g.fillRect(18, 46, 42, 14)
      g.fillStyle(COLORS.outline)
      g.fillRect(18, 60, 42, 1)
      g.fillRect(36, 56, 6, 8)
      g.fillStyle(0xf8d838)
      g.fillRect(37, 57, 4, 6)
      g.fillStyle(COLORS.outline)
      g.fillRect(26, 36, 26, 2)
      g.fillRect(24, 38, 2, 8)
      g.fillRect(52, 38, 2, 8)
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
      if (!info.usableInField || info.isBall) {
        this.say(info.isBall ? 'There’s nothing to catch here!' : 'This can’t be used right now.')
        audio.sfx('bump')
        await this.pause(900)
        continue
      }
      this.setVisible(false)
      const party = new PartyScreen(this.scene, this.stack, { mode: 'choose', prompt: `Use on which LLMMON?` })
      const mi = await party.run()
      this.setVisible(true)
      if (mi < 0) continue
      const mon = state.party[mi]
      const msg = useFieldItem(id, mon)
      if (msg) {
        state.removeItem(id, 1)
        audio.sfx('heal')
        this.say(msg)
      } else {
        audio.sfx('bump')
        this.say(`It won’t have any effect on ${monName(mon)}.`)
      }
      await this.pause(1100)
    }
  }

  private pause(ms: number): Promise<void> {
    return new Promise((r) => this.scene.time.delayedCall(ms, r))
  }

  input(): void {
    /* list widgets handle input */
  }

  close(r: string | null): void {
    this.list?.destroy()
    this.bagIcon = null
    super.close(r)
  }
}
