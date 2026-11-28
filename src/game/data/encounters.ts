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
  // SoMa Node outskirts / the north end of Route 101 (stage 2): the first components.
  {
    id: 'route_101_north',
    stepChance: 0.1,
    slots: [
      { speciesId: 'perceptron', rate: 30, minLevel: 6, maxLevel: 9 },
      { speciesId: 'sgd', rate: 30, minLevel: 6, maxLevel: 9 },
      { speciesId: 'sigmoid', rate: 30, minLevel: 6, maxLevel: 9 },
      { speciesId: 'gpt_5_4_mini', rate: 10, minLevel: 7, maxLevel: 9 },
    ],
  },
  {
    id: 'caltrain_line',
    stepChance: 0.1,
    slots: [
      { speciesId: 'n_gram', rate: 25, minLevel: 11, maxLevel: 14 },
      { speciesId: 'markov_chain', rate: 20, minLevel: 11, maxLevel: 14 },
      { speciesId: 'softmax', rate: 20, minLevel: 11, maxLevel: 14 },
      { speciesId: 'mistral_small', rate: 12, minLevel: 12, maxLevel: 14 },
      { speciesId: 'llama_scout', rate: 10, minLevel: 12, maxLevel: 14 },
      { speciesId: 'phi_mini', rate: 8, minLevel: 12, maxLevel: 14 },
      { speciesId: 'entropy', rate: 5, minLevel: 13, maxLevel: 15 },
    ],
  },
  {
    id: 'menlo_park_outskirts',
    stepChance: 0.1,
    slots: [
      { speciesId: 'markov_chain', rate: 20, minLevel: 14, maxLevel: 17 },
      { speciesId: 'softmax', rate: 20, minLevel: 14, maxLevel: 17 },
      { speciesId: 'llama_scout', rate: 15, minLevel: 15, maxLevel: 17 },
      { speciesId: 'mistral_small', rate: 15, minLevel: 15, maxLevel: 17 },
      { speciesId: 'gemma_4', rate: 12, minLevel: 15, maxLevel: 17 },
      { speciesId: 'qwen', rate: 10, minLevel: 15, maxLevel: 17 },
      { speciesId: 'entropy', rate: 8, minLevel: 16, maxLevel: 18 },
    ],
  },
]

export const ENCOUNTER_TABLES: Record<string, EncounterTable> = Object.fromEntries(TABLE_LIST.map((t) => [t.id, t]))
