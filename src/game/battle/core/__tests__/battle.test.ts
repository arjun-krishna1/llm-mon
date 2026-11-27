import { describe, expect, it } from 'vitest'
import type { BattleRequest, MonInstance } from '../../../types.ts'
import { Battle } from '../battle.ts'
import type { BattleEvent } from '../events.ts'
import { calcStats, createMon } from '../mon.ts'
import { chooseEnemyMove } from '../ai.ts'
import { trainerBattleRequest, tutorialBattleRequest, wildBattleRequest } from '../requests.ts'
import { createRng, type Rng } from '../rng.ts'
import { expForLevel } from '../stats.ts'
import { simulate } from './sim.ts'

const IV = { hp: 8, atk: 8, def: 8, spa: 8, spd: 8, spe: 8 }
/** Constant RNG: 0.99 = no crits, everything hits, no status procs, max damage roll. */
const fixed = (v: number): Rng => ({ next: () => v })
const mon = (id: string, level: number, moves?: string[]): MonInstance => createMon(id, level, createRng(1), { ivs: IV, moves })
const ofType = <T extends BattleEvent['type']>(events: BattleEvent[], type: T) => events.filter((e): e is Extract<BattleEvent, { type: T }> => e.type === type)
const texts = (events: BattleEvent[]) => ofType(events, 'text').map((e) => e.text)

function setup(player: MonInstance[], enemy: MonInstance[], rng: Rng, extra: Partial<BattleRequest> = {}, bag: Record<string, number> = {}) {
  const battle = new Battle({ request: wildBattleRequest(enemy[0], { enemyParty: enemy, ...extra }), party: player, bag, rng })
  const intro = battle.start()
  return { battle, intro, bag }
}

describe('battle start', () => {
  it('wild intro order', () => {
    const { intro, battle } = setup([mon('glm', 5)], [mon('gemma_4', 3)], fixed(0.99))
    expect(intro.map((e) => e.type)).toEqual(['battle_start', 'send_out', 'text', 'text', 'send_out'])
    expect(texts(intro)).toEqual(['A wild Gemma 4 appeared!', 'Go! GLM!'])
    expect(battle.getPrompt()).toEqual({ kind: 'action' })
    const view = battle.getView()
    expect(view.player.moves.map((m) => m.id)).toEqual(['graph_paw', 'pattern_guard'])
    expect(view.enemy.name).toBe('Gemma 4')
  })

  it('skips fainted lead', () => {
    const a = mon('glm', 5)
    a.hp = 0
    const { intro } = setup([a, mon('gpt_5_5', 5)], [mon('gemma_4', 3)], fixed(0.99))
    expect(texts(intro)).toContain('Go! GPT 5.5!')
  })

  it('throws without a healthy party mon', () => {
    const a = mon('glm', 5)
    a.hp = 0
    expect(() => new Battle({ request: wildBattleRequest(mon('gemma_4', 3)), party: [a], rng: fixed(0.5) })).toThrow()
  })
})

describe('turn order', () => {
  it('faster mon moves first', () => {
    const { battle } = setup([mon('gpt_5_5', 5)], [mon('gemma_4', 5)], fixed(0.99))
    const ev = battle.submit({ type: 'fight', moveIndex: 0 })
    expect(ofType(ev, 'move_used')[0].side).toBe('player')
  })

  it('priority beats speed', () => {
    const { battle } = setup([mon('gemma_4', 5, ['quick_reply'])], [mon('gemini_flash', 5, ['prompt_pulse'])], fixed(0.99))
    const ev = battle.submit({ type: 'fight', moveIndex: 0 })
    expect(ofType(ev, 'move_used')[0].side).toBe('player')
  })

  it('rate-limited halves speed', () => {
    const p = mon('gpt_5_5', 5, ['autocomplete'])
    p.status = 'rate_limited'
    const { battle } = setup([p], [mon('glm', 5, ['graph_paw'])], fixed(0.99))
    const ev = battle.submit({ type: 'fight', moveIndex: 0 })
    expect(ofType(ev, 'move_used')[0].side).toBe('enemy')
  })
})

