// Save migration for BATTLE-CORE data (move ids, statuses, out-of-range numbers).
// Pure and defensive: never throws, whatever is in the save.
//
// v1 -> v2: the 8 flavour types became lab types and typed moves were renamed
// (data/moves.ts LEGACY_MOVE_IDS). Types themselves are never stored in a save
// (they come from the species), so only move ids need mapping.

import type { MonInstance, SaveData } from '../../types.ts'
import { MOVES, SPECIES } from '../../data/index.ts'
import { LEGACY_MOVE_IDS, STRUGGLE_ID } from '../../data/moves.ts'
import { isMajorStatus } from '../../data/statuses.ts'
import { calcStats, defaultMovesAt, moveSlot } from './mon.ts'
import { STAT_KEYS } from './stats.ts'

/** Save version whose battle data matches the current tables. */
export const BATTLE_DATA_VERSION = 2

export interface MigrationReport {
  fromVersion: number
  toVersion: number
  /** Human-readable notes, e.g. 'party[0] glm: tool_tap -> function_call'. */
  changes: string[]
}

/**
 * Bring one mon up to date in place. `fromVersion` < 2 applies the round-1 move
 * renames. Unknown move ids are dropped; if none remain the mon relearns its
 * species' level-appropriate moves. Returns notes for anything changed.
 */
export function migrateMon(mon: MonInstance, fromVersion: number, label = 'mon'): string[] {
  const notes: string[] = []
  try {
    const species = SPECIES[mon.speciesId]
    const moves = Array.isArray(mon.moves) ? mon.moves : []
    const seen = new Set<string>()
    const out: MonInstance['moves'] = []
    for (const slot of moves) {
      const oldId = typeof slot?.id === 'string' ? slot.id : ''
      let id = oldId
      if (fromVersion < 2 && LEGACY_MOVE_IDS[id]) id = LEGACY_MOVE_IDS[id]
      const def = MOVES[id]
      if (!def || id === STRUGGLE_ID || seen.has(id)) {
        notes.push(`${label}: dropped move ${oldId || '(blank)'}`)
        continue
      }
      if (id !== oldId) notes.push(`${label}: ${oldId} -> ${id}`)
      seen.add(id)
      const pp = Number.isFinite(slot.pp) ? Math.max(0, Math.min(def.pp, Math.floor(slot.pp))) : def.pp
      out.push({ id, pp })
      if (out.length === 4) break
    }
    if (out.length === 0 && species) {
      for (const id of defaultMovesAt(species, Math.max(1, Math.floor(mon.level) || 1))) out.push(moveSlot(id))
      notes.push(`${label}: relearned ${out.map((s) => s.id).join(', ')}`)
    }
    mon.moves = out
    if (typeof mon.status !== 'string' || (mon.status !== 'none' && !isMajorStatus(mon.status))) {
      notes.push(`${label}: cleared status ${String(mon.status)}`)
      mon.status = 'none'
    }
    if (species) {
      if (!mon.ivs || typeof mon.ivs !== 'object') mon.ivs = { hp: 8, atk: 8, def: 8, spa: 8, spd: 8, spe: 8 }
      for (const k of STAT_KEYS) {
        const v = Number(mon.ivs[k])
        mon.ivs[k] = Number.isFinite(v) ? Math.max(0, Math.min(15, Math.floor(v))) : 8
      }
      const max = calcStats(mon).hp
      if (!Number.isFinite(mon.hp)) mon.hp = max
      mon.hp = Math.max(0, Math.min(max, Math.floor(mon.hp)))
    }
  } catch (e) {
    notes.push(`${label}: migration skipped (${String(e)})`)
  }
  return notes
}

/**
 * Migrate a parsed save in place (party + box) and bump its version to at least
 * BATTLE_DATA_VERSION. Safe to call on every load; a current save is untouched
 * apart from clamping. Never throws.
 */
export function migrateSave<T extends Partial<SaveData> & { box?: unknown }>(save: T): MigrationReport {
  const fromVersion = typeof save?.version === 'number' ? save.version : 1
  const report: MigrationReport = { fromVersion, toVersion: Math.max(fromVersion, BATTLE_DATA_VERSION), changes: [] }
  if (!save || typeof save !== 'object') return report
  const lists: [string, unknown][] = [
    ['party', save.party],
    ['box', save.box],
  ]
  for (const [name, list] of lists) {
    if (!Array.isArray(list)) continue
    list.forEach((mon, i) => {
      if (mon && typeof mon === 'object') report.changes.push(...migrateMon(mon as MonInstance, fromVersion, `${name}[${i}] ${(mon as MonInstance).speciesId}`))
    })
  }
  save.version = report.toVersion
  return report
}
