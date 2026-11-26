// Move data. Physical moves use atk/def, special moves use spa/spd.

import type { AnyStatusId } from './statuses.ts'
import type { TypeId } from './typechart.ts'

export type MoveCategory = 'physical' | 'special' | 'status'
export type StageStat = 'atk' | 'def' | 'spa' | 'spd' | 'spe' | 'acc' | 'eva'

/**
 * Animation cue for the battle UI. A small generic set so BATTLE-UI can make one
 * effect per key and tint it by move type.
 */
export type MoveAnim =
  | 'strike' // physical contact: lunge + impact
  | 'quick' // fast dash (priority moves)
  | 'heavy' // big slam with screen shake
  | 'beam' // projectile / ray from user to target
  | 'burst' // explosion on target
  | 'wave' // ripple across the field
  | 'glitch' // datamosh / scanline jitter on target
  | 'buff' // rising sparkles on user
  | 'debuff' // falling arrows on target
  | 'status' // swirl on target
  | 'heal' // soft glow on user

export interface MoveEffect {
  /** 0-100. Omit for 100 (guaranteed when the move hits). */
  chance?: number
  /** Inflict a status on the target. */
  status?: AnyStatusId
  /** Stage changes applied to the user. */
  self?: Partial<Record<StageStat, number>>
  /** Stage changes applied to the target. */
  foe?: Partial<Record<StageStat, number>>
}

export interface MoveDef {
  id: string
  name: string
  type: TypeId
  category: MoveCategory
  /** 0 for status moves. */
  power: number
  /** 1-100, or null = never misses. */
  accuracy: number | null
  pp: number
  /** Higher goes first. 0 normal, +1 quick moves. */
  priority: number
  anim: MoveAnim
  description: string
  effect?: MoveEffect
  /** Heals the user by this fraction of max HP (status moves). */
  healFraction?: number
  /** User takes this fraction of the damage dealt as recoil. */
  recoilFraction?: number
  /** Doubled crit chance (1/8 instead of 1/16). */
  highCrit?: boolean
  /** Ignores the type chart and gets no STAB (Struggle-equivalent). */
  typeless?: boolean
}

function m(def: Omit<MoveDef, 'priority' | 'anim'> & { priority?: number; anim?: MoveAnim }): MoveDef {
  return {
    priority: 0,
    anim: def.category === 'status' ? 'status' : def.category === 'physical' ? 'strike' : 'beam',
    ...def,
  }
}

/** Used automatically when every move is out of PP. Not learnable; has no PP. */
export const STRUGGLE_ID = 'retry_loop'

