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
  LAB_TYPE_IDS,
  TUTORS,
  canLearnTutorMove,
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

  it('every Route 101 wild knows a move of its own lab by Lv4', () => {
    for (const slot of ENCOUNTER_TABLES.route_101.slots) {
      const sp = getSpecies(slot.speciesId)
      expect(defaultMovesAt(sp, 4).some((id) => getMove(id).type === sp.types[0]), sp.id).toBe(true)
    }
  })

  it('every lab type has 3-4 moves and every species is single-typed', () => {
    for (const lab of LAB_TYPE_IDS) {
      const n = Object.values(MOVES).filter((m) => m.type === lab).length
      expect(n, lab).toBeGreaterThanOrEqual(3)
      expect(n, lab).toBeLessThanOrEqual(4)
    }
    for (const s of Object.values(SPECIES)) expect(s.types).toHaveLength(1)
  })

  it('starters form a type triangle through their primary types', () => {
    expect(getSpecies('claude_fable').types[0]).toBe('anthropic')
    expect(getSpecies('gpt_5_5').types[0]).toBe('openai')
    expect(getSpecies('glm').types[0]).toBe('zhipu')
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
    for (const id of ['route_101_a', 'route_101_b', 'rival_dana_gpt_5_5', 'rival_dana_glm', 'rival_dana_claude_fable', 'rival_yilong_glm']) {
      const t = TRAINERS[id]
      expect(t).toBeDefined()
      expect(t.preBattle.length).toBeGreaterThan(0)
      expect(t.postBattle.length).toBeGreaterThan(0)
      expect(t.prize).toBeGreaterThan(0)
    }
    for (const t of Object.values(TRAINERS)) {
      expect(t.sprite.length, t.id).toBeGreaterThan(0)
      for (const p of t.party) {
        expect(SPECIES[p.speciesId]).toBeDefined()
        for (const mv of p.moves ?? []) expect(MOVES[mv]).toBeDefined()
      }
    }
  })
})

// Stage 2-3 content (Gym 1-2, Caltrain Line, Menlo Park, Team Overfit, rival battle 2).
const SLICE_IDS = new Set([...ART_CONTRACT_IDS, 'claude_fable', 'gpt_5_5', 'glm'])
const TABLE_AREA: Record<string, string> = { route_101: 'route_101', route_101_north: 'route_101_north', caltrain_line: 'caltrain_line', menlo_park_outskirts: 'menlo_park' }

