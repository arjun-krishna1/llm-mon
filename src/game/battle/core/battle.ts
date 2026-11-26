// The battle engine. Pure and deterministic given its Rng.
//
//   const battle = new Battle({ request, party: state.party, bag: state.bag, rng })
//   play(battle.start())
//   while (battle.getPrompt().kind !== 'end') play(battle.submit(input))
//
// The engine MUTATES the `party` mons (hp, status, pp, exp, level, moves) and the
// `bag` counts you pass in, so the game state is already up to date when the
// battle ends. See docs/BATTLE_API.md.

import type { BattleRequest, BattleResult, MonInstance, Stats } from '../../types.ts'
import { getItem, getMove, getSpecies } from '../../data/index.ts'
import { STRUGGLE_ID, type MoveDef, type StageStat } from '../../data/moves.ts'
import { STATUSES, isMajorStatus, type AnyStatusId, type MajorStatusId } from '../../data/statuses.ts'
import { effectiveness, effectivenessText } from '../../data/typechart.ts'
import { chooseEnemyMove, type AiMoveOption } from './ai.ts'
import type { ActiveView, BattleEvent, BattleInput, BattlePrompt, DamageSource, MonView, MoveView, Side } from './events.ts'
import {
  CRIT_CHANCE,
  HIGH_CRIT_CHANCE,
  catchOdds,
  computeDamage,
  escapeChance,
  expYield,
  rollCatch,
  rollDamageRandom,
} from './formulas.ts'
import { addExp, calcStats, displayName, expProgress, learnMove } from './mon.ts'
import { chance, randRange, type Rng } from './rng.ts'
import { MAX_LEVEL, MAX_STAGE, MIN_STAGE, STAT_NAMES, accuracyStageMultiplier, expForLevel, stageMultiplier } from './stats.ts'

export interface BattleOptions {
  request: BattleRequest
  /** The player's party. Mutated in place. Must contain at least one mon with HP > 0. */
  party: MonInstance[]
  /** The player's bag (itemId -> count). Mutated in place. Default: empty. */
  bag?: Record<string, number>
  rng: Rng
}

export interface BattleView {
  kind: BattleRequest['kind']
  turn: number
  prompt: BattlePrompt
  player: ActiveView
  enemy: ActiveView
  playerParty: MonView[]
  /** Enemy party size and how many are still standing (for trainer orb pips). */
  enemyPartySize: number
  enemyRemaining: number
  canRun: boolean
  canCatch: boolean
}

interface Combatant {
  side: Side
  party: MonInstance[]
  active: number
  stages: Record<StageStat, number>
  hallucinatingTurns: number
}

interface PendingLearn {
  promptId: number
  partyIndex: number
  moveId: string
}

type BasePrompt = { kind: 'action' } | { kind: 'switch'; forced: true } | { kind: 'end'; result: BattleResult }

interface PlannedMove {
  side: Side
  /** -1 = struggle */
  slot: number
}

const ZERO_STAGES = (): Record<StageStat, number> => ({ atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0 })

export function monView(mon: MonInstance): MonView {
  return {
    uid: mon.uid,
    speciesId: mon.speciesId,
    name: displayName(mon),
    level: mon.level,
    hp: mon.hp,
    maxHp: calcStats(mon).hp,
    status: mon.status,
    types: [...getSpecies(mon.speciesId).types],
  }
}

export function moveView(slot: { id: string; pp: number }): MoveView {
  const mv = getMove(slot.id)
  return { id: mv.id, name: mv.name, type: mv.type, category: mv.category, power: mv.power, accuracy: mv.accuracy, pp: slot.pp, maxPp: mv.pp }
}

export class Battle {
  readonly request: BattleRequest
  private readonly rng: Rng
  private readonly bag: Record<string, number>
  private readonly player: Combatant
  private readonly enemy: Combatant
  private base: BasePrompt = { kind: 'action' }
  private learnQueue: PendingLearn[] = []
  private nextPromptId = 1
  private readonly sleepTurns = new Map<string, number>()
  private readonly participants = new Map<number, Set<number>>()
  private readonly faintHandled = new Set<string>()
  private runAttempts = 0
  private started = false
  private out: BattleEvent[] = []
  /** Number of completed action turns. */
  turn = 0

  constructor(opts: BattleOptions) {
    this.request = opts.request
    this.rng = opts.rng
    this.bag = opts.bag ?? {}
    if (opts.request.enemyParty.length === 0) throw new Error('Battle needs at least one enemy mon')
    const lead = opts.party.findIndex((m) => m.hp > 0)
    if (lead < 0) throw new Error('Battle needs at least one player mon with HP > 0')
    this.player = { side: 'player', party: opts.party, active: lead, stages: ZERO_STAGES(), hallucinatingTurns: 0 }
    const enemyLead = opts.request.enemyParty.findIndex((m) => m.hp > 0)
    this.enemy = { side: 'enemy', party: opts.request.enemyParty, active: Math.max(0, enemyLead), stages: ZERO_STAGES(), hallucinatingTurns: 0 }
  }