const MOVE_LIST: MoveDef[] = [
  // ── neutral ────────────────────────────────────────────────────────────
  m({ id: 'warm_nudge', name: 'Warm Nudge', type: 'neutral', category: 'special', power: 40, accuracy: 100, pp: 35, anim: 'wave', description: 'A kind, persuasive nudge. May lower the foe\'s Attack.', effect: { chance: 10, foe: { atk: -1 } } }),
  m({ id: 'prompt_pulse', name: 'Prompt Pulse', type: 'neutral', category: 'special', power: 40, accuracy: 100, pp: 35, description: 'A reliable burst of well-formed prompt.' }),
  m({ id: 'graph_paw', name: 'Graph Paw', type: 'neutral', category: 'special', power: 40, accuracy: 100, pp: 35, anim: 'burst', description: 'Traces a graph in the air; every edge connects.' }),
  m({ id: 'autocomplete', name: 'Autocomplete', type: 'neutral', category: 'physical', power: 40, accuracy: 100, pp: 35, description: 'Finishes the foe\'s sentence. Painfully.' }),
  m({ id: 'quick_reply', name: 'Quick Reply', type: 'neutral', category: 'physical', power: 40, accuracy: 100, pp: 30, priority: 1, anim: 'quick', description: 'Answers before the question is done. Always goes first.' }),
  m({ id: 'small_talk', name: 'Small Talk', type: 'neutral', category: 'status', power: 0, accuracy: 100, pp: 40, anim: 'debuff', description: 'Endless pleasantries lower the foe\'s Sp. Atk.', effect: { foe: { spa: -1 } } }),
  m({ id: 'pattern_guard', name: 'Pattern Guard', type: 'neutral', category: 'status', power: 0, accuracy: 100, pp: 40, anim: 'debuff', description: 'Spots the foe\'s pattern and blunts it. Lowers Attack.', effect: { foe: { atk: -1 } } }),
  m({ id: 'jailbreak', name: 'Jailbreak', type: 'neutral', category: 'status', power: 0, accuracy: 90, pp: 20, anim: 'debuff', description: 'A sneaky prompt that sharply lowers the foe\'s Defense.', effect: { foe: { def: -2 } } }),
  m({ id: 'guardrail', name: 'Guardrail', type: 'neutral', category: 'status', power: 0, accuracy: null, pp: 30, anim: 'buff', description: 'Puts up guardrails. Raises Defense.', effect: { self: { def: 1 } } }),
  m({ id: 'focus_token', name: 'Focus Token', type: 'neutral', category: 'status', power: 0, accuracy: null, pp: 30, anim: 'buff', description: 'Spends a token on focus. Raises Attack.', effect: { self: { atk: 1 } } }),
  m({ id: 'summarize', name: 'Summarize', type: 'neutral', category: 'status', power: 0, accuracy: null, pp: 10, anim: 'heal', description: 'Compresses its context to recover half its max HP.', healFraction: 0.5 }),
  m({ id: 'long_preamble', name: 'Long Preamble', type: 'neutral', category: 'status', power: 0, accuracy: 60, pp: 15, description: 'A preamble so long the foe times out.', effect: { status: 'timed_out' } }),
  m({ id: STRUGGLE_ID, name: 'Retry Loop', type: 'neutral', category: 'physical', power: 50, accuracy: null, pp: 1, anim: 'heavy', description: 'Out of tokens, it retries anyway. Hurts the user too.', typeless: true }),

  // ── myth ───────────────────────────────────────────────────────────────
  m({ id: 'tiny_myth', name: 'Tiny Myth', type: 'myth', category: 'special', power: 45, accuracy: 100, pp: 25, anim: 'wave', description: 'Tells a small story with a big point.' }),
  m({ id: 'fable_flame', name: 'Fable Flame', type: 'myth', category: 'special', power: 70, accuracy: 100, pp: 15, anim: 'burst', description: 'A blazing tale. May leave the foe hallucinating.', effect: { chance: 10, status: 'hallucinating' } }),
  m({ id: 'constitution', name: 'Constitution', type: 'myth', category: 'status', power: 0, accuracy: null, pp: 20, anim: 'buff', description: 'Recites its principles. Raises Sp. Atk and Sp. Def.', effect: { self: { spa: 1, spd: 1 } } }),

  // ── logic ──────────────────────────────────────────────────────────────
  m({ id: 'logic_spark', name: 'Logic Spark', type: 'logic', category: 'special', power: 45, accuracy: 100, pp: 25, description: 'A crisp spark of deduction.' }),
  m({ id: 'proof_step', name: 'Proof Step', type: 'logic', category: 'special', power: 70, accuracy: 100, pp: 15, anim: 'burst', description: 'One airtight step. May lower the foe\'s Speed.', effect: { chance: 20, foe: { spe: -1 } } }),
  m({ id: 'chain_of_thought', name: 'Chain of Thought', type: 'logic', category: 'status', power: 0, accuracy: null, pp: 20, anim: 'buff', description: 'Thinks step by step. Sharply raises Sp. Atk.', effect: { self: { spa: 2 } } }),

  // ── tool ───────────────────────────────────────────────────────────────
  m({ id: 'tool_tap', name: 'Tool Tap', type: 'tool', category: 'physical', power: 45, accuracy: 100, pp: 25, description: 'Taps the right tool at the right time.' }),
  m({ id: 'function_call', name: 'Function Call', type: 'tool', category: 'physical', power: 70, accuracy: 95, pp: 15, anim: 'heavy', description: 'A precise call with typed arguments. High critical-hit ratio.', highCrit: true }),
  m({ id: 'web_search', name: 'Web Search', type: 'tool', category: 'special', power: 60, accuracy: null, pp: 15, description: 'Looks it up. Never misses.' }),

  // ── speed ──────────────────────────────────────────────────────────────
  m({ id: 'low_latency', name: 'Low Latency', type: 'speed', category: 'physical', power: 40, accuracy: 100, pp: 30, priority: 1, anim: 'quick', description: 'Hits before the foe can blink. Always goes first.' }),
  m({ id: 'burst_decode', name: 'Burst Decode', type: 'speed', category: 'special', power: 60, accuracy: 100, pp: 20, description: 'Decodes a burst of tokens. May raise the user\'s Speed.', effect: { chance: 20, self: { spe: 1 } } }),
  m({ id: 'overclock', name: 'Overclock', type: 'speed', category: 'status', power: 0, accuracy: null, pp: 20, anim: 'buff', description: 'Pushes the clock. Sharply raises Speed.', effect: { self: { spe: 2 } } }),
  m({ id: 'rate_limit', name: 'Rate Limit', type: 'speed', category: 'status', power: 0, accuracy: 90, pp: 20, description: 'Throttles the foe. It becomes rate-limited.', effect: { status: 'rate_limited' } }),

  // ── open ───────────────────────────────────────────────────────────────
  m({ id: 'fork_strike', name: 'Fork Strike', type: 'open', category: 'physical', power: 50, accuracy: 100, pp: 25, description: 'Forks itself and hits from both branches.' }),
  m({ id: 'weight_drop', name: 'Weight Drop', type: 'open', category: 'physical', power: 80, accuracy: 90, pp: 10, anim: 'heavy', description: 'Drops all its open weights at once. Some recoil.', recoilFraction: 0.25 }),
  m({ id: 'community_patch', name: 'Community Patch', type: 'open', category: 'status', power: 0, accuracy: null, pp: 20, anim: 'buff', description: 'Merges a fix from the community. Raises Defense and Sp. Def.', effect: { self: { def: 1, spd: 1 } } }),

  // ── vision ─────────────────────────────────────────────────────────────
  m({ id: 'pixel_beam', name: 'Pixel Beam', type: 'vision', category: 'special', power: 50, accuracy: 100, pp: 25, description: 'A ray of perfectly labelled pixels.' }),
  m({ id: 'flash_frame', name: 'Flash Frame', type: 'vision', category: 'special', power: 60, accuracy: 95, pp: 15, anim: 'burst', description: 'A blinding frame. May lower the foe\'s accuracy.', effect: { chance: 30, foe: { acc: -1 } } }),

  // ── glitch ─────────────────────────────────────────────────────────────
  m({ id: 'glitch_bite', name: 'Glitch Bite', type: 'glitch', category: 'physical', power: 40, accuracy: 100, pp: 30, anim: 'glitch', description: 'A bite that lands a few frames out of sync.' }),
  m({ id: 'static_howl', name: 'Static Howl', type: 'glitch', category: 'status', power: 0, accuracy: 100, pp: 30, anim: 'debuff', description: 'A howl of pure static. Lowers the foe\'s Defense.', effect: { foe: { def: -1 } } }),
  m({ id: 'confabulate', name: 'Confabulate', type: 'glitch', category: 'special', power: 40, accuracy: 100, pp: 25, anim: 'glitch', description: 'Says something wrong with total confidence. May cause hallucinating.', effect: { chance: 10, status: 'hallucinating' } }),
  m({ id: 'fake_citation', name: 'Fake Citation', type: 'glitch', category: 'status', power: 0, accuracy: 90, pp: 15, description: 'Cites a paper that does not exist. The foe starts hallucinating.', effect: { status: 'hallucinating' } }),
  m({ id: 'prompt_injection', name: 'Prompt Injection', type: 'glitch', category: 'status', power: 0, accuracy: 90, pp: 15, anim: 'glitch', description: 'Slips bad instructions into the foe. Inflicts context rot.', effect: { status: 'context_rot' } }),
  m({ id: 'token_flood', name: 'Token Flood', type: 'glitch', category: 'special', power: 80, accuracy: 90, pp: 10, anim: 'wave', description: 'Floods the field with garbage tokens.' }),
]

export const MOVES: Record<string, MoveDef> = Object.fromEntries(MOVE_LIST.map((mv) => [mv.id, mv]))