describe('damage events', () => {
  it('report hp before/after consistently', () => {
    const { battle } = setup([mon('glm', 7, ['graph_reason'])], [mon('gpt_5_4_mini', 4, ['small_talk'])], fixed(0.99))
    const ev = battle.submit({ type: 'fight', moveIndex: 0 })
    const dmg = ofType(ev, 'damage')[0]
    expect(dmg.side).toBe('enemy')
    expect(dmg.hpBefore - dmg.hpAfter).toBe(dmg.amount)
    expect(dmg.effectiveness).toBe(2) // zhipu beats openai
  })

  it('super effective text follows damage', () => {
    const { battle } = setup([mon('glm', 7, ['graph_reason'])], [mon('gpt_5_5', 7, ['small_talk'])], fixed(0.99))
    const ev = battle.submit({ type: 'fight', moveIndex: 0 })
    expect(ofType(ev, 'damage')[0].effectiveness).toBe(2)
    expect(texts(ev)).toContain("It's super effective!")
  })

  it('misses emit a miss event', () => {
    const { battle } = setup([mon('glm', 5, ['jailbreak'])], [mon('gemma_4', 3, ['small_talk'])], fixed(0.95))
    const ev = battle.submit({ type: 'fight', moveIndex: 0 })
    expect(ofType(ev, 'miss')[0].side).toBe('player')
  })

  it('crits are flagged', () => {
    const { battle } = setup([mon('glm', 5, ['graph_paw'])], [mon('gemma_4', 3, ['small_talk'])], fixed(0.01))
    const ev = battle.submit({ type: 'fight', moveIndex: 0 })
    expect(ofType(ev, 'damage')[0].crit).toBe(true)
    expect(texts(ev)).toContain('A critical hit!')
  })
})

describe('stat stages', () => {
  it('apply, cap at +6 and report it', () => {
    const { battle } = setup([mon('claude_fable', 5, ['guardrail'])], [mon('gemma_4', 3, ['small_talk'])], fixed(0.99))
    for (let i = 0; i < 6; i++) battle.submit({ type: 'fight', moveIndex: 0 })
    expect(battle.getView().player.stages.def).toBe(6)
    const ev = battle.submit({ type: 'fight', moveIndex: 0 })
    const sc = ofType(ev, 'stat_change').find((e) => e.side === 'player')!
    expect(sc.delta).toBe(0)
    expect(texts(ev)).toContain("Claude Fable's Defense won't go any higher!")
  })

  it('sharp drops use stronger wording', () => {
    const { battle } = setup([mon('mistral_medium', 5, ['jailbreak'])], [mon('gemma_4', 3, ['small_talk'])], fixed(0.5))
    const ev = battle.submit({ type: 'fight', moveIndex: 0 })
    expect(ofType(ev, 'stat_change')[0]).toMatchObject({ side: 'enemy', stat: 'def', delta: -2, stage: -2 })
    expect(texts(ev)).toContain("Wild Gemma 4's Defense harshly fell!")
  })
})