  // ── public API ──────────────────────────────────────────────────────────

  /** Intro events (appear / send-outs). Call once, before any submit. */
  start(): BattleEvent[] {
    if (this.started) throw new Error('Battle already started')
    this.started = true
    this.out = []
    const req = this.request
    const enemyMon = this.activeMon(this.enemy)
    const trainer = req.kind === 'trainer' ? req.trainer : undefined
    this.emit({ type: 'battle_start', kind: req.kind, enemy: monView(enemyMon), trainerName: trainer?.name, trainerSprite: trainer?.sprite })
    if (trainer) {
      this.say(req.introText ?? `${trainer.name} would like to battle!`)
      this.say(`${trainer.name} sent out ${displayName(enemyMon)}!`)
      this.emit({ type: 'send_out', side: 'enemy', partyIndex: this.enemy.active, mon: monView(enemyMon), fromOrb: true })
    } else {
      this.emit({ type: 'send_out', side: 'enemy', partyIndex: this.enemy.active, mon: monView(enemyMon), fromOrb: false })
      this.say(req.introText ?? `A wild ${displayName(enemyMon)} appeared!`)
    }
    const playerMon = this.activeMon(this.player)
    this.say(`Go! ${displayName(playerMon)}!`)
    this.emit({ type: 'send_out', side: 'player', partyIndex: this.player.active, mon: monView(playerMon), fromOrb: true })
    this.markParticipant()
    return this.flush()
  }

  /** What input the battle is waiting for right now. */
  getPrompt(): BattlePrompt {
    const head = this.learnQueue[0]
    if (head) {
      const mon = this.player.party[head.partyIndex]
      return { kind: 'learn_move', promptId: head.promptId, partyIndex: head.partyIndex, moveId: head.moveId, currentMoves: mon.moves.map((m) => m.id) }
    }
    return this.base
  }

  /** Final result once the prompt kind is 'end', else null. */
  get result(): BattleResult | null {
    return this.base.kind === 'end' ? this.base.result : null
  }

  /** True when every move is at 0 PP: any `fight` input will use Retry Loop (Struggle). */
  mustStruggle(): boolean {
    return this.activeMon(this.player).moves.every((m) => m.pp <= 0)
  }

  /**
   * Null when `input` is acceptable now; otherwise a player-facing reason
   * ("There's no PP left for this move!") the UI can show without submitting.
   */
  validate(input: BattleInput): string | null {
    if (!this.started) return 'Battle not started.'
    const prompt = this.getPrompt()
    if (prompt.kind === 'end') return 'The battle is over.'
    if (prompt.kind === 'learn_move') {
      if (input.type !== 'learn_move') return 'Answer the move-learning prompt first.'
      const mon = this.player.party[prompt.partyIndex]
      if (input.forgetSlot !== null && (input.forgetSlot < 0 || input.forgetSlot >= mon.moves.length)) return 'Pick a move to forget.'
      return null
    }
    if (input.type === 'learn_move') return 'Nothing to learn right now.'
    if (prompt.kind === 'switch') {
      if (input.type !== 'switch') return 'Choose an LLMMON to send out.'
      return this.validateSwitchTarget(input.partyIndex)
    }
    const active = this.activeMon(this.player)
    switch (input.type) {
      case 'fight': {
        if (input.moveIndex < 0 || input.moveIndex >= active.moves.length) return 'Pick a move.'
        if (this.mustStruggle()) return null
        if (active.moves[input.moveIndex].pp <= 0) return "There's no PP left for this move!"
        return null
      }
      case 'switch':
        return this.validateSwitchTarget(input.partyIndex)
      case 'run':
        if (this.request.kind === 'trainer') return "No! There's no running from a trainer battle!"
        if (!this.request.canRun) return "You can't run from this battle!"
        return null
      case 'item':
        return this.validateItem(input.itemId, input.target)
    }
  }

  /** Apply an input; returns the ordered events to play back. Throws if `validate` fails. */
  submit(input: BattleInput): BattleEvent[] {
    const err = this.validate(input)
    if (err) throw new Error(`Invalid battle input (${JSON.stringify(input)}): ${err}`)
    this.out = []
    if (input.type === 'learn_move') {
      this.resolveLearn(input.forgetSlot)
      return this.flush()
    }
    if (this.base.kind === 'switch') {
      if (input.type === 'switch') this.switchIn(this.player, input.partyIndex, false)
      this.base = { kind: 'action' }
      return this.flush()
    }
    this.runTurn(input)
    return this.flush()
  }

  /** Rendering snapshot (copied data). */
  getView(): BattleView {
    const remaining = this.enemy.party.filter((m) => m.hp > 0).length
    return {
      kind: this.request.kind,
      turn: this.turn,
      prompt: this.getPrompt(),
      player: this.activeView(this.player),
      enemy: this.activeView(this.enemy),
      playerParty: this.player.party.map(monView),
      enemyPartySize: this.enemy.party.length,
      enemyRemaining: remaining,
      canRun: this.request.kind !== 'trainer' && this.request.canRun,
      canCatch: this.request.kind !== 'trainer' && this.request.canCatch,
    }
  }

