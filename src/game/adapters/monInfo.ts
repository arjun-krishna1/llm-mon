// The ONE place the engine touches BATTLE-CORE (src/game/battle/core, src/game/data).
// Modules are discovered with an eager glob rather than static imports, so the
// engine builds and runs whatever state those files are in; every accessor has a
// safe fallback. Wired to the real API documented in docs/BATTLE_API.md.

import type { BattleRequest, MonInstance, Stats, StatKey, TrainerInfo } from '../types'
import { rng } from '../rng'

type Mod = Record<string, unknown>
const mods = import.meta.glob<Mod>(['../battle/core/index.ts', '../data/index.ts'], { eager: true })
const core: Mod = Object.entries(mods).find(([k]) => k.includes('battle/core'))?.[1] ?? {}
const data: Mod = Object.entries(mods).find(([k]) => k.includes('data/index'))?.[1] ?? {}

type Fn = (...a: never[]) => unknown
function fn<T extends Fn>(name: string): T | undefined {
  const f = core[name] ?? data[name]
  return typeof f === 'function' ? (f as T) : undefined
}

/** BATTLE-CORE takes an `Rng` ({ next(): number }); route it through the engine's seeded rng. */
const coreRng = { next: () => rng() }

type AnyRec = Record<string, unknown>
function table(name: string): Record<string, AnyRec> {
  const t = data[name] ?? core[name]
  return (t && typeof t === 'object' ? t : {}) as Record<string, AnyRec>
}
const SPECIES = () => table('SPECIES')
const MOVES = () => table('MOVES')
/**
 * ENGINE key items the world screens need (Town Map, Notebook). Used only while BATTLE-CORE's
 * item table has no entry with that id, so data can take them over at any time.
 */
const ENGINE_ITEMS: Record<string, AnyRec> = {
  town_map: { id: 'town_map', name: 'Town Map', pocket: 'key', price: 0, description: 'A map of the three regions. Shows where you are.' },
  notebook: { id: 'notebook', name: 'Notebook', pocket: 'key', price: 0, description: 'Lecture and safety notes, one page per lesson.' },
}
const ITEMS = () => ({ ...ENGINE_ITEMS, ...table('ITEMS') })
const ENCOUNTERS = () => table('ENCOUNTER_TABLES')
const TRAINERS = () => table('TRAINERS')
const TYPES = () => table('TYPES')

/** Used only if BATTLE-CORE data is missing. */
const FALLBACK_NAMES: Record<string, string> = {
  claude_fable: 'Claude Fable', gpt_5_5: 'GPT 5.5', glm: 'GLM', hallucihound: 'HalluciHound',
  gemma_4: 'Gemma 4', gpt_5_4_mini: 'GPT-5.4 mini', mistral_medium: 'Mistral Medium',
  gemini_flash: 'Gemini Flash', claude_haiku: 'Claude Haiku',
}