describe('statuses', () => {
  it('context rot ticks 1/8 max HP at end of turn', () => {
    const e = mon('gemma_4', 4, ['small_talk'])
    e.status = 'context_rot'
    const { battle } = setup([mon('claude_fable', 5, ['guardrail'])], [e], fixed(0.99))
    const ev = battle.submit({ type: 'fight', moveIndex: 0 })
    const tick = ofType(ev, 'damage').find((d) => d.source === 'status')!
    expect(tick.amount).toBe(Math.max(1, Math.floor(calcStats(e).hp / 8)))
    expect(ev.indexOf(tick)).toBeGreaterThan(ev.findIndex((x) => x.type === 'move_used' && x.side === 'enemy'))
  })

  it('rate-limited can lose its turn', () => {
    const e = mon('gemma_4', 4, ['autocomplete'])
    e.status = 'rate_limited'
    const { battle } = setup([mon('claude_fable', 5, ['guardrail'])], [e], fixed(0.1))
    const ev = battle.submit({ type: 'fight', moveIndex: 0 })
    expect(ofType(ev, 'cant_move')[0]).toMatchObject({ side: 'enemy', reason: 'rate_limited' })
    expect(ofType(ev, 'move_used').some((m) => m.side === 'enemy')).toBe(false)
  })

  it('timed out skips 1-3 turns then reconnects', () => {
    const { battle } = setup([mon('claude_fable', 5, ['long_preamble', 'guardrail'])], [mon('gemma_4', 4, ['small_talk'])], fixed(0.3))
    const first = battle.submit({ type: 'fight', moveIndex: 0 })
    expect(ofType(first, 'status_applied')[0]).toMatchObject({ side: 'enemy', status: 'timed_out' })
    const all: BattleEvent[] = [...first]
    for (let i = 0; i < 4; i++) all.push(...battle.submit({ type: 'fight', moveIndex: 1 }))
    const skipped = ofType(all, 'cant_move').filter((c) => c.reason === 'timed_out').length
    expect(skipped).toBeGreaterThanOrEqual(1)
    expect(skipped).toBeLessThanOrEqual(3)
    expect(ofType(all, 'status_cured')[0]).toMatchObject({ side: 'enemy', status: 'timed_out' })
    expect(battle.getView().enemy.status).toBe('none')
  })

  it('hallucinating can make the mon hit itself, and glitch is immune', () => {
    const { battle } = setup([mon('hallucihound', 9, ['fake_citation'])], [mon('gemma_4', 4, ['autocomplete'])], fixed(0.01))
    const ev = battle.submit({ type: 'fight', moveIndex: 0 })
    expect(ofType(ev, 'status_applied')[0]).toMatchObject({ side: 'enemy', status: 'hallucinating' })
    expect(ofType(ev, 'damage').some((d) => d.side === 'enemy' && d.source === 'hallucination')).toBe(true)
    expect(battle.getView().enemy.hallucinating).toBe(true)

    const b2 = setup([mon('hallucihound', 9, ['fake_citation'])], [mon('hallucihound', 4, ['glitch_bite'])], fixed(0.5)).battle
    const ev2 = b2.submit({ type: 'fight', moveIndex: 0 })
    expect(texts(ev2)).toContain("It doesn't affect Wild HalluciHound...")
  })

  it('major status persists on the MonInstance after battle', () => {
    const e = mon('gemma_4', 4, ['autocomplete'])
    const p = mon('claude_fable', 5, ['warm_nudge'])
    const { battle } = setup([mon('hallucihound', 13, ['prompt_injection'])], [e], fixed(0.5))
    battle.submit({ type: 'fight', moveIndex: 0 })
    expect(e.status).toBe('context_rot')
    expect(p.status).toBe('none')
  })
})

