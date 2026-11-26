// Data barrel + lookup helpers. Pure data, no Phaser.

import { ENCOUNTER_TABLES, type EncounterTable } from './encounters.ts'
import { ITEMS, type ItemDef } from './items.ts'
import { MOVES, type MoveDef } from './moves.ts'
import { SPECIES, type SpeciesDef } from './species.ts'
import { TRAINERS, type TrainerDef } from './trainers.ts'

export * from './typechart.ts'
export * from './statuses.ts'
export * from './moves.ts'
export * from './species.ts'
export * from './items.ts'
export * from './encounters.ts'
export * from './trainers.ts'

function lookup<T>(table: Record<string, T>, id: string, what: string): T {
  const v = table[id]
  if (!v) throw new Error(`Unknown ${what} id "${id}"`)
  return v
}

/** Throws on unknown ids (catches typos early). */
export function getSpecies(id: string): SpeciesDef {
  return lookup(SPECIES, id, 'species')
}
export function getMove(id: string): MoveDef {
  return lookup(MOVES, id, 'move')
}
export function getItem(id: string): ItemDef {
  return lookup(ITEMS, id, 'item')
}
export function getTrainer(id: string): TrainerDef {
  return lookup(TRAINERS, id, 'trainer')
}
export function getEncounterTable(id: string): EncounterTable {
  return lookup(ENCOUNTER_TABLES, id, 'encounter table')
}