  // ── turn flow ───────────────────────────────────────────────────────────

  private runTurn(input: Exclude<BattleInput, { type: 'learn_move' }>): void {
    this.turn++
    const enemySlot = this.chooseEnemySlot()

    if (input.type === 'run') {
      const p = this.effectiveSpeed(this.player)
      const e = this.effectiveSpeed(this.enemy)
      const success = chance(this.rng, escapeChance(p, e, this.runAttempts))
      this.runAttempts++
      this.emit({ type: 'run_attempt', success })
      if (success) {
        this.say('Got away safely!')
        this.finish('run')
        return
      }
      this.say("Can't escape!")
    } else if (input.type === 'switch') {
      this.switchIn(this.player, input.partyIndex, true)
    } else if (input.type === 'item') {
      this.useItem(input.itemId, input.target)
      if (this.base.kind === 'end') return
    }

    const plans: PlannedMove[] = []
    if (input.type === 'fight') plans.push({ side: 'player', slot: this.mustStruggle() ? -1 : input.moveIndex })
    plans.push({ side: 'enemy', slot: enemySlot })
    this.orderPlans(plans)

    for (const plan of plans) {
      const actor = this.side(plan.side)
      if (this.activeMon(actor).hp <= 0) continue
      this.executeMove(actor, plan.slot)
      this.processFaints()
      if (this.anySideFainted()) break
    }

    this.endOfTurn()
    this.processFaints()
    this.resolveReplacements()
  }

  private orderPlans(plans: PlannedMove[]): void {
    if (plans.length < 2) return
    const [a, b] = plans
    const pa = this.planPriority(a)
    const pb = this.planPriority(b)
    let aFirst: boolean
    if (pa !== pb) aFirst = pa > pb
    else {
      const sa = this.effectiveSpeed(this.side(a.side))
      const sb = this.effectiveSpeed(this.side(b.side))
      aFirst = sa !== sb ? sa > sb : chance(this.rng, 0.5)
    }
    if (!aFirst) plans.reverse()
  }

  private planPriority(plan: PlannedMove): number {
    const mon = this.activeMon(this.side(plan.side))
    const id = plan.slot < 0 ? STRUGGLE_ID : mon.moves[plan.slot].id
    return getMove(id).priority
  }

  private endOfTurn(): void {
    for (const c of this.speedOrder()) {
      const mon = this.activeMon(c)
      if (mon.hp <= 0) continue
      if (mon.status === 'context_rot') {
        const dmg = Math.max(1, Math.floor(calcStats(mon).hp / 8))
        this.say(`${this.nameOf(c)} is hurt by context rot!`)
        this.applyDamage(c, dmg, 1, false, 'status')
      }
    }
  }

  private speedOrder(): Combatant[] {
    return this.effectiveSpeed(this.player) >= this.effectiveSpeed(this.enemy) ? [this.player, this.enemy] : [this.enemy, this.player]
  }

  private anySideFainted(): boolean {
    return this.activeMon(this.player).hp <= 0 || this.activeMon(this.enemy).hp <= 0
  }

  /** Emit faint events (+ EXP for enemy faints) for newly fainted active mons. */
  private processFaints(): void {
    for (const c of [this.enemy, this.player]) {
      const mon = this.activeMon(c)
      if (mon.hp > 0 || this.faintHandled.has(mon.uid)) continue
      this.faintHandled.add(mon.uid)
      c.hallucinatingTurns = 0
      this.say(`${this.nameOf(c)} fainted!`)
      this.emit({ type: 'faint', side: c.side, partyIndex: c.active })
      if (c.side === 'enemy') this.awardExp(c.active)
    }
  }

  private resolveReplacements(): void {
    const enemyDown = this.activeMon(this.enemy).hp <= 0
    const playerDown = this.activeMon(this.player).hp <= 0
    if (enemyDown) {
      const next = this.enemy.party.findIndex((m) => m.hp > 0)
      if (next < 0) {
        this.finish('win')
        return
      }
      const trainer = this.request.trainer
      const mon = this.enemy.party[next]
      this.enemy.active = next
      this.enemy.stages = ZERO_STAGES()
      this.enemy.hallucinatingTurns = 0
      this.say(`${trainer?.name ?? 'The foe'} sent out ${displayName(mon)}!`)
      this.emit({ type: 'send_out', side: 'enemy', partyIndex: next, mon: monView(mon), fromOrb: true })
      if (!playerDown) this.markParticipant()
    }
    if (playerDown) {
      if (this.player.party.some((m) => m.hp > 0)) {
        this.base = { kind: 'switch', forced: true }
        return
      }
      this.finish('lose')
    }
  }

