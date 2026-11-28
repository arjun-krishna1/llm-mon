// Abilities, held items, evolution, bond and AI tiers.

import { describe, expect, it } from 'vitest'
import type { BattleRequest, MonInstance } from '../../../types.ts'
import { ABILITIES, ITEMS, SPECIES, SPECIES_IDS, getSpecies } from '../../../data/index.ts'
import { CATCH_BOND, defaultBond } from '../arena.ts'
import { Battle } from '../battle.ts'
import type { BattleEvent, BattleInput } from '../events.ts'
import { addBond, applyItemOutsideBattle, calcStats, createMon, evolutionTarget, getBond, healParty } from '../mon.ts'
import { trainerBattleRequest, wildBattleRequest } from '../requests.ts'
import { createRng, type Rng } from '../rng.ts'
import { expForLevel } from '../stats.ts'

let seq = 100
const IV = { hp: 8, atk: 8, def: 8, spa: 8, spd: 8, spe: 8 }
const mon = (id: string, level: number, moves?: string[], extra: Partial<MonInstance> = {}): MonInstance => ({ ...createMon(id, level, createRng(seq++), { ivs: IV, moves }), ...extra })
const fixed = (v: number): Rng => ({ next: () => v })
const ofType = <T extends BattleEvent['type']>(events: BattleEvent[], type: T) => events.filter((e): e is Extract<BattleEvent, { type: T }> => e.type === type)
const texts = (events: BattleEvent[]) => ofType(events, 'text').map((e) => e.text)

function trainer(enemy: MonInstance[], extra: Partial<BattleRequest> = {}): BattleRequest {
  return { kind: 'trainer', enemyParty: enemy, trainer: { id: 't', name: 'Tester Ann', sprite: 'x', loseText: 'ok', prize: 10 }, canRun: false, canCatch: false, background: 'x', aiTier: 'basic', aiRandomness: 0, ...extra }
}
function setup(player: MonInstance[], enemy: MonInstance[], rng: Rng = createRng(7), extra: Partial<BattleRequest> = {}, bag: Record<string, number> = {}, badges?: string[]) {
  const battle = new Battle({ request: trainer(enemy, extra), party: player, bag, rng, context: { badges } })
  const intro = battle.start()
  return { battle, intro }
}
function play(battle: Battle, n: number, input: (b: Battle) => BattleInput = () => ({ type: 'fight', moveIndex: 0 })): BattleEvent[] {
  const all: BattleEvent[] = []
  for (let i = 0; i < n && battle.getPrompt().kind === 'action'; i++) all.push(...battle.submit(input(battle)))
  return all
}
const abilityPopups = (ev: BattleEvent[], id: string) => ofType(ev, 'ability').filter((e) => e.abilityId === id)

