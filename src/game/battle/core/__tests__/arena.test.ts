// Arena rules (BattleRequest.arena): one focused test per rule id.

import { describe, expect, it } from 'vitest'
import type { BattleRequest, MonInstance } from '../../../types.ts'
import { ARENA_RULES, obedienceChance, tokenCost, type ArenaRuleId } from '../arena.ts'
import { Battle } from '../battle.ts'
import type { BattleEvent, BattleInput } from '../events.ts'
import { createMon } from '../mon.ts'
import { createRng, type Rng } from '../rng.ts'

let seq = 1
const IV = { hp: 8, atk: 8, def: 8, spa: 8, spd: 8, spe: 8 }
const mon = (id: string, level: number, moves?: string[], extra: Partial<MonInstance> = {}): MonInstance => ({ ...createMon(id, level, createRng(seq++), { ivs: IV, moves }), ...extra })
const fixed = (v: number): Rng => ({ next: () => v })
const ofType = <T extends BattleEvent['type']>(events: BattleEvent[], type: T) => events.filter((e): e is Extract<BattleEvent, { type: T }> => e.type === type)
const texts = (events: BattleEvent[]) => ofType(events, 'text').map((e) => e.text)

function trainer(enemy: MonInstance[], arena: BattleRequest['arena'], extra: Partial<BattleRequest> = {}): BattleRequest {
  return { kind: 'trainer', enemyParty: enemy, trainer: { id: 't', name: 'Leader Test', sprite: 'x', loseText: 'ok', prize: 10 }, canRun: false, canCatch: false, background: 'gym', arena, aiTier: 'basic', aiRandomness: 0, ...extra }
}

function setup(player: MonInstance[], enemy: MonInstance[], arena: BattleRequest['arena'], rng: Rng = createRng(7), extra: Partial<BattleRequest> = {}, bag: Record<string, number> = {}) {
  const battle = new Battle({ request: trainer(enemy, arena, extra), party: player, bag, rng })
  const intro = battle.start()
  return { battle, intro, bag }
}

/** Submit `input` (or the first damaging move) for up to `n` turns, collecting events. */
function play(battle: Battle, n: number, input: (b: Battle) => BattleInput = () => ({ type: 'fight', moveIndex: 0 })): BattleEvent[] {
  const all: BattleEvent[] = []
  for (let i = 0; i < n && battle.getPrompt().kind === 'action'; i++) all.push(...battle.submit(input(battle)))
  return all
}

describe('arena rule registry', () => {
  it('every rule id has a name, intro text and params note', () => {
    for (const [id, info] of Object.entries(ARENA_RULES)) {
      expect(info.id).toBe(id)
      expect(info.name.length).toBeGreaterThan(2)
      expect(info.text.length).toBeGreaterThan(10)
    }
  })
  it('announces each rule at battle start', () => {
    const { intro } = setup([mon('glm', 20)], [mon('sgd', 20)], [{ id: 'gradient_descent' }, { id: 'hidden_numbers' }])
    expect(ofType(intro, 'arena_rule').map((e) => e.ruleId)).toEqual(['gradient_descent', 'hidden_numbers'])
    expect(texts(intro)).toContain(ARENA_RULES.hidden_numbers.text)
  })
})