  private finish(outcome: BattleResult['outcome'], caught?: MonInstance): void {
    let prize = 0
    if (outcome === 'win' && this.request.kind === 'trainer' && this.request.trainer) {
      const t = this.request.trainer
      prize = t.prize
      this.say(`You defeated ${t.name}!`)
      this.emit({ type: 'trainer_reappear', trainerName: t.name, trainerSprite: t.sprite })
      if (t.loseText) this.say(t.loseText)
      if (prize > 0) this.say(`You got ${prize} tokens for winning!`)
    }
    if (outcome === 'lose') {
      this.say("You're out of LLMMON that can battle!")
      this.say('You hurried back to safety...')
    }
    this.player.hallucinatingTurns = 0
    this.enemy.hallucinatingTurns = 0
    const result: BattleResult = { outcome }
    if (caught) result.caught = caught
    if (prize > 0) result.prize = prize
    this.emit({ type: 'battle_end', outcome, prize, caught })
    this.base = { kind: 'end', result }
  }

  // ── moves ───────────────────────────────────────────────────────────────

  private executeMove(actor: Combatant, slot: number): void {
    const user = this.activeMon(actor)
    const foe = this.other(actor)
    const name = this.nameOf(actor)

    if (!this.canAct(actor)) return

    let move: MoveDef
    if (slot < 0) {
      this.say(`${name} has no PP left!`)
      move = getMove(STRUGGLE_ID)
    } else {
      const s = user.moves[slot]
      move = getMove(s.id)
      s.pp = Math.max(0, s.pp - 1)
    }
    this.say(`${name} used ${move.name}!`)
    this.emit({ type: 'move_used', side: actor.side, moveId: move.id, moveName: move.name, moveType: move.type })

    const target = this.activeMon(foe)
    const selfOnly = move.category === 'status' && !move.effect?.foe && !move.effect?.status
    if (!selfOnly && target.hp <= 0) {
      this.say('But there was no target...')
      return
    }

    if (!selfOnly && move.accuracy !== null) {
      const acc = move.accuracy * accuracyStageMultiplier(actor.stages.acc - foe.stages.eva)
      if (this.rng.next() * 100 >= acc) {
        this.emit({ type: 'miss', side: actor.side, targetSide: foe.side })
        this.say(move.category === 'status' ? 'But it missed!' : `${name}'s attack missed!`)
        return
      }
    }

    this.emit({ type: 'move_anim', side: actor.side, moveId: move.id, anim: move.anim, moveType: move.type, category: move.category, targetSelf: selfOnly })

    if (move.category === 'status') this.runStatusMove(actor, foe, move)
    else this.runDamagingMove(actor, foe, move)
  }

  /** Pre-move status checks. Returns false if the mon loses its turn. */
  private canAct(actor: Combatant): boolean {
    const mon = this.activeMon(actor)
    const name = this.nameOf(actor)
    if (mon.status === 'timed_out') {
      const left = this.sleepTurns.get(mon.uid) ?? randRange(this.rng, 1, 3)
      if (left > 0) {
        this.sleepTurns.set(mon.uid, left - 1)
        this.say(`${name} is still timed out...`)
        this.emit({ type: 'cant_move', side: actor.side, reason: 'timed_out' })
        return false
      }
      this.sleepTurns.delete(mon.uid)
      this.cureMajor(actor)
    }
    if (mon.status === 'rate_limited' && chance(this.rng, 0.25)) {
      this.say(`${name} is rate-limited! It can't move!`)
      this.emit({ type: 'cant_move', side: actor.side, reason: 'rate_limited' })
      return false
    }
    if (actor.hallucinatingTurns > 0) {
      actor.hallucinatingTurns--
      if (actor.hallucinatingTurns === 0) {
        this.say(STATUSES.hallucinating.cureText.replace('{name}', name))
        this.emit({ type: 'status_cured', side: actor.side, partyIndex: actor.active, status: 'hallucinating' })
      } else {
        this.say(`${name} is hallucinating!`)
        if (chance(this.rng, 1 / 3)) {
          this.emit({ type: 'cant_move', side: actor.side, reason: 'hallucinating' })
          this.say('It confidently attacked itself!')
          const stats = calcStats(mon)
          const dmg = computeDamage({
            level: mon.level,
            power: 40,
            attack: stats.atk * stageMultiplier(actor.stages.atk),
            defense: stats.def * stageMultiplier(actor.stages.def),
            stab: false,
            effectiveness: 1,
            crit: false,
            random: rollDamageRandom(this.rng),
          })
          this.applyDamage(actor, dmg, 1, false, 'hallucination')
          return false
        }
      }
    }
    return true
  }

