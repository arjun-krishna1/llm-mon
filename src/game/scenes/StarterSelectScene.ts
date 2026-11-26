// Starter select (BATTLE-UI): the professor's satchel with three Prompt Orbs.
// Left/right picks an orb (it bobs, the creature fades in above it with name, type and
// a one-line description); A asks "So, you want X, the T-type LLMMON?" YES/NO.
//
// Launch: `scene.scene.run('StarterSelect', { starters?, onDone(speciesId) })`, or
// `await launchStarterSelect(scene)` from src/game/battle/ui/starterSelect.ts.

import Phaser from 'phaser'
import { FONT, H, W } from '../config'
import { controls } from '../controls'
import { audio } from '../audio'
import { params } from '../params'
import { ensureTexture, isPlaceholder } from '../assets'
import { DialogBox } from '../ui/DialogBox'
import { Window } from '../ui/Window'
import { WidgetStack, type Widget } from '../ui/WidgetStack'
import { PxText, measure, wrap } from '../ui/text'
import { choice } from '../ui/ListMenu'
import { getSpecies, TYPES } from '../battle/core'
import { tween } from '../battle/ui/util'

export interface StarterSelectData {
  starters?: string[]
  onDone: (speciesId: string | null) => void
}

export const DEFAULT_STARTERS = ['claude_fable', 'gpt_5_5', 'glm']
/** Orb centres on ui/starter_select_bg (docs/ART_CATALOG_SPRITES.md). */
const ORBS = [{ x: 72, y: 84 }, { x: 120, y: 84 }, { x: 168, y: 84 }]

export class StarterSelectScene extends Phaser.Scene {
  private d!: StarterSelectData
  private ids: string[] = []
  private stack = new WidgetStack()
  private index = 1
  private orbs: Phaser.GameObjects.Image[] = []
  private pointer!: Phaser.GameObjects.Image
  private mon!: Phaser.GameObjects.Image
  private glow!: Phaser.GameObjects.Graphics
  private plate!: Window
  private plateName!: PxText
  private chip!: Phaser.GameObjects.Image
  private descWin!: Window
  private desc: PxText[] = []
  private box!: DialogBox
  private fader!: Phaser.GameObjects.Rectangle
  private frame = 0
  private busy = true
  private monTween?: Phaser.Tweens.Tween
  phase = 'intro'
  private orbKey = 'fx/orb_throw'
  /** Half the orb size (8 for the 16px orb, 16 for orb_big). */
  private half = 8

  constructor() {
    super({ key: 'StarterSelect' })
  }

  init(d: StarterSelectData): void {
    this.d = d
    this.ids = (d.starters?.length ? d.starters : DEFAULT_STARTERS).slice(0, 3)
    this.stack = new WidgetStack()
    this.index = Math.min(1, this.ids.length - 1)
    this.orbs = []
    this.desc = []
    this.frame = 0
    this.busy = true
    this.phase = 'intro'
  }

  create(): void {
    this.add.image(0, 0, 'ui/starter_select_bg').setOrigin(0, 0)
    this.glow = this.add.graphics()
    // ART may ship a native 32px orb (fx/orb_big, same 4 frames) that fills the pockets better.
    this.orbKey = this.textures.exists('fx/orb_big') && !isPlaceholder('fx/orb_big') ? 'fx/orb_big' : 'fx/orb_throw'
    this.half = this.orbKey === 'fx/orb_big' ? 16 : 8
    this.ids.forEach((_, i) => {
      this.orbs.push(this.add.image(ORBS[i].x, ORBS[i].y, this.orbKey, 0).setOrigin(0.5, 0.5))
    })
    this.mon = this.add.image(0, 0, '__WHITE').setOrigin(0.5, 1).setAlpha(0)
    this.pointer = this.add.image(0, 0, 'ui/arrow_down').setOrigin(0.5, 0)
    // name plate (name + type chip) sits on top of the description box, like a speaker plate
    this.plate = new Window(this, 2, 90, 100, 24, 'ui/frame_dialog').setDepth(10)
    this.plateName = new PxText(this, 11, 96, '').setDepth(11)
    this.chip = this.add.image(0, 96, 'ui/type_neutral').setOrigin(0, 0).setDepth(11)
    this.descWin = new Window(this, 0, 112, W, 48, 'ui/frame_dialog').setDepth(10)
    this.desc = [0, 1].map((i) => new PxText(this, 10, 118 + i * 16, '').setDepth(11))
    this.box = new DialogBox(this, this.stack, { x: 0, y: 112, w: W, h: 48, frame: 'ui/frame_dialog', depth: 20 })
    this.fader = this.add.rectangle(0, 0, W, H, 0x000000).setOrigin(0, 0).setDepth(100).setAlpha(params.fast ? 0 : 1)
    const browse: Widget = { tick: () => this.tickBrowse(), input: () => this.browseInput() }
    this.stack.push(browse)
    this.installDebug()
    void this.begin()
  }

  private installDebug(): void {
    if (!params.debug) return
    const w = window as unknown as { __llmmon?: Record<string, unknown> }
    if (w.__llmmon) w.__llmmon.starterInfo = () => ({ phase: this.phase, index: this.index, id: this.ids[this.index], text: this.box.currentText })
  }

  private async begin(): Promise<void> {
    this.highlight(this.index, true)
    await tween(this, this.fader, 300, { alpha: 0 })
    this.busy = false
    this.phase = 'browse'
  }

  update(): void {
    controls.each(() => this.stack.update())
  }

