import { describe, expect, it } from 'vitest'
import {
  ENCOUNTER_TABLES,
  ITEMS,
  MOVES,
  SPECIES,
  SPECIES_IDS,
  STARTER_IDS,
  STATUSES,
  TRAINERS,
  TYPE_IDS,
  getMove,
  getSpecies,
} from '../index.ts'
import { STRUGGLE_ID } from '../moves.ts'
import { defaultMovesAt } from '../../battle/core/mon.ts'

const ART_CONTRACT_IDS = ['claude_fable', 'gpt_5_5', 'glm', 'hallucihound', 'gemma_4', 'gpt_5_4_mini', 'mistral_medium', 'gemini_flash', 'claude_haiku']
const LATER_IDS = ['claude_opus', 'command_a', 'deepseek_flash', 'deepseek_pro', 'glm_max', 'gpt_5_5_xhigh', 'kimi']

describe('species data', () => {
  it('defines the whole roster', () => {
    for (const id of [...ART_CONTRACT_IDS, ...LATER_IDS]) expect(SPECIES[id], id).toBeDefined()
  })

  it('uses the required display names', () => {
    const names: Record<string, string> = {
      claude_fable: 'Claude Fable',
      gpt_5_5: 'GPT 5.5',
      glm: 'GLM',
      gemma_4: 'Gemma 4',
      gpt_5_4_mini: 'GPT-5.4 mini',
      mistral_medium: 'Mistral Medium',
      gemini_flash: 'Gemini Flash',
      claude_haiku: 'Claude Haiku',
      hallucihound: 'HalluciHound',
    }
    for (const [id, name] of Object.entries(names)) expect(getSpecies(id).name).toBe(name)
  })

  it('has unique dex numbers and valid fields', () => {
    const nums = new Set<number>()
    for (const id of SPECIES_IDS) {
      const s = SPECIES[id]
      expect(s.id).toBe(id)
      expect(id).toMatch(/^[a-z0-9_]+$/)
      expect(nums.has(s.dexNo)).toBe(false)
      nums.add(s.dexNo)
      for (const t of s.types) expect(TYPE_IDS).toContain(t)
      expect(s.catchRate).toBeGreaterThanOrEqual(1)
      expect(s.catchRate).toBeLessThanOrEqual(255)
      expect(s.expYield).toBeGreaterThan(0)
      expect(s.dex.lines).toHaveLength(2)
      for (const line of s.dex.lines) expect(line.length).toBeLessThanOrEqual(40)
      expect(s.dex.stats.length).toBeGreaterThan(0)
      for (const v of Object.values(s.baseStats)) expect(v).toBeGreaterThan(0)
    }
  })

  it('learnsets are sorted, reference real moves and give >= 1 move at level 1', () => {
    for (const s of Object.values(SPECIES)) {
      let last = 0
      for (const e of s.learnset) {
        expect(MOVES[e.move], `${s.id}: ${e.move}`).toBeDefined()
        expect(e.move).not.toBe(STRUGGLE_ID)
        expect(e.level).toBeGreaterThanOrEqual(last)
        last = e.level
      }
      expect(defaultMovesAt(s, 1).length).toBeGreaterThan(0)
    }
  })

  it('starters know 2 moves at Lv5 and learn a STAB move at Lv7-8', () => {
    for (const id of STARTER_IDS) {
      const s = getSpecies(id)
      expect(defaultMovesAt(s, 5)).toHaveLength(2)
      const stab = s.learnset.find((e) => e.level >= 7 && e.level <= 8 && getMove(e.move).type === s.types[0])
      expect(stab, id).toBeDefined()
    }
  })

  it('starters form a type triangle through their primary types', () => {
    expect(getSpecies('claude_fable').types[0]).toBe('myth')
    expect(getSpecies('gpt_5_5').types[0]).toBe('tool')
    expect(getSpecies('glm').types[0]).toBe('logic')
    expect(getSpecies('hallucihound').types).toEqual(['glitch'])
  })

  it('base stats loosely follow model character', () => {
    const bst = (id: string) => Object.values(getSpecies(id).baseStats).reduce((a, b) => a + b, 0)
    expect(bst('claude_opus')).toBeGreaterThan(bst('claude_fable'))
    expect(bst('gpt_5_5_xhigh')).toBeGreaterThan(bst('gpt_5_5'))
    expect(getSpecies('gpt_5_4_mini').baseStats.spe).toBeGreaterThan(getSpecies('gpt_5_5').baseStats.spe)
    expect(getSpecies('gemini_flash').baseStats.spe).toBeGreaterThan(70)
    expect(getSpecies('gemma_4').baseStats.def).toBeGreaterThan(getSpecies('gpt_5_4_mini').baseStats.def)
  })
})