  private runDamagingMove(actor: Combatant, foe: Combatant, move: MoveDef): void {
    const user = this.activeMon(actor)
    const target = this.activeMon(foe)
    const targetName = this.nameOf(foe)
    const eff = move.typeless ? 1 : effectiveness(move.type, getSpecies(target.speciesId).types)
    if (eff === 0) {
      this.say(`It doesn't affect ${targetName}...`)
      return
    }
    const crit = chance(this.rng, move.highCrit ? HIGH_CRIT_CHANCE : CRIT_CHANCE)
    const dmg = this.computeMoveDamage(actor, foe, move, crit, rollDamageRandom(this.rng))
    const dealt = this.applyDamage(foe, dmg, eff, crit, move.typeless ? 'struggle' : 'move')
    if (crit) this.say('A critical hit!')
    const effText = move.typeless ? null : effectivenessText(eff)
    if (effText) this.say(effText)

    if (move.id === STRUGGLE_ID) {
      const recoil = Math.max(1, Math.floor(calcStats(user).hp / 4))
      this.say(`${this.nameOf(actor)} is hit with recoil!`)
      this.applyDamage(actor, recoil, 1, false, 'recoil')
    } else if (move.recoilFraction && dealt > 0) {
      const recoil = Math.max(1, Math.floor(dealt * move.recoilFraction))
      this.say(`${this.nameOf(actor)} is hit with recoil!`)
      this.applyDamage(actor, recoil, 1, false, 'recoil')
    }

    const fx = move.effect
    if (!fx) return
    if (!chance(this.rng, (fx.chance ?? 100) / 100)) return
    if (fx.self && user.hp > 0) this.applyStages(actor, fx.self, true)
    if (target.hp > 0) {
      if (fx.foe) this.applyStages(foe, fx.foe, true)
      if (fx.status) this.inflictStatus(foe, fx.status, true)
    }
  }

  private runStatusMove(actor: Combatant, foe: Combatant, move: MoveDef): void {
    const user = this.activeMon(actor)
    let didSomething = false
    if (move.healFraction) {
      const max = calcStats(user).hp
      if (user.hp < max) {
        this.applyHeal(actor, Math.max(1, Math.floor(max * move.healFraction)))
        this.say(`${this.nameOf(actor)} regained health!`)
        didSomething = true
      }
    }
    const fx = move.effect
    if (fx?.status) didSomething = this.inflictStatus(foe, fx.status, false) || didSomething
    if (fx?.self) didSomething = this.applyStages(actor, fx.self, false) || didSomething
    if (fx?.foe) didSomething = this.applyStages(foe, fx.foe, false) || didSomething
    if (!didSomething && !fx?.self && !fx?.foe && !fx?.status) this.say('But it failed!')
  }

  /** Raw damage for `move` from actor to foe's active mon (no side effects). */
  private computeMoveDamage(actor: Combatant, foe: Combatant, move: MoveDef, crit: boolean, random: number): number {
    const user = this.activeMon(actor)
    const target = this.activeMon(foe)
    const us = calcStats(user)
    const ts = calcStats(target)
    const physical = move.category === 'physical'
    let atkStage = physical ? actor.stages.atk : actor.stages.spa
    let defStage = physical ? foe.stages.def : foe.stages.spd
    if (crit) {
      atkStage = Math.max(0, atkStage)
      defStage = Math.min(0, defStage)
    }
    const userTypes = getSpecies(user.speciesId).types
    return computeDamage({
      level: user.level,
      power: move.power,
      attack: (physical ? us.atk : us.spa) * stageMultiplier(atkStage),
      defense: (physical ? ts.def : ts.spd) * stageMultiplier(defStage),
      stab: !move.typeless && (userTypes as string[]).includes(move.type),
      effectiveness: move.typeless ? 1 : effectiveness(move.type, getSpecies(target.speciesId).types),
      crit,
      random,
    })
  }

  // ── state changes (each emits its events) ──────────────────────────────

  /** Returns HP actually lost. Honours the `safety` flag for the player side. */
  private applyDamage(c: Combatant, amount: number, eff: number, crit: boolean, source: DamageSource): number {
    const mon = this.activeMon(c)
    const hpBefore = mon.hp
    let dmg = Math.max(0, Math.min(Math.floor(amount), hpBefore))
    if (c.side === 'player' && this.request.safety) dmg = Math.min(dmg, Math.max(0, hpBefore - 1))
    mon.hp = hpBefore - dmg
    this.emit({ type: 'damage', side: c.side, partyIndex: c.active, amount: dmg, hpBefore, hpAfter: mon.hp, maxHp: calcStats(mon).hp, effectiveness: eff, crit, source })
    return dmg
  }

  private applyHeal(c: Combatant, amount: number, partyIndex = c.active): number {
    const mon = c.party[partyIndex]
    const max = calcStats(mon).hp
    const hpBefore = mon.hp
    mon.hp = Math.min(max, hpBefore + Math.max(0, Math.floor(amount)))
    this.emit({ type: 'heal', side: c.side, partyIndex, amount: mon.hp - hpBefore, hpBefore, hpAfter: mon.hp, maxHp: max })
    return mon.hp - hpBefore
  }