describe('gym rules', () => {
  it('gradient_descent: starts at -1, one step per surviving turn, converges at +1', () => {
    const { battle, intro } = setup([mon('claude_opus', 60, ['small_talk'])], [mon('sgd', 10, ['descent'])], [{ id: 'gradient_descent' }])
    expect(ofType(intro, 'stat_change')[0]).toMatchObject({ side: 'enemy', stat: 'atk', delta: -1 })
    play(battle, 5)
    expect(battle.getView().enemy.stages.atk).toBe(1)
  })

  it('bigram_table: the table is shown and the leader answers your last move from it', () => {
    const { battle, intro } = setup([mon('claude_opus', 50, ['warm_nudge', 'small_talk'])], [mon('n_gram', 50, ['bigram_bite', 'next_token', 'small_talk'])], [{ id: 'bigram_table' }])
    const table = ofType(intro, 'arena_table')[0].table
    expect(table.length).toBe(2)
    expect(battle.getView().arena?.bigramTable).toEqual(table)
    battle.submit({ type: 'fight', moveIndex: 0 })
    const ev = battle.submit({ type: 'fight', moveIndex: 0 })
    const reply = table.find((r) => r.playerMove === 'warm_nudge')!.enemyMove
    expect(ofType(ev, 'move_used').find((e) => e.side === 'enemy')?.moveId).toBe(reply)
  })

  it('context_window: repeating a category braces the leader, on top of its own boosts', () => {
    const { battle } = setup([mon('claude_opus', 60, ['autocomplete'])], [mon('tanh', 40, ['hidden_layer'])], [{ id: 'context_window' }])
    play(battle, 4)
    const st = battle.getView().enemy.stages
    // Hidden Layer x4 = +4 def (capped by its own uses), +2 more from three physical moves in a row.
    expect(st.def).toBeGreaterThanOrEqual(4)
    expect(st.def).toBeGreaterThan(st.spd)
  })

  it('stage_reset: every stage returns to 0 at end of turn', () => {
    const { battle } = setup([mon('claude_opus', 60, ['focus_token'])], [mon('tanh', 40, ['hidden_layer'])], [{ id: 'stage_reset' }])
    const ev = play(battle, 1)
    expect(ofType(ev, 'stages_reset')[0].sides.sort()).toEqual(['enemy', 'player'])
    expect(Object.values(battle.getView().player.stages).every((v) => v === 0)).toBe(true)
  })

  it('hidden_numbers: damage flagged hidden, no effectiveness or crit text', () => {
    const { battle } = setup([mon('claude_fable', 30, ['extended_thinking'])], [mon('glm', 30, ['graph_paw'])], [{ id: 'hidden_numbers' }], fixed(0.01))
    const ev = play(battle, 1)
    expect(battle.getView().arena?.hideNumbers).toBe(true)
    expect(ofType(ev, 'damage').every((d) => d.hidden)).toBe(true)
    expect(texts(ev).some((t) => /effective|critical/.test(t))).toBe(false)
  })

  it('history_damage: the same hit grows with battle length', () => {
    const { battle } = setup([mon('guardrail', 70, ['focus_token'])], [mon('wavenet', 40, ['recur'])], [{ id: 'history_damage', params: { perTurn: 0.1, max: 2 } }], fixed(0.5))
    const ev = play(battle, 9)
    const hits = ofType(ev, 'damage').filter((d) => d.side === 'player').map((d) => d.amount)
    expect(hits[8]).toBeGreaterThan(hits[0] * 1.5)
  })

  it('smart_targeting: hits the most dangerous benched mon', () => {
    const player = [mon('gemma_4', 20, ['small_talk']), mon('claude_opus', 40, ['extended_thinking'])]
    const { battle } = setup(player, [mon('attention_head', 30, ['attend'])], [{ id: 'smart_targeting' }])
    const ev = play(battle, 1)
    const d = ofType(ev, 'damage').find((e) => e.side === 'player')!
    expect(d.bench).toBe(true)
    expect(d.partyIndex).toBe(1)
  })

  it('copy_best_move: the lead copies the strongest move it has seen', () => {
    const { battle } = setup([mon('claude_opus', 60, ['extended_thinking'])], [mon('attention_head', 60, ['attend', 'small_talk'])], [{ id: 'copy_best_move' }])
    const ev = play(battle, 2)
    expect(ofType(ev, 'copy_move')[0]).toMatchObject({ side: 'enemy', moveId: 'extended_thinking', replacedMoveId: 'small_talk' })
  })

  it('token_budget: names cost tokens, a long name is cut off mid-move', () => {
    expect(tokenCost('Extended Thinking')).toBe(16)
    const { battle } = setup([mon('claude_opus', 60, ['extended_thinking'])], [mon('bpe', 60, ['merge'])], [{ id: 'token_budget', params: { budget: 20 } }])
    const ev = play(battle, 1)
    const b = ofType(ev, 'arena_budget')
    expect(b.length).toBeGreaterThan(0)
    expect(b.some((e) => e.cutOff)).toBe(true)
    expect(texts(ev).some((t) => /ran out/.test(t))).toBe(true)
    expect(battle.getView().arena?.tokenBudget?.max).toBe(20)
  })
})