describe('safety flag', () => {
  it('player survives at 1 HP and the battle cannot be lost', () => {
    for (let seed = 0; seed < 30; seed++) {
      const rng = createRng(seed)
      const p = createMon('glm', 3, rng)
      const req: BattleRequest = { ...tutorialBattleRequest(rng), enemyParty: [createMon('hallucihound', 9, rng)] }
      const r = simulate(req, [p], rng, 'random', {}, 2000)
      expect(r.outcome).toBe('win')
      expect(p.hp).toBeGreaterThanOrEqual(1)
      for (const d of ofType(r.events, 'damage')) if (d.side === 'player') expect(d.hpAfter).toBeGreaterThanOrEqual(1)
    }
  })

  it('tutorial hound bolts instead of fainting', () => {
    const rng = createRng(3)
    const req = tutorialBattleRequest(rng)
    const r = simulate(req, [createMon('glm', 9, rng)], rng, 'random', {}, 2000)
    expect(r.outcome).toBe('win')
    expect(ofType(r.events, 'faint').filter((f) => f.side === 'enemy')).toEqual([{ type: 'faint', side: 'enemy', partyIndex: 0, fled: true }])
    expect(texts(r.events)).toContain('The HalluciHound lost its nerve and bolted!')
    expect(texts(r.events).some((t) => t.endsWith('fainted!'))).toBe(false)
  })

  it('tutorial request is scripted, no run, no catch', () => {
    const req = tutorialBattleRequest(createRng(1))
    expect(req).toMatchObject({ kind: 'scripted', canRun: false, canCatch: false, safety: true })
    const battle = new Battle({ request: req, party: [mon('glm', 5)], bag: { prompt_orb: 5 }, rng: createRng(1) })
    battle.start()
    expect(battle.validate({ type: 'run' })).toBe("You can't run from this battle!")
    expect(battle.validate({ type: 'item', itemId: 'prompt_orb' })).toBe("It's too wild to catch right now!")
  })
})

describe('PP and struggle', () => {
  it('rejects 0-PP moves while others remain', () => {
    const p = mon('glm', 5)
    p.moves[0].pp = 0
    const { battle } = setup([p], [mon('gemma_4', 3)], fixed(0.99))
    expect(battle.validate({ type: 'fight', moveIndex: 0 })).toBe("There's no PP left for this move!")
    expect(battle.validate({ type: 'fight', moveIndex: 1 })).toBeNull()
  })

  it('decrements PP', () => {
    const p = mon('glm', 5)
    const { battle } = setup([p], [mon('gemma_4', 3)], fixed(0.99))
    battle.submit({ type: 'fight', moveIndex: 1 })
    expect(p.moves[1].pp).toBe(39)
  })

  it('struggles with recoil when every move is empty', () => {
    const p = mon('glm', 5)
    for (const m of p.moves) m.pp = 0
    const { battle } = setup([p], [mon('gemma_4', 3, ['small_talk'])], fixed(0.99))
    expect(battle.mustStruggle()).toBe(true)
    const ev = battle.submit({ type: 'fight', moveIndex: 0 })
    expect(ofType(ev, 'move_used')[0].moveId).toBe('retry_loop')
    expect(ofType(ev, 'damage').some((d) => d.side === 'player' && d.source === 'recoil')).toBe(true)
  })
})

