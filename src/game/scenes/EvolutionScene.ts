// Evolution (BATTLE-UI). The GBA evolution sequence: a dark stage, the creature pulses
// white, its silhouette morphs between the old and the new form by alternating scale with
// an accelerating cadence, a flash, the new form's cry, "Congratulations!", a fanfare, the
// PromptDex line and the learn-move flow. B during the morph cancels ("Huh? X stopped
// evolving!").
//
// Two modes:
// - battle: BattleScene answers the core's `evolve` prompt through `host` (the core owns
//   the result; this scene plays the events it returns: texts, dex_register, learn prompts);
// - item / script: `launchEvolution(scene, { mon, toSpeciesId })` (src/game/battle/ui/evolution.ts)
//   evolves the instance itself with `evolveMon` and teaches the new moves.

import Phaser from 'phaser'
import { H, W } from '../config'
import { controls } from '../controls'
import { audio } from '../audio'
import { params } from '../params'
import { state } from '../state'
import type { MonInstance } from '../types'
import { ensureTexture } from '../assets'
import { DialogBox } from '../ui/DialogBox'
import { Window } from '../ui/Window'
import { WidgetStack, type Widget } from '../ui/WidgetStack'
import { evolveMon, getMove, getSpecies, knowsMove, learnMove, type BattleEvent } from '../battle/core'
import { DEPTH, LAYOUT } from '../battle/ui/constants'
import { animate, ensureFxTextures, tween, wait } from '../battle/ui/util'
import { askForgetMove, type LearnHost } from '../battle/ui/learn'

/** Battle mode: the core decides; this scene plays what it returns. */
export interface EvolutionHost {
  decide(accept: boolean): BattleEvent[]
  learn(slot: number | null): BattleEvent[]
}

export interface EvolutionSceneData {
  /** The evolving instance (battle: state.party[i]; mutated by the core or by this scene). */
  mon: MonInstance
  from: string
  to: string
  /** Line shown first (default "What? X is evolving!"). */
  introText?: string
  host?: EvolutionHost
  /** Debug: let the playtest force a cancel without key timing. */
  onDone: (evolved: boolean) => void
}

const STAGE_Y = 100

class CancelWatch implements Widget {
  done = false
  pressed = false
  armed = true
  tick(): void {}
  input(): void {
    if (this.armed && controls.justPressed('B')) {
      controls.consume('B')
      this.pressed = true
    }
  }
}

export class EvolutionScene extends Phaser.Scene {
  private d!: EvolutionSceneData
  private stack = new WidgetStack()
  private box!: DialogBox
  private fader!: Phaser.GameObjects.Rectangle
  private oldS!: Phaser.GameObjects.Image
  private newS!: Phaser.GameObjects.Image
  private oldW!: Phaser.GameObjects.Image
  private newW!: Phaser.GameObjects.Image
  private motes: { s: Phaser.GameObjects.Image; v: number }[] = []
  private moteSpeed = 0
  private glow!: Phaser.GameObjects.Graphics
  phase = 'intro'
  private evolved = false
  private dexShown = new Set<string>()

  constructor() {
    super({ key: 'Evolution' })
  }

  init(d: EvolutionSceneData): void {
    this.d = d
    this.stack = new WidgetStack()
    this.motes = []
    this.moteSpeed = 0
    this.phase = 'intro'
    this.evolved = false
    this.dexShown = new Set()
  }