describe('abilities', () => {
  it('there are 25+ distinct abilities, every species has one, and each is used', () => {
    expect(Object.keys(ABILITIES).length).toBeGreaterThanOrEqual(25)
    const used = new Set(SPECIES_IDS.map((id) => SPECIES[id].ability))
    for (const id of SPECIES_IDS) expect(ABILITIES[SPECIES[id].ability], id).toBeDefined()
    for (const a of Object.keys(ABILITIES)) expect(used.has(a), a).toBe(true)
  })

  it('entry abilities: Warm Start (+1 Speed), Pretrained (+1 best stat), with a popup', () => {
    const { intro } = setup([mon('claude_haiku', 20)], [mon('eliza', 20)])
    expect(abilityPopups(intro, 'warm_start')[0]).toMatchObject({ side: 'player', abilityName: 'Warm Start' })
    expect(abilityPopups(intro, 'pretrained')[0].side).toBe('enemy')
    expect(ofType(intro, 'stat_change').find((e) => e.side === 'player')).toMatchObject({ stat: 'spe', delta: 1 })
  })

  it('Saturation survives a knockout hit from full HP', () => {
    const { battle } = setup([mon('claude_opus', 80, ['extended_thinking'])], [mon('sigmoid', 5, ['squash'])], fixed(0.5))
    const ev = play(battle, 1)
    expect(abilityPopups(ev, 'saturation').length).toBe(1)
    expect(battle.getView().enemy.hp).toBe(1)
  })

  it('Gradient Clip caps any one hit at half max HP', () => {
    const { battle } = setup([mon('claude_opus', 80, ['extended_thinking'])], [mon('rmsprop', 20, ['descent'])], fixed(0.5))
    const ev = play(battle, 1)
    const d = ofType(ev, 'damage').find((e) => e.side === 'enemy')!
    expect(d.amount).toBeLessThanOrEqual(Math.floor(d.maxHp / 2))
  })

  it('Constitutional: immune to hallucinating and to obey moves', () => {
    const { battle } = setup([mon('claude_sonnet', 40, ['warm_nudge'])], [mon('constitution_ai', 40, ['preference_shift'])])
    const ev = play(battle, 2)
    expect(texts(ev).some((t) => /sticks with its own trainer/.test(t))).toBe(true)
  })

  it('Caching: repeating the last move costs no PP', () => {
    const m = mon('deepseek_flash', 30, ['expert_mix'])
    const { battle } = setup([m], [mon('guardrail', 60, ['polite_refusal'])])
    play(battle, 3)
    // the first use spends a PP, the two repeats are free
    expect(m.moves[0].pp).toBe(getMovePp('expert_mix') - 1)
  })

  it('Compressed: every other move is free', () => {
    const m = mon('lora', 30, ['low_rank'])
    const { battle } = setup([m], [mon('guardrail', 60, ['polite_refusal'])])
    play(battle, 4)
    expect(m.moves[0].pp).toBe(getMovePp('low_rank') - 2)
  })

  it('Polyglot turns Classic moves into its lab type', () => {
    const { battle } = setup([mon('qwen', 30, ['prompt_pulse'])], [mon('gpt_5_5', 30, ['focus_token'])], fixed(0.5))
    const ev = play(battle, 1)
    expect(ofType(ev, 'damage').find((e) => e.side === 'enemy')?.effectiveness).toBe(2) // alibaba > openai
  })

  it('Skip Connection heals 1/16 at end of turn; Normalization clears its drops', () => {
    const r = mon('residual', 30, ['residual_strike'])
    r.hp = 20
    const { battle } = setup([r], [mon('guardrail', 60, ['pattern_guard'])])
    const ev = play(battle, 1)
    expect(abilityPopups(ev, 'skip_connection').length).toBe(1)
    const bn = setup([mon('batchnorm', 30, ['hidden_layer'])], [mon('guardrail', 60, ['pattern_guard'])])
    play(bn.battle, 2)
    expect(bn.battle.getView().player.stages.atk).toBe(0)
  })

  it('Weight Decay shaves the foe\'s boosts each turn', () => {
    const { battle } = setup([mon('claude_opus', 60, ['focus_token'])], [mon('adamw', 60, ['weight_decay'])])
    play(battle, 2)
    expect(battle.getView().player.stages.atk).toBeLessThan(2)
  })

  it('Move 37: the first attack is always a critical hit', () => {
    const { battle } = setup([mon('alphago', 30, ['move_37'])], [mon('guardrail', 60, ['pattern_guard'])], fixed(0.9), { aiRandomness: 0 })
    const ev = play(battle, 1)
    expect(ofType(ev, 'damage').find((e) => e.side === 'enemy')?.crit).toBe(true)
  })

  it('Goodhart doubles its boosts; Clear Signal blocks drops', () => {
    const g = setup([mon('proxy_mascot', 30, ['focus_token'])], [mon('guardrail', 30, ['polite_refusal'])])
    play(g.battle, 1)
    expect(g.battle.getView().player.stages.atk).toBe(2)
    const c = setup([mon('sgd', 30, ['pattern_guard'])], [mon('relu', 30, ['hidden_layer'])])
    const ev = play(c.battle, 1)
    expect(c.battle.getView().enemy.stages.atk).toBe(0)
    expect(abilityPopups(ev, 'clear_signal').length).toBe(1)
  })

  it('every species ability is wired into the engine', async () => {
    const src = (await import('node:fs')).readFileSync(new URL('../battle.ts', import.meta.url), 'utf8')
    for (const id of Object.keys(ABILITIES)) expect(src.includes(`'${id}'`), id).toBe(true)
  })
})

function getMovePp(id: string): number {
  return createMon('sgd', 1, createRng(1), { moves: [id] }).moves[0].pp
}

