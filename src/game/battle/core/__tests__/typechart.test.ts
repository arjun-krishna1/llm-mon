import { describe, expect, it } from 'vitest'
import { TYPES, TYPE_IDS, effectiveness, effectivenessText, typeMultiplier } from '../../../data/typechart.ts'

describe('type chart', () => {
  it('has 8 lowercase single-word ids with info', () => {
    expect(TYPE_IDS).toHaveLength(8)
    for (const t of TYPE_IDS) {
      expect(t).toMatch(/^[a-z]+$/)
      expect(TYPES[t].id).toBe(t)
    }
  })

  it('only uses 0.5 / 1 / 2 single-type multipliers', () => {
    for (const a of TYPE_IDS) for (const d of TYPE_IDS) expect([0.5, 1, 2]).toContain(typeMultiplier(a, d))
  })

  it('starter triangle: myth > logic > tool > myth', () => {
    expect(typeMultiplier('myth', 'logic')).toBe(2)
    expect(typeMultiplier('logic', 'tool')).toBe(2)
    expect(typeMultiplier('tool', 'myth')).toBe(2)
    expect(typeMultiplier('logic', 'myth')).toBe(0.5)
    expect(typeMultiplier('tool', 'logic')).toBe(0.5)
    expect(typeMultiplier('myth', 'tool')).toBe(0.5)
  })

  it('neutral is neutral offensively', () => {
    for (const d of TYPE_IDS) expect(typeMultiplier('neutral', d)).toBe(1)
  })

  it('glitch is countered by logic, speed and vision', () => {
    expect(typeMultiplier('logic', 'glitch')).toBe(2)
    expect(typeMultiplier('speed', 'glitch')).toBe(2)
    expect(typeMultiplier('vision', 'glitch')).toBe(2)
    expect(typeMultiplier('glitch', 'glitch')).toBe(0.5)
  })

  it('every type has at least one weakness and one strength', () => {
    for (const t of TYPE_IDS) {
      expect(TYPE_IDS.some((a) => typeMultiplier(a, t) === 2), `${t} weakness`).toBe(true)
      if (t !== 'neutral') expect(TYPE_IDS.some((d) => typeMultiplier(t, d) === 2), `${t} strength`).toBe(true)
    }
  })

  it('dual types multiply', () => {
    expect(effectiveness('tool', ['speed', 'open'])).toBe(1)
    expect(effectiveness('myth', ['logic', 'open'])).toBe(4)
    expect(effectiveness('glitch', ['open', 'glitch'])).toBe(0.25)
  })

  it('texts', () => {
    expect(effectivenessText(2)).toMatch(/super effective/)
    expect(effectivenessText(0.5)).toMatch(/not very effective/)
    expect(effectivenessText(1)).toBeNull()
  })
})