  /** Returns true if any stage changed. `silent` hides "won't go higher" messages (secondary effects). */
  private applyStages(c: Combatant, changes: Partial<Record<StageStat, number>>, silent: boolean): boolean {
    let changed = false
    for (const [stat, delta] of Object.entries(changes) as [StageStat, number][]) {
      const before = c.stages[stat]
      const after = Math.max(MIN_STAGE, Math.min(MAX_STAGE, before + delta))
      const applied = after - before
      const statName = STAT_NAMES[stat]
      if (applied === 0) {
        if (!silent) {
          this.emit({ type: 'stat_change', side: c.side, stat, delta: 0, stage: before })
          this.say(`${this.nameOf(c)}'s ${statName} won't go any ${delta > 0 ? 'higher' : 'lower'}!`)
        }
        continue
      }
      c.stages[stat] = after
      changed = true
      this.emit({ type: 'stat_change', side: c.side, stat, delta: applied, stage: after })
      const mag = Math.abs(applied)
      const verb = applied > 0 ? (mag === 1 ? 'rose' : mag === 2 ? 'rose sharply' : 'rose drastically') : mag === 1 ? 'fell' : mag === 2 ? 'harshly fell' : 'severely fell'
      this.say(`${this.nameOf(c)}'s ${statName} ${verb}!`)
    }
    return changed
  }

  /** Returns true if the status was applied. */
  private inflictStatus(c: Combatant, status: AnyStatusId, silent: boolean): boolean {
    const mon = this.activeMon(c)
    const info = STATUSES[status]
    const name = this.nameOf(c)
    const types = getSpecies(mon.speciesId).types
    if (info.immuneTypes.some((t) => (types as string[]).includes(t))) {
      if (!silent) this.say(`It doesn't affect ${name}...`)
      return false
    }
    if (status === 'hallucinating') {
      if (c.hallucinatingTurns > 0) {
        if (!silent) this.say(info.alreadyText.replace('{name}', name))
        return false
      }
      c.hallucinatingTurns = randRange(this.rng, 2, 5) + 1 // +1: the first check ticks immediately
    } else {
      if (mon.status !== 'none') {
        if (!silent) this.say(mon.status === status ? info.alreadyText.replace('{name}', name) : 'But it failed!')
        return false
      }
      mon.status = status
      if (status === 'timed_out') this.sleepTurns.set(mon.uid, randRange(this.rng, 1, 3))
    }
    this.emit({ type: 'status_applied', side: c.side, partyIndex: c.active, status })
    this.say(info.inflictText.replace('{name}', name))
    return true
  }

  private cureMajor(c: Combatant, partyIndex = c.active): void {
    const mon = c.party[partyIndex]
    if (!isMajorStatus(mon.status)) return
    const status: MajorStatusId = mon.status
    mon.status = 'none'
    this.sleepTurns.delete(mon.uid)
    this.emit({ type: 'status_cured', side: c.side, partyIndex, status })
    this.say(STATUSES[status].cureText.replace('{name}', this.nameFor(c, mon)))
  }

  private switchIn(c: Combatant, partyIndex: number, withdraw: boolean): void {
    if (withdraw) {
      const old = this.activeMon(c)
      this.say(`${displayName(old)}, come back!`)
      this.emit({ type: 'withdraw', side: c.side, partyIndex: c.active, mon: monView(old) })
    }
    c.active = partyIndex
    c.stages = ZERO_STAGES()
    c.hallucinatingTurns = 0
    const mon = this.activeMon(c)
    this.say(`Go! ${displayName(mon)}!`)
    this.emit({ type: 'send_out', side: c.side, partyIndex, mon: monView(mon), fromOrb: true })
    if (c.side === 'player') this.markParticipant()
  }

  // ── items ───────────────────────────────────────────────────────────────

  private validateSwitchTarget(i: number): string | null {
    const mon = this.player.party[i]
    if (!mon) return 'Pick an LLMMON.'
    if (i === this.player.active && mon.hp > 0) return `${displayName(mon)} is already in battle!`
    if (mon.hp <= 0) return `${displayName(mon)} has no energy left to battle!`
    return null
  }

  private validateItem(itemId: string, target?: number): string | null {
    const item = getItem(itemId)
    if ((this.bag[itemId] ?? 0) <= 0) return `You don't have any ${item.name} left.`
    if (!item.usableInBattle) return "That can't be used in battle!"
    if (item.effect.kind === 'catch') {
      if (this.request.kind === 'trainer') return "You can't catch another trainer's LLMMON!"
      if (!this.request.canCatch) return "It's too wild to catch right now!"
      return null
    }
    const idx = target ?? this.player.active
    const mon = this.player.party[idx]
    if (!mon) return 'Pick an LLMMON.'
    if (mon.hp <= 0) return "It won't have any effect."
    if (item.effect.kind === 'heal' && mon.hp >= calcStats(mon).hp) return "It won't have any effect."
    if (item.effect.kind === 'cure') {
      const hall = idx === this.player.active && this.player.hallucinatingTurns > 0
      if (!isMajorStatus(mon.status) && !hall) return "It won't have any effect."
    }
    return null
  }