describe('EXP, level-up and learning moves', () => {
  it('emits exp segments, level_up with deltas and auto-learns with a free slot', () => {
    const p = mon('claude_fable', 5, ['quick_reply'])
    const e = mon('hallucihound', 20, ['static_howl'])
    e.hp = 1
    const { battle } = setup([p], [e], fixed(0.99))
    const ev = battle.submit({ type: 'fight', moveIndex: 0 })
    const segs = ofType(ev, 'exp_gain')
    expect(segs.length).toBeGreaterThanOrEqual(2)
    expect(segs[0].expFrom).toBe(expForLevel('medium_slow', 5))
    for (let i = 1; i < segs.length; i++) expect(segs[i].expFrom).toBe(segs[i - 1].expTo)
    for (const s of segs) {
      expect(s.expTo).toBeLessThanOrEqual(s.levelEnd)
      expect(s.expFrom).toBeGreaterThanOrEqual(s.levelStart)
    }
    expect(segs[segs.length - 1].expTo).toBe(p.exp)
    const ups = ofType(ev, 'level_up')
    expect(ups[0].level).toBe(6)
    expect(ups[0].deltas.hp).toBe(ups[0].statsAfter.hp - ups[0].statsBefore.hp)
    expect(ofType(ev, 'move_learned').map((m) => m.moveId)).toContain('artifact')
    expect(p.moves.map((m) => m.id)).toContain('artifact')
    expect(ev[ev.length - 1].type).toBe('battle_end')
  })

  it('prompts for a 5th move and supports replace and give-up', () => {
    for (const answer of [0, null] as const) {
      const p = mon('glm', 6, ['graph_paw', 'pattern_guard', 'summarize', 'thinking_mode'])
      p.exp = expForLevel('medium_slow', 7) - 1
      const e = mon('gemma_4', 3, ['small_talk'])
      e.hp = 1
      const { battle } = setup([p], [e], fixed(0.99))
      const ev = battle.submit({ type: 'fight', moveIndex: 0 })
      const prompt = ofType(ev, 'learn_move_prompt')[0]
      expect(prompt).toMatchObject({ moveId: 'graph_reason', currentMoves: ['graph_paw', 'pattern_guard', 'summarize', 'thinking_mode'] })
      expect(ev.indexOf(prompt)).toBeLessThan(ev.findIndex((x) => x.type === 'battle_end'))
      expect(battle.getPrompt()).toMatchObject({ kind: 'learn_move', moveId: 'graph_reason', promptId: prompt.promptId })
      expect(battle.validate({ type: 'fight', moveIndex: 0 })).not.toBeNull()
      const res = battle.submit({ type: 'learn_move', forgetSlot: answer })
      if (answer === 0) {
        expect(ofType(res, 'move_learned')[0]).toMatchObject({ moveId: 'graph_reason', forgotMoveId: 'graph_paw' })
        expect(p.moves[0].id).toBe('graph_reason')
      } else {
        expect(ofType(res, 'move_not_learned')).toHaveLength(1)
        expect(p.moves.map((m) => m.id)).not.toContain('graph_reason')
      }
      expect(battle.getPrompt().kind).toBe('end')
      expect(battle.result?.outcome).toBe('win')
    }
  })

  it('splits EXP between participants', () => {
    const a = mon('glm', 5, ['pattern_guard'])
    const b = mon('gpt_5_5', 5, ['autocomplete'])
    const e = mon('gemma_4', 4, ['small_talk'])
    const { battle } = setup([a, b], [e], fixed(0.99))
    battle.submit({ type: 'switch', partyIndex: 1 })
    e.hp = 1
    const ev = battle.submit({ type: 'fight', moveIndex: 0 })
    const gained = ofType(ev, 'exp_gain')
    expect(new Set(gained.map((g) => g.partyIndex))).toEqual(new Set([0, 1]))
    expect(gained[0].amount).toBe(Math.floor(Math.floor((56 * 4) / 7) / 2))
  })
})

describe('switching', () => {
  it('voluntary switch withdraws, sends in, then the foe attacks the newcomer', () => {
    const { battle } = setup([mon('glm', 5), mon('gpt_5_5', 5)], [mon('gemma_4', 3, ['autocomplete'])], fixed(0.99))
    expect(battle.validate({ type: 'switch', partyIndex: 0 })).toBe('GLM is already in battle!')
    const ev = battle.submit({ type: 'switch', partyIndex: 1 })
    expect(ev.map((e) => e.type).slice(0, 4)).toEqual(['text', 'withdraw', 'text', 'send_out'])
    expect(ofType(ev, 'damage')[0]).toMatchObject({ side: 'player', partyIndex: 1 })
  })

  it('forced switch after a faint', () => {
    const weak = mon('glm', 5, ['pattern_guard'])
    weak.hp = 1
    const { battle } = setup([weak, mon('gpt_5_5', 5)], [mon('gemini_flash', 5, ['prompt_pulse'])], fixed(0.99))
    const ev = battle.submit({ type: 'fight', moveIndex: 0 })
    expect(ofType(ev, 'faint')[0]).toMatchObject({ side: 'player', partyIndex: 0 })
    expect(battle.getPrompt()).toEqual({ kind: 'switch', forced: true })
    expect(battle.validate({ type: 'fight', moveIndex: 0 })).not.toBeNull()
    expect(battle.validate({ type: 'switch', partyIndex: 0 })).toBe('GLM has no energy left to battle!')
    const sw = battle.submit({ type: 'switch', partyIndex: 1 })
    expect(ofType(sw, 'send_out')[0].partyIndex).toBe(1)
    expect(ofType(sw, 'damage')).toHaveLength(0)
    expect(battle.getPrompt().kind).toBe('action')
  })

  it('losing the last mon ends the battle as a loss', () => {
    const weak = mon('glm', 5, ['pattern_guard'])
    weak.hp = 1
    const { battle } = setup([weak], [mon('gemini_flash', 5, ['prompt_pulse'])], fixed(0.99))
    const ev = battle.submit({ type: 'fight', moveIndex: 0 })
    expect(battle.result).toEqual({ outcome: 'lose' })
    expect(ofType(ev, 'battle_end')[0].outcome).toBe('lose')
  })
})

