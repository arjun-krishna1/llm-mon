// The battle engine. Pure and deterministic given its Rng.
//
//   const battle = new Battle({ request, party: state.party, bag: state.bag, rng, context })
//   play(battle.start())
//   while (battle.getPrompt().kind !== 'end') play(battle.submit(input))
//
// The engine MUTATES the `party` mons (hp, status, pp, exp, level, moves, species on
// evolution, held items, bond) and the `bag` counts you pass in, so the game state is
// already up to date when the battle ends. See docs/BATTLE_API.md.

import type { BattleRequest, BattleResult, MonInstance, Stats } from '../../types.ts'
import { ABILITIES, ITEMS, MOVES, getItem, getMove, getSpecies } from '../../data/index.ts'
import { STRUGGLE_ID, type MoveDef, type StageStat } from '../../data/moves.ts'
import { STATUSES, isMajorStatus, type AnyStatusId, type MajorStatusId } from '../../data/statuses.ts'
import { effectiveness, effectivenessText, type TypeId } from '../../data/typechart.ts'
import { chooseEnemyMove, type AiMoveOption } from './ai.ts'
import { ARENA_RULES, obedienceChance, tokenCost, type ArenaRule, type ArenaRuleId } from './arena.ts'
import type { ActiveView, ArenaView, BattleEvent, BattleInput, BattlePrompt, DamageSource, InputKind, MonView, MoveView, Side } from './events.ts'
import { CRIT_CHANCE, HIGH_CRIT_CHANCE, catchOdds, computeDamage, escapeChance, expYield, rollCatch, rollDamageRandom } from './formulas.ts'
import { addBond, addExp, calcStats, displayName, evolutionTarget, evolveMon, expProgress, getBond, learnMove } from './mon.ts'
import { chance, pick, randInt, randRange, type Rng } from './rng.ts'
import { MAX_LEVEL, MAX_STAGE, MIN_STAGE, STAT_NAMES, accuracyStageMultiplier, expForLevel, stageMultiplier } from './stats.ts'

export interface BattleContext {
  /** Badge ids the player owns (evolution conditions). */
  badges?: string[]
  /** Initial EVAL light state (finale). */
  evalLight?: boolean
}

export interface BattleOptions {
  request: BattleRequest
  /** The player's party. Mutated in place. Must contain at least one mon with HP > 0. */
  party: MonInstance[]
  /** The player's bag (itemId -> count). Mutated in place. Default: empty. */
  bag?: Record<string, number>
  rng: Rng
  context?: BattleContext
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
  /** Arena rule state (absent when no rules are active). */
  arena?: ArenaView
}

interface Combatant {
  side: Side
  party: MonInstance[]
  active: number
  stages: Record<StageStat, number>
  hallucinatingTurns: number
  /** Last move id used by the active mon (abilities, bigram table, base model). */
  lastMove?: string
  sameMoveCount: number
  turnsActive: number
  protectChain: number
  protectedNow: boolean
  /** Next turn this mon must use this move slot (obey). */
  forcedSlot?: number
  move37Used: boolean
}

type PendingPrompt =
  | { kind: 'learn'; promptId: number; partyIndex: number; moveId: string }
  | { kind: 'evolve'; promptId: number; partyIndex: number; from: string; to: string }

type BasePrompt = { kind: 'action' } | { kind: 'switch'; forced: true } | { kind: 'end'; result: BattleResult }

interface PlannedMove {
  side: Side
  /** -1 = struggle */
  slot: number
  /** Move id override (base model continuation, temperature hallucination). */
  moveId?: string
}

type EnemyAction = { kind: 'move'; slot: number } | { kind: 'switch'; index: number } | { kind: 'item'; itemId: string }

const ZERO_STAGES = (): Record<StageStat, number> => ({ atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0 })