  private useItem(itemId: string, target?: number): void {
    const item = getItem(itemId)
    this.bag[itemId] = (this.bag[itemId] ?? 0) - 1
    if (this.bag[itemId] <= 0) delete this.bag[itemId]
    const eff = item.effect
    if (eff.kind === 'catch') {
      this.throwOrb(itemId, eff.multiplier)
      return
    }
    const idx = target ?? this.player.active
    const mon = this.player.party[idx]
    this.say(`You used a ${item.name}!`)
    this.emit({ type: 'item_used', itemId, targetPartyIndex: idx })
    if (eff.kind === 'heal') {
      const healed = this.applyHeal(this.player, eff.amount, idx)
      this.say(`${displayName(mon)}'s HP was restored by ${healed}.`)
    } else if (eff.kind === 'cure') {
      this.cureMajor(this.player, idx)
      if (idx === this.player.active && this.player.hallucinatingTurns > 0) {
        this.player.hallucinatingTurns = 0
        this.emit({ type: 'status_cured', side: 'player', partyIndex: idx, status: 'hallucinating' })
        this.say(STATUSES.hallucinating.cureText.replace('{name}', displayName(mon)))
      }
    }
  }

  private throwOrb(itemId: string, multiplier: number): void {
    const item = getItem(itemId)
    const mon = this.activeMon(this.enemy)
    this.say(`You threw a ${item.name}!`)
    this.emit({ type: 'catch_throw', itemId })
    const odds = catchOdds(calcStats(mon).hp, mon.hp, getSpecies(mon.speciesId).catchRate, multiplier, mon.status)
    const { caught, shakes } = rollCatch(this.rng, odds)
    for (let n = 1; n <= shakes; n++) this.emit({ type: 'catch_shake', n })
    this.emit({ type: 'catch_result', caught, shakes })
    if (caught) {
      this.say(`Gotcha! ${displayName(mon)} was caught!`)
      this.finish('caught', mon)
      return
    }
    const lines = [
      'Oh no! It slipped right out of the prompt!',
      'So close... it wriggled free!',
      'Argh! It almost accepted the prompt!',
      'Shoot! One more token and it was yours!',
    ]
    this.say(lines[shakes])
  }

  // ── EXP + learning ──────────────────────────────────────────────────────

  private markParticipant(): void {
    const set = this.participants.get(this.enemy.active) ?? new Set<number>()
    set.add(this.player.active)
    this.participants.set(this.enemy.active, set)
  }

  private awardExp(enemyIndex: number): void {
    const defeated = this.enemy.party[enemyIndex]
    const ids = [...(this.participants.get(enemyIndex) ?? [])].filter((i) => this.player.party[i]?.hp > 0)
    if (ids.length === 0) return
    const amount = expYield(getSpecies(defeated.speciesId).expYield, defeated.level, this.request.kind === 'trainer', ids.length)
    for (const i of ids) this.gainExp(i, amount)
  }

  private gainExp(partyIndex: number, amount: number): void {
    const mon = this.player.party[partyIndex]
    if (mon.level >= MAX_LEVEL) return
    const growth = getSpecies(mon.speciesId).growth
    const name = displayName(mon)
    this.say(`${name} gained ${amount} EXP!`)
    const startExp = mon.exp
    const startLevel = mon.level
    const steps = addExp(mon, amount)
    const endExp = mon.exp
    // One bar segment per level crossed, then the remainder.
    let cursor = startExp
    for (let lvl = startLevel; lvl <= mon.level; lvl++) {
      const levelStart = expForLevel(growth, lvl)
      const levelEnd = lvl >= MAX_LEVEL ? levelStart : expForLevel(growth, lvl + 1)
      const to = Math.min(endExp, levelEnd)
      if (to > cursor || lvl === startLevel) {
        this.emit({ type: 'exp_gain', partyIndex, amount, expFrom: cursor, expTo: to, levelStart, levelEnd, level: lvl })
      }
      cursor = to
      const step = steps.find((s) => s.level === lvl + 1)
      if (!step) break
      const deltas = {} as Stats
      for (const k of Object.keys(step.statsAfter) as (keyof Stats)[]) deltas[k] = step.statsAfter[k] - step.statsBefore[k]
      this.emit({ type: 'level_up', partyIndex, level: step.level, statsBefore: step.statsBefore, statsAfter: step.statsAfter, deltas })
      this.say(`${name} grew to Lv. ${step.level}!`)
      for (const moveId of step.newMoves) this.offerMove(partyIndex, moveId)
    }
  }

  private offerMove(partyIndex: number, moveId: string): void {
    const mon = this.player.party[partyIndex]
    const name = displayName(mon)
    const moveName = getMove(moveId).name
    if (mon.moves.some((m) => m.id === moveId)) return
    // Moves already queued for this mon count toward the 4 slots for auto-learning.
    const queuedForMon = this.learnQueue.some((q) => q.partyIndex === partyIndex)
    if (mon.moves.length < 4 && !queuedForMon) {
      learnMove(mon, moveId)
      this.emit({ type: 'move_learned', partyIndex, moveId })
      this.say(`${name} learned ${moveName}!`)
      return
    }
    const promptId = this.nextPromptId++
    this.learnQueue.push({ promptId, partyIndex, moveId })
    this.say(`${name} wants to learn ${moveName}!`)
    this.say(`But ${name} already knows four moves.`)
    this.emit({ type: 'learn_move_prompt', promptId, partyIndex, moveId, currentMoves: mon.moves.map((m) => m.id) })
  }

