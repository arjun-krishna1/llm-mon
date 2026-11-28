// MonInstance helpers: creation, stats, healing, EXP, move learning, field item use.

import type { MonInstance, MoveSlot, Stats } from '../../types.ts'
import { SPECIES, getItem, getMove, getSpecies } from '../../data/index.ts'
import { defaultBond } from './arena.ts'
import { STATUSES, isMajorStatus } from '../../data/statuses.ts'
import type { SpeciesDef } from '../../data/species.ts'
import { randInt, type Rng } from './rng.ts'
import { MAX_LEVEL, STAT_KEYS, calcStatsFromBase, expForLevel, levelForExp } from './stats.ts'

export interface CreateMonOptions {
  /** Explicit moveset (move ids). Default: the last 4 moves learnable at `level`. */
  moves?: string[]
  nickname?: string
  /** Explicit IVs; default random 0-15 each. */
  ivs?: Partial<Stats>
}

/** Moves a mon of `species` knows by default at `level` (latest 4 distinct). */
export function defaultMovesAt(species: SpeciesDef, level: number): string[] {
  const known: string[] = []
  for (const entry of species.learnset) {
    if (entry.level > level) break
    const idx = known.indexOf(entry.move)
    if (idx >= 0) known.splice(idx, 1)
    known.push(entry.move)
  }
  return known.slice(-4)
}

/** Moves a species learns on reaching exactly `level`. */
export function movesLearnedAt(speciesId: string, level: number): string[] {
  return getSpecies(speciesId)
    .learnset.filter((e) => e.level === level)
    .map((e) => e.move)
}

export function moveSlot(moveId: string): MoveSlot {
  return { id: moveId, pp: getMove(moveId).pp }
}

export function createMon(speciesId: string, level: number, rng: Rng, opts: CreateMonOptions = {}): MonInstance {
  const species = getSpecies(speciesId)
  const lvl = Math.max(1, Math.min(MAX_LEVEL, Math.floor(level)))
  const ivs = {} as Stats
  for (const k of STAT_KEYS) ivs[k] = opts.ivs?.[k] ?? randInt(rng, 16)
  let uid = ''
  for (let i = 0; i < 8; i++) uid += randInt(rng, 36).toString(36)
  const moves = (opts.moves ?? defaultMovesAt(species, lvl)).slice(0, 4).map(moveSlot)
  const mon: MonInstance = {
    uid: `${speciesId}-${uid}`,
    speciesId,
    level: lvl,
    exp: expForLevel(species.growth, lvl),
    hp: 1,
    status: 'none',
    moves,
    ivs,
  }
  if (opts.nickname) mon.nickname = opts.nickname
  mon.hp = calcStats(mon).hp
  return mon
}

/** Derived (max) stats for the mon's species, level and IVs. */
export function calcStats(mon: MonInstance): Stats {
  return calcStatsFromBase(getSpecies(mon.speciesId).baseStats, mon.ivs, mon.level)
}

export function maxHp(mon: MonInstance): number {
  return calcStats(mon).hp
}

export function displayName(mon: MonInstance): string {
  return mon.nickname || getSpecies(mon.speciesId).name
}

export function isFainted(mon: MonInstance): boolean {
  return mon.hp <= 0
}

/** EXP progress within the current level, for summary screens and EXP bars. */
export function expProgress(mon: MonInstance): { levelStart: number; levelEnd: number; exp: number; fraction: number } {
  const growth = getSpecies(mon.speciesId).growth
  const levelStart = expForLevel(growth, mon.level)
  const levelEnd = mon.level >= MAX_LEVEL ? levelStart : expForLevel(growth, mon.level + 1)
  const fraction = levelEnd > levelStart ? (mon.exp - levelStart) / (levelEnd - levelStart) : 1
  return { levelStart, levelEnd, exp: mon.exp, fraction: Math.max(0, Math.min(1, fraction)) }
}

/** Full HP, no status, full PP. */
export function healMon(mon: MonInstance): void {
  mon.hp = maxHp(mon)
  mon.status = 'none'
  for (const slot of mon.moves) slot.pp = getMove(slot.id).pp
}

/** Model Center heal / white-out heal. Mutates in place. Each heal adds 1 bond. */
export function healParty(party: MonInstance[]): void {
  for (const mon of party) {
    healMon(mon)
    addBond(mon, 1)
  }
}

// ── bond ─────────────────────────────────────────────────────────────────

/** Current bond (0-255); old mons without the field get a level-based default. */
export function getBond(mon: MonInstance): number {
  return mon.bond ?? defaultBond(mon.level)
}

export function addBond(mon: MonInstance, amount: number): number {
  mon.bond = Math.max(0, Math.min(255, getBond(mon) + amount))
  return mon.bond
}

// ── evolution ────────────────────────────────────────────────────────────

export interface EvolutionContext {
  /** Badge ids the player owns, e.g. ['gradient', 'likelihood']. */
  badges?: string[]
  /** An evolution item being used on the mon. */
  item?: string
}

/**
 * The species this mon would evolve into now, or null. Level conditions are checked
 * when no item is given; item evolutions only with `ctx.item`. Frozen Weights blocks all.
 */
