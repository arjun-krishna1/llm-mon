// The ONE place the engine touches BATTLE-CORE data/logic (src/game/data/**,
// src/game/battle/core/**). Everything has a safe fallback so the engine builds
// and runs whatever state those files are in. Modules are discovered with an
// eager glob, so missing files simply yield empty results instead of build errors.

import type { BattleRequest, MonInstance, Stats, StatKey, TrainerInfo } from '../types'
import { rng } from '../rng'

type Mod = Record<string, unknown>
const mods = import.meta.glob<Mod>(
  ['../data/**/*.ts', '../battle/core/**/*.ts', '!**/*.test.ts', '!**/*.spec.ts', '!**/__tests__/**'],
  { eager: true },
)

function find<T>(...names: string[]): T | undefined {
  for (const n of names) {
    for (const m of Object.values(mods)) {
      if (m && n in m && m[n] != null) return m[n] as T
    }
  }
  return undefined
}

const rngAdapter = { next: () => rng() }

// ---------------------------------------------------------------- records

type AnyRec = Record<string, unknown>
function table(...names: string[]): Record<string, AnyRec> {
  const t = find<unknown>(...names)
  if (!t) return {}
  if (Array.isArray(t)) {
    const out: Record<string, AnyRec> = {}
    for (const r of t as AnyRec[]) if (r && typeof r.id === 'string') out[r.id] = r
    return out
  }
  return t as Record<string, AnyRec>
}

const SPECIES = () => table('SPECIES', 'species', 'SPECIES_DATA', 'SPECIES_BY_ID')
const MOVES = () => table('MOVES', 'moves', 'MOVE_DATA', 'MOVES_BY_ID')
const ITEMS = () => table('ITEMS', 'items', 'ITEM_DATA', 'ITEMS_BY_ID')
const ENCOUNTERS = () => table('ENCOUNTERS', 'ENCOUNTER_TABLES', 'encounterTables', 'ENCOUNTER_DATA')
const TRAINERS = () => table('TRAINERS', 'trainers', 'TRAINER_DATA', 'TRAINERS_BY_ID')

/** Species shown when BATTLE-CORE data is missing. */
const FALLBACK_NAMES: Record<string, string> = {
  claude_fable: 'Claude Fable', gpt_5_5: 'GPT 5.5', glm: 'GLM', hallucihound: 'HalluciHound',
  gemma_4: 'Gemma 4', gpt_5_4_mini: 'GPT-5.4 mini', mistral_medium: 'Mistral Medium',
  gemini_flash: 'Gemini Flash', claude_haiku: 'Claude Haiku',
}