  create(): void {
    ensureFxTextures(this)
    this.cameras.main.setScroll(0, 0)
    // the dark stage: deep navy with soft concentric rings and a floor glow
    const bg = this.add.graphics().setDepth(0)
    bg.fillStyle(0x080810)
    bg.fillRect(0, 0, W, H)
    for (let i = 7; i >= 1; i--) {
      bg.fillStyle(0x101830 + i * 0x020204, 0.18)
      bg.fillEllipse(W / 2, 64, 60 + i * 34, 40 + i * 20)
    }
    this.glow = this.add.graphics().setDepth(1)
    this.drawGlow(0.25)
    const fk = (id: string) => ensureTexture(this, `mons/${id}_front`, 64, 64)
    this.oldS = this.add.image(W / 2, STAGE_Y, fk(this.d.from)).setOrigin(0.5, 1).setDepth(10)
    this.newS = this.add.image(W / 2, STAGE_Y, fk(this.d.to)).setOrigin(0.5, 1).setDepth(10).setVisible(false)
    this.oldW = this.add.image(W / 2, STAGE_Y, fk(this.d.from)).setOrigin(0.5, 1).setDepth(11).setTintFill(0xffffff).setAlpha(0)
    this.newW = this.add.image(W / 2, STAGE_Y, fk(this.d.to)).setOrigin(0.5, 1).setDepth(11).setTintFill(0xffffff).setVisible(false)
    for (let i = 0; i < 22; i++) {
      const s = this.add.image(Phaser.Math.Between(40, 200), Phaser.Math.Between(10, 108), 'bfx/pixel').setDepth(5).setAlpha(0).setScale(0.5)
      this.motes.push({ s, v: 0.3 + Math.random() * 0.7 })
    }
    new Window(this, LAYOUT.box.x, LAYOUT.box.y, LAYOUT.box.w, LAYOUT.box.h, 'ui/frame_battle').setDepth(DEPTH.frame)
    this.box = new DialogBox(this, this.stack, { ...LAYOUT.box, frame: 'ui/frame_battle', depth: DEPTH.box })
    this.fader = this.add.rectangle(0, 0, W, H, 0x000000).setOrigin(0, 0).setDepth(DEPTH.fader).setAlpha(1)
    this.scene.bringToTop()
    this.installDebug()
    void this.run().catch((err: unknown) => {
      console.error('[evolution] crashed', err)
      this.done(false)
    })
  }

  update(): void {
    controls.each(() => {
      this.stack.update()
      for (const m of this.motes) {
        if (this.moteSpeed <= 0) {
          m.s.setAlpha(Math.max(0, m.s.alpha - 0.03))
          continue
        }
        m.s.y -= m.v * this.moteSpeed
        m.s.setAlpha(Math.min(0.9, m.s.alpha + 0.04))
        if (m.s.y < 4) {
          m.s.y = 108
          m.s.x = Phaser.Math.Between(40, 200)
        }
      }
    })
  }

  private drawGlow(a: number): void {
    const g = this.glow
    g.clear()
    g.fillStyle(0xa0b8e0, a * 0.5)
    g.fillEllipse(W / 2, STAGE_Y - 2, 96, 14)
    g.fillStyle(0xfcfaf0, a * 0.4)
    g.fillEllipse(W / 2, STAGE_Y - 2, 56, 7)
  }

  private installDebug(): void {
    if (!params.debug) return
    const w = window as unknown as { __llmmon?: Record<string, unknown> }
    if (!w.__llmmon) return
    w.__llmmon.evolutionInfo = () => ({
      phase: this.phase,
      text: this.box.currentText,
      box: (this.box as unknown as { phase: string }).phase,
      from: this.d.from,
      to: this.d.to,
      evolved: this.evolved,
    })
  }

  private async fade(to: 0 | 1, dur = 300): Promise<void> {
    await tween(this, this.fader, dur, { alpha: to })
    this.fader.setAlpha(to)
  }

  private get name(): string {
    return this.d.mon.nickname ?? getSpecies(this.d.from).name
  }

  private async say(text: string): Promise<void> {
    this.phase = this.phase === 'learn' ? 'learn' : 'text'
    await this.box.say(text)
  }

