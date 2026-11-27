// Battle scene (BATTLE-UI). Presents the pure BATTLE-CORE engine (src/game/battle/core)
// with GBA-style choreography. Contract (plan §4.6):
//   scene.launch('Battle', { request, onDone })
// The core mutates state.party / state.bag in place; this scene adds prize money and
// caught mons, records seen/caught, fades itself out and then calls onDone(result).
// Layout/timings: src/game/battle/ui/constants.ts. Docs: docs/BATTLE_UI.md.

import Phaser from 'phaser'
import { H, W } from '../config'
import { controls } from '../controls'
import { audio } from '../audio'
import { params } from '../params'
import { rng } from '../rng'
import { state } from '../state'
import type { BattleRequest, BattleResult, MonInstance } from '../types'
import { DialogBox } from '../ui/DialogBox'
import { Window } from '../ui/Window'
import { WidgetStack } from '../ui/WidgetStack'
import { assetUrl } from '../assets'
import { choice } from '../ui/ListMenu'
import { PartyScreen } from '../ui/screens/PartyScreen'
import { BagScreen } from '../ui/screens/BagScreen'
import { NameEntryScreen } from '../ui/screens/NameEntryScreen'
import { Battle, getItem, getMove, getSpecies, type BattleEvent, type BattleInput, type Side } from '../battle/core'
import { DEPTH, LAYOUT, TIMING } from '../battle/ui/constants'
import { Stage, type PipState } from '../battle/ui/Stage'
import { playMoveAnim } from '../battle/ui/anims'
import { ForgetMoveScreen, commandMenu, levelUpWindow, moveMenu, type MoveInfo } from '../battle/ui/menus'
import { ensureFxTextures, holdSkippable, tween, wait } from '../battle/ui/util'

export interface BattleSceneData {
  request: BattleRequest
  onDone: (r: BattleResult) => void
}

type TextMode = 'auto' | 'wait' | 'held'

/** Lines a GBA battle stops on (A to continue). Everything else auto-advances after a hold. */
const WAIT_LINES = [
  /appeared!$/, /would like to battle!$/, /^.+ learned .+!$/, /did not learn/, /^Gotcha!/,
  /tokens for winning!$/, /^You defeated/, /Got away safely!$/, /out of LLMMON/, /hurried back/,
  /wants to learn/, /already knows four moves/, /PromptDex/, /^Can't escape!$/,
]

export class BattleScene extends Phaser.Scene {
  private req!: BattleRequest
  private onDone!: (r: BattleResult) => void
  private stack = new WidgetStack()
  private stage!: Stage
  private box!: DialogBox
  private fader!: Phaser.GameObjects.Rectangle
  private battle!: Battle
  private active: Record<Side, number> = { player: 0, enemy: 0 }
  private cmdCursor = 0
  private moveCursor = new Map<string, number>()
  private pendingHold = 0
  private holdFrom = 0
  private lowHpOn = false
  private outcome: BattleResult['outcome'] | null = null
  private pendingLevel: Extract<BattleEvent, { type: 'level_up' }> | null = null
  private nextTextMode: TextMode | null = null
  private firstText = true
  /** After the defeated trainer reappears every line waits for A. */
  private trainerTalk = false
  private enemySentOut = false
  private victoryStarted = false
  private wasCaughtBefore = false
  private phase = 'intro'
  private ended = false

  constructor() {
    super({ key: 'Battle' })
  }

  init(d: BattleSceneData): void {
    this.req = d.request
    this.onDone = d.onDone
    this.stack = new WidgetStack()
    this.active = { player: 0, enemy: 0 }
    this.cmdCursor = 0
    this.moveCursor = new Map()
    this.pendingHold = 0
    this.lowHpOn = false
    this.outcome = null
    this.pendingLevel = null
    this.nextTextMode = null
    this.firstText = true
    this.trainerTalk = false
    this.enemySentOut = false
    this.victoryStarted = false
    this.phase = 'intro'
    this.ended = false
  }