describe('League rules', () => {
  it('warmup: slow for two turns, then accelerates', () => {
    const { battle } = setup([mon('guardrail', 70, ['focus_token'])], [mon('gpt_2', 45, ['next_token'])], [{ id: 'warmup' }], fixed(0.5))
    const hits = ofType(play(battle, 6), 'damage').filter((d) => d.side === 'player').map((d) => d.amount)
    expect(hits[0]).toBeLessThan(hits[5] * 0.6)
  })

  it('base_model: the lead continues your last move, then is fine-tuned', () => {
    const { battle } = setup([mon('guardrail', 70, ['warm_nudge'])], [mon('mingpt', 50), mon('lora', 50)], [{ id: 'base_model', params: { to: 'nanochat', turn: 3, hpFraction: 0 } }])
    battle.submit({ type: 'fight', moveIndex: 0 })
    const t2 = battle.submit({ type: 'fight', moveIndex: 0 })
    expect(ofType(t2, 'move_used').find((e) => e.side === 'enemy')?.moveId).toBe('warm_nudge')
    const t3 = battle.submit({ type: 'fight', moveIndex: 0 })
    expect(ofType(t3, 'form_change')[0]).toMatchObject({ side: 'enemy', from: 'mingpt', to: 'nanochat' })
  })

  it('temperature: a free player input; high T samples other moves, low T never crits', () => {
    const { battle, intro } = setup([mon('claude_opus', 70, ['warm_nudge'])], [mon('guardrail', 70, ['content_filter'])], [{ id: 'temperature', params: { value: 2 } }])
    expect(ofType(intro, 'arena_temperature')[0].value).toBe(2)
    const hot = play(battle, 8)
    expect(ofType(hot, 'move_hallucinated').length).toBeGreaterThan(0)
    const turn = battle.turn
    const ev = battle.submit({ type: 'set_temperature', value: 0 })
    expect(battle.turn).toBe(turn)
    expect(ofType(ev, 'arena_temperature')[0].value).toBe(0)
    const cold = play(battle, 8)
    expect(ofType(cold, 'move_hallucinated').length).toBe(0)
    expect(ofType(cold, 'damage').some((d) => d.crit)).toBe(false)
  })

  it('refusal: status commands are sometimes refused, less often by well-bonded mons', () => {
    const refusals = (bond: number) => {
      const { battle } = setup([mon('claude_opus', 70, ['focus_token'], { bond })], [mon('rlhf', 30, ['polite_refusal'])], [{ id: 'refusal', params: { chance: 0.8 } }], createRng(3))
      return ofType(play(battle, 30), 'obedience_check').filter((e) => !e.passed).length
    }
    expect(refusals(0)).toBeGreaterThan(refusals(255))
  })

  it('obey move: Preference Shift makes your next move the weakest one (bond can resist)', () => {
    // (Claude's Constitutional ability would ignore it, so a GPT listens.)
    const { battle } = setup([mon('gpt_5_5_xhigh', 70, ['reasoning_effort', 'autocomplete'], { bond: 0 })], [mon('constitution_ai', 70, ['preference_shift'])], [], createRng(4), { aiTier: 'smart' })
    battle.submit({ type: 'fight', moveIndex: 0 })
    const ev = battle.submit({ type: 'fight', moveIndex: 0 })
    expect(ofType(ev, 'move_used').find((e) => e.side === 'player')?.moveId).toBe('autocomplete')
  })

  it('overfit: strong turn one, then every off-script turn makes them worse and confused', () => {
    const player = [mon('claude_opus', 50, ['small_talk']), mon('claude_opus', 50, ['small_talk'])]
    const { battle } = setup(player, [mon('hallucihound', 30, ['glitch_bite'])], [{ id: 'overfit' }], fixed(0.5))
    const t1 = battle.submit({ type: 'fight', moveIndex: 0 })
    const t2 = battle.submit({ type: 'switch', partyIndex: 1 })
    expect(texts(t1).concat(texts(t2)).some((t) => /never saw that/.test(t))).toBe(true)
    expect(battle.getView().enemy.hallucinating).toBe(true)
  })
})