describe('moves', () => {
  it('are well-formed', () => {
    for (const mv of Object.values(MOVES)) {
      expect(TYPE_IDS).toContain(mv.type)
      expect(mv.pp).toBeGreaterThan(0)
      if (mv.category === 'status') expect(mv.power).toBe(0)
      else expect(mv.power).toBeGreaterThan(0)
      if (mv.accuracy !== null) expect(mv.accuracy).toBeGreaterThan(0)
      if (mv.effect?.status) expect(STATUSES[mv.effect.status]).toBeDefined()
    }
    expect(Object.keys(MOVES).length).toBeGreaterThanOrEqual(30)
  })

  it('has priority moves, status inflicters and stat-stage moves', () => {
    const all = Object.values(MOVES)
    expect(all.some((m) => m.priority > 0)).toBe(true)
    for (const st of ['hallucinating', 'rate_limited', 'context_rot', 'timed_out']) expect(all.some((m) => m.effect?.status === st)).toBe(true)
    expect(all.some((m) => m.effect?.self)).toBe(true)
    expect(all.some((m) => m.effect?.foe)).toBe(true)
  })
})

describe('items, encounters, trainers', () => {
  it('items have required ids', () => {
    for (const id of ['prompt_orb', 'patch', 'big_patch', 'debugger', 'firewall']) expect(ITEMS[id]).toBeDefined()
    expect(ITEMS.patch.effect).toEqual({ kind: 'heal', amount: 20 })
    expect(ITEMS.prompt_orb.effect.kind).toBe('catch')
    for (const it of Object.values(ITEMS)) expect(it.price).toBeGreaterThanOrEqual(0)
  })

  it('route_101 table matches the slice plan', () => {
    const t = ENCOUNTER_TABLES.route_101
    expect(t.stepChance).toBeGreaterThan(0)
    expect(t.stepChance).toBeLessThan(0.3)
    expect(t.slots.reduce((a, s) => a + s.rate, 0)).toBe(100)
    for (const s of t.slots) {
      expect(SPECIES[s.speciesId]).toBeDefined()
      expect(s.minLevel).toBeGreaterThanOrEqual(2)
      expect(s.maxLevel).toBeLessThanOrEqual(4)
    }
    expect(t.slots.map((s) => s.speciesId).sort()).toEqual(['gemini_flash', 'gemma_4', 'gpt_5_4_mini', 'mistral_medium'])
    expect(t.slots.find((s) => s.speciesId === 'gemini_flash')!.rate).toBeLessThanOrEqual(10)
  })

  it('trainers reference valid species and sprites', () => {
    for (const id of ['route_101_a', 'route_101_b']) {
      const t = TRAINERS[id]
      expect(t).toBeDefined()
      expect(['trainer_m_front', 'trainer_f_front']).toContain(t.sprite)
      expect(t.preBattle.length).toBeGreaterThan(0)
      expect(t.postBattle.length).toBeGreaterThan(0)
      expect(t.prize).toBeGreaterThan(0)
      for (const p of t.party) {
        expect(SPECIES[p.speciesId]).toBeDefined()
        for (const mv of p.moves ?? []) expect(MOVES[mv]).toBeDefined()
      }
    }
  })
})