describe('trainers', () => {
  it('sends out the next mon, pays a prize and gives boosted EXP', () => {
    const rng = createRng(3)
    const req = trainerBattleRequest('route_101_b', rng)
    expect(req.trainer?.name).toBe('Benchmarker Tiana')
    const p = mon('glm', 30, ['blank_infill'])
    const battle = new Battle({ request: req, party: [p], rng })
    const intro = battle.start()
    expect(texts(intro)[0]).toBe('Benchmarker Tiana would like to battle!')
    expect(ofType(intro, 'send_out')[0]).toMatchObject({ side: 'enemy', fromOrb: true })
    expect(battle.validate({ type: 'run' })).toMatch(/no running/)
    expect(battle.validate({ type: 'item', itemId: 'prompt_orb' })).not.toBeNull()
    const all: BattleEvent[] = []
    while (battle.getPrompt().kind !== 'end') all.push(...battle.submit({ type: 'fight', moveIndex: 0 }))
    expect(ofType(all, 'send_out').filter((s) => s.side === 'enemy')).toHaveLength(1)
    expect(ofType(all, 'faint')).toHaveLength(2)
    expect(ofType(all, 'trainer_reappear')).toHaveLength(1)
    expect(texts(all)).toContain('You got 120 tokens for winning!')
    expect(battle.result).toEqual({ outcome: 'win', prize: 120 })
    expect(ofType(all, 'exp_gain')[0].amount).toBe(Math.floor(Math.floor((50 * 3) / 7) * 1.5))
  })

  it('AI prefers super-effective and finishing moves', () => {
    const rng = createRng(5)
    let picks = 0
    for (let i = 0; i < 200; i++) {
      const idx = chooseEnemyMove(
        {
          kind: 'trainer',
          targetHp: 20,
          selfHpFraction: 1,
          options: [
            { index: 0, moveId: 'autocomplete', expectedDamage: 5, effectUseful: false },
            { index: 1, moveId: 'function_call', expectedDamage: 12, effectUseful: false },
            { index: 2, moveId: 'small_talk', expectedDamage: 0, effectUseful: true },
          ],
        },
        rng,
      )
      if (idx === 1) picks++
    }
    expect(picks).toBeGreaterThan(170)
  })

  it('wild AI picks only moves with PP, -1 when none', () => {
    const rng = createRng(1)
    expect(chooseEnemyMove({ kind: 'wild', targetHp: 10, selfHpFraction: 1, options: [] }, rng)).toBe(-1)
    const seen = new Set<number>()
    for (let i = 0; i < 100; i++) seen.add(chooseEnemyMove({ kind: 'wild', targetHp: 10, selfHpFraction: 1, options: [0, 2].map((index) => ({ index, moveId: 'autocomplete', expectedDamage: 1, effectUseful: false })) }, rng))
    expect(seen).toEqual(new Set([0, 2]))
  })
})