  private resolveLearn(forgetSlot: number | null): void {
    const pending = this.learnQueue.shift()
    if (!pending) return
    const mon = this.player.party[pending.partyIndex]
    const name = displayName(mon)
    const moveName = getMove(pending.moveId).name
    if (mon.moves.length < 4 && forgetSlot === null) {
      learnMove(mon, pending.moveId)
      this.emit({ type: 'move_learned', partyIndex: pending.partyIndex, moveId: pending.moveId })
      this.say(`${name} learned ${moveName}!`)
      return
    }
    if (forgetSlot === null) {
      this.emit({ type: 'move_not_learned', partyIndex: pending.partyIndex, moveId: pending.moveId })
      this.say(`${name} did not learn ${moveName}.`)
      return
    }
    const res = learnMove(mon, pending.moveId, forgetSlot)
    if (!res.learned) {
      this.emit({ type: 'move_not_learned', partyIndex: pending.partyIndex, moveId: pending.moveId })
      this.say(`${name} did not learn ${moveName}.`)
      return
    }
    this.say('1, 2 and... Poof!')
    if (res.forgot) this.say(`${name} forgot ${getMove(res.forgot).name}.`)
    this.emit({ type: 'move_learned', partyIndex: pending.partyIndex, moveId: pending.moveId, forgotMoveId: res.forgot })
    this.say(`And ${name} learned ${moveName}!`)
  }

  // ── enemy AI glue ───────────────────────────────────────────────────────

  private chooseEnemySlot(): number {
    const self = this.activeMon(this.enemy)
    const target = this.activeMon(this.player)
    const options: AiMoveOption[] = []
    self.moves.forEach((slot, index) => {
      if (slot.pp <= 0) return
      const move = getMove(slot.id)
      let expectedDamage = 0
      if (move.category !== 'status') {
        const eff = effectiveness(move.type, getSpecies(target.speciesId).types)
        if (eff > 0) expectedDamage = this.computeMoveDamage(this.enemy, this.player, move, false, 0.925) * ((move.accuracy ?? 100) / 100)
      }
      options.push({ index, moveId: slot.id, expectedDamage, effectUseful: this.effectUseful(move) })
    })
    return chooseEnemyMove(
      { kind: this.request.kind, options, targetHp: target.hp, selfHpFraction: self.hp / calcStats(self).hp },
      this.rng,
    )
  }

  private effectUseful(move: MoveDef): boolean {
    const self = this.activeMon(this.enemy)
    const target = this.activeMon(this.player)
    if (move.healFraction) return self.hp < calcStats(self).hp
    const fx = move.effect
    if (!fx) return false
    if (fx.status === 'hallucinating') return this.player.hallucinatingTurns === 0 && !(getSpecies(target.speciesId).types as string[]).includes('glitch')
    if (fx.status) return target.status === 'none'
    if (fx.self) return Object.entries(fx.self).some(([k, d]) => (d > 0 ? this.enemy.stages[k as StageStat] < 2 : true))
    if (fx.foe) return Object.entries(fx.foe).some(([k, d]) => (d < 0 ? this.player.stages[k as StageStat] > -2 : true))
    return false
  }

  // ── small helpers ───────────────────────────────────────────────────────

  private side(s: Side): Combatant {
    return s === 'player' ? this.player : this.enemy
  }

  private other(c: Combatant): Combatant {
    return c.side === 'player' ? this.enemy : this.player
  }

  private activeMon(c: Combatant): MonInstance {
    return c.party[c.active]
  }

  private effectiveSpeed(c: Combatant): number {
    const mon = this.activeMon(c)
    let spe = calcStats(mon).spe * stageMultiplier(c.stages.spe)
    if (mon.status === 'rate_limited') spe *= 0.5
    return spe
  }

  /** Name used in battle text: "GLM", "Wild Gemma 4", "Foe Gemma 4". */
  private nameOf(c: Combatant): string {
    return this.nameFor(c, this.activeMon(c))
  }

  private nameFor(c: Combatant, mon: MonInstance): string {
    if (c.side === 'player') return displayName(mon)
    return `${this.request.kind === 'trainer' ? 'Foe' : 'Wild'} ${displayName(mon)}`
  }

  private activeView(c: Combatant): ActiveView {
    const mon = this.activeMon(c)
    const prog = c.side === 'player' ? expProgress(mon) : { exp: 0, levelStart: 0, levelEnd: 0 }
    return {
      ...monView(mon),
      partyIndex: c.active,
      moves: mon.moves.map(moveView),
      stages: { ...c.stages },
      hallucinating: c.hallucinatingTurns > 0,
      exp: prog.exp,
      expLevelStart: prog.levelStart,
      expLevelEnd: prog.levelEnd,
    }
  }

  private say(text: string): void {
    this.out.push({ type: 'text', text })
  }

  private emit(e: BattleEvent): void {
    this.out.push(e)
  }

  private flush(): BattleEvent[] {
    const events = this.out
    this.out = []
    return events
  }
}