export function evolutionTarget(mon: MonInstance, ctx: EvolutionContext = {}): string | null {
  if (mon.heldItem === 'frozen_weights' || mon.hp <= 0 && !ctx.item) return null
  const sp = SPECIES[mon.speciesId]
  if (!sp) return null
  for (const e of sp.evolvesTo) {
    if (!SPECIES[e.to]) continue
    if (e.item ? e.item !== ctx.item : !!ctx.item) continue
    if (e.level !== undefined && mon.level < e.level) continue
    if (e.badge && !(ctx.badges ?? []).includes(e.badge)) continue
    return e.to
  }
  return null
}

/**
 * Change species in place. HP keeps the damage taken (max HP grows). Returns the moves
 * the new species offers right now (its moves at this exact level plus its level-1
 * moves the mon does not know): teach them with learnMove or the battle's prompt flow.
 */
export function evolveMon(mon: MonInstance, toId: string): { from: string; to: string; newMoves: string[] } {
  const from = mon.speciesId
  const before = calcStats(mon).hp
  mon.speciesId = toId
  const after = calcStats(mon).hp
  if (mon.hp > 0) mon.hp = Math.min(after, mon.hp + (after - before))
  const sp = getSpecies(toId)
  const newMoves = sp.learnset.filter((e) => (e.level === mon.level || e.level === 1) && !knowsMove(mon, e.move)).map((e) => e.move)
  return { from, to: toId, newMoves: [...new Set(newMoves)] }
}

/** Give a held item to a mon. Returns the item it was holding before (put that back in the bag). */
export function giveHeldItem(mon: MonInstance, itemId: string | undefined): string | undefined {
  const prev = mon.heldItem
  if (itemId) mon.heldItem = itemId
  else delete mon.heldItem
  return prev
}

export interface LevelUpStep {
  level: number
  statsBefore: Stats
  statsAfter: Stats
  /** Moves the species learns at this level (not yet taught). */
  newMoves: string[]
}

/**
 * Adds EXP, raising level as needed. Current HP rises by the max-HP gain.
 * Does NOT teach moves: callers decide (auto-learn if < 4 moves, else prompt).
 */
export function addExp(mon: MonInstance, amount: number): LevelUpStep[] {
  const growth = getSpecies(mon.speciesId).growth
  const cap = expForLevel(growth, MAX_LEVEL)
  mon.exp = Math.min(cap, mon.exp + Math.max(0, Math.floor(amount)))
  const target = levelForExp(growth, mon.exp)
  const steps: LevelUpStep[] = []
  while (mon.level < target) {
    const statsBefore = calcStats(mon)
    mon.level++
    const statsAfter = calcStats(mon)
    if (mon.hp > 0) mon.hp = Math.min(statsAfter.hp, mon.hp + (statsAfter.hp - statsBefore.hp))
    steps.push({ level: mon.level, statsBefore, statsAfter, newMoves: movesLearnedAt(mon.speciesId, mon.level) })
  }
  return steps
}

export function knowsMove(mon: MonInstance, moveId: string): boolean {
  return mon.moves.some((s) => s.id === moveId)
}

/**
 * Teach a move. With fewer than 4 moves it is appended. With 4, pass `replaceSlot`
 * (0-3) to overwrite; returns the forgotten move id. Returns null when nothing changed.
 */
export function learnMove(mon: MonInstance, moveId: string, replaceSlot?: number): { learned: boolean; forgot?: string } {
  if (knowsMove(mon, moveId)) return { learned: false }
  if (mon.moves.length < 4) {
    mon.moves.push(moveSlot(moveId))
    return { learned: true }
  }
  if (replaceSlot === undefined || replaceSlot < 0 || replaceSlot > 3) return { learned: false }
  const forgot = mon.moves[replaceSlot].id
  mon.moves[replaceSlot] = moveSlot(moveId)
  return { learned: true, forgot }
}

export interface ItemUseResult {
  ok: boolean
  /** Ready-to-show text, e.g. "Claude Fable's HP was restored by 20." or "It won't have any effect." */
  message: string
  hpBefore?: number
  hpAfter?: number
  curedStatus?: string
  /** Evolution item used: the mon has already evolved (play the evolution scene). */
  evolved?: { from: string; to: string; newMoves: string[] }
}

/**
 * Use a medicine item on a party mon from the bag (outside battle). Mutates the mon.
 * Does NOT change the bag: decrement it yourself when `ok` is true.
 */
export function applyItemOutsideBattle(itemId: string, mon: MonInstance): ItemUseResult {
  const item = getItem(itemId)
  const name = displayName(mon)
  const noEffect: ItemUseResult = { ok: false, message: "It won't have any effect." }
  if (!item.usableOnMon) return { ok: false, message: "That can't be used on an LLMMON." }
  switch (item.effect.kind) {
    case 'heal': {
      const max = maxHp(mon)
      if (mon.hp <= 0 || mon.hp >= max) return noEffect
      const hpBefore = mon.hp
      mon.hp = Math.min(max, mon.hp + item.effect.amount)
      return { ok: true, message: `${name}'s HP was restored by ${mon.hp - hpBefore}.`, hpBefore, hpAfter: mon.hp }
    }
    case 'cure': {
      if (mon.hp <= 0 || !isMajorStatus(mon.status)) return noEffect
      const cured = mon.status
      mon.status = 'none'
      return { ok: true, message: STATUSES[cured].cureText.replace('{name}', name), curedStatus: cured }
    }
    case 'evolution': {
      const to = evolutionTarget(mon, { item: itemId })
      if (!to) return noEffect
      const evolved = evolveMon(mon, to)
      return { ok: true, message: `${name} evolved into ${getSpecies(to).name}!`, evolved }
    }
    default:
      return noEffect
  }
}