describe('stage 2-3 data', () => {
  it('encounter tables use first-batch species whose areas list the table, at sensible levels', () => {
    for (const t of Object.values(ENCOUNTER_TABLES)) {
      expect(TABLE_AREA[t.id], t.id).toBeDefined()
      expect(t.slots.reduce((a, s) => a + s.rate, 0), t.id).toBe(100)
      for (const s of t.slots) {
        const sp = SPECIES[s.speciesId]
        expect(sp.firstBatch || SLICE_IDS.has(s.speciesId), `${t.id}: ${s.speciesId} has art`).toBe(true)
        expect(sp.areas, `${s.speciesId} areas`).toContain(TABLE_AREA[t.id])
        expect(s.minLevel).toBeLessThanOrEqual(s.maxLevel)
      }
    }
    const lv = (id: string) => ENCOUNTER_TABLES[id].slots.map((s) => s.maxLevel)
    expect(Math.max(...lv('caltrain_line'))).toBeLessThanOrEqual(15)
    expect(Math.max(...lv('menlo_park_outskirts'))).toBeLessThanOrEqual(18)
  })

  it('Gym 1 and Gym 2 match the STORY_BIBLE: leader teams, three gym trainers, badges, level bands', () => {
    const team = (id: string) => TRAINERS[id].party.map((p) => p.speciesId)
    expect(team('gym1_leader')).toEqual(['perceptron', 'sgd', 'mlp'])
    expect(team('gym2_leader')).toEqual(['n_gram', 'markov_chain', 'entropy'])
    expect(TRAINERS.gym1_leader.badge).toBe('gradient')
    expect(TRAINERS.gym2_leader.badge).toBe('likelihood')
    for (const [gym, lo, hi] of [['gym1', 10, 14], ['gym2', 15, 20]] as const) {
      for (const s of ['a', 'b', 'c', 'leader']) {
        const t = TRAINERS[`${gym}_${s}`]
        expect(t, `${gym}_${s}`).toBeDefined()
        for (const p of t.party) {
          expect(p.level).toBeGreaterThanOrEqual(lo)
          expect(p.level).toBeLessThanOrEqual(hi)
        }
        expect(t.arena?.length, `${gym}_${s} uses the gym mechanic`).toBeGreaterThan(0)
      }
    }
  })

  it('8 Caltrain trainers, 6 Team Overfit grunts and an admin; first-batch species only', () => {
    const ids = [...Array.from({ length: 8 }, (_, i) => `caltrain_${i + 1}`), ...Array.from({ length: 6 }, (_, i) => `overfit_grunt_${i + 1}`), 'overfit_admin', 'gym1_a', 'gym1_b', 'gym1_c', 'gym1_leader', 'gym2_a', 'gym2_b', 'gym2_c', 'gym2_leader']
    for (const id of ids) {
      const t = TRAINERS[id]
      expect(t, id).toBeDefined()
      for (const p of t.party) expect(SPECIES[p.speciesId].firstBatch || SLICE_IDS.has(p.speciesId), `${id}: ${p.speciesId}`).toBe(true)
    }
    for (let i = 1; i <= 6; i++) expect(TRAINERS[`overfit_grunt_${i}`].arena?.[0].id).toBe('overfit')
    expect(TRAINERS.overfit_admin.arena?.[0].id).toBe('overfit')
  })

  it('rival Yilong: ids keyed by the player\'s starter, ace Grok plus the counter-starter, old Dana ids kept', () => {
    const counter: Record<string, string> = { claude_fable: 'gpt_5_5', gpt_5_5: 'glm', glm: 'claude_fable' }
    for (const mine of STARTER_IDS) {
      for (const id of [`rival_yilong_${mine}`, `rival_yilong_${mine}_rematch`, `rival_yilong2_${mine}`]) {
        const t = TRAINERS[id]
        expect(t, id).toBeDefined()
        expect(t.name).toBe('Yilong')
        expect(t.party.some((p) => p.speciesId === 'grok'), `${id} has Grok`).toBe(true)
        expect(t.party.some((p) => getSpecies(p.speciesId).types[0] === getSpecies(counter[mine]).types[0]), `${id} has the counter lab`).toBe(true)
      }
      expect(TRAINERS[`rival_dana_${counter[mine]}`].party).toEqual(TRAINERS[`rival_yilong_${mine}`].party)
    }
  })
})

describe('move tutors', () => {
  it('teach real moves for a price, with type and role limits', () => {
    expect(Object.keys(TUTORS).length).toBeGreaterThanOrEqual(4)
    for (const t of Object.values(TUTORS)) for (const m of t.moves) {
      expect(MOVES[m.move], `${t.id}: ${m.move}`).toBeDefined()
      expect(m.price).toBeGreaterThan(0)
    }
    const lab = TUTORS.tutor_labs.moves.find((m) => m.move === 'extended_thinking')!
    expect(canLearnTutorMove(lab, 'claude_fable')).toBe(true)
    expect(canLearnTutorMove(lab, 'glm')).toBe(false)
    const drop = TUTORS.tutor_mountain_view.moves.find((m) => m.move === 'drop_units')!
    expect(canLearnTutorMove(drop, 'dropout')).toBe(true)
    expect(canLearnTutorMove(drop, 'claude_fable')).toBe(false)
    expect(canLearnTutorMove(TUTORS.tutor_soma.moves[0], 'proxy_student')).toBe(false)
  })
})