describe('items, catching and running', () => {
  it('Patch heals the target and is consumed', () => {
    const p = mon('glm', 5)
    p.hp = 3
    const { battle, bag } = setup([p], [mon('gemma_4', 2, ['small_talk'])], fixed(0.99), {}, { patch: 1 })
    const ev = battle.submit({ type: 'item', itemId: 'patch' })
    expect(ofType(ev, 'heal')[0]).toMatchObject({ side: 'player', hpBefore: 3, amount: Math.min(20, calcStats(p).hp - 3) })
    expect(bag.patch).toBeUndefined()
    expect(battle.validate({ type: 'item', itemId: 'patch' })).toMatch(/don't have/)
  })

  it('Debugger cures status; useless items are rejected', () => {
    const p = mon('glm', 5)
    p.status = 'context_rot'
    const { battle } = setup([p], [mon('gemma_4', 2, ['small_talk'])], fixed(0.99), {}, { debugger: 2, patch: 1, firewall: 1 })
    expect(battle.validate({ type: 'item', itemId: 'patch' })).toBe("It won't have any effect.")
    expect(battle.validate({ type: 'item', itemId: 'firewall' })).toBe("That can't be used in battle!")
    const ev = battle.submit({ type: 'item', itemId: 'debugger' })
    expect(ofType(ev, 'status_cured')[0].status).toBe('context_rot')
    expect(p.status).toBe('none')
  })

  it('catching: shake events then result; caught mon returned', () => {
    let caughtOnce = false
    let failedOnce = false
    for (let seed = 0; seed < 40 && !(caughtOnce && failedOnce); seed++) {
      const e = mon('gemma_4', 3, ['small_talk'])
      const { battle, bag } = setup([mon('glm', 5)], [e], createRng(seed), {}, { prompt_orb: 1 })
      const ev = battle.submit({ type: 'item', itemId: 'prompt_orb' })
      const res = ofType(ev, 'catch_result')[0]
      expect(ofType(ev, 'catch_shake')).toHaveLength(res.shakes)
      expect(bag.prompt_orb).toBeUndefined()
      if (res.caught) {
        caughtOnce = true
        expect(battle.result).toEqual({ outcome: 'caught', caught: e })
        expect(ofType(ev, 'move_used')).toHaveLength(0)
      } else {
        failedOnce = true
        expect(ofType(ev, 'move_used').some((m) => m.side === 'enemy')).toBe(true)
      }
    }
    expect(caughtOnce && failedOnce).toBe(true)
  })

  it('running: faster escapes, slower may fail and then gets hit', () => {
    const fast = setup([mon('gpt_5_5', 5)], [mon('gemma_4', 3)], fixed(0.99)).battle
    const ev = fast.submit({ type: 'run' })
    expect(ofType(ev, 'run_attempt')[0].success).toBe(true)
    expect(fast.result?.outcome).toBe('run')

    const slow = setup([mon('gemma_4', 3)], [mon('gemini_flash', 8, ['prompt_pulse'])], fixed(0.99)).battle
    const ev2 = slow.submit({ type: 'run' })
    expect(ofType(ev2, 'run_attempt')[0].success).toBe(false)
    expect(texts(ev2)).toContain("Can't escape!")
    expect(ofType(ev2, 'move_used')[0].side).toBe('enemy')
  })
})

describe('determinism', () => {
  it('same seed, same events', () => {
    const run = () => {
      const rng = createRng(777)
      return simulate(wildBattleRequest(createMon('mistral_medium', 4, rng)), [createMon('claude_fable', 5, rng)], rng, 'random').events
    }
    expect(JSON.stringify(run())).toBe(JSON.stringify(run()))
  })

  it('throws on invalid input and after the end', () => {
    const { battle } = setup([mon('gpt_5_5', 5)], [mon('gemma_4', 3)], fixed(0.99))
    expect(() => battle.submit({ type: 'fight', moveIndex: 9 })).toThrow()
    battle.submit({ type: 'run' })
    expect(() => battle.submit({ type: 'fight', moveIndex: 0 })).toThrow()
  })
})
