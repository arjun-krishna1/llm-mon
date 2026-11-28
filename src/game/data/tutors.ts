// Move tutors: NPCs who teach a move for tokens (or free once). The engine shows
// the list; `canLearn(speciesId)` decides who may learn it. Placement is CONTENT's.

import { SPECIES } from './species.ts'
import type { TypeId } from './typechart.ts'

export interface TutorMove {
  move: string
  price: number
  /** Species that may learn it: by type, by role tag, or explicit ids. Empty = everyone. */
  types?: TypeId[]
  roles?: string[]
  species?: string[]
}

export interface TutorDef {
  id: string
  name: string
  /** Map id / area where the tutor stands (suggested). */
  area: string
  greeting: string
  moves: TutorMove[]
}

const LIST: TutorDef[] = [
  {
    id: 'tutor_soma', name: 'Backprop Tutor', area: 'soma_node', greeting: 'Want to learn to send blame backwards? It is very useful.',
    moves: [{ move: 'backprop', price: 800 }, { move: 'fact_check', price: 600 }],
  },
  {
    id: 'tutor_menlo', name: 'Sampling Tutor', area: 'menlo_park', greeting: 'A little randomness makes everything more interesting.',
    moves: [{ move: 'sample', price: 1000 }, { move: 'add_noise', price: 500 }, { move: 'early_stopping', price: 1500 }],
  },
  {
    id: 'tutor_palo_alto', name: 'Embedding Tutor', area: 'palo_alto', greeting: 'Words are places. Let me show you around.',
    moves: [{ move: 'embed', price: 1200 }, { move: 'analogy', price: 2400, roles: ['language'] }, { move: 'knowledge_transfer', price: 2000 }],
  },
  {
    id: 'tutor_mountain_view', name: 'Norm Tutor', area: 'mountain_view', greeting: 'Keep the signal healthy and everything works.',
    moves: [{ move: 'normalize', price: 1500 }, { move: 'regularize', price: 1500 }, { move: 'drop_units', price: 2000, roles: ['regularizer', 'normalizer', 'activation'] }],
  },
  {
    id: 'tutor_labs', name: 'Lab Liaison', area: 'seattle', greeting: 'Each lab has a signature trick. I can teach the family moves.',
    moves: [
      { move: 'extended_thinking', price: 4000, types: ['anthropic'] },
      { move: 'reasoning_effort', price: 4000, types: ['openai'] },
      { move: 'grounding', price: 4000, types: ['google'] },
      { move: 'blank_infill', price: 4000, types: ['zhipu'] },
      { move: 'deep_think', price: 4000, types: ['deepseek'] },
      { move: 'le_chat', price: 4000, types: ['mistral'] },
      { move: 'moonshot', price: 4000, types: ['moonshot'] },
      { move: 'rerank', price: 4000, types: ['cohere'] },
      { move: 'big_brain', price: 4000, types: ['xai'] },
      { move: 'long_trail', price: 4000, types: ['meta'] },
      { move: 'small_wonder', price: 4000, types: ['microsoft'] },
      { move: 'thousand_tongues', price: 4000, types: ['alibaba'] },
    ],
  },
]

export const TUTORS: Record<string, TutorDef> = Object.fromEntries(LIST.map((t) => [t.id, t]))

/** Whether `speciesId` may learn this tutor move. */
export function canLearnTutorMove(tm: TutorMove, speciesId: string): boolean {
  const sp = SPECIES[speciesId]
  if (!sp || sp.catchable === false) return false
  if (tm.species?.length && !tm.species.includes(speciesId)) return false
  if (tm.types?.length && !tm.types.includes(sp.types[0])) return false
  if (tm.roles?.length && !(sp.role && tm.roles.includes(sp.role))) return false
  return true
}
