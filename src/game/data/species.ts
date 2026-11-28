// Species table: roster.ts (identity, stats, evolution, art brief) + learnsets.ts.
// Sprite keys follow the art contract: mons/<id>_front.png, _back.png, _icon.png.

import type { Stats } from '../types.ts'
import { LEARNSETS } from './learnsets.ts'
import { ROSTER, type EvolutionDef, type Family, type GrowthRate, type Role } from './roster.ts'
import type { TypeId } from './typechart.ts'

export type { EvolutionDef, Family, GrowthRate, Role } from './roster.ts'

export interface LearnsetEntry {
  level: number
  move: string
}

export interface DexInfo {
  /** e.g. "Fable Fox" -> shown as "Fable Fox LLMMON". */
  category: string
  /** Exactly two short lines for the PromptDex page. */
  lines: [string, string]
  /** Height/weight-style flavour rows, e.g. { label: 'Context', value: '200K tokens' }. */
  stats: { label: string; value: string }[]
}

export interface SpeciesDef {
  id: string
  /** Display name (real model name). */
  name: string
  /** PromptDex number (roster order). */
  dexNo: number
  /** Single lab type (or classic/glitch). Array kept for the dual-type-ready engine. */
  types: [TypeId]
  baseStats: Stats
  /** 1-255; higher is easier. */
  catchRate: number
  /** Base EXP yield used by the EXP formula. */
  expYield: number
  growth: GrowthRate
  /** Sorted by level. Level-1 entries are the moves a freshly created mon knows. */
  learnset: LearnsetEntry[]
  dex: DexInfo
  family: Family
  role?: Role
  /** 1 = basic form. */
  stage: 1 | 2 | 3
  evolvesTo: EvolutionDef[]
  /** Species this one evolves from, if any (first match). */
  evolvesFrom?: string
  ability: string
  areas: string[]
  /** False for Proxy forms (never catchable). */
  catchable: boolean
  firstBatch: boolean
  concept: string
}

export const SPECIES: Record<string, SpeciesDef> = {}
ROSTER.forEach((r, i) => {
  const ls = LEARNSETS[r.id] ?? []
  SPECIES[r.id] = {
    id: r.id,
    name: r.name,
    dexNo: i + 1,
    types: [r.type],
    baseStats: r.baseStats,
    catchRate: r.catchRate,
    expYield: r.expYield,
    growth: r.growth,
    learnset: ls.map(([level, move]) => ({ level, move })).sort((a, b) => a.level - b.level),
    dex: r.dex,
    family: r.family,
    role: r.role,
    stage: r.stage,
    evolvesTo: r.evolvesTo ?? [],
    ability: r.ability,
    areas: r.areas,
    catchable: r.catchable !== false,
    firstBatch: !!r.firstBatch,
    concept: r.concept,
  }
})
for (const s of Object.values(SPECIES)) for (const e of s.evolvesTo) if (SPECIES[e.to] && !SPECIES[e.to].evolvesFrom) SPECIES[e.to].evolvesFrom = s.id

/** Species ids in PromptDex order. */
export const SPECIES_IDS: string[] = ROSTER.map((r) => r.id)

export const STARTER_IDS = ['claude_fable', 'gpt_5_5', 'glm'] as const
