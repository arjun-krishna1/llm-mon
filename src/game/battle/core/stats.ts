// Stat, stage and EXP-curve maths (generic handheld-RPG style, our own implementation).

import type { StatKey, Stats } from '../../types.ts'
import type { GrowthRate } from '../../data/species.ts'

export const STAT_KEYS: StatKey[] = ['hp', 'atk', 'def', 'spa', 'spd', 'spe']
export const STAT_NAMES: Record<StatKey | 'acc' | 'eva', string> = {
  hp: 'HP',
  atk: 'Attack',
  def: 'Defense',
  spa: 'Sp. Atk',
  spd: 'Sp. Def',
  spe: 'Speed',
  acc: 'accuracy',
  eva: 'evasiveness',
}

export const MAX_LEVEL = 100
export const MIN_STAGE = -6
export const MAX_STAGE = 6

/**
 * One stat at a level. IVs are 0-15 (doubled internally, so the spread matches a 0-31 range).
 * HP:     floor((2*base + 2*iv) * L / 100) + L + 10
 * Others: floor((2*base + 2*iv) * L / 100) + 5
 */
export function calcStat(stat: StatKey, base: number, iv: number, level: number): number {
  const core = Math.floor(((2 * base + 2 * iv) * level) / 100)
  return stat === 'hp' ? core + level + 10 : core + 5
}

export function calcStatsFromBase(base: Stats, ivs: Stats, level: number): Stats {
  const out = {} as Stats
  for (const k of STAT_KEYS) out[k] = calcStat(k, base[k], ivs[k], level)
  return out
}

/** Stage multiplier for atk/def/spa/spd/spe: +1 = 1.5x, +2 = 2x ... -1 = 0.67x ... */
export function stageMultiplier(stage: number): number {
  return stage >= 0 ? (2 + stage) / 2 : 2 / (2 - stage)
}

/** Stage multiplier for accuracy/evasion: +1 = 1.33x, -1 = 0.75x ... */
export function accuracyStageMultiplier(stage: number): number {
  return stage >= 0 ? (3 + stage) / 3 : 3 / (3 - stage)
}

/** Total EXP needed to *be* at `level`. Level 1 = 0. */
export function expForLevel(growth: GrowthRate, level: number): number {
  if (level <= 1) return 0
  const n = Math.min(level, MAX_LEVEL)
  const n3 = n * n * n
  switch (growth) {
    case 'fast':
      return Math.floor((4 * n3) / 5)
    case 'medium_fast':
      return n3
    case 'medium_slow':
      return Math.max(0, Math.floor((6 * n3) / 5 - 15 * n * n + 100 * n - 140))
    case 'slow':
      return Math.floor((5 * n3) / 4)
  }
}

/** Highest level whose threshold `exp` has reached. */
export function levelForExp(growth: GrowthRate, exp: number): number {
  let level = 1
  while (level < MAX_LEVEL && expForLevel(growth, level + 1) <= exp) level++
  return level
}