function titleCase(id: string): string {
  return id.split(/[_-]/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

export function hasBattleCore(): boolean {
  return Object.keys(SPECIES()).length > 0
}

export function allSpeciesIds(): string[] {
  const ids = new Set([...Object.keys(FALLBACK_NAMES), ...Object.keys(SPECIES())])
  return [...ids]
}

export function speciesName(id: string): string {
  const s = SPECIES()[id]
  return (s && typeof s.name === 'string' ? s.name : FALLBACK_NAMES[id]) ?? titleCase(id)
}

export function speciesTypes(id: string): string[] {
  const s = SPECIES()[id]
  const t = s?.types ?? s?.type
  if (Array.isArray(t)) return t as string[]
  if (typeof t === 'string') return [t]
  return ['neutral']
}

export function speciesInfo(id: string): { name: string; types: string[]; dexText: string; category: string } {
  const s = SPECIES()[id] ?? {}
  return {
    name: speciesName(id),
    types: speciesTypes(id),
    dexText: String(s.dexText ?? s.dex ?? s.flavor ?? s.description ?? ''),
    category: String(s.category ?? s.genus ?? ''),
  }
}

export function monName(mon: MonInstance): string {
  return mon.nickname || speciesName(mon.speciesId)
}

const STAT_KEYS: StatKey[] = ['hp', 'atk', 'def', 'spa', 'spd', 'spe']

export function monStats(mon: MonInstance): Stats {
  const calc = find<(...a: unknown[]) => unknown>('calcStats')
  if (calc) {
    try {
      const sp = SPECIES()[mon.speciesId]
      // Try the common signatures: calcStats(mon) / calcStats(species, level, ivs)
      let r = calc(mon) as Stats | undefined
      if (!r || typeof r.hp !== 'number' || Number.isNaN(r.hp)) r = calc(sp, mon.level, mon.ivs) as Stats
      if (r && typeof r.hp === 'number' && !Number.isNaN(r.hp)) return r
    } catch {
      /* fall through */
    }
  }
  const base = (SPECIES()[mon.speciesId]?.baseStats ?? SPECIES()[mon.speciesId]?.base ?? {}) as Partial<Stats>
  const out = {} as Stats
  for (const k of STAT_KEYS) {
    const b = base[k] ?? 50
    const iv = mon.ivs?.[k] ?? 8
    out[k] = k === 'hp'
      ? Math.floor(((2 * b + iv) * mon.level) / 100) + mon.level + 10
      : Math.floor(((2 * b + iv) * mon.level) / 100) + 5
  }
  return out
}

export function monMaxHp(mon: MonInstance): number {
  return monStats(mon).hp
}

export function moveInfo(id: string): { name: string; type: string; power: number; pp: number; desc: string; category: string } {
  const m = MOVES()[id] ?? {}
  return {
    name: String(m.name ?? titleCase(id)),
    type: String(m.type ?? 'neutral'),
    power: Number(m.power ?? 0),
    pp: Number(m.pp ?? 20),
    desc: String(m.desc ?? m.description ?? ''),
    category: String(m.category ?? ''),
  }
}

export function typeName(id: string): string {
  const types = table('TYPES', 'types')
  const t = types[id]
  return String(t?.name ?? titleCase(id))
}

/** EXP progress through the current level, 0..1, plus raw numbers if known. */
export function expProgress(mon: MonInstance): { frac: number; toNext: number } {
  const f = find<(...a: unknown[]) => unknown>('expForLevel', 'expToLevel', 'totalExpForLevel')
  if (f) {
    try {
      const growth = SPECIES()[mon.speciesId]?.growth
      const a = Number(f(mon.level, growth) ?? f(mon.level))
      const b = Number(f(mon.level + 1, growth) ?? f(mon.level + 1))
      if (b > a) return { frac: Math.max(0, Math.min(1, (mon.exp - a) / (b - a))), toNext: Math.max(0, b - mon.exp) }
    } catch {
      /* ignore */
    }
  }
  const a = mon.level ** 3
  const b = (mon.level + 1) ** 3
  return { frac: Math.max(0, Math.min(1, (mon.exp - a) / (b - a))), toNext: Math.max(0, b - mon.exp) }
}

let uidCounter = 0
/** Create a fresh mon (BATTLE-CORE `createMon` if present). */
export function createMon(speciesId: string, level: number): MonInstance {
  const fn = find<(...a: unknown[]) => MonInstance>('createMon', 'makeMon', 'createMonInstance', 'newMon')
  if (fn) {
    try {
      const m = fn(speciesId, level, rngAdapter)
      if (m && m.speciesId) return m
    } catch (e) {
      console.warn('[monInfo] createMon failed, using fallback', e)
    }
  }
  const ivs = {} as Stats
  for (const k of STAT_KEYS) ivs[k] = Math.floor(rng() * 16)
  const sp = SPECIES()[speciesId]
  let moves = [{ id: 'tackle', pp: 35 }]
  const learnset = sp?.learnset as Array<{ level: number; move?: string; moveId?: string }> | undefined
  if (Array.isArray(learnset)) {
    const known = learnset.filter((l) => l.level <= level).map((l) => String(l.move ?? l.moveId)).slice(-4)
    if (known.length) moves = known.map((id) => ({ id, pp: moveInfo(id).pp }))
  }
  const mon: MonInstance = {
    uid: `m${Date.now().toString(36)}${(uidCounter++).toString(36)}${Math.floor(rng() * 1e6).toString(36)}`,
    speciesId, level, exp: level ** 3, hp: 1, status: 'none', moves, ivs,
  }
  mon.hp = monMaxHp(mon)
  return mon
}

export function healMon(mon: MonInstance): void {
  mon.hp = monMaxHp(mon)
  mon.status = 'none'
  for (const m of mon.moves) m.pp = moveInfo(m.id).pp
}

// ---------------------------------------------------------------- items

export interface ItemView { id: string; name: string; desc: string; price: number; pocket: string; heal: number; usableInField: boolean; isBall: boolean }

export function itemInfo(id: string): ItemView {
  const it = ITEMS()[id] ?? {}
  const kind = String(it.kind ?? it.category ?? it.pocket ?? (id.includes('orb') ? 'ball' : 'item'))
  const heal = Number(it.heal ?? it.healAmount ?? it.hp ?? (id.includes('patch') ? 20 : 0))
  return {
    id,
    name: String(it.name ?? titleCase(id)),
    desc: String(it.desc ?? it.description ?? ''),
    price: Number(it.price ?? it.cost ?? 0),
    pocket: kind,
    heal,
    usableInField: Boolean(it.usableInField ?? it.fieldUse ?? heal > 0),
    isBall: kind === 'ball' || kind === 'orb' || Boolean(it.catchRate ?? it.ballBonus),
  }
}

/** Use an item on a party mon outside battle. Returns the message to show, or null if it had no effect. */
export function useFieldItem(itemId: string, mon: MonInstance): string | null {
  const fn = find<(...a: unknown[]) => unknown>('useItemOutsideBattle', 'useFieldItem', 'applyFieldItem')
  if (fn) {
    try {
      const r = fn(itemId, mon) as { ok?: boolean; message?: string; text?: string } | string | boolean | null
      if (typeof r === 'string') return r
      if (r && typeof r === 'object') return r.ok === false ? null : (r.message ?? r.text ?? `${monName(mon)} was patched up!`)
      if (r === false || r == null) return null
    } catch {
      /* fallback */
    }
  }
  const info = itemInfo(itemId)
  const max = monMaxHp(mon)
  if (info.heal > 0) {
    if (mon.hp <= 0 || mon.hp >= max) return null
    const before = mon.hp
    mon.hp = Math.min(max, mon.hp + info.heal)
    return `${monName(mon)}'s HP was restored by ${mon.hp - before} point${mon.hp - before === 1 ? '' : 's'}.`
  }
  return null
}

// ---------------------------------------------------------------- encounters

/** Chance (0..1) that a grass step in this table triggers a battle. */
export function encounterRate(tableId: string): number | null {
  const t = ENCOUNTERS()[tableId]
  if (!t) return null
  const r = Number(t.rate ?? t.encounterRate ?? NaN)
  if (Number.isNaN(r)) return null
  return r > 1 ? r / 100 : r // allow percent or 0..1
}

/** Pick a wild mon for this table. Null when the table is unknown. */
export function rollEncounter(tableId: string): { speciesId: string; level: number } | null {
  const fn = find<(...a: unknown[]) => unknown>('rollEncounter', 'pickEncounter', 'rollWildEncounter')
  const t = ENCOUNTERS()[tableId]
  if (fn) {
    try {
      const r = (fn(t ?? tableId, rngAdapter) ?? fn(tableId, rngAdapter)) as { speciesId?: string; species?: string; level?: number } | null
      if (r && (r.speciesId || r.species)) return { speciesId: String(r.speciesId ?? r.species), level: Number(r.level ?? 3) }
    } catch {
      /* fallback */
    }
  }
  if (!t) return null
  const slots = (t.slots ?? t.mons ?? t.entries ?? t.encounters) as Array<AnyRec> | undefined
  if (!Array.isArray(slots) || !slots.length) return null
  const total = slots.reduce((s, x) => s + Number(x.weight ?? x.chance ?? 1), 0)
  let roll = rng() * total
  for (const s of slots) {
    roll -= Number(s.weight ?? s.chance ?? 1)
    if (roll < 0) {
      const min = Number(s.minLevel ?? s.min ?? s.level ?? 2)
      const max = Number(s.maxLevel ?? s.max ?? s.level ?? min)
      return { speciesId: String(s.speciesId ?? s.species), level: min + Math.floor(rng() * (max - min + 1)) }
    }
  }
  return null
}

export function wildRequest(speciesId: string, level: number, extra: Partial<BattleRequest> = {}): BattleRequest {
  const build = find<(...a: unknown[]) => BattleRequest>('makeWildBattle', 'wildBattleRequest', 'createWildBattle')
  if (build) {
    try {
      const r = build(speciesId, level, rngAdapter)
      if (r && r.enemyParty) return { ...r, ...extra }
    } catch {
      /* fallback */
    }
  }
  return {
    kind: 'wild', enemyParty: [createMon(speciesId, level)], canRun: true, canCatch: true,
    background: 'grass', music: 'battle_wild', ...extra,
  }
}

// ---------------------------------------------------------------- trainers

export function trainerRequest(trainerId: string): BattleRequest | null {
  const build = find<(...a: unknown[]) => BattleRequest>('makeTrainerBattle', 'trainerBattleRequest', 'createTrainerBattle')
  if (build) {
    try {
      const r = build(trainerId, rngAdapter)
      if (r && r.enemyParty) return r
    } catch {
      /* fallback */
    }
  }
  const t = TRAINERS()[trainerId]
  if (!t) return null
  const partyDef = (t.party ?? t.team ?? []) as Array<AnyRec>
  const enemyParty = partyDef.map((p) => {
    const m = createMon(String(p.speciesId ?? p.species), Number(p.level ?? 5))
    if (Array.isArray(p.moves)) m.moves = (p.moves as string[]).map((id) => ({ id, pp: moveInfo(id).pp }))
    return m
  })
  const trainer: TrainerInfo = {
    id: trainerId,
    name: String(t.name ?? titleCase(trainerId)),
    sprite: String(t.sprite ?? 'trainer_m_front'),
    loseText: String(t.loseText ?? t.defeatText ?? '...'),
    prize: Number(t.prize ?? t.money ?? 100),
  }
  return { kind: 'trainer', enemyParty, trainer, canRun: false, canCatch: false, background: 'grass', music: 'battle_trainer' }
}

export function trainerInfo(trainerId: string): { name: string; intro: string; defeated: string } {
  const t = TRAINERS()[trainerId] ?? {}
  return {
    name: String(t.name ?? titleCase(trainerId)),
    intro: String(t.introText ?? t.intro ?? t.seeText ?? ''),
    defeated: String(t.afterText ?? t.postText ?? t.defeatedText ?? ''),
  }
}