  // ---------------------------------------------------------------- widget (browse input)

  private tickBrowse(): void {
    this.frame++
    const f = this.frame
    // pointer bounces like the dialog advance arrow; selected orb hops + wiggles
    const o = ORBS[this.index]
    this.pointer.setPosition(o.x, o.y - this.half - 12 + [0, 1, 2, 1][Math.floor(f / 8) % 4])
    this.orbs.forEach((orb, i) => {
      if (i !== this.index) {
        orb.setPosition(ORBS[i].x, ORBS[i].y).setFrame(0)
        return
      }
      const t = f % 64
      const hop = t < 16 ? [0, -1, -2, -3, -3, -2, -1, 0][Math.floor(t / 2)] : 0
      const wig = t >= 20 && t < 36 ? [1, 0, 2, 0][Math.floor((t - 20) / 4)] : 0
      orb.setPosition(ORBS[i].x, ORBS[i].y + hop).setFrame(wig)
    })
    this.drawGlow()
  }

  private drawGlow(): void {
    const g = this.glow
    g.clear()
    const o = ORBS[this.index]
    // soft shadow under the orb that shrinks while it hops
    const t = this.frame % 64
    const hop = t < 16 ? [0, 1, 2, 3, 3, 2, 1, 0][Math.floor(t / 2)] : 0
    // contact shadow under the creature (follows its fade)
    const a = this.mon.alpha * 0.28
    if (a > 0) {
      g.fillStyle(0x3a2418, a)
      g.fillRect(o.x - 14, o.y - this.half - 7, 28, 3)
      g.fillRect(o.x - 18, o.y - this.half - 6, 36, 1)
    }
    g.fillStyle(0x5a3a28, 0.35)
    const r = this.half - 2
    g.fillRect(o.x - r + Math.ceil(hop / 2), o.y + this.half - 1, r * 2 - hop, 2)
    g.fillRect(o.x - r + 1 + Math.ceil(hop / 2), o.y + this.half + 1, r * 2 - 2 - hop, 1)
  }

  private browseInput(): void {
    if (this.busy) return
    if (controls.justPressed('left') && this.index > 0) this.move(-1)
    else if (controls.justPressed('right') && this.index < this.ids.length - 1) this.move(1)
    else if (controls.justPressed('A')) {
      controls.consume('A')
      audio.sfx('select')
      void this.confirm()
    }
  }

  private move(dir: number): void {
    audio.sfx('select')
    this.highlight(this.index + dir)
  }

  private highlight(i: number, instant = false): void {
    this.index = i
    const id = this.ids[i]
    const sp = getSpecies(id)
    const o = ORBS[i]
    this.monTween?.stop()
    this.mon.setTexture(ensureTexture(this, `mons/${id}_front`, 64, 64))
    this.mon.setPosition(o.x, o.y - this.half - 6 + 4).setAlpha(0)
    this.monTween = this.tweens.add({ targets: this.mon, alpha: 1, y: o.y - this.half - 6, duration: instant || params.fast ? 1 : 260, ease: 'Quad.Out' })
    // name plate + chip
    const name = sp.name
    const nw = measure(this, FONT.dialog, name)
    this.plateName.setText(name)
    const type = sp.types[0]
    this.chip.setTexture(`ui/type_${type}`).setPosition(11 + nw + 6, 97)
    this.plate.setSize(nw + 6 + 32 + 20, 24)
    const lines = sp.dex.lines.length ? sp.dex.lines : wrap(this, FONT.dialog, `${name}.`, 216)
    const text = wrap(this, FONT.dialog, lines.join(' '), 218)
    this.desc[0].setText(text[0] ?? '')
    this.desc[1].setText(text[1] ?? '')
  }

  private setBrowseVisible(v: boolean): void {
    this.descWin.setVisible(v)
    for (const t of this.desc) t.setVisible(v)
  }

  private async confirm(): Promise<void> {
    this.busy = true
    this.phase = 'confirm'
    const id = this.ids[this.index]
    const sp = getSpecies(id)
    const typeName = TYPES[sp.types[0]]?.name ?? sp.types[0]
    this.setBrowseVisible(false)
    await this.box.say(`So, you want ${sp.name}, the ${typeName}-type LLMMON?`, { keepOpen: true })
    const yes = (await choice(this, this.stack, ['YES', 'NO'], { x: W - 2, y: 110, anchor: 'br', depth: 30, cancelIndex: 1 })) === 0
    this.box.close()
    if (!yes) {
      this.setBrowseVisible(true)
      this.phase = 'browse'
      this.busy = false
      return
    }
    this.phase = 'chosen'
    // the chosen orb hops and flashes once before the scene fades out
    audio.sfx('orb_throw')
    const orb = this.orbs[this.index]
    await tween(this, orb, 140, { y: ORBS[this.index].y - 8, ease: 'Quad.Out' })
    orb.setFrame(3)
    await tween(this, orb, 140, { y: ORBS[this.index].y, ease: 'Quad.In' })
    await tween(this, this.fader, 350, { alpha: 1 })
    // reveal the field underneath again before handing back to the script
    this.children.list.filter((o) => o !== this.fader).forEach((o) => (o as unknown as { setVisible(v: boolean): void }).setVisible?.(false))
    await tween(this, this.fader, 250, { alpha: 0 })
    this.phase = 'done'
    const w = window as unknown as { __llmmon?: Record<string, unknown> }
    if (w.__llmmon) delete w.__llmmon.starterInfo
    const done = this.d.onDone
    this.scene.stop()
    done(id)
  }
}
