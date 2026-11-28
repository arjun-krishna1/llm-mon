import { describe, expect, it } from 'vitest'
import { LAB_BEATS, LAB_TYPE_IDS, TYPES, TYPE_IDS, effectiveness, effectivenessText, matchupReason, typeMultiplier } from '../../../data/typechart.ts'

describe('type chart', () => {
  it('has the 8 labs plus classic and glitch, with names and 3-letter codes', () => {
    expect([...TYPE_IDS]).toEqual(['anthropic', 'openai', 'google', 'zhipu', 'deepseek', 'mistral', 'moonshot', 'cohere', 'xai', 'meta', 'microsoft', 'alibaba', 'classic', 'glitch'])
    const codes = new Set<string>()
    for (const t of TYPE_IDS) {
      expect(t).toMatch(/^[a-z]+$/)
      expect(TYPES[t].id).toBe(t)
      expect(TYPES[t].short).toMatch(/^[A-Z]{3}$/)
      codes.add(TYPES[t].short)
    }
    expect(codes.size).toBe(TYPE_IDS.length)
    expect(TYPES.openai.name).toBe('OpenAI')
    expect(TYPES.deepseek.name).toBe('DeepSeek')
  })

  it('only uses 0.5 / 1 / 2 single-type multipliers (no immunities)', () => {
    for (const a of TYPE_IDS) for (const d of TYPE_IDS) expect([0.5, 1, 2]).toContain(typeMultiplier(a, d))
  })

  it('starter triangle: anthropic > zhipu > openai > anthropic', () => {
    expect(typeMultiplier('anthropic', 'zhipu')).toBe(2)
    expect(typeMultiplier('zhipu', 'openai')).toBe(2)
    expect(typeMultiplier('openai', 'anthropic')).toBe(2)
    expect(typeMultiplier('zhipu', 'anthropic')).toBe(0.5)
    expect(typeMultiplier('openai', 'zhipu')).toBe(0.5)
    expect(typeMultiplier('anthropic', 'openai')).toBe(0.5)
  })

  it('every lab beats exactly two labs and is beaten by exactly two', () => {
    for (const lab of LAB_TYPE_IDS) {
      const beats = LAB_TYPE_IDS.filter((d) => typeMultiplier(lab, d) === 2)
      const beatenBy = LAB_TYPE_IDS.filter((a) => typeMultiplier(a, lab) === 2)
      const resists = LAB_TYPE_IDS.filter((a) => typeMultiplier(a, lab) === 0.5)
      expect(beats, lab).toHaveLength(2)
      expect(beatenBy, lab).toHaveLength(2)
      expect(resists, lab).toHaveLength(2)
      expect(beats.filter((b) => beatenBy.includes(b))).toEqual([]) // no mutual arrows
    }
    expect(LAB_BEATS).toHaveLength(24)
  })

  it('classic is neutral both ways against labs', () => {
    for (const lab of LAB_TYPE_IDS) {
      expect(typeMultiplier('classic', lab)).toBe(1)
      expect(typeMultiplier(lab, 'classic')).toBe(1)
    }
  })

  it('glitch is weak to every lab and corrupts classic', () => {
    for (const lab of LAB_TYPE_IDS) {
      expect(typeMultiplier(lab, 'glitch')).toBe(2)
      expect(typeMultiplier('glitch', lab)).toBe(1)
    }
    expect(typeMultiplier('glitch', 'classic')).toBe(2)
    expect(typeMultiplier('glitch', 'glitch')).toBe(0.5)
  })

  it('every matchup has an in-world reason', () => {
    for (const m of LAB_BEATS) {
      expect(m.reason.length).toBeGreaterThan(10)
      expect(m.reason.length).toBeLessThanOrEqual(64)
      expect(matchupReason(m.defender, m.attacker)).toBe(m.reason)
    }
    expect(matchupReason('anthropic', 'glitch')).toMatch(/fact-check/)
    expect(matchupReason('classic', 'google')).toBeNull()
  })

  it('effectiveness and texts', () => {
    expect(effectiveness('anthropic', ['google'])).toBe(2)
    expect(effectiveness('google', ['anthropic'])).toBe(0.5)
    expect(effectivenessText(2)).toMatch(/super effective/)
    expect(effectivenessText(0.5)).toMatch(/not very effective/)
    expect(effectivenessText(1)).toBeNull()
  })
})