function titleCase(id: string): string {
  return id.split(/[_-]/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function safe<T>(f: () => T, fallback: T): T {
  try {
    const v = f()
    return v === undefined || v === null ? fallback : v
  } catch {
    return fallback
  }
}

export function hasBattleCore(): boolean {
  return Object.keys(SPECIES()).length > 0 && !!fn('createMon')
}

// ---------------------------------------------------------------- species

export function allSpeciesIds(): string[] {
  const ids = Object.keys(SPECIES())
  return ids.length ? ids : Object.keys(FALLBACK_NAMES)
}

export function speciesName(id: string): string {
  const s = SPECIES()[id]
  return (s && typeof s.name === 'string' ? s.name : FALLBACK_NAMES[id]) ?? titleCase(id)
}

export function speciesTypes(id: string): string[] {
  const t = SPECIES()[id]?.types
  return Array.isArray(t) && t.length ? (t as string[]) : ['classic']
}

export function speciesInfo(id: string): { name: string; types: string[]; dexText: string; category: string } {
  const dex = (SPECIES()[id]?.dex ?? {}) as AnyRec
  return {
    name: speciesName(id),
    types: speciesTypes(id),
    dexText: String(dex.text ?? dex.entry ?? dex.description ?? ''),
    category: String(dex.category ?? dex.genus ?? ''),
  }
}

/** Species ids in PromptDex order (BATTLE-CORE `dexNo`, then `SPECIES_IDS` order). */
export function dexOrder(): string[] {
  const order = data.SPECIES_IDS ?? core.SPECIES_IDS
  const ids = Array.isArray(order) && order.length ? (order as string[]) : allSpeciesIds()
  const no = (id: string) => Number(SPECIES()[id]?.dexNo ?? 9999)
  return [...ids].sort((a, b) => no(a) - no(b))
}

export interface DexEntry {
  /** Dex number (1-based; falls back to the position in dexOrder()). */
  no: number
  /** e.g. "Fable Fox". */
  category: string
  /** Two short blurb lines. */
  lines: [string, string]
  /** Flavour rows, e.g. [{ label: 'Context', value: '200K tokens' }, { label: 'Lab', value: 'Anthropic' }]. */
  flavour: { label: string; value: string }[]
  baseStats: Stats
}

/** PromptDex data for a species (SpeciesDef.dex + base stats), with safe fallbacks. */
export function speciesDex(id: string): DexEntry {
  const s = SPECIES()[id] ?? {}
  const dex = (s.dex ?? {}) as AnyRec
  const lines = Array.isArray(dex.lines) ? (dex.lines as string[]).map(String) : String(dex.text ?? '').split('\n')
  const flavour = Array.isArray(dex.stats)
    ? (dex.stats as AnyRec[]).map((r) => ({ label: String(r.label ?? ''), value: String(r.value ?? '') }))
    : []
  const base = (s.baseStats ?? {}) as Partial<Stats>
  const baseStats = {} as Stats
  for (const k of STAT_KEYS) baseStats[k] = Number(base[k] ?? 0)
  return {
    no: Number(s.dexNo ?? dexOrder().indexOf(id) + 1),
    category: String(dex.category ?? ''),
    lines: [lines[0] ?? '', lines[1] ?? ''],
    flavour,
    baseStats,
  }
}

/** Display names of the encounter tables that contain a species ("route_101" → "Route 101"). */
export function speciesAreas(id: string): string[] {
  const out: string[] = []
  for (const [tid, t] of Object.entries(ENCOUNTERS())) {
    const slots = Array.isArray(t.slots) ? (t.slots as AnyRec[]) : []
    if (slots.some((sl) => sl.speciesId === id)) out.push(String(t.name ?? titleCase(tid)))
  }
  return out
}

export function monName(mon: MonInstance): string {
  return mon.nickname || speciesName(mon.speciesId)
}

const STAT_KEYS: StatKey[] = ['hp', 'atk', 'def', 'spa', 'spd', 'spe']

export function monStats(mon: MonInstance): Stats {
  const calc = fn<(m: MonInstance) => Stats>('calcStats')
  if (calc) {
    const r = safe(() => calc(mon), null as Stats | null)
    if (r && typeof r.hp === 'number') return r
  }
  const base = (SPECIES()[mon.speciesId]?.baseStats ?? {}) as Partial<Stats>
  const out = {} as Stats
  for (const k of STAT_KEYS) {
    const b = base[k] ?? 50
    const iv = mon.ivs?.[k] ?? 8
    out[k] = Math.floor(((2 * b + iv) * mon.level) / 100) + (k === 'hp' ? mon.level + 10 : 5)
  }
  return out
}

export function monMaxHp(mon: MonInstance): number {
  return monStats(mon).hp
}

/** EXP progress through the current level (0..1) and EXP still needed. */
export function expProgress(mon: MonInstance): { frac: number; toNext: number } {
  const f = fn<(m: MonInstance) => { fraction: number; levelEnd: number; exp: number }>('expProgress')
  const r = f ? safe(() => f(mon), null) : null
  if (r) return { frac: r.fraction, toNext: Math.max(0, r.levelEnd - r.exp) }
  const a = mon.level ** 3
  const b = (mon.level + 1) ** 3
  return { frac: Math.max(0, Math.min(1, (mon.exp - a) / (b - a))), toNext: Math.max(0, b - mon.exp) }
}

let uidCounter = 0
/** Create a fresh mon via BATTLE-CORE `createMon(speciesId, level, rng)`. */
export function createMon(speciesId: string, level: number, opts: { nickname?: string; moves?: string[] } = {}): MonInstance {
  const f = fn<(id: string, lv: number, r: typeof coreRng, o?: object) => MonInstance>('createMon')
  if (f) {
    const m = safe(() => f(speciesId, level, coreRng, opts), null)
    if (m) return m
    console.warn(`[monInfo] createMon('${speciesId}') failed; using fallback`)
  }
  const ivs = {} as Stats
  for (const k of STAT_KEYS) ivs[k] = Math.floor(rng() * 16)
  const mon: MonInstance = {
    uid: `m${(uidCounter++).toString(36)}${Math.floor(rng() * 1e9).toString(36)}`,
    speciesId, level, exp: level ** 3, hp: 1, status: 'none',
    moves: (opts.moves ?? ['tackle']).map((id) => ({ id, pp: moveInfo(id).pp })), ivs,
  }
  if (opts.nickname) mon.nickname = opts.nickname
  mon.hp = monMaxHp(mon)
  return mon
}

export function healMon(mon: MonInstance): void {
  const f = fn<(m: MonInstance) => void>('healMon')
  if (f && safe(() => (f(mon), true), false)) return
  mon.hp = monMaxHp(mon)
  mon.status = 'none'
  for (const m of mon.moves) m.pp = moveInfo(m.id).pp
}

// ---------------------------------------------------------------- moves / types

export function moveInfo(id: string): { name: string; type: string; power: number; pp: number; desc: string; category: string } {
  const m = MOVES()[id] ?? {}
  return {
    name: String(m.name ?? titleCase(id)),
    type: String(m.type ?? 'classic'),
    power: Number(m.power ?? 0),
    pp: Number(m.pp ?? 20),
    desc: String(m.description ?? ''),
    category: String(m.category ?? ''),
  }
}

export function typeName(id: string): string {
  return String(TYPES()[id]?.name ?? titleCase(id))
}

/** 3-letter type code ("OAI") for tight HUDs. */
export function typeShort(id: string): string {
  return String(TYPES()[id]?.short ?? id.slice(0, 3)).toUpperCase()
}

/** Suggested type colour as a number (0xe08a3c), grey if unknown. */
export function typeColor(id: string): number {
  const c = String(TYPES()[id]?.color ?? '#a8a29a')
  const n = parseInt(c.replace('#', ''), 16)
  return Number.isFinite(n) ? n : 0xa8a29a
}

// ---------------------------------------------------------------- items

export interface ItemView {
  id: string; name: string; desc: string; price: number; pocket: string
  usableOnMon: boolean; isBall: boolean; isKey: boolean
  /** Firewall-style repel: steps of protection (0 if not a repel). */
  repelSteps: number
}

export function itemInfo(id: string): ItemView {
  const it = ITEMS()[id] ?? {}
  const pocket = String(it.pocket ?? (id.includes('orb') ? 'orbs' : 'medicine'))
  const effect = (it.effect ?? {}) as AnyRec
  return {
    id,
    name: String(it.name ?? titleCase(id)),
    desc: String(it.description ?? ''),
    price: Number(it.price ?? 0),
    pocket,
    usableOnMon: Boolean(it.usableOnMon ?? effect.kind === 'heal'),
    isBall: pocket === 'orbs' || effect.kind === 'catch',
    isKey: pocket === 'key',
    repelSteps: effect.kind === 'repel' ? Number(effect.steps ?? 100) : 0,
  }
}

/** Use an item on a party mon outside battle. Returns { ok, message }; the caller decrements the bag when ok. */
export function useFieldItem(itemId: string, mon: MonInstance): { ok: boolean; message: string } {
  const f = fn<(id: string, m: MonInstance) => { ok: boolean; message: string }>('applyItemOutsideBattle')
  if (f) {
    const r = safe(() => f(itemId, mon), null)
    if (r) return r
  }
  return { ok: false, message: 'It won’t have any effect.' }
}

// ---------------------------------------------------------------- encounters

/** Per-grass-step chance (0..1) for a table, or null if the table is unknown. */
export function encounterRate(tableId: string): number | null {
  const t = ENCOUNTERS()[tableId]
  return t && typeof t.stepChance === 'number' ? t.stepChance : null
}

/** A wild mon for this table (the step chance is rolled by the engine). Null if the table is unknown. */
export function rollEncounter(tableId: string): MonInstance | null {
  const f = fn<(id: string, r: typeof coreRng, o: object) => MonInstance | null>('rollEncounter')
  if (!f || !ENCOUNTERS()[tableId]) return null
  return safe(() => f(tableId, coreRng, { force: true }), null)
}

export function wildRequest(speciesOrMon: string | MonInstance, level = 5, extra: Partial<BattleRequest> = {}): BattleRequest {
  const mon = typeof speciesOrMon === 'string' ? createMon(speciesOrMon, level) : speciesOrMon
  const f = fn<(m: MonInstance, o: Partial<BattleRequest>) => BattleRequest>('wildBattleRequest')
  const r = f ? safe(() => f(mon, extra), null) : null
  return r ?? { kind: 'wild', enemyParty: [mon], canRun: true, canCatch: true, background: 'grass', music: 'battle_wild', ...extra }
}

/** The rescue fight request (BATTLE-CORE tutorialBattleRequest), or a safe wild fallback. */
export function tutorialRequest(level = 2): BattleRequest {
  const f = fn<(r: typeof coreRng, lv: number) => BattleRequest>('tutorialBattleRequest')
  const r = f ? safe(() => f(coreRng, level), null) : null
  return r ?? { ...wildRequest('hallucihound', level), kind: 'scripted', canRun: false, canCatch: false, safety: true }
}

// ---------------------------------------------------------------- trainers

function normaliseTrainer(t?: TrainerInfo): TrainerInfo | undefined {
  if (!t) return t
  return { ...t, sprite: t.sprite.includes('/') ? t.sprite : `battle/${t.sprite}` }
}

export function trainerRequest(trainerId: string, extra: Partial<BattleRequest> = {}): BattleRequest | null {
  const f = fn<(id: string, r: typeof coreRng, o: Partial<BattleRequest>) => BattleRequest>('trainerBattleRequest')
  const r = f ? safe(() => f(trainerId, coreRng, extra), null) : null
  return r ? { ...r, trainer: normaliseTrainer(r.trainer) } : null
}

/** Overworld lines for a trainer: `intro` before battle, `defeated` when talked to afterwards (pages joined by \f). */
export function trainerInfo(trainerId: string): { name: string; intro: string; defeated: string; sprite: string } {
  const t = TRAINERS()[trainerId] ?? {}
  const lines = (v: unknown) => (Array.isArray(v) ? (v as string[]).join('\f') : String(v ?? ''))
  return {
    name: [t.trainerClass, t.name].filter(Boolean).join(' ') || titleCase(trainerId),
    intro: lines(t.preBattle),
    defeated: lines(t.postBattle),
    sprite: String(t.overworldSprite ?? 'trainer_m'),
  }
}
