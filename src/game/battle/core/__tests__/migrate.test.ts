import { describe, expect, it } from 'vitest'
import { MOVES, LEGACY_MOVE_IDS, TRAINERS, STARTER_IDS, getSpecies, typeMultiplier } from '../../../data/index.ts'
import { BATTLE_DATA_VERSION, migrateMon, migrateSave } from '../migrate.ts'
import { calcStats } from '../mon.ts'
import type { MonInstance } from '../../../types.ts'

const IVS = { hp: 8, atk: 8, def: 8, spa: 8, spd: 8, spe: 8 }

/** A save exactly as round 1 (SAVE_VERSION 1, 8-type move ids) wrote it. */
function roundOneSave() {
  return {
    version: 1,
    playerName: 'Arjun',
    map: 'overworld',
    x: 10,
    y: 40,
    facing: 'up' as const,
    party: [
      { uid: 'glm-a', speciesId: 'glm', level: 8, exp: 314, hp: 20, status: 'none', ivs: IVS, moves: [{ id: 'graph_paw', pp: 30 }, { id: 'pattern_guard', pp: 40 }, { id: 'logic_spark', pp: 20 }] },
      { uid: 'gem-a', speciesId: 'gemma_4', level: 4, exp: 64, hp: 15, status: 'context_rot', ivs: IVS, moves: [{ id: 'autocomplete', pp: 35 }, { id: 'small_talk', pp: 40 }, { id: 'fork_strike', pp: 25 }] },
      { uid: 'gpt-a', speciesId: 'gpt_5_5', level: 20, exp: 5000, hp: 999, status: 'hallucinating', ivs: IVS, moves: [{ id: 'tool_tap', pp: 25 }, { id: 'function_call', pp: 15 }, { id: 'web_search', pp: 99 }, { id: 'no_such_move', pp: 3 }] },
      { uid: 'fla-a', speciesId: 'gemini_flash', level: 13, exp: 2197, hp: 30, status: 'none', ivs: IVS, moves: [{ id: 'bogus', pp: 1 }] },
    ],
    box: [{ uid: 'min-a', speciesId: 'gpt_5_4_mini', level: 4, exp: 51, hp: 12, status: 'none', ivs: IVS, moves: [{ id: 'low_latency', pp: 30 }, { id: 'overclock', pp: 20 }] }],
    bag: { prompt_orb: 5, patch: 2 },
    money: 3000,
    flags: { got_starter: true },
    seen: ['glm', 'hallucihound'],
    caught: ['glm'],
    healPoint: { map: 'center', spawn: 'counter' },
    playTimeMs: 123456,
  }
}

describe('save migration v1 -> v2', () => {
  it('maps every legacy move id to a real move', () => {
    for (const [oldId, newId] of Object.entries(LEGACY_MOVE_IDS)) expect(MOVES[newId], `${oldId} -> ${newId}`).toBeDefined()
  })

  it('migrates a round-1 save shape', () => {
    const save = roundOneSave()
    const report = migrateSave(save)
    expect(report.fromVersion).toBe(1)
    expect(save.version).toBe(BATTLE_DATA_VERSION)
    const ids = (i: number) => save.party[i].moves.map((m) => m.id)
    expect(ids(0)).toEqual(['graph_paw', 'pattern_guard', 'graph_reason'])
    expect(ids(1)).toEqual(['autocomplete', 'small_talk', 'expert_mix'])
    expect(save.party[1].status).toBe('context_rot')
    // old function_call (70) -> reasoning_effort; tool_tap -> new function_call; unknown dropped
    expect(ids(2)).toEqual(['function_call', 'reasoning_effort', 'grounding'])
    expect(save.party[2].moves[2].pp).toBe(MOVES.grounding.pp) // clamped from 99
    expect(save.party[2].status).toBe('none') // volatile status never persists
    expect(save.party[2].hp).toBe(calcStats(save.party[2] as MonInstance).hp) // clamped
    // nothing valid left -> relearns level-appropriate moves
    expect(save.party[3].moves.length).toBeGreaterThan(0)
    for (const m of save.party[3].moves) expect(MOVES[m.id]).toBeDefined()
    expect(save.box[0].moves.map((m) => m.id)).toEqual(['tailwind', 'cool_breeze'])
    // everything else untouched
    expect(save.bag).toEqual({ prompt_orb: 5, patch: 2 })
    expect(save.money).toBe(3000)
    expect(save.seen).toEqual(['glm', 'hallucihound'])
    expect(report.changes.some((c) => c.includes('logic_spark -> graph_reason'))).toBe(true)
  })

  it('is idempotent and leaves v2 move ids alone (function_call stays function_call)', () => {
    const save = roundOneSave()
    migrateSave(save)
    const once = JSON.stringify(save)
    const report = migrateSave(save)
    expect(JSON.stringify(save)).toBe(once)
    expect(report.changes).toEqual([])
  })

  it('never throws on junk', () => {
    expect(() => migrateSave({} as never)).not.toThrow()
    expect(() => migrateSave({ version: 1, party: [null, 5, { speciesId: 'nope', moves: 'x' }] } as never)).not.toThrow()
    const weird = { uid: 'x', speciesId: 'glm', level: 'NaN', exp: 0, hp: 'lots', status: 42, moves: null, ivs: null } as unknown as MonInstance
    expect(() => migrateMon(weird, 1)).not.toThrow()
    expect(weird.moves.length).toBeGreaterThan(0)
    expect(weird.status).toBe('none')
    expect(Number.isFinite(weird.hp)).toBe(true)
  })
})

describe('route trainers showcase the type web', () => {
  it('every starter has a super-effective interaction (either way) with each route trainer', () => {
    for (const id of ['route_101_a', 'route_101_b']) {
      const types = TRAINERS[id].party.map((p) => getSpecies(p.speciesId).types[0])
      for (const s of STARTER_IDS) {
        const st = getSpecies(s).types[0]
        expect(types.some((t) => typeMultiplier(st, t) > 1 || typeMultiplier(t, st) > 1), `${s} vs ${id}`).toBe(true)
      }
    }
  })

  it('rivals use full PP (no PP tricks)', () => {
    for (const t of Object.values(TRAINERS)) for (const p of t.party) expect(p.pp, t.id).toBeUndefined()
  })
})