  private async run(): Promise<void> {
    await this.fade(0)
    audio.stopMusic(300)
    this.cry(this.d.from)
    await this.say(this.d.introText ?? `What? ${this.name} is evolving!`)
    this.phase = 'morph'
    const watch = new CancelWatch()
    this.stack.push(watch)
    const finished = await this.morph(watch)
    watch.armed = false
    this.stack.remove(watch)
    if (!finished) await this.cancelled()
    else await this.completed()
    this.phase = 'end'
    await wait(this, 200)
    await this.fade(1)
    this.done(this.evolved)
  }

  private cry(id: string): void {
    audio.cry(id)
  }

  /** The morph. Resolves true when it ran to the end, false when B cancelled it. */
  private async morph(watch: CancelWatch): Promise<boolean> {
    // 1. the creature pulses white
    for (let i = 0; i < 3; i++) {
      await animate(this, 260, (k) => this.oldW.setAlpha(0.15 + 0.55 * Math.sin(k * Math.PI) + (i / 3) * 0.3))
      if (watch.pressed) return false
    }
    await animate(this, 300, (k) => this.oldW.setAlpha(Math.min(1, 0.6 + k * 0.4)))
    this.oldW.setAlpha(1)
    this.oldS.setVisible(false)
    this.moteSpeed = 0.6
    // 2. silhouettes trade places with an accelerating cadence
    this.newW.setVisible(true).setScale(0.05)
    let period = 560
    let t = 0
    let showingNew = false
    while (t < 4200 && !params.fast) {
      const half = Math.max(36, period / 2)
      const from = showingNew ? this.newW : this.oldW
      const to = showingNew ? this.oldW : this.newW
      audio.sfx('text')
      await animate(this, half, (k) => {
        const e = k * k * (3 - 2 * k)
        from.setScale(1 - 0.95 * e)
        to.setScale(0.05 + 0.95 * e)
      })
      if (watch.pressed) {
        this.oldW.setScale(1)
        this.newW.setVisible(false)
        return false
      }
      showingNew = !showingNew
      t += half
      period *= 0.86
      this.moteSpeed = Math.min(3, this.moteSpeed + 0.12)
      this.drawGlow(0.25 + Math.min(0.6, t / 6000))
    }
    if (watch.pressed) return false
    // end on the new silhouette, full size
    this.oldW.setScale(0.05).setVisible(false)
    this.newW.setScale(1)
    return true
  }

  private async cancelled(): Promise<void> {
    this.moteSpeed = 0
    this.newW.setVisible(false)
    this.oldS.setVisible(true).setScale(1)
    this.oldW.setScale(1)
    await animate(this, 500, (k) => this.oldW.setAlpha(1 - k))
    this.drawGlow(0.2)
    this.cry(this.d.from)
    this.phase = 'cancelled'
    if (this.d.host) await this.playEvents(this.d.host.decide(false))
    else await this.say(`Huh? ${this.name} stopped evolving!`)
  }

  private async completed(): Promise<void> {
    // 3. the flash, then the new form in colour
    this.moteSpeed = 0
    const flash = this.add.rectangle(0, 0, W, H, 0xffffff).setOrigin(0, 0).setDepth(DEPTH.fader - 1).setAlpha(0)
    await animate(this, 140, (k) => flash.setAlpha(k))
    this.newS.setVisible(true)
    this.newW.setAlpha(1)
    void animate(this, 600, (k) => this.newW.setAlpha(1 - k)).then(() => this.newW.setVisible(false))
    await animate(this, 520, (k) => flash.setAlpha(1 - k))
    flash.destroy()
    void this.sparkle()
    this.cry(this.d.to)
    this.drawGlow(0.5)
    await wait(this, 500)
    this.evolved = true
    this.phase = 'done'
    if (this.d.host) {
      await this.playEvents(this.d.host.decide(true))
      return
    }
    // item / script mode
    const oldName = this.name
    const res = evolveMon(this.d.mon, this.d.to)
    audio.sfx('key_item_get')
    await this.say(`Congratulations! Your ${oldName} evolved into ${getSpecies(this.d.to).name}!`)
    await this.dexLine(this.d.to)
    for (const id of res.newMoves) await this.teach(id)
  }

