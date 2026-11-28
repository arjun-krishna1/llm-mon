// Save migration for BATTLE-CORE data (move ids, statuses, out-of-range numbers).
// Pure and defensive: never throws, whatever is in the save.
//
// v1 -> v2: the 8 flavour types became lab types and typed moves were renamed
// (data/moves.ts LEGACY_MOVE_IDS). Types themselves are never stored in a save
// (they come from the species), so only move ids need mapping.
// v2 -> v3 (stage 1): mons gain `bond` (default from level) and `heldItem`
// (unknown ids are dropped). Species ids did not change.

import type { MonInstance, SaveData } from '../../types.ts'
import { ITEMS, MOVES, SPECIES } from '../../data/index.ts'
import { defaultBond } from './arena.ts'
import { LEGACY_MOVE_IDS, STRUGGLE_ID } from '../../data/moves.ts'
import { isMajorStatus } from '../../data/statuses.ts'
import { calcStats, defaultMovesAt, moveSlot } from './mon.ts'
import { MAX_LEVEL, STAT_KEYS, expForLevel } from './stats.ts'

/** Save version whose battle data matches the current tables. */
export const BATTLE_DATA_VERSION = 3

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
      for (const id of defaultMovesAt(species, Math.max(1, Math.min(MAX_LEVEL, Math.floor(Number(mon.level)) || 1)))) out.push(moveSlot(id))
      notes.push(`${label}: relearned ${out.map((s) => s.id).join(', ')}`)
    }
    mon.moves = out
    if (typeof mon.status !== 'string' || (mon.status !== 'none' && !isMajorStatus(mon.status))) {
      notes.push(`${label}: cleared status ${String(mon.status)}`)
      mon.status = 'none'
    }
    if (species) {
      const lvl = Math.floor(Number(mon.level))
      if (!Number.isFinite(lvl) || lvl < 1 || lvl > MAX_LEVEL) {
        mon.level = Math.max(1, Math.min(MAX_LEVEL, Number.isFinite(lvl) ? lvl : 1))
        notes.push(`${label}: fixed level`)
      }
      if (!Number.isFinite(mon.exp)) mon.exp = expForLevel(species.growth, mon.level)
      if (!mon.ivs || typeof mon.ivs !== 'object') mon.ivs = { hp: 8, atk: 8, def: 8, spa: 8, spd: 8, spe: 8 }
      for (const k of STAT_KEYS) {
        const v = Number(mon.ivs[k])
        mon.ivs[k] = Number.isFinite(v) ? Math.max(0, Math.min(15, Math.floor(v))) : 8
      }
      if (typeof mon.bond !== 'number' || !Number.isFinite(mon.bond)) {
        mon.bond = defaultBond(mon.level)
        notes.push(`${label}: bond set to ${mon.bond}`)
      } else mon.bond = Math.max(0, Math.min(255, Math.floor(mon.bond)))
      if (mon.heldItem !== undefined && !(typeof mon.heldItem === 'string' && ITEMS[mon.heldItem]?.effect.kind === 'held')) {
        notes.push(`${label}: dropped held item ${String(mon.heldItem)}`)
        delete mon.heldItem
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