  /** Lazily load art the boot manifest doesn't list (e.g. a new trainer sprite like battle/rival_front). */
  preload(): void {
    const sprite = this.req.trainer?.sprite
    if (!sprite) return
    const key = sprite.includes('/') ? sprite : `battle/${sprite}`
    if (!this.textures.exists(key)) this.load.image(key, assetUrl(key))
  }

  create(): void {
    ensureFxTextures(this)
    this.cameras.main.setBackgroundColor(0x000000)
    this.cameras.main.setScroll(0, 0)
    this.stage = new Stage(this)
    new Window(this, LAYOUT.box.x, LAYOUT.box.y, LAYOUT.box.w, LAYOUT.box.h, 'ui/frame_battle').setDepth(DEPTH.frame)
    this.box = new DialogBox(this, this.stack, { ...LAYOUT.box, frame: 'ui/frame_battle', depth: DEPTH.box })
    this.fader = this.add.rectangle(0, 0, W, H, 0x000000).setOrigin(0, 0).setDepth(DEPTH.fader).setAlpha(params.fast ? 0 : 1)
    this.battle = new Battle({ request: this.req, party: state.party, bag: state.bag, rng: { next: () => rng() } })
    const enemy0 = this.req.enemyParty[0]
    this.wasCaughtBefore = !!enemy0 && state.caught.includes(enemy0.speciesId)
    this.installDebug()
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      audio.stopSfx('low_hp')
      audio.stopSfx('exp')
    })
    void this.run().catch((err: unknown) => {
      console.error('[battle] crashed', err)
      void this.finish({ outcome: 'run' })
    })
  }

  update(): void {
    controls.each(() => {
      this.stack.update()
      // Battle chatter types 1.5x faster than field dialogue (an extra typewriter tick every other frame).
      this.tickN++
      if (this.tickN % 2 === 0 && (this.box as unknown as { phase: string }).phase === 'typing') this.box.tick()
      this.stage.tick()
    })
  }

  private tickN = 0

  /** "What will X do?" appears at once (it is a prompt, not news). */
  private async prompt(text: string): Promise<void> {
    const p = this.box.say(text, { keepOpen: true, silent: true })
    ;(this.box as unknown as { revealAll(): void }).revealAll()
    await p
  }

  private installDebug(): void {
    if (!params.debug) return
    const w = window as unknown as { __llmmon?: Record<string, unknown> }
    if (!w.__llmmon) return
    w.__llmmon.battleInfo = () => ({
      phase: this.phase,
      text: this.box.currentText,
      busy: this.box.isBusy,
      /** DialogBox phase: typing / waiting (for A) / held / idle. */
      box: (this.box as unknown as { phase: string }).phase,
      prompt: this.battle.getPrompt().kind,
      outcome: this.outcome,
      view: this.battle.getView(),
    })
  }

  // ================================================================ flow

  private async run(): Promise<void> {
    await this.play(this.battle.start())
    for (;;) {
      const prompt = this.battle.getPrompt()
      if (prompt.kind === 'end') break
      let input: BattleInput | null
      if (prompt.kind === 'switch') {
        await this.flushText()
        input = { type: 'switch', partyIndex: await this.pickParty('Choose a LLMMON to send out.', false) }
      } else {
        input = await this.chooseAction()
      }
      if (!input) continue
      const why = this.battle.validate(input)
      if (why) {
        this.stage.setBob(false)
        await this.text(why, 'wait')
        continue
      }
      this.stage.setBob(false)
      this.phase = 'playback'
      await this.play(this.battle.submit(input))
    }
    await this.end()
  }

  private async chooseAction(): Promise<BattleInput | null> {
    const v = this.battle.getView()
    await this.flushText()
    this.updateLowHp()
    await this.prompt(`What will\n${v.player.name} do?`)
    this.stage.setBob(true)
    for (;;) {
      this.phase = 'command'
      const c = await commandMenu(this, this.stack, this.cmdCursor)
      this.cmdCursor = c
      if (c === 0) {
        if (this.battle.mustStruggle()) return { type: 'fight', moveIndex: 0 }
        this.phase = 'moves'
        const key = v.player.uid
        const mi = await moveMenu(this, this.stack, v.player.moves, this.moveCursor.get(key) ?? 0)
        if (mi < 0) continue
        this.moveCursor.set(key, mi)
        return { type: 'fight', moveIndex: mi }
      }
      if (c === 1) {
        const r = await this.bagFlow()
        if (r) return r
        await this.prompt(`What will\n${v.player.name} do?`)
        continue
      }
      if (c === 2) {
        const i = await this.pickParty('Choose a LLMMON.', true)
        if (i < 0) continue
        return { type: 'switch', partyIndex: i }
      }
      return { type: 'run' }
    }
  }

  // ---------------------------------------------------------------- party / bag

  private async fade(to: 0 | 1, dur = TIMING.screenFade): Promise<void> {
    await tween(this, this.fader, dur, { alpha: to })
    this.fader.setAlpha(to)
  }

  /** Party screen on our own stack. Refusals are shown in its message line and it reopens. */
  private async pickParty(prompt: string, canCancel: boolean): Promise<number> {
    this.phase = 'party'
    await this.fade(1)
    let msg = prompt
    for (;;) {
      const screen = new PartyScreen(this, this.stack, { mode: 'choose', prompt: msg })
      const p = screen.run()
      await this.fade(0)
      const i = await p
      if (i < 0) {
        if (!canCancel) {
          this.fader.setAlpha(1)
          msg = prompt
          continue
        }
        this.fader.setAlpha(1)
        await this.fade(0)
        return -1
      }
      const why = this.battle.validate({ type: 'switch', partyIndex: i })
      this.fader.setAlpha(1)
      if (why) {
        audio.sfx('bump')
        msg = why
        continue
      }
      await this.fade(0)
      return i
    }
  }

  private async bagFlow(): Promise<BattleInput | null> {
    this.phase = 'bag'
    await this.fade(1)
    for (;;) {
      const bag = new BagScreen(this, this.stack, { mode: 'choose', filter: (id) => safeItem(id)?.usableInBattle === true })
      const p = bag.run()
      await this.fade(0)
      const id = await p
      this.fader.setAlpha(1)
      if (!id) {
        await this.fade(0)
        return null
      }
      const item = getItem(id)
      if (item.effect.kind === 'catch') {
        await this.fade(0)
        return { type: 'item', itemId: id }
      }
      this.phase = 'bag-party'
      const party = new PartyScreen(this, this.stack, { mode: 'choose', prompt: `Use ${item.name} on which LLMMON?` })
      const pp = party.run()
      await this.fade(0)
      const t = await pp
      this.fader.setAlpha(1)
      this.phase = 'bag'
      if (t < 0) continue
      await this.fade(0)
      return { type: 'item', itemId: id, target: t }
    }
  }

  // ================================================================ text

  private classify(text: string, next: BattleEvent | undefined): TextMode {
    if (this.nextTextMode) {
      const m = this.nextTextMode
      this.nextTextMode = null
      return m
    }
    if (this.firstText) {
      this.firstText = false
      return 'wait'
    }
    if (this.trainerTalk) return 'wait'
    if (/grew to Lv/.test(text)) return this.pendingLevel ? 'held' : 'wait'
    if (next?.type === 'battle_end') return 'wait'
    if (next?.type === 'learn_move_prompt') return 'held'
    return WAIT_LINES.some((r) => r.test(text)) ? 'wait' : 'auto'
  }

  /** Make sure the previous auto line has been readable for its hold (A skips). */
  private async flushText(): Promise<void> {
    if (this.pendingHold <= 0) return
    const left = this.pendingHold - (this.time.now - this.holdFrom)
    this.pendingHold = 0
    if (left > 0) await holdSkippable(this, left)
  }

  private async text(text: string, mode: TextMode, keepPhase = false): Promise<void> {
    await this.flushText()
    if (!keepPhase) this.phase = mode === 'wait' ? 'text-wait' : 'text'
    if (mode === 'wait') {
      await this.box.say(text)
      return
    }
    await this.box.say(text, { keepOpen: true })
    if (mode === 'auto') {
      this.pendingHold = /fainted!$|super effective|not very effective|critical hit/.test(text) ? TIMING.textHold + 250 : TIMING.textHold
      this.holdFrom = this.time.now
    }
  }

  // ================================================================ playback

  private async play(events: BattleEvent[]): Promise<void> {
    events = [...events]
    // The defeated trainer slides back in *before* "You defeated X!" (core emits the text first).
    for (let i = 0; i + 1 < events.length; i++) {
      if (events[i].type === 'text' && events[i + 1].type === 'trainer_reappear') [events[i], events[i + 1]] = [events[i + 1], events[i]]
    }
    for (let i = 0; i < events.length; i++) {
      const e = events[i]
      if (e.type === 'learn_move_prompt') {
        const slot = await this.askForget(e.partyIndex, e.moveId)
        await this.play(this.battle.submit({ type: 'learn_move', forgetSlot: slot }))
        continue
      }
      if (e.type === 'text') {
        // Sync text with action: the move animation / faint drop / orb throw starts as
        // its line begins typing, not after it has been read.
        let j = i + 1
        while (events[j]?.type === 'move_used') j++
        const act = events[j]
        const mode = this.peekMode(e.text, events[i + 1])
        if (act && mode === 'auto' && (act.type === 'move_anim' || act.type === 'faint' || act.type === 'catch_throw' || act.type === 'send_out')) {
          await this.flushText()
          await Promise.all([
            this.text(e.text, mode, true),
            this.present(act, events[j + 1], events.slice(j + 1)),
          ])
          i = j
          continue
        }
      }
      await this.present(e, events[i + 1], events.slice(i + 1))
    }
  }

  /** classify() without consuming one-shot overrides (for look-ahead). */
  private peekMode(text: string, next: BattleEvent | undefined): TextMode {
    if (this.nextTextMode || this.firstText || this.trainerTalk) return 'wait'
    return this.classify(text, next)
  }

  private async present(e: BattleEvent, next: BattleEvent | undefined, rest: BattleEvent[]): Promise<void> {
    const st = this.stage
    switch (e.type) {
      case 'text': {
        await this.text(e.text, this.classify(e.text, next))
        if (this.pendingLevel && /grew to Lv/.test(e.text)) {
          const lv = this.pendingLevel
          this.pendingLevel = null
          this.phase = 'levelup'
          await levelUpWindow(this, this.stack, lv.statsBefore, lv.statsAfter)
        }
        return
      }
      case 'battle_start': {
        this.phase = 'intro'
        const isTrainer = e.kind === 'trainer' && !!e.trainerSprite
        const slide = st.introSlide(e.kind, e.enemy.speciesId, e.trainerSprite)
        const fadeIn = params.fast ? Promise.resolve() : this.fade(0, TIMING.fadeIn)
        await Promise.all([slide, fadeIn])
        this.fader.setAlpha(0)
        if (isTrainer) {
          st.showPips('enemy', this.req.enemyParty.map((m) => pipOf(m.hp, m.status)))
          st.showPips('player', state.party.map((m) => pipOf(m.hp, m.status)))
          await st.slidePipsIn()
        }
        return
      }
      case 'send_out': {
        this.active[e.side] = e.partyIndex
        const hud = st.hud[e.side]
        if (e.side === 'enemy') {
          state.markSeen(e.mon.speciesId)
          if (!e.fromOrb) {
            await st.litUp()
          } else {
            if (this.enemySentOut && this.req.kind === 'trainer') {
              // the trainer's remaining team: fallen mons show as greyed pips
              st.showPips('enemy', this.req.enemyParty.map((m) => pipOf(m.hp, m.status)))
              await st.slidePipsIn(['enemy'])
              await wait(this, 450)
            }
            void st.hidePips('enemy')
            await wait(this, 100)
            await st.enemySendOut(e.mon.speciesId)
          }
          this.enemySentOut = true
          hud.setMon(e.mon)
          await hud.slideIn()
        } else {
          await wait(this, 120)
          void st.hidePips('player')
          await st.playerSendOut(e.mon.speciesId, st.playerTrainer.visible)
          hud.setMon(e.mon, this.expFrac(e.partyIndex))
          await hud.slideIn()
          this.updateLowHp()
        }
        st.setHallucinating(e.side, false)
        return
      }
      case 'withdraw': {
        audio.stopSfx('low_hp')
        this.lowHpOn = false
        await Promise.all([st.withdraw(e.side), st.hud[e.side].slideOut()])
        await wait(this, 100)
        return
      }
      case 'move_used':
        return
      case 'move_anim': {
        await Promise.all([wait(this, 120), st.cryDone()])
        this.phase = 'anim'
        await playMoveAnim(this, st, e)
        return
      }
      case 'miss': {
        const m = st.mon[e.targetSide]
        const x0 = m.x
        const dx = e.targetSide === 'enemy' ? 10 : -10
        if (e.targetSide === 'player') st.playerResting = false
        await tween(this, m, 120, { x: x0 + dx, ease: 'Quad.Out' })
        await tween(this, m, 160, { x: x0, ease: 'Quad.In' })
        if (e.targetSide === 'player') st.playerResting = true
        return
      }
      case 'damage': {
        this.phase = 'damage'
        if (e.source === 'status') await st.statusAnim(e.side, 'context_rot')
        else if (e.source === 'hallucination') await playMoveAnim(this, st, { side: e.side, moveId: '_self_hit', anim: 'glitch', moveType: 'glitch', targetSelf: true })
        await st.hit(e.side, e.source === 'move' ? e.effectiveness : 1, e.crit)
        await st.hud[e.side].animateHp(e.hpBefore, e.hpAfter, e.maxHp)
        if (e.side === 'player') this.updateLowHp()
        return
      }
      case 'heal': {
        if (e.partyIndex !== this.active[e.side]) return
        audio.sfx('stat_up')
        await Promise.all([st.healGlow(e.side), st.hud[e.side].animateHp(e.hpBefore, e.hpAfter, e.maxHp)])
        if (e.side === 'player') this.updateLowHp()
        return
      }
      case 'status_applied': {
        if (e.partyIndex !== this.active[e.side]) return
        if (e.status === 'hallucinating') st.setHallucinating(e.side, true)
        else st.hud[e.side].setStatus(e.status)
        await st.statusAnim(e.side, e.status)
        return
      }
      case 'status_cured': {
        if (e.partyIndex !== this.active[e.side]) return
        if (e.status === 'hallucinating') st.setHallucinating(e.side, false)
        else st.hud[e.side].setStatus('none')
        return
      }
      case 'cant_move':
        await st.statusAnim(e.side, e.reason)
        return
      case 'stat_change':
        if (e.delta !== 0) await st.statChange(e.side, e.delta > 0)
        return
      case 'faint': {
        this.phase = 'faint'
        const lastEnemy = e.side === 'enemy' && rest.some((x) => x.type === 'battle_end' && x.outcome === 'win')
        if (lastEnemy && !this.victoryStarted) {
          this.victoryStarted = true
          audio.playMusic('victory', { fadeMs: 0 })
        }
        if (e.side === 'player') {
          audio.stopSfx('low_hp')
          this.lowHpOn = false
        }
        if (e.fled) await Promise.all([st.flee(e.side), wait(this, 200).then(() => st.hud[e.side].slideOut())])
        else await Promise.all([st.faint(e.side), wait(this, 120).then(() => st.hud[e.side].slideOut())])
        await st.cryDone()
        return
      }
      case 'exp_gain': {
        if (e.partyIndex !== this.active.player || !st.hud.player.shown) return
        this.phase = 'exp'
        const span = Math.max(1, e.levelEnd - e.levelStart)
        const from = (e.expFrom - e.levelStart) / span
        const to = (e.expTo - e.levelStart) / span
        st.hud.player.setExp(from)
        await st.hud.player.animateExp(from, to)
        return
      }
      case 'level_up': {
        if (e.partyIndex !== this.active.player) return
        const hud = st.hud.player
        audio.sfx('level_up')
        hud.flash()
        hud.setLevel(e.level)
        hud.setHp(Math.min(e.statsAfter.hp, hud.hp + e.deltas.hp), e.statsAfter.hp)
        hud.setExp(0)
        this.pendingLevel = e
        await this.levelFlash()
        return
      }
      case 'move_learned':
        audio.sfx('item_get')
        return
      case 'move_not_learned':
      case 'item_used':
        return
      case 'catch_throw':
        await Promise.all([wait(this, 100), st.cryDone()])
        this.phase = 'catch'
        await st.catchThrow()
        return
      case 'catch_shake':
        await st.catchShake()
        return
      case 'catch_result': {
        const sp = this.req.enemyParty[this.active.enemy]?.speciesId ?? ''
        await st.catchResult(e.caught, sp)
        if (e.caught) {
          this.victoryStarted = true
          audio.playMusic('victory', { fadeMs: 0 })
        } else {
          this.nextTextMode = 'wait'
        }
        return
      }
      case 'run_attempt':
        if (e.success) audio.sfx('run')
        return
      case 'trainer_reappear':
        this.trainerTalk = true
        await st.trainerReappear(e.trainerSprite)
        return
      case 'battle_end':
        this.outcome = e.outcome
        if (e.outcome === 'caught' && e.caught) await this.askNickname(e.caught)
        if (e.outcome === 'caught' && e.caught && !this.wasCaughtBefore) {
          audio.sfx('dex_register')
          await this.text(`${getSpecies(e.caught.speciesId).name}'s data was added to the PromptDex.`, 'wait')
        }
        if (e.outcome === 'caught' && e.caught && state.party.length >= 6) {
          // finish() hands it to state.addMon, which stores it in state.box when the party is full
          await this.text(`${e.caught.nickname ?? getSpecies(e.caught.speciesId).name} was sent to storage.`, 'wait')
        }
        return
    }
  }

  /** "Give a nickname to the caught X?" YES/NO → NameEntryScreen. Empty / unchanged = no nickname. */
  private async askNickname(mon: MonInstance): Promise<void> {
    const species = getSpecies(mon.speciesId).name
    await this.flushText()
    await this.box.say(`Give a nickname to the caught ${species}?`, { keepOpen: true })
    this.phase = 'nickname-yesno'
    const yes = (await choice(this, this.stack, ['YES', 'NO'], { x: 238, y: 110, anchor: 'br', depth: DEPTH.menu, cancelIndex: 1 })) === 0
    if (!yes) return
    this.phase = 'nickname'
    await this.fade(1)
    const scr = new NameEntryScreen(this, this.stack, { title: `${species}'s nickname?`, initial: '', max: 10, icon: `mons/${mon.speciesId}_icon` })
    const p = scr.run()
    await this.fade(0)
    const name = (await p).trim()
    this.fader.setAlpha(1)
    await this.fade(0)
    if (name && name !== species) mon.nickname = name
  }

  private async levelFlash(): Promise<void> {
    const hud = this.stage.hud.player
    const g = this.add.graphics().setDepth(DEPTH.hud + 1)
    await tween(this, { k: 0 }, 300, {
      k: 1,
      onUpdate: (tw: Phaser.Tweens.Tween) => {
        const k = tw.progress
        g.clear()
        g.fillStyle(0xfcf6d0, 0.7 * Math.sin(k * Math.PI))
        g.fillRect(hud.root.x + 2, hud.root.y + 2, 100, 36)
      },
    })
    g.destroy()
  }

  private expFrac(partyIndex: number): number {
    const v = this.battle.getView()
    if (v.player.partyIndex !== partyIndex) return 0
    const span = Math.max(1, v.player.expLevelEnd - v.player.expLevelStart)
    return (v.player.exp - v.player.expLevelStart) / span
  }

  private updateLowHp(): void {
    const hud = this.stage.hud.player
    const low = hud.shown && hud.lowHp && !this.ended
    if (low === this.lowHpOn) return
    this.lowHpOn = low
    if (low) audio.sfxLoop('low_hp')
    else audio.stopSfx('low_hp')
  }

  // ================================================================ learn move

  private async askForget(partyIndex: number, moveId: string): Promise<number | null> {
    const mon = state.party[partyIndex]
    const name = mon.nickname ?? getSpecies(mon.speciesId).name
    const moveName = getMove(moveId).name
    for (;;) {
      await this.box.say(`Forget a move to make room for ${moveName}?`, { keepOpen: true })
      this.phase = 'learn-yesno'
      const yes = (await choice(this, this.stack, ['YES', 'NO'], { x: 238, y: 110, anchor: 'br', depth: DEPTH.menu, cancelIndex: 1 })) === 0
      if (yes) {
        await this.box.say('Which move should be forgotten?', { keepOpen: true })
        this.phase = 'learn-pick'
        await this.fade(1)
        const infos: MoveInfo[] = [...mon.moves.map((m) => moveInfo(m.id, m.pp)), moveInfo(moveId)]
        const scr = new ForgetMoveScreen(this, this.stack, infos, name)
        const p = scr.result()
        await this.fade(0)
        const slot = await p
        this.fader.setAlpha(1)
        await this.fade(0)
        if (slot >= 0 && slot < 4) return slot
      }
      await this.box.say(`Stop learning ${moveName}?`, { keepOpen: true })
      this.phase = 'learn-stop'
      const stop = (await choice(this, this.stack, ['YES', 'NO'], { x: 238, y: 110, anchor: 'br', depth: DEPTH.menu, cancelIndex: 1 })) === 0
      if (stop) return null
    }
  }

  // ================================================================ end

  private async end(): Promise<void> {
    await this.flushText()
    const result = this.battle.result ?? { outcome: this.outcome ?? 'run' }
    await this.finish(result)
  }

  private async finish(result: BattleResult): Promise<void> {
    if (this.ended) return
    this.ended = true
    this.phase = 'end'
    audio.stopSfx('low_hp')
    audio.stopSfx('exp')
    if (result.outcome === 'run' || result.outcome === 'lose') audio.stopMusic(TIMING.fadeOut)
    await this.fade(1, TIMING.fadeOut)
    if (result.prize) state.addMoney(result.prize)
    if (result.caught) {
      state.markSeen(result.caught.speciesId)
      state.markCaught(result.caught.speciesId)
      state.addMon(result.caught)
    }
    this.stage.clearCatchOrb()
    const w = window as unknown as { __llmmon?: Record<string, unknown> }
    if (w.__llmmon) delete w.__llmmon.battleInfo
    this.onDone(result)
    this.scene.stop()
  }
}

function pipOf(hp: number, status: string): PipState {
  if (hp <= 0) return 'fainted'
  return status && status !== 'none' ? 'status' : 'ok'
}

function safeItem(id: string): ReturnType<typeof getItem> | null {
  try {
    return getItem(id)
  } catch {
    return null
  }
}

function moveInfo(id: string, pp?: number): MoveInfo {
  const m = getMove(id)
  return {
    id, name: m.name, type: m.type, category: m.category, power: m.power, accuracy: m.accuracy,
    pp: pp ?? m.pp, maxPp: m.pp, description: m.description,
  }
}
