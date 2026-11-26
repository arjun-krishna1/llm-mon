import { describe, expect, it } from 'vitest'
import { ENCOUNTER_TABLES, SPECIES_IDS, STARTER_IDS } from '../../../data/index.ts'
import type { BattleEvent } from '../events.ts'
import { applyItemOutsideBattle, calcStats, createMon, healParty } from '../mon.ts'
import { rollEncounter, trainerBattleRequest, tutorialBattleRequest, wildBattleRequest } from '../requests.ts'
import { createRng } from '../rng.ts'
import { simulate } from './sim.ts'

function assertSane(events: BattleEvent[]): void {
  const walk = (v: unknown, path: string): void => {
    if (typeof v === 'number') expect(Number.isFinite(v), path).toBe(true)
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`)
  }
  events.forEach((e, i) => walk(e, `${i}:${e.type}`))
  for (const e of events) {
    if (e.type === 'damage' || e.type === 'heal') {
      expect(e.hpAfter).toBeGreaterThanOrEqual(0)
      expect(e.hpAfter).toBeLessThanOrEqual(e.maxHp)
    }
    if (e.type === 'text') expect(e.text).not.toMatch(/undefined|NaN|\{name\}/)
  }
  expect(events.filter((e) => e.type === 'battle_end')).toHaveLength(1)
  expect(events[events.length - 1].type === 'battle_end' || events.some((e) => e.type === 'learn_move_prompt')).toBe(true)
}

describe('full simulated battles', () => {
  for (const starter of STARTER_IDS) {
    it(`${starter} vs hallucihound tutorial always wins`, () => {
      for (let seed = 0; seed < 50; seed++) {
        const rng = createRng(seed)
        const party = [createMon(starter, 5, rng)]
        const r = simulate(tutorialBattleRequest(rng, 2 + (seed % 2)), party, rng, 'random')
        expect(r.outcome).toBe('win')
        assertSane(r.events)
      }
    })

    for (const slot of ENCOUNTER_TABLES.route_101.slots) {
      it(`${starter} vs wild ${slot.speciesId} finishes cleanly`, () => {
        for (let seed = 0; seed < 40; seed++) {
          const rng = createRng(seed * 31 + 7)
          const party = [createMon(starter, 5, rng), createMon('gemma_4', 3, rng)]
          const lvl = slot.minLevel + (seed % (slot.maxLevel - slot.minLevel + 1))
          const r = simulate(wildBattleRequest(createMon(slot.speciesId, lvl, rng)), party, rng, 'random', { patch: 2, prompt_orb: 1 })
          expect(['win', 'lose', 'run', 'caught']).toContain(r.outcome)
          assertSane(r.events)
        }
      })
    }

    it(`${starter} vs both route trainers`, () => {
      for (let seed = 0; seed < 20; seed++) {
        const rng = createRng(seed)
        const party = [createMon(starter, 7, rng)]
        for (const t of ['route_101_a', 'route_101_b']) {
          const r = simulate(trainerBattleRequest(t, rng), party, rng, 'random')
          assertSane(r.events)
          healParty(party)
        }
      }
    })
  }

  it('every species can battle every species without hanging', () => {
    const rng = createRng(99)
    for (const a of SPECIES_IDS)
      for (const b of SPECIES_IDS) {
        const r = simulate(wildBattleRequest(createMon(b, 12, rng)), [createMon(a, 12, rng)], rng, 'random', {}, 2000)
        assertSane(r.events)
      }
  })
})

describe('encounters', () => {
  it('rollEncounter respects step chance, levels and rates', () => {
    const rng = createRng(2024)
    const counts: Record<string, number> = {}
    let hits = 0
    const N = 20000
    for (let i = 0; i < N; i++) {
      const m = rollEncounter('route_101', rng)
      if (!m) continue
      hits++
      counts[m.speciesId] = (counts[m.speciesId] ?? 0) + 1
      expect(m.level).toBeGreaterThanOrEqual(2)
      expect(m.level).toBeLessThanOrEqual(4)
    }
    expect(hits / N).toBeGreaterThan(0.08)
    expect(hits / N).toBeLessThan(0.12)
    expect(counts.gemini_flash / hits).toBeLessThan(0.08)
    expect(counts.gemma_4 / hits).toBeGreaterThan(0.3)
  })

  it('force and repel options', () => {
    const rng = createRng(5)
    for (let i = 0; i < 50; i++) expect(rollEncounter('route_101', rng, { force: true })).not.toBeNull()
    for (let i = 0; i < 200; i++) expect(rollEncounter('route_101', rng, { force: true, repelActive: true, leadLevel: 10 })).toBeNull()
  })
})

describe('field items', () => {
  it('patch heals up to max, refuses full/fainted', () => {
    const m = createMon('glm', 5, createRng(1))
    expect(applyItemOutsideBattle('patch', m).ok).toBe(false)
    m.hp = 1
    const r = applyItemOutsideBattle('patch', m)
    expect(r.ok).toBe(true)
    expect(m.hp).toBe(Math.min(calcStats(m).hp, 21))
    m.hp = 0
    expect(applyItemOutsideBattle('big_patch', m).ok).toBe(false)
  })

  it('debugger cures, orbs cannot be used on a mon', () => {
    const m = createMon('glm', 5, createRng(1))
    m.status = 'rate_limited'
    expect(applyItemOutsideBattle('debugger', m)).toMatchObject({ ok: true, curedStatus: 'rate_limited' })
    expect(m.status).toBe('none')
    expect(applyItemOutsideBattle('prompt_orb', m).ok).toBe(false)
  })

  it('healParty restores hp, status and pp', () => {
    const m = createMon('glm', 5, createRng(1))
    m.hp = 0
    m.status = 'context_rot'
    m.moves[0].pp = 0
    healParty([m])
    expect(m.hp).toBe(calcStats(m).hp)
    expect(m.status).toBe('none')
    expect(m.moves[0].pp).toBe(35)
  })
})