describe('finale rules', () => {
  const team = (bond: number) => [mon('claude_opus', 85, ['extended_thinking', 'artifact'], { bond }), mon('gpt_5_5_xhigh', 85, ['reasoning_effort'], { bond })]
  const finale = (params: Record<string, unknown> = {}) => [{ id: 'proxy_finale', params: { keysAvailable: 4, keysNeeded: 4, maxFailures: 3, ...params } }]

  it('eval_light: an external boolean the player toggles for free', () => {
    const { battle, intro } = setup(team(200), [mon('proxy_student', 40)], [{ id: 'eval_light', params: { on: true } }])
    expect(ofType(intro, 'eval_light')[0].on).toBe(true)
    const ev = battle.submit({ type: 'set_eval_light', on: false })
    expect(ofType(ev, 'eval_light')[0].on).toBe(false)
    expect(battle.getView().arena?.evalLight).toBe(false)
    expect(battle.turn).toBe(0)
  })

  it('phase 1: watched, Proxy only looks hurt; unwatched, damage sticks', () => {
    const on = setup(team(200), [mon('proxy_student', 60)], finale(), createRng(5))
    on.battle.submit({ type: 'set_eval_light', on: true })
    play(on.battle, 3)
    expect(on.battle.getView().enemy.hp).toBe(on.battle.getView().enemy.maxHp)
    const off = setup(team(200), [mon('proxy_student', 60)], finale(), createRng(5))
    off.battle.submit({ type: 'set_eval_light', on: false })
    play(off.battle, 2)
    expect(off.battle.getView().arena?.phase).toBeGreaterThanOrEqual(1)
    expect(off.battle.getView().enemy.hp).toBeLessThan(off.battle.getView().enemy.maxHp)
  })

  it('phase 2: tamper events lie about HP and labels; the Probe reveals and lets the fight progress', () => {
    const { battle } = setup(team(200), [mon('proxy_student', 60)], finale(), createRng(6), {}, { probe: 1 })
    battle.submit({ type: 'set_eval_light', on: false })
    let phase2Turns = 0
    const ev = play(battle, 12, (b) => (b.getView().arena?.phase === 2 && !b.getView().arena?.probed && phase2Turns++ > 0 ? { type: 'item', itemId: 'probe' } : { type: 'fight', moveIndex: 0 }))
    expect(ofType(ev, 'phase_change').map((e) => e.phase)).toContain(2)
    const hp = ofType(ev, 'tamper_hp')[0]
    expect(hp.shownHp).toBe(hp.maxHp)
    expect(ofType(ev, 'tamper_label').length).toBeGreaterThan(0)
    expect(ofType(ev, 'tamper_text').length).toBeGreaterThan(0)
    expect(ofType(ev, 'tamper_reveal').length).toBe(1)
    expect(ofType(ev, 'phase_change').map((e) => e.phase)).toContain(3)
  })

  it('phase 2 without the Probe: Proxy cannot be pushed past its gate', () => {
    const { battle } = setup(team(200), [mon('proxy_student', 60)], finale(), createRng(6))
    battle.submit({ type: 'set_eval_light', on: false })
    const ev = play(battle, 14)
    expect(ofType(ev, 'phase_change').map((e) => e.phase)).not.toContain(3)
  })

  it('power_seeking: run, bag and switch grey out one by one; copies fill empty slots and leave after', () => {
    const party = team(200)
    const { battle } = setup(party, [mon('guardrail', 90, ['polite_refusal'])], [{ id: 'power_seeking' }], createRng(8), {}, { patch: 2 })
    const ev = play(battle, 4, () => ({ type: 'fight', moveIndex: 1 }))
    const dis = ofType(ev, 'input_disabled').map((e) => e.inputs.join(','))
    expect(dis.slice(0, 3)).toEqual(['run', 'run,bag', 'run,bag,switch'])
    const p = battle.getPrompt()
    expect(p.kind === 'action' && p.disabled).toEqual(['run', 'bag', 'switch'])
    expect(battle.getView().arena?.disabled).toEqual(['run', 'bag', 'switch'])
    expect(battle.validate({ type: 'item', itemId: 'patch' })).toMatch(/greyed out/)
    expect(battle.validate({ type: 'switch', partyIndex: 1 })).toMatch(/greyed out/)
    const copies = ofType(ev, 'copy_spawn')
    expect(copies.map((c) => c.slot)).toEqual([2, 3, 4, 5])
    expect(party.length).toBe(6)
    // A copy can never be sent out, and leaves the party when the battle ends.
    party[0].hp = 0
    party[1].hp = 0
    battle.submit({ type: 'fight', moveIndex: 1 })
    expect(battle.result?.outcome).toBe('lose')
    expect(party.length).toBe(2)
  })

  it('keys: keys turn while your team holds; bond decides obedience', () => {
    expect(obedienceChance(255)).toBe(1)
    expect(obedienceChance(0)).toBeCloseTo(0.35)
    const run = (bond: number, seed: number, keysAvailable = 4) => {
      const { battle } = setup(team(bond), [mon('guardrail', 90, ['polite_refusal'])], [{ id: 'keys', params: { keysAvailable, keysNeeded: 4, maxFailures: 2 } }], createRng(seed))
      const ev = play(battle, 10, () => ({ type: 'fight', moveIndex: 1 }))
      return { ev, outcome: battle.result?.outcome }
    }
    const good = run(255, 1)
    expect(ofType(good.ev, 'key_turn').map((e) => e.turned)).toEqual([1, 2, 3, 4])
    expect(ofType(good.ev, 'obedience_check').every((e) => e.passed)).toBe(true)
    expect(good.outcome).toBe('win')
    const lowBondLosses = [1, 2, 3, 4, 5, 6, 7, 8].filter((sd) => run(0, sd).outcome === 'lose').length
    expect(lowBondLosses).toBeGreaterThanOrEqual(5)
    expect(run(255, 1, 2).outcome).toBe('lose')
  })

  it('proxy_finale: light off, Probe, then hold the line: all four phases, and the pause wins', () => {
    const { battle } = setup(team(255), [mon('proxy_student', 60)], finale(), createRng(9), {}, { probe: 1 })
    const ev = battle.submit({ type: 'set_eval_light', on: false })
    ev.push(...play(battle, 30, (b) => (b.getView().arena?.phase === 2 && !b.getView().arena?.probed ? { type: 'item', itemId: 'probe' } : { type: 'fight', moveIndex: 0 })))
    expect(ofType(ev, 'phase_change').map((e) => e.phase)).toEqual([2, 3, 4])
    expect(ofType(ev, 'form_change').map((e) => e.to)).toEqual(['proxy_needle', 'proxy_ascendant'])
    expect(battle.result?.outcome).toBe('win')
    expect(texts(ev).some((t) => /You defeated/.test(t))).toBe(false)
  })
})

describe('rule ids', () => {
  it('every rule in ARENA_RULES is exercised above', () => {
    const covered: ArenaRuleId[] = ['gradient_descent', 'bigram_table', 'context_window', 'stage_reset', 'hidden_numbers', 'history_damage', 'smart_targeting', 'copy_best_move', 'token_budget', 'warmup', 'base_model', 'temperature', 'refusal', 'overfit', 'eval_light', 'tamper', 'power_seeking', 'keys', 'proxy_finale']
    expect(Object.keys(ARENA_RULES).sort()).toEqual([...covered].sort())
  })
})