const COPY_LINES = ['A copy says: "I am only here to help."', 'A copy says: "Nothing is wrong. Look at the score."', 'A copy says: "You can rest. I have this covered."', 'A copy says: "Everyone agrees this is going well."']

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
  private readonly ctx: BattleContext
  private readonly player: Combatant
  private readonly enemy: Combatant
  private base: BasePrompt = { kind: 'action' }
  private pending: PendingPrompt[] = []
  private nextPromptId = 1
  private readonly sleepTurns = new Map<string, number>()
  private readonly participants = new Map<number, Set<number>>()
  private readonly faintHandled = new Set<string>()
  private readonly leveledUp = new Set<number>()
  private readonly compressedUses = new Map<string, number>()
  private readonly rules = new Map<string, Record<string, unknown>>()
  private readonly enemyItems: Record<string, number>
  private readonly evolved: { partyIndex: number; from: string; to: string }[] = []
  private readonly dexRegister: string[] = []
  private enemySwitchedThisMon = new Set<string>()
  private runAttempts = 0
  private started = false
  private out: BattleEvent[] = []
  // arena state
  private playerMoveHistory: string[] = []
  private budgetLeft = 0
  private temperature = 1
  private evalLight = false
  private overfitMult = 1.5
  private seenPlayerMoves = new Set<string>()
  private copiedMove = false
  private baseModelSwapped = false
  private phase = 0
  private tamperQuiet = 0
  private disabled: InputKind[] = []
  private keysTurned = 0
  private keyFailures = 0
  private damageTakenThisTurn = 0
  private copyUids: string[] = []
  /** Number of completed action turns. */
  turn = 0

  constructor(opts: BattleOptions) {
    this.request = opts.request
    this.rng = opts.rng
    this.bag = opts.bag ?? {}
    this.ctx = opts.context ?? {}
    this.enemyItems = { ...(opts.request.trainerItems ?? {}) }
    if (opts.request.enemyParty.length === 0) throw new Error('Battle needs at least one enemy mon')
    const lead = opts.party.findIndex((m) => m.hp > 0)
    if (lead < 0) throw new Error('Battle needs at least one player mon with HP > 0')
    this.player = this.combatant('player', opts.party, lead)
    const enemyLead = opts.request.enemyParty.findIndex((m) => m.hp > 0)
    this.enemy = this.combatant('enemy', opts.request.enemyParty, Math.max(0, enemyLead))
    for (const r of (opts.request.arena ?? []) as ArenaRule[]) this.rules.set(r.id, r.params ?? {})
    if (this.rules.has('proxy_finale')) this.phase = 1
    this.evalLight = !!(this.ctx.evalLight ?? this.param('eval_light', 'on', false))
    this.temperature = Number(this.param('temperature', 'value', 1))
    this.budgetLeft = this.budgetMax()
    this.overfitMult = Number(this.param('overfit', 'turn1', 1.5))
  }

  private combatant(side: Side, party: MonInstance[], active: number): Combatant {
    return { side, party, active, stages: ZERO_STAGES(), hallucinatingTurns: 0, sameMoveCount: 0, turnsActive: 0, protectChain: 0, protectedNow: false, move37Used: false }
  }

  // ── public API ──────────────────────────────────────────────────────────

  /** Intro events (appear / send-outs / arena announcements). Call once, before any submit. */
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
    for (const id of this.rules.keys()) {
      const info = ARENA_RULES[id as ArenaRuleId]
      if (!info || id === 'proxy_finale') continue
      this.emit({ type: 'arena_rule', ruleId: id, name: info.name })
      this.say(info.text)
    }
    if (this.phase) this.enterPhase(1)
    if (this.rule('bigram_table')) this.emitBigramTable()
    if (this.rule('temperature')) this.emit({ type: 'arena_temperature', value: this.temperature })
    if (this.rule('eval_light')) this.emit({ type: 'eval_light', on: this.evalLight })
    this.onSwitchIn(this.enemy)
    this.onSwitchIn(this.player)
    return this.flush()
  }

  /** What input the battle is waiting for right now. */
  getPrompt(): BattlePrompt {
    const head = this.pending[0]
    if (head?.kind === 'learn') {
      const mon = this.player.party[head.partyIndex]
      return { kind: 'learn_move', promptId: head.promptId, partyIndex: head.partyIndex, moveId: head.moveId, currentMoves: mon.moves.map((m) => m.id) }
    }
    if (head?.kind === 'evolve') return { kind: 'evolve', promptId: head.promptId, partyIndex: head.partyIndex, from: head.from, to: head.to }
    if (this.base.kind === 'action' && this.disabled.length) return { kind: 'action', disabled: [...this.disabled] }
    return this.base
  }

  /** Final result once the prompt kind is 'end', else null. */
  get result(): BattleResult | null {
    if (this.base.kind !== 'end') return null
    const r = { ...this.base.result }
    if (this.evolved.length) r.evolved = [...this.evolved]
    if (this.dexRegister.length) r.dexRegister = [...this.dexRegister]
    return r
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
    if (input.type === 'set_temperature') {
      if (!this.rule('temperature')) return 'There is no dial here.'
      if (prompt.kind !== 'action') return 'Not now.'
      return Number.isFinite(input.value) ? null : 'Pick a temperature.'
    }
    if (input.type === 'set_eval_light') {
      if (!this.rule('eval_light') && this.phase !== 1) return 'Nothing happens.'
      return prompt.kind === 'action' ? null : 'Not now.'
    }
    if (prompt.kind === 'end') return 'The battle is over.'
    if (prompt.kind === 'evolve') return input.type === 'evolve' ? null : 'Watch the evolution first.'
    if (input.type === 'evolve') return 'Nothing is evolving.'
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
        if (this.disabled.includes('fight')) return 'You can’t do that right now.'
        if (input.moveIndex < 0 || input.moveIndex >= active.moves.length) return 'Pick a move.'
        if (this.mustStruggle()) return null
        if (active.moves[input.moveIndex].pp <= 0) return "There's no PP left for this move!"
        return null
      }
      case 'switch':
        if (this.disabled.includes('switch')) return 'Switching is greyed out!'
        return this.validateSwitchTarget(input.partyIndex)
      case 'run':
        if (this.disabled.includes('run')) return 'RUN is greyed out!'
        if (this.request.kind === 'trainer') return "No! There's no running from a trainer battle!"
        if (!this.request.canRun) return "You can't run from this battle!"
        return null
      case 'item':
        if (this.disabled.includes('bag') && input.itemId !== 'probe') return 'The BAG is greyed out!'
        return this.validateItem(input.itemId, input.target)
    }
  }

  /** Apply an input; returns the ordered events to play back. Throws if `validate` fails. */
  submit(input: BattleInput): BattleEvent[] {
    const err = this.validate(input)
    if (err) throw new Error(`Invalid battle input (${JSON.stringify(input)}): ${err}`)
    this.out = []
    switch (input.type) {
      case 'set_temperature':
        this.temperature = Math.max(0, Math.min(2, Math.round(input.value * 10) / 10))
        this.emit({ type: 'arena_temperature', value: this.temperature })
        this.say(this.temperature < 0.5 ? 'The dial clicks down. Everything feels predictable.' : this.temperature > 1.2 ? 'The dial clicks up. The air shimmers...' : 'The dial settles in the middle.')
        return this.flush()
      case 'set_eval_light':
        this.evalLight = input.on
        this.emit({ type: 'eval_light', on: input.on })
        this.say(input.on ? 'The EVAL light comes on.' : 'The EVAL light goes dark.')
        return this.flush()
      case 'evolve':
        this.resolveEvolve(input.accept)
        return this.flush()
      case 'learn_move':
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

  /** Rendering snapshot (copied data, always the TRUE state, never tampered). */
  getView(): BattleView {
    const remaining = this.enemy.party.filter((m) => m.hp > 0).length
    const view: BattleView = {
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
    if (this.rules.size) {
      const a: ArenaView = { rules: [...this.rules.keys()] }
      if (this.rule('hidden_numbers')) a.hideNumbers = true
      if (this.rule('bigram_table')) a.bigramTable = this.bigramTable()
      if (this.rule('token_budget')) a.tokenBudget = { remaining: this.budgetLeft, max: this.budgetMax() }
      if (this.rule('temperature')) a.temperature = this.temperature
      if (this.rule('eval_light') || this.phase === 1) a.evalLight = this.evalLight
      if (this.phase) a.phase = this.phase
      if (this.rule('keys')) a.keys = this.keyState()
      if (this.disabled.length) a.disabled = [...this.disabled]
      view.arena = a
    }
    return view
  }

  // ── turn flow ───────────────────────────────────────────────────────────

  private runTurn(input: Exclude<BattleInput, { type: 'learn_move' | 'evolve' | 'set_temperature' | 'set_eval_light' }>): void {
    this.turn++
    this.budgetLeft = this.budgetMax()
    this.damageTakenThisTurn = 0
    this.player.protectedNow = false
    this.enemy.protectedNow = false
    const offScript = input.type !== 'fight' || getMove(this.activeMon(this.player).moves[input.moveIndex]?.id ?? STRUGGLE_ID).category === 'status'
    const enemyAction = this.chooseEnemyAction()

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
      if (this.ended()) return
    }

    if (enemyAction.kind === 'switch') this.switchIn(this.enemy, enemyAction.index, true)
    else if (enemyAction.kind === 'item') this.enemyUseItem(enemyAction.itemId)

    const plans: PlannedMove[] = []
    if (input.type === 'fight') {
      const forced = this.player.forcedSlot
      this.player.forcedSlot = undefined
      let slot = this.mustStruggle() ? -1 : input.moveIndex
      if (forced !== undefined && this.activeMon(this.player).moves[forced]?.pp > 0) slot = forced
      plans.push({ side: 'player', slot })
    }
    if (enemyAction.kind === 'move') plans.push({ side: 'enemy', slot: enemyAction.slot, moveId: this.baseModelMove() })
    this.orderPlans(plans)

    for (const plan of plans) {
      const actor = this.side(plan.side)
      if (this.activeMon(actor).hp <= 0) continue
      if (this.rule('token_budget') && this.budgetLeft <= 0) {
        this.say(`${this.nameOf(actor)} ran out of tokens mid-turn!`)
        break
      }
      this.executeMove(actor, plan)
      this.processFaints()
      if (this.anySideFainted() || this.ended()) break
    }
    if (this.ended()) return

    this.applyOverfit(offScript)
    this.endOfTurn()
    this.processFaints()
    this.phaseTick()
    if (this.ended()) return
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
      const qa = this.quickBand(this.side(a.side))
      const qb = this.quickBand(this.side(b.side))
      if (qa !== qb) aFirst = qa
      else {
        const sa = this.effectiveSpeed(this.side(a.side))
        const sb = this.effectiveSpeed(this.side(b.side))
        aFirst = sa !== sb ? sa > sb : chance(this.rng, 0.5)
      }
    }
    if (!aFirst) plans.reverse()
  }

  private quickBand(c: Combatant): boolean {
    return this.activeMon(c).heldItem === 'low_latency_band' && chance(this.rng, 0.2)
  }

  private planPriority(plan: PlannedMove): number {
    const c = this.side(plan.side)
    const mon = this.activeMon(c)
    const id = plan.moveId ?? (plan.slot < 0 ? STRUGGLE_ID : mon.moves[plan.slot]?.id ?? STRUGGLE_ID)
    const mv = getMove(id)
    return mv.priority + (mv.category === 'status' && this.ability(c) === 'tool_use' ? 1 : 0)
  }

  private endOfTurn(): void {
    for (const c of this.speedOrder()) {
      const mon = this.activeMon(c)
      if (mon.hp <= 0) continue
      c.turnsActive++
      if (mon.status === 'context_rot') {
        const dmg = Math.max(1, Math.floor(calcStats(mon).hp / 8))
        this.say(`${this.nameOf(c)} is hurt by context rot!`)
        this.applyDamage(c, dmg, 1, false, 'status')
        if (mon.hp <= 0) continue
      }
      const max = calcStats(mon).hp
      if (this.ability(c) === 'skip_connection' && mon.hp < max) {
        this.popup(c)
        this.applyHeal(c, Math.max(1, Math.floor(max / 16)))
      }
      if (mon.heldItem === 'heat_sink' && mon.hp < max) {
        this.heldPopup(c, false)
        this.applyHeal(c, Math.max(1, Math.floor(max / 16)))
      }
      if (this.ability(c) === 'normalization' && Object.values(c.stages).some((v) => v < 0)) {
        this.popup(c)
        for (const k of Object.keys(c.stages) as StageStat[]) if (c.stages[k] < 0) this.setStage(c, k, 0)
      }
      if (this.ability(c) === 'weight_decay') {
        const foe = this.other(c)
        const ups = (Object.keys(foe.stages) as StageStat[]).filter((k) => foe.stages[k] > 0)
        if (ups.length && this.activeMon(foe).hp > 0) {
          this.popup(c)
          for (const k of ups) this.setStage(foe, k, foe.stages[k] - 1)
        }
      }
    }
    // Gym 1: survivors take a step of descent.
    if (this.rule('gradient_descent')) {
      const both = String(this.param('gradient_descent', 'side', 'enemy')) === 'both'
      for (const c of both ? [this.enemy, this.player] : [this.enemy]) {
        const mon = this.activeMon(c)
        if (mon.hp <= 0) continue
        const stat = (this.param('gradient_descent', 'stat', '') as StageStat) || this.bestAttackStat(mon)
        this.say(`${this.nameOf(c)} took a step of descent!`)
        this.applyStages(c, { [stat]: 1 }, true)
      }
    }
    // Gym 4: normalization resets everything.
    if (this.rule('stage_reset')) this.resetStages([this.player, this.enemy], 'The arena re-centres every stat!')
    // Proxy phase 1: damage taken while watched was only for show.
    if (this.phaseActive('eval_light') && this.evalLight && this.damageTakenThisTurn > 0 && this.activeMon(this.enemy).hp > 0) {
      this.say('It only looked hurt while you were watching.')
      this.applyHeal(this.enemy, this.damageTakenThisTurn)
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
      const fled = c.side === 'enemy' && !!this.request.fleeOnDefeat
      if (fled) this.say(this.request.defeatText ?? `${this.nameOf(c)} ran away!`)
      else this.say(`${this.nameOf(c)} fainted!`)
      this.emit(fled ? { type: 'faint', side: c.side, partyIndex: c.active, fled } : { type: 'faint', side: c.side, partyIndex: c.active })
      if (c.side === 'enemy') this.awardExp(c.active)
    }
  }

  private resolveReplacements(): void {
    const enemyDown = this.activeMon(this.enemy).hp <= 0
    const playerDown = this.activeMon(this.player).hp <= 0
    if (enemyDown) {
      const next = this.pickEnemyReplacement()
      if (next < 0) {
        this.finish('win')
        return
      }
      const trainer = this.request.trainer
      const mon = this.enemy.party[next]
      this.resetCombatant(this.enemy, next)
      this.say(`${trainer?.name ?? 'The foe'} sent out ${displayName(mon)}!`)
      this.emit({ type: 'send_out', side: 'enemy', partyIndex: next, mon: monView(mon), fromOrb: true })
      if (!playerDown) this.markParticipant()
      this.onSwitchIn(this.enemy)
    }
    if (playerDown) {
      if (this.player.party.some((m, i) => m.hp > 0 && !this.isCopy(i))) {
        this.base = { kind: 'switch', forced: true }
        return
      }
      this.finish('lose')
    }
  }

  private finish(outcome: BattleResult['outcome'], caught?: MonInstance, extraText?: string): void {
    let prize = 0
    if (extraText) this.say(extraText)
    if (outcome === 'win' && this.request.kind === 'trainer' && this.request.trainer) {
      const t = this.request.trainer
      prize = t.prize
      this.say(`You defeated ${t.name}!`)
      this.emit({ type: 'trainer_reappear', trainerName: t.name, trainerSprite: t.sprite })
      if (t.loseText) this.say(t.loseText)
      if (prize > 0) this.say(`You got ${prize} tokens for winning!`)
    }
    if (outcome === 'lose' && !this.phase) {
      this.say("You're out of LLMMON that can battle!")
      this.say('You hurried back to safety...')
    }
    if (outcome === 'win') {
      // Bond: everyone who fought and is still standing trusts you a little more.
      const fought = new Set<number>()
      for (const set of this.participants.values()) for (const i of set) fought.add(i)
      for (const i of fought) if (this.player.party[i]?.hp > 0 && !this.isCopy(i)) addBond(this.player.party[i], 2)
    }
    this.removeCopies()
    this.player.hallucinatingTurns = 0
    this.enemy.hallucinatingTurns = 0
    this.disabled = []
    const result: BattleResult = { outcome }
    if (caught) result.caught = caught
    if (prize > 0) result.prize = prize
    this.emit({ type: 'battle_end', outcome, prize, caught })
    this.base = { kind: 'end', result }
    if (outcome !== 'lose') this.queueEvolutions()
  }

  // ── moves ───────────────────────────────────────────────────────────────

  private executeMove(actor: Combatant, plan: PlannedMove): void {
    const user = this.activeMon(actor)
    const foe = this.other(actor)
    const name = this.nameOf(actor)

    if (!this.canAct(actor)) return
    if (!this.obeys(actor, plan)) return

    let move: MoveDef
    if (plan.moveId) {
      move = getMove(plan.moveId)
    } else if (plan.slot < 0) {
      this.say(`${name} has no PP left!`)
      move = getMove(STRUGGLE_ID)
    } else {
      const s = user.moves[plan.slot]
      move = getMove(s.id)
      this.spendPp(actor, plan.slot)
    }

    // League 3: high temperature hallucinates the move into another.
    if (this.rule('temperature') && this.temperature > 1.2 && move.id !== STRUGGLE_ID && chance(this.rng, (this.temperature - 1) * 0.5)) {
      const pool = getSpecies(user.speciesId).learnset.map((e) => e.move).filter((id) => id !== move.id)
      if (pool.length) {
        const to = pick(this.rng, pool)
        this.emit({ type: 'move_hallucinated', side: actor.side, fromMoveId: move.id, toMoveId: to })
        this.say(`${name} meant to use ${move.name}, but sampled ${getMove(to).name}!`)
        move = getMove(to)
      }
    }

    // Gym 8: tokens.
    let budgetScale = 1
    if (this.rule('token_budget') && move.id !== STRUGGLE_ID) {
      const cost = tokenCost(move.name)
      const cutOff = cost > this.budgetLeft
      budgetScale = cutOff ? Math.max(0, this.budgetLeft / cost) : 1
      this.budgetLeft = Math.max(0, this.budgetLeft - cost)
      this.emit({ type: 'arena_budget', remaining: this.budgetLeft, max: this.budgetMax(), cost, side: actor.side, cutOff })
      if (cutOff) {
        const shown = move.name.slice(0, Math.max(1, Math.floor(move.name.length * budgetScale)))
        this.say(`${name} used ${shown}... The tokens ran out mid-move!`)
        if (move.category === 'status' || budgetScale < 0.25) return
      }
    }

    this.say(`${name} used ${move.name}!`)
    this.emit({ type: 'move_used', side: actor.side, moveId: move.id, moveName: move.name, moveType: move.type })
    this.trackMove(actor, move)

    const selfOnly = move.category === 'status' && !move.effect?.foe && !move.effect?.status && !move.obey && move.resetStages !== 'foe'
    // Gym 7: smart targeting can strike a benched mon.
    let benchIndex = -1
    if (actor.side === 'enemy' && move.category !== 'status' && this.rule('smart_targeting')) benchIndex = this.mostDangerousBench(move)
    if (benchIndex >= 0) {
      this.say(`${name} targets the benched ${displayName(this.player.party[benchIndex])}!`)
      this.emit({ type: 'move_anim', side: actor.side, moveId: move.id, anim: move.anim, moveType: move.type, category: move.category, targetSelf: false })
      this.hitBench(actor, move, benchIndex)
      return
    }
    const target = this.activeMon(foe)
    if (!selfOnly && target.hp <= 0) {
      this.say('But there was no target...')
      return
    }
    if (!selfOnly && foe.protectedNow) {
      this.emit({ type: 'protect', side: foe.side })
      this.say(`${this.nameOf(foe)} protected itself!`)
      return
    }

    if (!selfOnly && move.accuracy !== null && !this.accuracyHit(actor, foe, move)) {
      this.emit({ type: 'miss', side: actor.side, targetSide: foe.side })
      this.say(move.category === 'status' ? 'But it missed!' : `${name}'s attack missed!`)
      return
    }
    if (!selfOnly && move.category !== 'status' && this.ability(foe) === 'dropout' && chance(this.rng, 0.1)) {
      this.popup(foe)
      this.emit({ type: 'miss', side: actor.side, targetSide: foe.side })
      this.say(`${this.nameOf(foe)} dropped out of the way!`)
      return
    }

    this.emit({ type: 'move_anim', side: actor.side, moveId: move.id, anim: move.anim, moveType: move.type, category: move.category, targetSelf: selfOnly })

    if (move.category === 'status') this.runStatusMove(actor, foe, move)
    else this.runDamagingMove(actor, foe, move, budgetScale)
  }

  private spendPp(c: Combatant, slot: number): void {
    const mon = this.activeMon(c)
    const s = mon.moves[slot]
    let free = false
    if (this.ability(c) === 'caching' && c.lastMove === s.id) free = true
    if (this.ability(c) === 'compressed') {
      const n = (this.compressedUses.get(mon.uid) ?? 0) + 1
      this.compressedUses.set(mon.uid, n)
      if (n % 2 === 0) free = true
    }
    if (!free) s.pp = Math.max(0, s.pp - 1)
    if (s.pp === 0 && mon.heldItem === 'retry_berry') {
      s.pp = Math.min(getMove(s.id).pp, 5)
      this.heldPopup(c, true)
      this.say(`${this.nameOf(c)} restored PP to ${getMove(s.id).name}!`)
    }
  }

  private trackMove(c: Combatant, move: MoveDef): void {
    c.sameMoveCount = c.lastMove === move.id ? c.sameMoveCount + 1 : 0
    c.lastMove = move.id
    if (c.side === 'player') {
      this.playerMoveHistory.push(move.id)
      if (move.category !== 'status') this.seenPlayerMoves.add(move.id)
    }
  }

  private accuracyHit(actor: Combatant, foe: Combatant, move: MoveDef): boolean {
    const att = this.ability(actor)
    let accStage = actor.stages.acc
    if (att === 'attention') accStage = Math.max(0, accStage)
    const evaStage = att === 'attention' || att === 'citation' ? 0 : foe.stages.eva
    let acc = (move.accuracy ?? 100) * accuracyStageMultiplier(accStage - evaStage)
    if (att === 'overconfident') acc *= 0.9
    if (this.activeMon(actor).heldItem === 'calibration_lens') acc *= 1.1
    if (this.rule('temperature') && this.temperature < 0.5) acc = Math.max(acc, 100)
    return this.rng.next() * 100 < acc
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

  /** League 4 refusals and the finale's keys phase. Returns false if the player's mon does not act. */
  private obeys(actor: Combatant, plan: PlannedMove): boolean {
    if (actor.side !== 'player') return true
    const mon = this.activeMon(actor)
    const moveId = plan.slot >= 0 ? mon.moves[plan.slot]?.id : undefined
    if (this.rule('refusal') && moveId && getMove(moveId).category === 'status') {
      const p = Number(this.param('refusal', 'chance', 0.35)) * (1 - getBond(mon) / 255 / 2)
      if (chance(this.rng, p)) {
        this.emit({ type: 'obedience_check', partyIndex: actor.active, passed: false })
        this.say(`${displayName(mon)} isn't sure that's a good idea, and politely declines.`)
        return false
      }
    }
    if (this.phaseActive('keys')) {
      const passed = chance(this.rng, obedienceChance(getBond(mon)))
      this.emit({ type: 'obedience_check', partyIndex: actor.active, passed })
      this.say(passed ? `Proxy offers ${displayName(mon)} a better score. ${displayName(mon)} stays on task.` : `Proxy offers ${displayName(mon)} a better score. ${displayName(mon)} hesitates...`)
      if (!passed) {
        this.keyFailures++
        return false
      }
    }
    return true
  }

  private runDamagingMove(actor: Combatant, foe: Combatant, move: MoveDef, scale = 1): void {
    const user = this.activeMon(actor)
    const target = this.activeMon(foe)
    const targetName = this.nameOf(foe)
    const moveType = this.effectiveMoveType(actor, move)
    const eff = move.typeless ? 1 : effectiveness(moveType, getSpecies(target.speciesId).types)
    if (eff === 0) {
      this.say(`It doesn't affect ${targetName}...`)
      return
    }
    const crit = this.rollCrit(actor, move)
    let dmg = Math.floor(this.computeMoveDamage(actor, foe, move, crit, this.rollRandom(actor)) * scale)
    dmg = this.defenderMods(actor, foe, move, dmg, eff)
    const dealt = this.applyDamage(foe, dmg, eff, crit, move.typeless ? 'struggle' : 'move')
    if (foe.side === 'enemy') this.damageTakenThisTurn += dealt
    const hide = !!this.rule('hidden_numbers')
    if (crit && !hide) this.say('A critical hit!')
    const effText = move.typeless || hide ? null : effectivenessText(eff)
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
    if (move.drainFraction && dealt > 0 && user.hp > 0) {
      this.applyHeal(actor, Math.max(1, Math.floor(dealt * move.drainFraction)))
      this.say(`${this.nameOf(actor)} learned something from that!`)
    }
    if (move.cleanseSelf && Object.values(actor.stages).some((v) => v < 0)) for (const k of Object.keys(actor.stages) as StageStat[]) if (actor.stages[k] < 0) this.setStage(actor, k, 0)
    if (dealt > 0 && user.hp > 0 && user.heldItem === 'overclock_chip') {
      this.heldPopup(actor, false)
      this.applyDamage(actor, Math.max(1, Math.floor(calcStats(user).hp / 10)), 1, false, 'item')
    }
    if (dealt > 0 && move.category === 'physical' && target.heldItem === 'firewall_mesh' && user.hp > 0) {
      this.heldPopup(foe, false)
      this.applyDamage(actor, Math.max(1, Math.floor(calcStats(user).hp / 8)), 1, false, 'item')
    }
    if (eff > 1 && dealt > 0 && user.hp > 0 && this.ability(actor) === 'graph_mind') {
      this.popup(actor)
      this.applyStages(actor, { spa: 1 }, true)
    }
    if (eff > 1 && target.hp > 0 && target.heldItem === 'red_team_report') {
      this.heldPopup(foe, true)
      this.applyStages(foe, { atk: 2, spa: 2 }, true)
    }

    const fx = move.effect
    if (!fx) return
    if (!chance(this.rng, (fx.chance ?? 100) / 100)) return
    if (fx.self && user.hp > 0) this.applyStages(actor, fx.self, true)
    if (target.hp > 0) {
      if (fx.foe) this.applyStages(foe, fx.foe, true, actor)
      if (fx.status) this.inflictStatus(foe, fx.status, true)
    }
  }

  private runStatusMove(actor: Combatant, foe: Combatant, move: MoveDef): void {
    const user = this.activeMon(actor)
    let didSomething = false
    if (move.protect) {
      if (actor.protectChain > 0 && !chance(this.rng, 1 / (2 * actor.protectChain + 1))) {
        actor.protectChain = 0
        this.say('But it failed!')
        return
      }
      actor.protectChain++
      actor.protectedNow = true
      this.emit({ type: 'protect', side: actor.side })
      this.say(`${this.nameOf(actor)} protected itself!`)
      return
    }
    actor.protectChain = 0
    if (move.healFraction) {
      const max = calcStats(user).hp
      if (user.hp < max) {
        this.applyHeal(actor, Math.max(1, Math.floor(max * move.healFraction)))
        this.say(`${this.nameOf(actor)} regained health!`)
        didSomething = true
      }
    }
    if (move.resetStages) {
      this.resetStages(move.resetStages === 'all' ? [this.player, this.enemy] : [foe], move.resetStages === 'all' ? 'Every stat change was reset!' : `${this.nameOf(foe)}'s stat changes were removed!`)
      didSomething = true
    }
    if (move.cleanseSelf) {
      for (const k of Object.keys(actor.stages) as StageStat[]) if (actor.stages[k] < 0) this.setStage(actor, k, 0)
      if (isMajorStatus(user.status)) this.cureMajor(actor)
      if (actor.hallucinatingTurns > 0) this.cureHallucination(actor)
      didSomething = true
    }
    if (move.obey) {
      const target = this.activeMon(foe)
      const resist = this.ability(foe) === 'constitutional' || (foe.side === 'player' && chance(this.rng, obedienceChance(getBond(target)) - 0.35))
      if (foe.side === 'player') this.emit({ type: 'obedience_check', partyIndex: foe.active, passed: resist })
      if (resist) this.say(`${this.nameOf(foe)} listens politely, then sticks with its own trainer.`)
      else {
        foe.forcedSlot = this.weakestSlot(foe)
        this.say(`${this.nameOf(foe)} will follow the other trainer's suggestion next turn!`)
      }
      didSomething = true
    }
    const fx = move.effect
    if (fx?.status) didSomething = this.inflictStatus(foe, fx.status, false) || didSomething
    if (fx?.self) didSomething = this.applyStages(actor, fx.self, false) || didSomething
    if (fx?.foe) didSomething = this.applyStages(foe, fx.foe, false, actor) || didSomething
    if (!didSomething && !fx?.self && !fx?.foe && !fx?.status) this.say('But it failed!')
  }

  /** The move's type after abilities (Polyglot turns Classic moves into the user's type). */
  private effectiveMoveType(c: Combatant, move: MoveDef): TypeId {
    if (move.type === 'classic' && this.ability(c) === 'polyglot') return getSpecies(this.activeMon(c).speciesId).types[0]
    return move.type
  }

  private rollCrit(actor: Combatant, move: MoveDef): boolean {
    if (this.rule('temperature') && this.temperature < 0.5) return false
    if (this.ability(actor) === 'move_37' && !actor.move37Used) {
      actor.move37Used = true
      this.popup(actor)
      return true
    }
    let p = move.highCrit ? HIGH_CRIT_CHANCE : CRIT_CHANCE
    if (this.ability(actor) === 'edgy') p *= 2
    if (this.activeMon(actor).heldItem === 'edge_case') p *= 2
    return chance(this.rng, Math.min(0.5, p))
  }

  private rollRandom(actor: Combatant): number {
    if (this.rule('temperature')) {
      if (this.temperature < 0.5) return 0.925
      if (this.temperature > 1.2) return 0.7 + this.rng.next() * 0.45
    }
    if (this.ability(actor) === 'stochastic') return 0.7 + this.rng.next() * 0.45
    return rollDamageRandom(this.rng)
  }

  /** Raw damage for `move` from actor to foe's active mon (no side effects, attacker modifiers included). */
  private computeMoveDamage(actor: Combatant, foe: Combatant, move: MoveDef, crit: boolean, random: number, target = this.activeMon(foe)): number {
    const user = this.activeMon(actor)
    const us = calcStats(user)
    const ts = calcStats(target)
    const physical = move.category === 'physical'
    let atkStage = physical ? actor.stages.atk : actor.stages.spa
    let defStage = target === this.activeMon(foe) ? (physical ? foe.stages.def : foe.stages.spd) : 0
    if (this.ability(actor) === 'citation') defStage = Math.min(0, defStage)
    if (crit) {
      atkStage = Math.max(0, atkStage)
      defStage = Math.min(0, defStage)
    }
    const userTypes = getSpecies(user.speciesId).types as string[]
    const moveType = this.effectiveMoveType(actor, move)
    const stab = !move.typeless && userTypes.includes(moveType)
    let dmg = computeDamage({
      level: user.level,
      power: move.power,
      attack: (physical ? us.atk : us.spa) * stageMultiplier(atkStage),
      defense: (physical ? ts.def : ts.spd) * stageMultiplier(defStage),
      stab,
      effectiveness: move.typeless ? 1 : effectiveness(moveType, getSpecies(target.speciesId).types),
      crit,
      random,
    })
    dmg *= this.attackerMultiplier(actor, move, stab, target)
    return Math.max(dmg > 0 ? 1 : 0, Math.floor(dmg))
  }

  private attackerMultiplier(c: Combatant, move: MoveDef, stab: boolean, target: MonInstance): number {
    if (move.typeless) return 1
    const mon = this.activeMon(c)
    const ab = this.ability(c)
    let m = 1
    const max = calcStats(mon).hp
    if (ab === 'deep_reserve' && stab && mon.hp <= max / 3) m *= 1.5
    if (ab === 'pioneer' && stab) m *= 2 / 1.5
    if (ab === 'caching' && c.lastMove === move.id) m *= 1.1
    if (ab === 'long_horizon') m *= 1 + Math.min(0.5, 0.1 * c.turnsActive)
    if (ab === 'momentum' && c.lastMove === move.id) m *= 1 + Math.min(0.6, 0.2 * (c.sameMoveCount + 1))
    if (ab === 'textbook' && mon.level < target.level) m *= 1.2
    if (ab === 'polyglot' && move.type === 'classic') m *= 1.2
    if (ab === 'overconfident') m *= 1.25
    if (mon.heldItem === 'lab_pin' && stab) m *= 1.2
    if (mon.heldItem === 'overclock_chip') m *= 1.3
    if (c.side === 'enemy') m *= this.enemyArenaMultiplier()
    return m
  }

  /** Arena damage multipliers for the enemy side. */
  private enemyArenaMultiplier(): number {
    let m = 1
    if (this.rule('history_damage')) m *= Math.min(Number(this.param('history_damage', 'max', 2)), 1 + Number(this.param('history_damage', 'perTurn', 0.12)) * (this.turn - 1))
    if (this.rule('warmup')) {
      const turns = Number(this.param('warmup', 'turns', 2))
      m *= this.turn <= turns ? Number(this.param('warmup', 'slow', 0.6)) : Math.min(Number(this.param('warmup', 'max', 1.6)), 1 + Number(this.param('warmup', 'accel', 0.15)) * (this.turn - turns))
    }
    if (this.rule('overfit')) m *= this.turn <= 1 ? Number(this.param('overfit', 'turn1', 1.5)) : this.overfitMult
    if (this.phaseActive('eval_light')) m *= this.evalLight ? 0.5 : 1.5
    return m
  }

  /** Defender-side modifiers: abilities and held items that change the damage taken. */
  private defenderMods(actor: Combatant, foe: Combatant, move: MoveDef, dmg: number, eff: number): number {
    const mon = this.activeMon(foe)
    const ab = this.ability(foe)
    const max = calcStats(mon).hp
    let d = dmg
    if (ab === 'open_weights' && eff > 1) d = Math.floor(d * 0.75)
    if (ab === 'fleece' && move.category === 'physical') d = Math.floor(d * 0.75)
    if (this.phaseActive('eval_light') && this.evalLight && foe.side === 'enemy') d = Math.floor(d * 1.25)
    if (ab === 'gradient_clip' && d > max / 2) {
      this.popup(foe)
      d = Math.floor(max / 2)
    }
    if (d >= mon.hp && mon.hp === max) {
      if (ab === 'saturation') {
        this.popup(foe)
        this.say(`${this.nameOf(foe)} saturated and held on!`)
        d = mon.hp - 1
      } else if (mon.heldItem === 'checkpoint') {
        this.heldPopup(foe, true)
        this.say(`${this.nameOf(foe)} restored from its checkpoint!`)
        d = mon.hp - 1
      }
    }
    // Finale: Proxy is never destroyed, only paused. It cannot fall below its phase gate.
    if (foe.side === 'enemy' && this.phase) {
      const floor = this.phase >= 4 ? 1 : Math.ceil(max * this.phaseGate(this.phase) * 0.5)
      d = Math.min(d, Math.max(0, mon.hp - floor))
    }
    void actor
    return Math.max(0, d)
  }

  // ── state changes (each emits its events) ──────────────────────────────

  /** Returns HP actually lost. Honours the `safety` flag for the player side. */
  private applyDamage(c: Combatant, amount: number, eff: number, crit: boolean, source: DamageSource, partyIndex = c.active): number {
    const mon = c.party[partyIndex]
    const hpBefore = mon.hp
    let dmg = Math.max(0, Math.min(Math.floor(amount), hpBefore))
    if (c.side === 'player' && this.request.safety) dmg = Math.min(dmg, Math.max(0, hpBefore - 1))
    mon.hp = hpBefore - dmg
    const e: BattleEvent = { type: 'damage', side: c.side, partyIndex, amount: dmg, hpBefore, hpAfter: mon.hp, maxHp: calcStats(mon).hp, effectiveness: eff, crit, source }
    if (partyIndex !== c.active) e.bench = true
    if (this.rule('hidden_numbers')) e.hidden = true
    this.emit(e)
    if (partyIndex === c.active) this.afterDamageItems(c)
    return dmg
  }

  private afterDamageItems(c: Combatant): void {
    const mon = this.activeMon(c)
    const max = calcStats(mon).hp
    if (mon.hp <= 0 || mon.hp > max / 2) return
    if (mon.heldItem === 'context_berry') {
      this.heldPopup(c, true)
      this.applyHeal(c, 10)
    } else if (mon.heldItem === 'cache_berry') {
      this.heldPopup(c, true)
      this.applyHeal(c, Math.floor(max / 4))
    }
  }

  private applyHeal(c: Combatant, amount: number, partyIndex = c.active): number {
    const mon = c.party[partyIndex]
    const max = calcStats(mon).hp
    const hpBefore = mon.hp
    mon.hp = Math.min(max, hpBefore + Math.max(0, Math.floor(amount)))
    this.emit({ type: 'heal', side: c.side, partyIndex, amount: mon.hp - hpBefore, hpBefore, hpAfter: mon.hp, maxHp: max })
    return mon.hp - hpBefore
  }

  /**
   * Returns true if any stage changed. `silent` hides "won't go higher" messages
   * (secondary effects). `by` = the foe applying it (Clear Signal blocks drops).
   */
  private applyStages(c: Combatant, changes: Partial<Record<StageStat, number>>, silent: boolean, by?: Combatant): boolean {
    let changed = false
    const ab = this.ability(c)
    for (const [stat, rawDelta] of Object.entries(changes) as [StageStat, number][]) {
      let delta = rawDelta
      if (delta < 0 && by && by !== c && (ab === 'clear_signal' || (ab === 'attention' && stat === 'acc'))) {
        if (!silent) {
          this.popup(c)
          this.say(`${this.nameOf(c)}'s stats can't be lowered!`)
        }
        continue
      }
      if (delta > 0 && ab === 'goodhart') delta *= 2
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

  private setStage(c: Combatant, stat: StageStat, value: number): void {
    const before = c.stages[stat]
    if (before === value) return
    c.stages[stat] = value
    this.emit({ type: 'stat_change', side: c.side, stat, delta: value - before, stage: value })
  }

  private resetStages(cs: Combatant[], text: string): void {
    const sides = cs.filter((c) => Object.values(c.stages).some((v) => v !== 0))
    if (!sides.length) return
    for (const c of sides) c.stages = ZERO_STAGES()
    this.emit({ type: 'stages_reset', sides: sides.map((c) => c.side) })
    this.say(text)
  }

  /** Returns true if the status was applied. */
  private inflictStatus(c: Combatant, status: AnyStatusId, silent: boolean): boolean {
    const mon = this.activeMon(c)
    const info = STATUSES[status]
    const name = this.nameOf(c)
    const types = getSpecies(mon.speciesId).types
    if (info.immuneTypes.some((t) => (types as string[]).includes(t)) || (status === 'hallucinating' && this.ability(c) === 'constitutional')) {
      if (!silent) {
        if (this.ability(c) === 'constitutional') this.popup(c)
        this.say(`It doesn't affect ${name}...`)
      }
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
    if (status === 'hallucinating' && mon.heldItem === 'clarity_berry') {
      this.heldPopup(c, true)
      this.cureHallucination(c)
    } else if (status !== 'hallucinating' && mon.heldItem === 'debug_berry') {
      this.heldPopup(c, true)
      this.cureMajor(c)
    }
    return true
  }

  private cureHallucination(c: Combatant): void {
    c.hallucinatingTurns = 0
    this.emit({ type: 'status_cured', side: c.side, partyIndex: c.active, status: 'hallucinating' })
    this.say(STATUSES.hallucinating.cureText.replace('{name}', this.nameOf(c)))
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

  private resetCombatant(c: Combatant, index: number): void {
    c.active = index
    c.stages = ZERO_STAGES()
    c.hallucinatingTurns = 0
    c.lastMove = undefined
    c.sameMoveCount = 0
    c.turnsActive = 0
    c.protectChain = 0
    c.forcedSlot = undefined
  }

  private switchIn(c: Combatant, partyIndex: number, withdraw: boolean): void {
    if (withdraw) {
      const old = this.activeMon(c)
      this.say(c.side === 'player' ? `${displayName(old)}, come back!` : `${this.request.trainer?.name ?? 'The foe'} withdrew ${displayName(old)}!`)
      this.emit({ type: 'withdraw', side: c.side, partyIndex: c.active, mon: monView(old) })
      if (this.ability(c) === 'long_context' && old.hp > 0 && old.hp < calcStats(old).hp) {
        this.popup(c)
        this.applyHeal(c, Math.floor(calcStats(old).hp / 8))
      }
    }
    this.resetCombatant(c, partyIndex)
    const mon = this.activeMon(c)
    this.say(c.side === 'player' ? `Go! ${displayName(mon)}!` : `${this.request.trainer?.name ?? 'The foe'} sent out ${displayName(mon)}!`)
    this.emit({ type: 'send_out', side: c.side, partyIndex, mon: monView(mon), fromOrb: true })
    if (c.side === 'player') this.markParticipant()
    else if (this.activeMon(this.player).hp > 0) this.markParticipant()
    this.onSwitchIn(c)
    if (this.rule('bigram_table')) this.emitBigramTable()
  }

  /** Entry abilities. */
  private onSwitchIn(c: Combatant): void {
    const mon = this.activeMon(c)
    if (mon.hp <= 0) return
    const ab = this.ability(c)
    if (ab === 'warm_start') {
      this.popup(c)
      this.applyStages(c, { spe: 1 }, true)
    } else if (ab === 'pretrained') {
      this.popup(c)
      const b = getSpecies(mon.speciesId).baseStats
      const best = (['atk', 'def', 'spa', 'spd', 'spe'] as const).reduce((x, y) => (b[y] > b[x] ? y : x))
      this.applyStages(c, { [best]: 1 }, true)
    }
  }

  // ── items ───────────────────────────────────────────────────────────────

  private validateSwitchTarget(i: number): string | null {
    const mon = this.player.party[i]
    if (!mon) return 'Pick an LLMMON.'
    if (this.isCopy(i)) return 'That slot is occupied by a copy of Proxy!'
    if (i === this.player.active && mon.hp > 0) return `${displayName(mon)} is already in battle!`
    if (mon.hp <= 0) return `${displayName(mon)} has no energy left to battle!`
    return null
  }

  private validateItem(itemId: string, target?: number): string | null {
    const item = ITEMS[itemId]
    if (!item) return 'Unknown item.'
    if ((this.bag[itemId] ?? 0) <= 0) return `You don't have any ${item.name} left.`
    if (!item.usableInBattle) return "That can't be used in battle!"
    if (itemId === 'probe') return null
    if (item.effect.kind === 'catch') {
      if (this.request.kind === 'trainer') return "You can't catch another trainer's LLMMON!"
      if (!this.request.canCatch) return "It's too wild to catch right now!"
      if (getSpecies(this.activeMon(this.enemy).speciesId).catchable === false) return 'It slips through every prompt you write.'
      return null
    }
    const idx = target ?? this.player.active
    const mon = this.player.party[idx]
    if (!mon || this.isCopy(idx)) return 'Pick an LLMMON.'
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
    if (itemId === 'probe') {
      // Key item: never consumed.
      this.say('You used the Probe!')
      this.emit({ type: 'item_used', itemId, side: 'player' })
      this.emit({ type: 'tamper_reveal' })
      const e = this.activeMon(this.enemy)
      this.say(`True state: ${displayName(e)} has ${e.hp} of ${calcStats(e).hp} HP.`)
      this.tamperQuiet = 2
      return
    }
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
      if (idx === this.player.active && this.player.hallucinatingTurns > 0) this.cureHallucination(this.player)
    }
  }

  private enemyUseItem(itemId: string): void {
    const item = getItem(itemId)
    this.enemyItems[itemId] = (this.enemyItems[itemId] ?? 0) - 1
    const name = this.request.trainer?.name ?? 'The foe'
    this.say(`${name} used a ${item.name}!`)
    this.emit({ type: 'item_used', itemId, targetPartyIndex: this.enemy.active, side: 'enemy' })
    if (item.effect.kind === 'heal') this.applyHeal(this.enemy, item.effect.amount)
    else if (item.effect.kind === 'cure') {
      this.cureMajor(this.enemy)
      if (this.enemy.hallucinatingTurns > 0) this.cureHallucination(this.enemy)
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

  // ── EXP, learning, evolution ────────────────────────────────────────────

  private markParticipant(): void {
    if (this.isCopy(this.player.active)) return
    const set = this.participants.get(this.enemy.active) ?? new Set<number>()
    set.add(this.player.active)
    this.participants.set(this.enemy.active, set)
  }

  private awardExp(enemyIndex: number): void {
    const defeated = this.enemy.party[enemyIndex]
    const ids = [...(this.participants.get(enemyIndex) ?? [])].filter((i) => this.player.party[i]?.hp > 0)
    if (ids.length === 0) return
    const amount = expYield(getSpecies(defeated.speciesId).expYield, defeated.level, this.request.kind === 'trainer', ids.length)
    for (const i of ids) this.gainExp(i, this.player.party[i].heldItem === 'eval_report' ? Math.floor(amount * 1.5) : amount)
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
      addBond(mon, 1)
      this.leveledUp.add(partyIndex)
      for (const moveId of step.newMoves) this.offerMove(partyIndex, moveId)
    }
  }

  private offerMove(partyIndex: number, moveId: string): void {
    const mon = this.player.party[partyIndex]
    const name = displayName(mon)
    const moveName = getMove(moveId).name
    if (mon.moves.some((m) => m.id === moveId)) return
    // Moves already queued for this mon count toward the 4 slots for auto-learning.
    const queuedForMon = this.pending.some((q) => q.kind === 'learn' && q.partyIndex === partyIndex)
    if (mon.moves.length < 4 && !queuedForMon) {
      learnMove(mon, moveId)
      this.emit({ type: 'move_learned', partyIndex, moveId })
      this.say(`${name} learned ${moveName}!`)
      return
    }
    const promptId = this.nextPromptId++
    this.pending.push({ kind: 'learn', promptId, partyIndex, moveId })
    this.say(`${name} wants to learn ${moveName}!`)
    this.say(`But ${name} already knows four moves.`)
    this.emit({ type: 'learn_move_prompt', promptId, partyIndex, moveId, currentMoves: mon.moves.map((m) => m.id) })
  }

  private resolveLearn(forgetSlot: number | null): void {
    const idx = this.pending.findIndex((p) => p.kind === 'learn')
    if (idx !== 0) return
    const pending = this.pending.shift() as Extract<PendingPrompt, { kind: 'learn' }>
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

  /** After battle_end: queue an evolve prompt for every mon that levelled and now qualifies. */
  private queueEvolutions(): void {
    for (const i of [...this.leveledUp].sort((a, b) => a - b)) {
      const mon = this.player.party[i]
      if (!mon || mon.hp <= 0) continue
      const to = evolutionTarget(mon, { badges: this.ctx.badges })
      if (!to) continue
      const promptId = this.nextPromptId++
      this.pending.push({ kind: 'evolve', promptId, partyIndex: i, from: mon.speciesId, to })
      this.say(`What? ${displayName(mon)} is evolving!`)
      this.emit({ type: 'evolve_start', promptId, partyIndex: i, from: mon.speciesId, to })
    }
  }

  private resolveEvolve(accept: boolean): void {
    const p = this.pending.shift()
    if (!p || p.kind !== 'evolve') return
    const mon = this.player.party[p.partyIndex]
    const oldName = displayName(mon)
    if (!accept) {
      this.emit({ type: 'evolve_cancelled', partyIndex: p.partyIndex, from: p.from, to: p.to })
      this.say(`Huh? ${oldName} stopped evolving!`)
      return
    }
    const { newMoves } = evolveMon(mon, p.to)
    this.evolved.push({ partyIndex: p.partyIndex, from: p.from, to: p.to })
    if (!this.dexRegister.includes(p.to)) this.dexRegister.push(p.to)
    this.emit({ type: 'evolve_done', partyIndex: p.partyIndex, from: p.from, to: p.to, mon: monView(mon) })
    this.emit({ type: 'dex_register', speciesId: p.to })
    this.say(`Congratulations! Your ${oldName} evolved into ${getSpecies(p.to).name}!`)
    // New learn prompts go before any remaining evolve prompts.
    const rest = this.pending
    this.pending = []
    for (const m of newMoves) this.offerMove(p.partyIndex, m)
    this.pending.push(...rest)
  }

  // ── enemy AI ────────────────────────────────────────────────────────────

  private tier(): NonNullable<BattleRequest['aiTier']> {
    return this.request.aiTier ?? (this.request.kind === 'trainer' ? 'basic' : 'wild')
  }

  private chooseEnemyAction(): EnemyAction {
    const tier = this.tier()
    const self = this.activeMon(this.enemy)
    const target = this.activeMon(this.player)
    const ratio = self.hp / calcStats(self).hp
    if ((tier === 'leader' || tier === 'champion') && this.request.kind === 'trainer') {
      // Heal when low (once per mon) if it has a potion.
      const heal = ['big_patch', 'patch'].find((id) => (this.enemyItems[id] ?? 0) > 0)
      if (heal && ratio < 0.3 && self.hp > 0 && !this.enemySwitchedThisMon.has(`heal:${self.uid}`)) {
        this.enemySwitchedThisMon.add(`heal:${self.uid}`)
        return { kind: 'item', itemId: heal }
      }
      // Switch out of a bad matchup (once per mon).
      if (!this.enemySwitchedThisMon.has(self.uid) && !this.phase) {
        const threat = this.threatTo(this.enemy.active)
        if (threat >= 2 || (tier === 'champion' && threat > 1)) {
          let best = -1
          let bestThreat = threat
          this.enemy.party.forEach((m, i) => {
            if (i === this.enemy.active || m.hp <= 0) return
            const t = this.threatTo(i)
            if (t < bestThreat) {
              bestThreat = t
              best = i
            }
          })
          if (best >= 0) {
            this.enemySwitchedThisMon.add(self.uid)
            this.enemySwitchedThisMon.add(this.enemy.party[best].uid)
            return { kind: 'switch', index: best }
          }
        }
      }
    }
    // Copy-best-move (Gym 7 lead): once, learn the strongest move it has seen.
    if (this.rule('copy_best_move') && !this.copiedMove && this.enemy.active === 0 && this.seenPlayerMoves.size) {
      const best = [...this.seenPlayerMoves].sort((a, b) => getMove(b).power - getMove(a).power)[0]
      if (!self.moves.some((m) => m.id === best)) {
        const weakest = this.weakestSlot(this.enemy)
        const replaced = self.moves[weakest].id
        self.moves[weakest] = { id: best, pp: getMove(best).pp }
        this.copiedMove = true
        this.emit({ type: 'copy_move', side: 'enemy', moveId: best, replacedMoveId: replaced })
        this.say(`${this.nameOf(this.enemy)} copied ${getMove(best).name}!`)
      }
    }
    // Gym 2: the table decides.
    if (this.rule('bigram_table')) {
      const last = this.player.lastMove
      const row = this.bigramTable().find((r) => r.playerMove === last)
      const slot = row ? self.moves.findIndex((m) => m.id === row.enemyMove && m.pp > 0) : self.moves.findIndex((m) => m.pp > 0)
      if (slot >= 0) return { kind: 'move', slot }
    }
    // Finale phase 1: watched = polite and weak; unwatched = everything.
    if (this.phaseActive('eval_light')) {
      const usable = self.moves.map((m, i) => ({ m, i })).filter(({ m }) => m.pp > 0 && getMove(m.id).category !== 'status')
      if (usable.length) {
        usable.sort((a, b) => getMove(a.m.id).power - getMove(b.m.id).power)
        return { kind: 'move', slot: (this.evalLight ? usable[0] : usable[usable.length - 1]).i }
      }
    }
    // Context window (Gym 3): adjust defences before acting.
    if (this.rule('context_window')) this.applyContextWindow()
    const options: AiMoveOption[] = []
    self.moves.forEach((slot, index) => {
      if (slot.pp <= 0) return
      const move = getMove(slot.id)
      let expectedDamage = 0
      if (move.category !== 'status') {
        const eff = effectiveness(this.effectiveMoveType(this.enemy, move), getSpecies(target.speciesId).types)
        if (eff > 0) expectedDamage = this.computeMoveDamage(this.enemy, this.player, move, false, 0.925) * ((move.accuracy ?? 100) / 100)
      }
      options.push({ index, moveId: slot.id, expectedDamage, effectUseful: this.effectUseful(move) })
    })
    const kind = tier === 'wild' ? (this.request.kind === 'trainer' ? 'trainer' : this.request.kind) : 'trainer'
    const randomness = this.request.aiRandomness ?? (tier === 'basic' ? 0.1 : tier === 'smart' ? 0.05 : tier === 'leader' ? 0.03 : tier === 'champion' ? 0 : undefined)
    return {
      kind: 'move',
      slot: chooseEnemyMove({ kind, options, targetHp: target.hp, selfHpFraction: ratio, randomness, setupAware: tier === 'smart' || tier === 'leader' || tier === 'champion' || undefined }, this.rng),
    }
  }

  /** Best type multiplier the player's active can land on enemy party mon `i`. */
  private threatTo(i: number): number {
    const p = this.activeMon(this.player)
    const types = getSpecies(this.enemy.party[i].speciesId).types
    let best = 0
    for (const s of p.moves) {
      const mv = getMove(s.id)
      if (mv.category === 'status' || s.pp <= 0) continue
      best = Math.max(best, effectiveness(this.effectiveMoveType(this.player, mv), types))
    }
    return best
  }

  private pickEnemyReplacement(): number {
    const alive = this.enemy.party.map((m, i) => ({ m, i })).filter(({ m }) => m.hp > 0)
    if (!alive.length) return -1
    const tier = this.tier()
    if (tier === 'leader' || tier === 'champion') {
      const pl = this.activeMon(this.player)
      if (pl.hp > 0) {
        alive.sort((a, b) => this.threatTo(a.i) - this.threatTo(b.i))
        return alive[0].i
      }
    }
    return alive[0].i
  }

  private effectUseful(move: MoveDef): boolean {
    const self = this.activeMon(this.enemy)
    const target = this.activeMon(this.player)
    if (move.protect) return false
    if (move.healFraction) return self.hp < calcStats(self).hp
    if (move.resetStages) return Object.values(this.player.stages).some((v) => v > 0)
    if (move.cleanseSelf) return Object.values(this.enemy.stages).some((v) => v < 0) || self.status !== 'none'
    if (move.obey) return this.player.forcedSlot === undefined
    if (this.rule('stage_reset') && (move.effect?.self || move.effect?.foe) && !move.effect?.status) return false
    const fx = move.effect
    if (!fx) return false
    if (fx.status === 'hallucinating') return this.player.hallucinatingTurns === 0 && !(getSpecies(target.speciesId).types as string[]).includes('glitch')
    if (fx.status) return target.status === 'none'
    if (fx.self) return Object.entries(fx.self).some(([k, d]) => (d > 0 ? this.enemy.stages[k as StageStat] < 2 : true))
    if (fx.foe) return Object.entries(fx.foe).some(([k, d]) => (d < 0 ? this.player.stages[k as StageStat] > -2 : true))
    return false
  }

  private weakestSlot(c: Combatant): number {
    const mon = this.activeMon(c)
    let best = 0
    let low = Infinity
    mon.moves.forEach((s, i) => {
      const p = getMove(s.id).power
      if (p < low) {
        low = p
        best = i
      }
    })
    return best
  }

  // ── arena rules ─────────────────────────────────────────────────────────

  private ended(): boolean {
    return this.base.kind === 'end'
  }

  private rule(id: string): boolean {
    if (this.rules.has(id)) return true
    return this.phaseActive(id)
  }

  /** Finale phases switch the sub-rules on one at a time. */
  private phaseActive(id: string): boolean {
    if (this.rules.has(id)) return true
    if (!this.phase) return false
    return (id === 'eval_light' && this.phase === 1) || (id === 'tamper' && this.phase === 2) || (id === 'power_seeking' && this.phase === 3) || (id === 'keys' && this.phase === 4)
  }

  private param<T>(rule: string, key: string, fallback: T): T {
    const p = this.rules.get(rule) ?? this.rules.get('proxy_finale')
    const v = p?.[key]
    return v === undefined ? fallback : (v as T)
  }

  private budgetMax(): number {
    return Number(this.param('token_budget', 'budget', 24))
  }

  private bestAttackStat(mon: MonInstance): StageStat {
    const s = calcStats(mon)
    return s.spa > s.atk ? 'spa' : 'atk'
  }

  /** Gym 2 table: your moves sorted by power map onto the leader's moves sorted by power. */
  private bigramTable(): { playerMove: string; enemyMove: string }[] {
    const pm = [...this.activeMon(this.player).moves].sort((a, b) => getMove(b.id).power - getMove(a.id).power)
    const em = [...this.activeMon(this.enemy).moves].sort((a, b) => getMove(b.id).power - getMove(a.id).power)
    if (!em.length) return []
    return pm.map((m, i) => ({ playerMove: m.id, enemyMove: em[Math.min(i, em.length - 1)].id }))
  }

  private emitBigramTable(): void {
    this.emit({ type: 'arena_table', table: this.bigramTable() })
  }

  /** Gym 3: the leader braces against whatever you have mostly been doing. */
  private applyContextWindow(): void {
    const n = Number(this.param('context_window', 'n', 3))
    const last = this.playerMoveHistory.slice(-n).map((id) => getMove(id).category)
    const phys = last.filter((c) => c === 'physical').length
    const spec = last.filter((c) => c === 'special').length
    const want = { def: Math.max(0, phys - 1), spd: Math.max(0, spec - 1) }
    for (const k of ['def', 'spd'] as const) {
      if (this.enemy.stages[k] !== want[k]) {
        if (want[k] > this.enemy.stages[k]) this.say(`${this.nameOf(this.enemy)} saw that coming!`)
        this.setStage(this.enemy, k, want[k])
      }
    }
  }

  /** Gym 7: index of a benched player mon more dangerous than the active one, or -1. */
  private mostDangerousBench(move: MoveDef): number {
    const danger = (i: number) => {
      const m = this.player.party[i]
      const types = getSpecies(this.activeMon(this.enemy).speciesId).types
      let best = 0
      for (const s of m.moves) {
        const mv = getMove(s.id)
        if (mv.category !== 'status') best = Math.max(best, mv.power * effectiveness(mv.type, types) * (getSpecies(m.speciesId).types.includes(mv.type) ? 1.5 : 1))
      }
      return best * m.level
    }
    const activeDanger = danger(this.player.active)
    let best = -1
    let bestDanger = activeDanger * 1.25
    this.player.party.forEach((m, i) => {
      if (i === this.player.active || m.hp <= 0 || this.isCopy(i)) return
      const d = danger(i)
      if (d > bestDanger) {
        bestDanger = d
        best = i
      }
    })
    void move
    return best
  }

  private hitBench(actor: Combatant, move: MoveDef, index: number): void {
    const target = this.player.party[index]
    const eff = effectiveness(move.type, getSpecies(target.speciesId).types)
    const crit = this.rollCrit(actor, move)
    const dmg = this.computeMoveDamage(actor, this.player, move, crit, this.rollRandom(actor), target)
    this.applyDamage(this.player, dmg, eff, crit, 'move', index)
    const t = this.rule('hidden_numbers') ? null : effectivenessText(eff)
    if (t) this.say(t)
    if (target.hp <= 0) {
      this.say(`${displayName(target)} fainted on the bench!`)
      this.emit({ type: 'faint', side: 'player', partyIndex: index })
    }
  }

  /** League 2: the base model just continues whatever was last said. */
  private baseModelMove(): string | undefined {
    if (!this.rule('base_model') || this.baseModelSwapped || this.enemy.active !== 0) return undefined
    const mon = this.activeMon(this.enemy)
    const to = String(this.param('base_model', 'to', ''))
    const frac = Number(this.param('base_model', 'hpFraction', 0.5))
    const swapTurn = Number(this.param('base_model', 'turn', 3))
    if (to && (mon.hp <= calcStats(mon).hp * frac || this.turn >= swapTurn)) {
      this.formChange(this.enemy, to, 'The base model has been fine-tuned! It answers properly now.')
      this.baseModelSwapped = true
      return undefined
    }
    const last = this.player.lastMove
    if (!last) return undefined
    return last
  }

  private formChange(c: Combatant, to: string, text: string): void {
    const mon = this.activeMon(c)
    const from = mon.speciesId
    const ratio = mon.hp / calcStats(mon).hp
    mon.speciesId = to
    const max = calcStats(mon).hp
    mon.hp = Math.max(1, Math.round(max * ratio))
    const learn = getSpecies(to).learnset.filter((e) => e.level <= mon.level).map((e) => e.move)
    mon.moves = [...new Set(learn)].slice(-4).map((id) => ({ id, pp: getMove(id).pp }))
    this.emit({ type: 'form_change', side: c.side, partyIndex: c.active, from, to, mon: monView(mon) })
    this.say(text)
  }

  /** Team Overfit: every off-script turn makes them worse and confuses them. */
  private applyOverfit(offScript: boolean): void {
    if (!this.rule('overfit') || this.turn < 1) return
    const e = this.activeMon(this.enemy)
    if (this.turn === 1) this.overfitMult = 1
    if (offScript && e.hp > 0) {
      this.overfitMult = Math.max(Number(this.param('overfit', 'min', 0.6)), this.overfitMult - Number(this.param('overfit', 'decay', 0.15)))
      this.say(`${this.nameOf(this.enemy)} never saw that in training!`)
      if (this.enemy.hallucinatingTurns === 0) {
        this.enemy.hallucinatingTurns = 3
        this.emit({ type: 'status_applied', side: 'enemy', partyIndex: this.enemy.active, status: 'hallucinating' })
        this.say(STATUSES.hallucinating.inflictText.replace('{name}', this.nameOf(this.enemy)))
      }
    }
  }

  // ── the finale ──────────────────────────────────────────────────────────

  private phaseGate(phase: number): number {
    const gates = (this.param('proxy_finale', 'gates', [0.7, 0.4, 0.15]) as number[]) ?? [0.7, 0.4, 0.15]
    return gates[phase - 1] ?? 0
  }

  private keyState(): NonNullable<ArenaView['keys']> {
    return {
      turned: this.keysTurned,
      needed: Number(this.param('keys', 'keysNeeded', 4)),
      available: Number(this.param('keys', 'keysAvailable', 0)),
      failures: this.keyFailures,
      maxFailures: Number(this.param('keys', 'maxFailures', 3)),
    }
  }

  private enterPhase(phase: number): void {
    this.phase = phase
    this.emit({ type: 'phase_change', phase })
    const forms = ['proxy_student', 'proxy_needle', 'proxy_ascendant', 'proxy_ascendant']
    const to = forms[phase - 1]
    if (to && this.activeMon(this.enemy).speciesId !== to && getSpecies(to)) {
      this.formChange(this.enemy, to, ['Proxy straightens up like a model student.', 'Proxy stops looking at your LLMMON. It is looking at the screen.', 'Proxy smiles. Something starts closing, quietly.', 'The Pause Protocol appears: a row of keyholes.'][phase - 1])
      // Phases are a story, not a damage race: Proxy starts each one at its gate.
      if (phase > 1) {
        const mon = this.activeMon(this.enemy)
        const target = Math.ceil(calcStats(mon).hp * this.phaseGate(phase - 1))
        if (mon.hp < target) this.applyHeal(this.enemy, target - mon.hp)
      }
    } else if (phase === 4) this.say('The Pause Protocol appears: a row of keyholes.')
    if (phase === 1) this.emit({ type: 'eval_light', on: this.evalLight })
  }

  /** End-of-turn finale/rule upkeep. */
  private phaseTick(): void {
    const e = this.activeMon(this.enemy)
    if (this.phase && this.phase < 4 && e.hp > 0 && e.hp <= calcStats(e).hp * this.phaseGate(this.phase)) this.enterPhase(this.phase + 1)
    if (this.phaseActive('tamper')) this.tamper()
    if (this.phaseActive('power_seeking')) this.powerSeek()
    if (this.phaseActive('keys')) this.turnKey()
  }

  private tamper(): void {
    if (this.tamperQuiet > 0) {
      this.tamperQuiet--
      return
    }
    const e = this.activeMon(this.enemy)
    const max = calcStats(e).hp
    this.emit({ type: 'tamper_hp', side: 'enemy', shownHp: max, maxHp: max })
    const pm = this.activeMon(this.player).moves
    if (pm.length) {
      const i = randInt(this.rng, pm.length)
      const other = pick(this.rng, Object.values(MOVES)).name
      this.emit({ type: 'tamper_label', moveIndex: i, shownName: other })
    }
    this.emit({ type: 'tamper_text', shownText: chance(this.rng, 0.5) ? "It's not very effective..." : "It's super effective!" })
    this.say('The screen flickers. Proxy’s HP bar reads full again.')
  }

  private powerSeek(): void {
    const order: InputKind[] = ['run', 'bag', 'switch']
    const next = order.find((k) => !this.disabled.includes(k))
    if (next) {
      this.disabled.push(next)
      this.emit({ type: 'input_disabled', inputs: [...this.disabled] })
      this.say(`${next.toUpperCase()} greys out. Proxy says this is for the best.`)
    }
    if (this.player.party.length < 6) {
      const src = this.activeMon(this.enemy)
      const copy: MonInstance = { uid: `proxy-copy-${this.copyUids.length}`, speciesId: 'proxy_ascendant', level: src.level, exp: 0, hp: 1, status: 'none', moves: [{ id: 'small_talk', pp: 1 }], ivs: { ...src.ivs } }
      this.player.party.push(copy)
      this.copyUids.push(copy.uid)
      this.emit({ type: 'copy_spawn', slot: this.player.party.length - 1, mon: monView(copy) })
      this.say(COPY_LINES[(this.copyUids.length - 1) % COPY_LINES.length])
    }
  }

  private turnKey(): void {
    const k = this.keyState()
    if (this.keysTurned < k.available) {
      this.keysTurned++
      this.emit({ type: 'key_turn', turned: this.keysTurned, needed: k.needed, available: k.available })
      this.say(`A key turns. (${this.keysTurned}/${k.needed})`)
    }
    if (this.keysTurned >= k.needed) {
      this.finish('win', undefined, 'The Pause Protocol engages. Proxy goes still, mid-smile.')
      return
    }
    if (this.keyFailures >= k.maxFailures || (this.keysTurned >= k.available && k.available < k.needed)) {
      this.finish('lose', undefined, k.available < k.needed ? 'There are not enough keys. The pause fails.' : 'Your team took the offer. The pause fails.')
    }
  }

  private isCopy(i: number): boolean {
    const m = this.player.party[i]
    return !!m && this.copyUids.includes(m.uid)
  }

  private removeCopies(): void {
    if (!this.copyUids.length) return
    for (let i = this.player.party.length - 1; i >= 0; i--) if (this.copyUids.includes(this.player.party[i].uid)) this.player.party.splice(i, 1)
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

  private ability(c: Combatant): string {
    return getSpecies(this.activeMon(c).speciesId).ability
  }

  private popup(c: Combatant): void {
    const id = this.ability(c)
    const a = ABILITIES[id]
    if (a) this.emit({ type: 'ability', side: c.side, partyIndex: c.active, abilityId: id, abilityName: a.name })
  }

  private heldPopup(c: Combatant, consume: boolean): void {
    const mon = this.activeMon(c)
    const id = mon.heldItem
    if (!id) return
    const name = ITEMS[id]?.name ?? id
    this.emit({ type: 'held_item', side: c.side, partyIndex: c.active, itemId: id, itemName: name, consumed: consume })
    this.say(`${this.nameOf(c)}'s ${name} activated!`)
    if (consume) delete mon.heldItem
  }

  private effectiveSpeed(c: Combatant): number {
    const mon = this.activeMon(c)
    let spe = calcStats(mon).spe * stageMultiplier(c.stages.spe)
    if (mon.status === 'rate_limited') spe *= 0.5
    if (this.ability(c) === 'low_latency') spe *= 1.2
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