describe('held items', () => {
  it('there are 15+ held items (consumables and passive boosts), each wired into the engine', async () => {
    const held = Object.values(ITEMS).filter((i) => i.effect.kind === 'held')
    expect(held.length).toBeGreaterThanOrEqual(15)
    expect(held.some((i) => i.effect.kind === 'held' && i.effect.consumable)).toBe(true)
    expect(held.some((i) => i.effect.kind === 'held' && !i.effect.consumable)).toBe(true)
    const fs = await import('node:fs')
    const src = fs.readFileSync(new URL('../battle.ts', import.meta.url), 'utf8') + fs.readFileSync(new URL('../mon.ts', import.meta.url), 'utf8')
    for (const i of held) expect(src.includes(`'${i.id}'`), i.id).toBe(true)
  })

  it('Cache Berry heals once at half HP and is consumed (held_item popup)', () => {
    const m = mon('claude_opus', 30, ['small_talk'], { heldItem: 'cache_berry' })
    const { battle } = setup([m], [mon('sgd', 40, ['descent'])], createRng(3))
    const ev = play(battle, 8)
    const pop = ofType(ev, 'held_item')[0]
    expect(pop).toMatchObject({ side: 'player', itemId: 'cache_berry', consumed: true })
    expect(m.heldItem).toBeUndefined()
  })

  it('Checkpoint survives one knockout hit from full HP', () => {
    const m = mon('sgd', 5, ['descent'], { heldItem: 'checkpoint' })
    const { battle } = setup([mon('claude_opus', 80, ['extended_thinking'])], [m], fixed(0.5))
    play(battle, 1)
    expect(m.hp).toBe(1)
    expect(m.heldItem).toBeUndefined()
  })

  it('Debug Berry cures a status as soon as it lands; Clarity Berry ends hallucinating', () => {
    const m = mon('claude_opus', 40, ['small_talk'], { heldItem: 'debug_berry' })
    const { battle } = setup([m], [mon('entropy', 40, ['stale_cache'])], fixed(0.5))
    const ev = play(battle, 1)
    expect(ofType(ev, 'status_cured').length).toBe(1)
    expect(m.status).toBe('none')
  })

  it('Lab Pin boosts same-type moves; Overclock Chip boosts and costs HP', () => {
    const dmg = (held?: string) => {
      const { battle } = setup([mon('claude_opus', 40, ['extended_thinking'], held ? { heldItem: held } : {})], [mon('guardrail', 60, ['pattern_guard'])], fixed(0.5))
      const ev = play(battle, 1)
      return { hit: ofType(ev, 'damage').find((e) => e.side === 'enemy')!.amount, self: ofType(ev, 'damage').filter((e) => e.side === 'player' && e.source === 'item').length }
    }
    const base = dmg()
    expect(dmg('lab_pin').hit).toBeGreaterThan(base.hit)
    const oc = dmg('overclock_chip')
    expect(oc.hit).toBeGreaterThan(base.hit)
    expect(oc.self).toBe(1)
  })

  it('Eval Report: 50% more EXP; Frozen Weights blocks evolution', () => {
    const a = mon('gpt_5_4_mini', 10, ['function_call'])
    const b = mon('gpt_5_4_mini', 10, ['function_call'], { heldItem: 'eval_report' })
    const gain = (m: MonInstance) => {
      const { battle } = setup([m], [mon('sgd', 8, ['descent'])], fixed(0.5))
      return ofType(play(battle, 3), 'exp_gain')[0].amount
    }
    expect(gain(b)).toBe(Math.floor(gain(a) * 1.5))
    expect(evolutionTarget({ ...mon('sgd', 20), heldItem: 'frozen_weights' })).toBeNull()
    expect(evolutionTarget(mon('sgd', 20))).toBe('momentum')
  })
})

