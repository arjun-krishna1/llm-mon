// Wild encounter tables, referenced by map `zone` objects (`encounters` property).

export interface EncounterSlot {
  speciesId: string
  /** Relative weight; a table's weights sum to 100 for readability. */
  rate: number
  minLevel: number
  maxLevel: number
}

export interface EncounterTable {
  id: string
  /** Chance (0..1) that one step on a grass tile starts a battle. */
  stepChance: number
  slots: EncounterSlot[]
}

const TABLE_LIST: EncounterTable[] = [
  {
    id: 'route_101',
    stepChance: 0.1,
    slots: [
      { speciesId: 'gemma_4', rate: 35, minLevel: 2, maxLevel: 4 },
      { speciesId: 'gpt_5_4_mini', rate: 35, minLevel: 2, maxLevel: 4 },
      { speciesId: 'mistral_medium', rate: 25, minLevel: 2, maxLevel: 4 },
      { speciesId: 'gemini_flash', rate: 5, minLevel: 3, maxLevel: 4 },
    ],
  },
]

export const ENCOUNTER_TABLES: Record<string, EncounterTable> = Object.fromEntries(TABLE_LIST.map((t) => [t.id, t]))