  private async sparkle(): Promise<void> {
    const stars = Array.from({ length: 10 }, (_, i) => ({ s: this.add.image(W / 2, STAGE_Y - 30, 'bfx/star').setDepth(12), a: (i / 10) * Math.PI * 2 }))
    await animate(this, 700, (k) => {
      for (const { s, a } of stars) {
        s.setPosition(Math.round(W / 2 + Math.cos(a) * (8 + k * 46)), Math.round(STAGE_Y - 30 + Math.sin(a) * (6 + k * 30)))
        s.setAlpha(1 - k * k)
      }
    })
    stars.forEach(({ s }) => s.destroy())
  }

  private async dexLine(speciesId: string): Promise<void> {
    if (this.dexShown.has(speciesId)) return
    this.dexShown.add(speciesId)
    const before = state.caught.includes(speciesId)
    state.markSeen(speciesId)
    state.markCaught(speciesId)
    if (before) return
    audio.sfx('dex_register')
    await this.say(`${getSpecies(speciesId).name}'s data was added to the PromptDex.`)
  }

  /** Item mode: teach one new move (forget flow when the moveset is full). */
  private async teach(moveId: string): Promise<void> {
    const mon = this.d.mon
    if (knowsMove(mon, moveId)) return
    const name = mon.nickname ?? getSpecies(mon.speciesId).name
    const mv = getMove(moveId).name
    this.phase = 'learn'
    if (mon.moves.length < 4) {
      learnMove(mon, moveId)
      audio.sfx('item_get')
      await this.say(`${name} learned ${mv}!`)
      return
    }
    await this.say(`${name} wants to learn ${mv}!`)
    await this.say(`But ${name} already knows four moves.`)
    const slot = await askForgetMove(this.learnHost(), mon, moveId)
    if (slot === null) {
      await this.say(`${name} did not learn ${mv}.`)
      return
    }
    const forgot = mon.moves[slot]?.id
    learnMove(mon, moveId, slot)
    await this.say('1, 2 and... Poof!')
    if (forgot) await this.say(`${name} forgot ${getMove(forgot).name}.`)
    audio.sfx('item_get')
    await this.say(`And ${name} learned ${mv}!`)
  }

  private learnHost(): LearnHost {
    return {
      scene: this, stack: this.stack, box: this.box,
      fade: (to) => this.fade(to, 140),
      setFader: (a) => this.fader.setAlpha(a),
      setPhase: (p) => (this.phase = p),
    }
  }

  /** Battle mode: play the core's events for this evolution (texts, dex, learn prompts). */
  private async playEvents(events: BattleEvent[]): Promise<void> {
    const host = this.d.host!
    let pendingDex: string | null = null
    for (const e of events) {
      switch (e.type) {
        case 'evolve_done':
          audio.sfx('key_item_get')
          break
        case 'dex_register':
          pendingDex = e.speciesId
          break
        case 'text':
          if (/wants to learn|already knows|learned|forgot|did not learn/.test(e.text)) this.phase = 'learn'
          await this.say(e.text)
          if (pendingDex && /^Congratulations/.test(e.text)) {
            await this.dexLine(pendingDex)
            pendingDex = null
          }
          break
        case 'move_learned':
          audio.sfx('item_get')
          break
        case 'learn_move_prompt': {
          this.phase = 'learn'
          const slot = await askForgetMove(this.learnHost(), this.d.mon, e.moveId)
          await this.playEvents(host.learn(slot))
          break
        }
        default:
          break
      }
    }
    if (pendingDex) await this.dexLine(pendingDex)
  }

  private done(evolved: boolean): void {
    const w = window as unknown as { __llmmon?: Record<string, unknown> }
    if (w.__llmmon) delete w.__llmmon.evolutionInfo
    const cb = this.d.onDone
    this.scene.stop()
    cb(evolved)
  }
}