describe('evolution', () => {
  const nearLevel = (id: string, level: number, moves?: string[]) => {
    const m = mon(id, level - 1, moves)
    m.exp = expForLevel(getSpecies(id).growth, level) - 1
    return m
  }

  it('every evolution target exists, levels make sense and later stages know where they come from', () => {
    for (const id of SPECIES_IDS) {
      const s = SPECIES[id]
      for (const e of s.evolvesTo) {
        expect(SPECIES[e.to], `${id} -> ${e.to}`).toBeDefined()
        expect(e.level !== undefined || e.item !== undefined, `${id} needs a condition`).toBe(true)
        if (e.item) expect(ITEMS[e.item]?.effect.kind, e.item).toBe('evolution')
        expect(SPECIES[e.to].stage).toBeGreaterThan(s.stage === 3 ? 2 : s.stage - 1)
      }
      if (s.stage > 1 && s.areas.includes('evolve')) expect(s.evolvesFrom, id).toBeDefined()
    }
  })

  it('the STORY_BIBLE lines evolve as written', () => {
    const chain = (start: string) => {
      const out = [start]
      for (let id = start; SPECIES[id].evolvesTo.length; ) {
        id = SPECIES[id].evolvesTo[0].to
        out.push(id)
      }
      return out
    }
    expect(chain('sgd')).toEqual(['sgd', 'momentum', 'adam', 'adamw'])
    expect(chain('sigmoid')).toEqual(['sigmoid', 'tanh', 'relu', 'gelu'])
    expect(chain('perceptron')).toEqual(['perceptron', 'mlp', 'resnet'])
    expect(chain('rnn')).toEqual(['rnn', 'lstm', 'transformer_base'])
    expect(chain('batchnorm')).toEqual(['batchnorm', 'layernorm'])
    expect(chain('n_gram')).toEqual(['n_gram', 'word2vec', 'embedding'])
    expect(chain('claude_haiku')).toEqual(['claude_haiku', 'claude_sonnet', 'claude_opus'])
    expect(chain('gpt_5_4_mini')).toEqual(['gpt_5_4_mini', 'gpt_5_5', 'gpt_5_5_thinking', 'gpt_5_5_xhigh'])
    expect(chain('gemini_flash')).toEqual(['gemini_flash', 'gemini_pro'])
  })

  it('level evolution after a win: evolve_start, prompt, accept -> evolve_done + dex_register + new moves', () => {
    const m = nearLevel('claude_fable', 16, ['artifact', 'warm_nudge', 'guardrail', 'constitution'])
    const party = [m]
    const { battle } = setup(party, [mon('sgd', 12, ['descent'])], fixed(0.5))
    const ev = play(battle, 5)
    const start = ofType(ev, 'evolve_start')[0]
    expect(start).toMatchObject({ partyIndex: 0, from: 'claude_fable', to: 'claude_sonnet' })
    expect(battle.getPrompt()).toMatchObject({ kind: 'evolve', from: 'claude_fable', to: 'claude_sonnet' })
    expect(battle.validate({ type: 'fight', moveIndex: 0 })).not.toBeNull()
    const done = battle.submit({ type: 'evolve', accept: true })
    expect(ofType(done, 'evolve_done')[0].mon.speciesId).toBe('claude_sonnet')
    expect(ofType(done, 'dex_register')[0].speciesId).toBe('claude_sonnet')
    expect(m.speciesId).toBe('claude_sonnet')
    // Sonnet's Lv16 move is offered right away.
    expect(ofType(done, 'move_learned').length + ofType(done, 'learn_move_prompt').length).toBeGreaterThan(0)
    while (battle.getPrompt().kind === 'learn_move') battle.submit({ type: 'learn_move', forgetSlot: null })
    expect(battle.getPrompt().kind).toBe('end')
    expect(battle.result?.evolved).toEqual([{ partyIndex: 0, from: 'claude_fable', to: 'claude_sonnet' }])
    expect(battle.result?.dexRegister).toEqual(['claude_sonnet'])
  })

  it('B cancels: evolve_cancelled and the species stays', () => {
    const m = nearLevel('sgd', 14, ['descent'])
    const { battle } = setup([m], [mon('perceptron', 12, ['fire_neuron'])], fixed(0.5))
    play(battle, 6)
    expect(battle.getPrompt().kind).toBe('evolve')
    const ev = battle.submit({ type: 'evolve', accept: false })
    expect(ofType(ev, 'evolve_cancelled').length).toBe(1)
    expect(m.speciesId).toBe('sgd')
    expect(battle.getPrompt().kind).toBe('end')
  })

  it('badge evolution needs the badge (LSTM -> Transformer with the Attention Badge)', () => {
    const m = mon('lstm', 40)
    expect(evolutionTarget(m)).toBeNull()
    expect(evolutionTarget(m, { badges: ['attention'] })).toBe('transformer_base')
    const near = nearLevel('lstm', 41, ['next_token'])
    const { battle } = setup([near], [mon('rnn', 30, ['recur'])], fixed(0.5), {}, {}, ['attention'])
    const ev = play(battle, 6)
    expect(ofType(ev, 'evolve_start')[0]?.to).toBe('transformer_base')
  })

  it('item evolution from the bag (Skip Link: MLP -> ResNet)', () => {
    const m = mon('mlp', 20)
    expect(applyItemOutsideBattle('skip_link', mon('sgd', 20)).ok).toBe(false)
    const r = applyItemOutsideBattle('skip_link', m)
    expect(r.ok).toBe(true)
    expect(r.evolved).toMatchObject({ from: 'mlp', to: 'resnet' })
    expect(m.speciesId).toBe('resnet')
  })
})

