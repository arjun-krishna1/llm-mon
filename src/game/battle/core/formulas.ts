// Damage, catch and escape maths. Pure functions; randomness is passed in.

import { randInt, type Rng } from './rng.ts'

export interface DamageParams {
  level: number
  power: number
  /** Effective attacking stat (after stages). */
  attack: number
  /** Effective defending stat (after stages). */
  defense: number
  stab: boolean
  /** Type multiplier (0, 0.25, 0.5, 1, 2, 4). */
  effectiveness: number
  crit: boolean
  /** Random factor in [0.85, 1.0]. */
  random: number
}

export const CRIT_MULTIPLIER = 1.5
export const STAB_MULTIPLIER = 1.5
export const CRIT_CHANCE = 1 / 16
export const HIGH_CRIT_CHANCE = 1 / 8

/**
 * Classic handheld formula:
 *   base = floor(floor(floor(2L/5 + 2) * P * A / D) / 50) + 2
 *   then * crit * random * STAB * type, flooring each step; min 1 unless immune.
 */
export function computeDamage(p: DamageParams): number {
  if (p.power <= 0 || p.effectiveness === 0) return 0
  const a = Math.max(1, p.attack)
  const d = Math.max(1, p.defense)
  let dmg = Math.floor(Math.floor((Math.floor((2 * p.level) / 5 + 2) * p.power * a) / d) / 50) + 2
  if (p.crit) dmg = Math.floor(dmg * CRIT_MULTIPLIER)
  dmg = Math.floor(dmg * p.random)
  if (p.stab) dmg = Math.floor(dmg * STAB_MULTIPLIER)
  dmg = Math.floor(dmg * p.effectiveness)
  return Math.max(1, dmg)
}

/** Random factor: one of 16 steps between 0.85 and 1.00. */
export function rollDamageRandom(rng: Rng): number {
  return (85 + randInt(rng, 16)) / 100
}

/** [min, max] non-crit damage, handy for AI and tests. */
export function damageRange(p: Omit<DamageParams, 'random' | 'crit'>): [number, number] {
  return [computeDamage({ ...p, crit: false, random: 0.85 }), computeDamage({ ...p, crit: false, random: 1 })]
}

// ── catching ──────────────────────────────────────────────────────────────

/** Catch-rate bonus for the target's major status. */
export function statusCatchBonus(status: string): number {
  if (status === 'timed_out') return 2
  if (status === 'rate_limited' || status === 'context_rot') return 1.5
  return 1
}

export interface CatchOdds {
  /** Modified catch value 1..255. >= 255 is a guaranteed catch. */
  a: number
  /** Probability each of the 4 shake checks passes. */
  shakeProbability: number
  /** Overall probability of a catch (= shakeProbability ^ 4). */
  probability: number
}

export function catchOdds(maxHp: number, hp: number, catchRate: number, orbMultiplier: number, status: string): CatchOdds {
  const m = Math.max(1, maxHp)
  const h = Math.max(1, Math.min(m, hp))
  const raw = (((3 * m - 2 * h) * catchRate * orbMultiplier) / (3 * m)) * statusCatchBonus(status)
  const a = Math.max(1, Math.min(255, Math.floor(raw)))
  if (a >= 255) return { a, shakeProbability: 1, probability: 1 }
  const b = Math.floor(1048560 / Math.sqrt(Math.sqrt(16711680 / a)))
  const shakeProbability = Math.min(1, b / 65536)
  return { a, shakeProbability, probability: shakeProbability ** 4 }
}

/** Four shake checks. `shakes` is how many times the orb wobbles on screen (0-3). */
export function rollCatch(rng: Rng, odds: CatchOdds): { caught: boolean; shakes: number } {
  let passes = 0
  while (passes < 4 && rng.next() < odds.shakeProbability) passes++
  return { caught: passes === 4, shakes: Math.min(3, passes) }
}

// ── running ───────────────────────────────────────────────────────────────

/**
 * Chance to flee a wild battle. Faster always escapes; otherwise
 * ((playerSpe * 128 / enemySpe) + 30 * previousAttempts) / 256.
 */
export function escapeChance(playerSpe: number, enemySpe: number, previousAttempts: number): number {
  if (playerSpe >= enemySpe) return 1
  const f = Math.floor((playerSpe * 128) / Math.max(1, enemySpe)) + 30 * previousAttempts
  return Math.min(1, f / 256)
}

// ── EXP ───────────────────────────────────────────────────────────────────

/** EXP for defeating a mon: floor(base * L / 7), x1.5 for trainer mons, split between participants. */
export function expYield(baseExp: number, defeatedLevel: number, trainer: boolean, participants: number): number {
  let exp = Math.floor((baseExp * defeatedLevel) / 7)
  if (trainer) exp = Math.floor(exp * 1.5)
  return Math.max(1, Math.floor(exp / Math.max(1, participants)))
}
