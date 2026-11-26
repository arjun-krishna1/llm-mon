import { describe, expect, it } from 'vitest'
import { catchOdds, computeDamage, damageRange, escapeChance, expYield, rollCatch } from '../formulas.ts'
import { createRng } from '../rng.ts'
import { calcStat, expForLevel, levelForExp, stageMultiplier } from '../stats.ts'
import { addExp, calcStats, createMon, learnMove } from '../mon.ts'
import type { GrowthRate } from '../../../data/species.ts'

const base = { level: 5, power: 40, attack: 11, defense: 10, stab: false, effectiveness: 1 }

describe('damage', () => {
  it('stays within the random band', () => {
    const [lo, hi] = damageRange(base)
    expect(lo).toBeGreaterThanOrEqual(1)
    expect(hi).toBeGreaterThanOrEqual(lo)
    for (let r = 85; r <= 100; r++) {
      const d = computeDamage({ ...base, crit: false, random: r / 100 })
      expect(d).toBeGreaterThanOrEqual(lo)
      expect(d).toBeLessThanOrEqual(hi)
    }
  })

  it('crit, STAB and type scale damage up', () => {
    const plain = computeDamage({ ...base, crit: false, random: 1 })
    expect(computeDamage({ ...base, crit: true, random: 1 })).toBeGreaterThan(plain)
    expect(computeDamage({ ...base, stab: true, crit: false, random: 1 })).toBeGreaterThan(plain)
    expect(computeDamage({ ...base, effectiveness: 2, crit: false, random: 1 })).toBeGreaterThanOrEqual(plain * 2 - 1)
    expect(computeDamage({ ...base, effectiveness: 0.5, crit: false, random: 1 })).toBeLessThan(plain)
  })

  it('is at least 1 unless immune, 0 if immune', () => {
    expect(computeDamage({ ...base, attack: 1, defense: 999, crit: false, random: 0.85 })).toBe(1)
    expect(computeDamage({ ...base, effectiveness: 0, crit: false, random: 1 })).toBe(0)
  })

  it('stage multipliers', () => {
    expect(stageMultiplier(0)).toBe(1)
    expect(stageMultiplier(1)).toBe(1.5)
    expect(stageMultiplier(-1)).toBeCloseTo(2 / 3)
    expect(stageMultiplier(6)).toBe(4)
    expect(stageMultiplier(-6)).toBe(0.25)
  })
})

describe('stats + exp curves', () => {
  it('calcStat matches the formula', () => {
    expect(calcStat('hp', 50, 8, 5)).toBe(Math.floor((116 * 5) / 100) + 15)
    expect(calcStat('atk', 50, 8, 5)).toBe(Math.floor((116 * 5) / 100) + 5)
  })

  it('exp curves are monotonic and invert', () => {
    for (const g of ['fast', 'medium_fast', 'medium_slow', 'slow'] as GrowthRate[]) {
      let prev = -1
      for (let l = 1; l <= 100; l++) {
        const e = expForLevel(g, l)
        expect(e).toBeGreaterThan(prev)
        prev = e
        expect(levelForExp(g, e)).toBe(l)
        if (l > 1) expect(levelForExp(g, e - 1)).toBe(l - 1)
      }
    }
    expect(expForLevel('medium_fast', 10)).toBe(1000)
  })

  it('createMon is deterministic and consistent', () => {
    const a = createMon('glm', 5, createRng(42))
    const b = createMon('glm', 5, createRng(42))
    expect(a).toEqual(b)
    expect(a.hp).toBe(calcStats(a).hp)
    expect(a.exp).toBe(expForLevel('medium_slow', 5))
    expect(a.moves.map((m) => m.id)).toEqual(['graph_paw', 'pattern_guard'])
    for (const v of Object.values(a.ivs)) expect(v).toBeGreaterThanOrEqual(0)
    for (const v of Object.values(a.ivs)) expect(v).toBeLessThanOrEqual(15)
  })

  it('addExp levels up across several levels and raises HP', () => {
    const mon = createMon('claude_fable', 5, createRng(1))
    const hpBefore = mon.hp
    const steps = addExp(mon, expForLevel('medium_slow', 8) - mon.exp)
    expect(steps.map((s) => s.level)).toEqual([6, 7, 8])
    expect(mon.level).toBe(8)
    expect(mon.hp).toBeGreaterThan(hpBefore)
    expect(steps.find((s) => s.level === 7)!.newMoves).toEqual(['tiny_myth'])
  })

  it('learnMove appends, replaces and refuses duplicates', () => {
    const mon = createMon('glm', 5, createRng(1))
    expect(learnMove(mon, 'logic_spark').learned).toBe(true)
    expect(learnMove(mon, 'logic_spark').learned).toBe(false)
    learnMove(mon, 'summarize')
    expect(learnMove(mon, 'proof_step').learned).toBe(false)
    expect(learnMove(mon, 'proof_step', 0)).toEqual({ learned: true, forgot: 'graph_paw' })
  })

  it('exp yield', () => {
    expect(expYield(64, 7, false, 1)).toBe(64)
    expect(expYield(64, 7, true, 1)).toBe(96)
    expect(expYield(64, 7, false, 2)).toBe(32)
  })
})

describe('catching', () => {
  it('lower HP, status and better orbs raise odds', () => {
    const full = catchOdds(20, 20, 190, 1, 'none').probability
    const low = catchOdds(20, 1, 190, 1, 'none').probability
    const asleep = catchOdds(20, 1, 190, 1, 'timed_out').probability
    const great = catchOdds(20, 20, 45, 1.5, 'none').probability
    const plain = catchOdds(20, 20, 45, 1, 'none').probability
    expect(low).toBeGreaterThan(full)
    expect(asleep).toBeGreaterThanOrEqual(low)
    expect(great).toBeGreaterThan(plain)
    expect(catchOdds(20, 1, 255, 2, 'timed_out').probability).toBe(1)
  })

  it('seeded sampling matches the computed probability', () => {
    const rng = createRng(1234)
    for (const [hp, rate] of [
      [20, 190],
      [5, 190],
      [20, 45],
      [3, 75],
    ]) {
      const odds = catchOdds(20, hp, rate, 1, 'none')
      let caught = 0
      const N = 20000
      for (let i = 0; i < N; i++) if (rollCatch(rng, odds).caught) caught++
      expect(Math.abs(caught / N - odds.probability)).toBeLessThan(0.02)
    }
  })

  it('rollCatch reports 0-3 shakes', () => {
    const rng = createRng(9)
    const odds = catchOdds(20, 20, 45, 1, 'none')
    for (let i = 0; i < 500; i++) {
      const r = rollCatch(rng, odds)
      expect(r.shakes).toBeGreaterThanOrEqual(0)
      expect(r.shakes).toBeLessThanOrEqual(3)
      if (r.caught) expect(r.shakes).toBe(3)
    }
  })

  it('full-HP route mons are catchable but not trivially', () => {
    const p = catchOdds(16, 16, 190, 1, 'none').probability
    expect(p).toBeGreaterThan(0.2)
    expect(p).toBeLessThan(0.6)
    expect(catchOdds(16, 16, 75, 1, 'none').probability).toBeLessThan(0.25)
  })
})

describe('escape', () => {
  it('faster always escapes, slower improves with attempts', () => {
    expect(escapeChance(20, 10, 0)).toBe(1)
    expect(escapeChance(10, 20, 0)).toBeCloseTo(64 / 256)
    expect(escapeChance(10, 20, 3)).toBeGreaterThan(escapeChance(10, 20, 0))
  })
})