describe('bond', () => {
  it('grows with wins, levels and heals; fresh catches start low', () => {
    const m = mon('glm', 10)
    expect(getBond(m)).toBe(defaultBond(10))
    addBond(m, 5)
    healParty([m])
    expect(getBond(m)).toBe(defaultBond(10) + 6)
    const before = getBond(m)
    const { battle } = setup([m], [mon('sgd', 5, ['descent'])], fixed(0.5))
    play(battle, 5)
    expect(getBond(m)).toBeGreaterThan(before)
    // catching
    const wild = mon('gemma_4', 2)
    wild.hp = 1
    const w = new Battle({ request: wildBattleRequest(wild), party: [mon('glm', 30)], bag: { great_orb: 20 }, rng: createRng(2) })
    w.start()
    while (w.getPrompt().kind === 'action') w.submit({ type: 'item', itemId: 'great_orb' })
    expect(w.result?.caught?.bond).toBe(CATCH_BOND)
  })
})

describe('AI tiers', () => {
  it('wild picks randomly; basic trainers prefer super-effective hits', () => {
    const counts = new Map<string, number>()
    for (let i = 0; i < 40; i++) {
      const { battle } = setup([mon('claude_opus', 50, ['small_talk'])], [mon('gpt_5_5', 20, ['function_call', 'autocomplete'])], createRng(i))
      const ev = play(battle, 1)
      const id = ofType(ev, 'move_used').find((e) => e.side === 'enemy')!.moveId
      counts.set(id, (counts.get(id) ?? 0) + 1)
    }
    expect(counts.get('function_call') ?? 0).toBeGreaterThan(35)
  })

  it('leader tier switches out of a bad matchup and heals when low', () => {
    const enemy = [mon('glm', 30, ['graph_reason']), mon('gpt_5_5', 30, ['function_call'])]
    const { battle } = setup([mon('claude_opus', 30, ['extended_thinking'])], enemy, createRng(1), { aiTier: 'leader' })
    const ev = play(battle, 1)
    expect(ofType(ev, 'withdraw').some((e) => e.side === 'enemy')).toBe(true)
    const low = mon('sgd', 30, ['descent'])
    low.hp = Math.floor(calcStats(low).hp * 0.2)
    const h = setup([mon('claude_opus', 30, ['small_talk'])], [low], createRng(1), { aiTier: 'leader', trainerItems: { big_patch: 1 } })
    const ev2 = play(h.battle, 1)
    expect(ofType(ev2, 'item_used')[0]).toMatchObject({ side: 'enemy', itemId: 'big_patch' })
  })

  it('setup-aware tiers take a KO instead of setting up', () => {
    const target = mon('gemma_4', 5, ['small_talk'])
    const { battle } = setup([target], [mon('adam', 50, ['adaptive_step', 'look_ahead'])], createRng(2), { aiTier: 'smart' })
    const ev = play(battle, 1)
    expect(ofType(ev, 'move_used').find((e) => e.side === 'enemy')?.moveId).toBe('look_ahead')
  })

  it('trainer data sets tiers: leaders/League use leader/champion, gym trainers smart', () => {
    expect(trainerBattleRequest('gym1_leader', createRng(1)).aiTier).toBe('leader')
    expect(trainerBattleRequest('gym1_a', createRng(1)).aiTier).toBe('smart')
    expect(trainerBattleRequest('champion_karpathy', createRng(1)).aiTier).toBe('champion')
    expect(trainerBattleRequest('route_101_a', createRng(1)).aiTier).toBeUndefined()
  })
})
