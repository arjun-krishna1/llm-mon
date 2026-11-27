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
  // ── classic (basic moves anyone can learn) ─────────────────────────────
  m({ id: 'warm_nudge', name: 'Warm Nudge', type: 'classic', category: 'special', power: 40, accuracy: 100, pp: 35, anim: 'wave', description: 'A kind, persuasive nudge. May lower the foe\'s Attack.', effect: { chance: 10, foe: { atk: -1 } } }),
  m({ id: 'prompt_pulse', name: 'Prompt Pulse', type: 'classic', category: 'special', power: 40, accuracy: 100, pp: 35, description: 'A reliable burst of well-formed prompt.' }),
  m({ id: 'graph_paw', name: 'Graph Paw', type: 'classic', category: 'special', power: 40, accuracy: 100, pp: 35, anim: 'burst', description: 'Traces a graph in the air; every edge connects.' }),
  m({ id: 'autocomplete', name: 'Autocomplete', type: 'classic', category: 'physical', power: 40, accuracy: 100, pp: 35, description: 'Finishes the foe\'s sentence. Painfully.' }),
  m({ id: 'quick_reply', name: 'Quick Reply', type: 'classic', category: 'physical', power: 40, accuracy: 100, pp: 30, priority: 1, anim: 'quick', description: 'Answers before the question is done. Always goes first.' }),
  m({ id: 'small_talk', name: 'Small Talk', type: 'classic', category: 'status', power: 0, accuracy: 100, pp: 40, anim: 'debuff', description: 'Endless pleasantries lower the foe\'s Sp. Atk.', effect: { foe: { spa: -1 } } }),
  m({ id: 'pattern_guard', name: 'Pattern Guard', type: 'classic', category: 'status', power: 0, accuracy: 100, pp: 40, anim: 'debuff', description: 'Spots the foe\'s pattern and blunts it. Lowers Attack.', effect: { foe: { atk: -1 } } }),
  m({ id: 'jailbreak', name: 'Jailbreak', type: 'classic', category: 'status', power: 0, accuracy: 90, pp: 20, anim: 'debuff', description: 'A sneaky prompt that sharply lowers the foe\'s Defense.', effect: { foe: { def: -2 } } }),
  m({ id: 'guardrail', name: 'Guardrail', type: 'classic', category: 'status', power: 0, accuracy: null, pp: 30, anim: 'buff', description: 'Puts up guardrails. Raises Defense.', effect: { self: { def: 1 } } }),
  m({ id: 'focus_token', name: 'Focus Token', type: 'classic', category: 'status', power: 0, accuracy: null, pp: 30, anim: 'buff', description: 'Spends a token on focus. Raises Attack.', effect: { self: { atk: 1 } } }),
  m({ id: 'summarize', name: 'Summarize', type: 'classic', category: 'status', power: 0, accuracy: null, pp: 10, anim: 'heal', description: 'Compresses its context to recover half its max HP.', healFraction: 0.5 }),
  m({ id: 'long_preamble', name: 'Long Preamble', type: 'classic', category: 'status', power: 0, accuracy: 60, pp: 15, description: 'A preamble so long the foe times out.', effect: { status: 'timed_out' } }),
  m({ id: 'rate_limit', name: 'Rate Limit', type: 'classic', category: 'status', power: 0, accuracy: 90, pp: 20, description: 'Throttles the foe. It becomes rate-limited.', effect: { status: 'rate_limited' } }),
  m({ id: STRUGGLE_ID, name: 'Retry Loop', type: 'classic', category: 'physical', power: 50, accuracy: null, pp: 1, anim: 'heavy', description: 'Out of tokens, it retries anyway. Hurts the user too.', typeless: true }),

  // ── anthropic ──────────────────────────────────────────────────────────
  m({ id: 'artifact', name: 'Artifact', type: 'anthropic', category: 'special', power: 40, accuracy: 100, pp: 25, anim: 'wave', description: 'Builds a little interactive page and drops it on the foe.' }),
  m({ id: 'extended_thinking', name: 'Extended Thinking', type: 'anthropic', category: 'special', power: 70, accuracy: 100, pp: 15, anim: 'burst', description: 'Signature. Thinks it all through first. May raise Sp. Atk.', effect: { chance: 20, self: { spa: 1 } } }),
  m({ id: 'constitution', name: 'Constitution', type: 'anthropic', category: 'status', power: 0, accuracy: null, pp: 20, anim: 'buff', description: 'Recites its principles. Raises Sp. Atk and Sp. Def.', effect: { self: { spa: 1, spd: 1 } } }),

  // ── openai ─────────────────────────────────────────────────────────────
  m({ id: 'function_call', name: 'Function Call', type: 'openai', category: 'physical', power: 40, accuracy: 100, pp: 25, description: 'Calls exactly the right function with typed arguments.' }),
  m({ id: 'reasoning_effort', name: 'Reasoning Effort', type: 'openai', category: 'physical', power: 75, accuracy: 95, pp: 10, anim: 'heavy', description: 'Signature. Turns the effort dial to max. High critical-hit ratio.', highCrit: true }),
  m({ id: 'custom_instruction', name: 'Custom Instruction', type: 'openai', category: 'status', power: 0, accuracy: null, pp: 20, anim: 'buff', description: 'Remembers how you like it. Raises Attack and Speed.', effect: { self: { atk: 1, spe: 1 } } }),

  // ── google ─────────────────────────────────────────────────────────────
  m({ id: 'multimodal_beam', name: 'Multimodal Beam', type: 'google', category: 'special', power: 40, accuracy: 100, pp: 25, description: 'A ray of text, pixels and audio all at once.' }),
  m({ id: 'grounding', name: 'Grounding', type: 'google', category: 'special', power: 65, accuracy: null, pp: 15, anim: 'burst', description: 'Signature. Anchors the hit in search results. Never misses.' }),
  m({ id: 'long_context', name: 'Long Context', type: 'google', category: 'status', power: 0, accuracy: null, pp: 20, anim: 'buff', description: 'Remembers every hit so far. Raises Defense and Sp. Def.', effect: { self: { def: 1, spd: 1 } } }),
  m({ id: 'tpu_slam', name: 'TPU Slam', type: 'google', category: 'physical', power: 80, accuracy: 90, pp: 10, anim: 'heavy', description: 'Drops a whole rack of chips on the foe. Some recoil.', recoilFraction: 0.25 }),

  // ── zhipu ──────────────────────────────────────────────────────────────
  m({ id: 'graph_reason', name: 'Graph Reason', type: 'zhipu', category: 'special', power: 40, accuracy: 100, pp: 25, description: 'Follows every edge of the problem to the answer.' }),
  m({ id: 'blank_infill', name: 'Blank Infill', type: 'zhipu', category: 'special', power: 70, accuracy: 100, pp: 15, anim: 'burst', description: 'Signature. Fills in the blank the foe left. May lower its Speed.', effect: { chance: 20, foe: { spe: -1 } } }),
  m({ id: 'thinking_mode', name: 'Thinking Mode', type: 'zhipu', category: 'status', power: 0, accuracy: null, pp: 20, anim: 'buff', description: 'Flips into thinking mode. Sharply raises Sp. Atk.', effect: { self: { spa: 2 } } }),

  // ── deepseek ───────────────────────────────────────────────────────────
  m({ id: 'expert_mix', name: 'Expert Mix', type: 'deepseek', category: 'physical', power: 50, accuracy: 100, pp: 25, description: 'Routes the hit through just the right experts.' }),
  m({ id: 'deep_think', name: 'Deep Think', type: 'deepseek', category: 'special', power: 75, accuracy: 95, pp: 10, anim: 'burst', description: 'Signature. Thinks out loud for pages, then lands it.' }),
  m({ id: 'distill', name: 'Distill', type: 'deepseek', category: 'status', power: 0, accuracy: null, pp: 20, anim: 'buff', description: 'Boils itself down to the good parts. Raises Sp. Atk and Speed.', effect: { self: { spa: 1, spe: 1 } } }),

  // ── mistral ────────────────────────────────────────────────────────────
  m({ id: 'tailwind', name: 'Tailwind', type: 'mistral', category: 'physical', power: 40, accuracy: 100, pp: 30, priority: 1, anim: 'quick', description: 'Rides a gust in from Paris. Always goes first.' }),
  m({ id: 'le_chat', name: 'Le Chat', type: 'mistral', category: 'special', power: 60, accuracy: 100, pp: 20, description: 'Signature. A breezy chat with claws. May raise Speed.', effect: { chance: 20, self: { spe: 1 } } }),
  m({ id: 'cool_breeze', name: 'Cool Breeze', type: 'mistral', category: 'status', power: 0, accuracy: null, pp: 20, anim: 'buff', description: 'Catches a cool wind. Sharply raises Speed.', effect: { self: { spe: 2 } } }),

  // ── moonshot ───────────────────────────────────────────────────────────
  m({ id: 'agent_swarm', name: 'Agent Swarm', type: 'moonshot', category: 'physical', power: 50, accuracy: 100, pp: 25, description: 'A hundred little tool calls, all at once.' }),
  m({ id: 'moonshot', name: 'Moonshot', type: 'moonshot', category: 'special', power: 85, accuracy: 85, pp: 10, anim: 'beam', description: 'Signature. Aims for the moon. Sometimes misses it.' }),
  m({ id: 'orbit', name: 'Orbit', type: 'moonshot', category: 'status', power: 0, accuracy: null, pp: 20, anim: 'buff', description: 'Settles into a steady orbit. Raises Attack and Defense.', effect: { self: { atk: 1, def: 1 } } }),

  // ── cohere ─────────────────────────────────────────────────────────────
  m({ id: 'retrieval', name: 'Retrieval', type: 'cohere', category: 'physical', power: 50, accuracy: 100, pp: 25, description: 'Fetches the exact document and throws it.' }),
  m({ id: 'rerank', name: 'Rerank', type: 'cohere', category: 'special', power: 65, accuracy: 100, pp: 15, anim: 'burst', description: 'Signature. Puts the foe at the bottom of the list. May lower Sp. Atk.', effect: { chance: 30, foe: { spa: -1 } } }),
  m({ id: 'command', name: 'Command', type: 'cohere', category: 'status', power: 0, accuracy: 100, pp: 20, anim: 'debuff', description: 'A clear, polite order. Sharply lowers the foe\'s Attack.', effect: { foe: { atk: -2 } } }),

  // ── glitch ─────────────────────────────────────────────────────────────
  m({ id: 'glitch_bite', name: 'Glitch Bite', type: 'glitch', category: 'physical', power: 40, accuracy: 100, pp: 30, anim: 'glitch', description: 'A bite that lands a few frames out of sync.' }),
  m({ id: 'static_howl', name: 'Static Howl', type: 'glitch', category: 'status', power: 0, accuracy: 100, pp: 30, anim: 'debuff', description: 'A howl of pure static. Lowers the foe\'s Defense.', effect: { foe: { def: -1 } } }),
  m({ id: 'confabulate', name: 'Confabulate', type: 'glitch', category: 'special', power: 40, accuracy: 100, pp: 25, anim: 'glitch', description: 'Says something wrong with total confidence. May cause hallucinating.', effect: { chance: 10, status: 'hallucinating' } }),
  m({ id: 'fake_citation', name: 'Fake Citation', type: 'glitch', category: 'status', power: 0, accuracy: 90, pp: 15, description: 'Cites a paper that does not exist. The foe starts hallucinating.', effect: { status: 'hallucinating' } }),
  m({ id: 'prompt_injection', name: 'Prompt Injection', type: 'glitch', category: 'status', power: 0, accuracy: 90, pp: 15, anim: 'glitch', description: 'Slips bad instructions into the foe. Inflicts context rot.', effect: { status: 'context_rot' } }),
  m({ id: 'token_flood', name: 'Token Flood', type: 'glitch', category: 'special', power: 80, accuracy: 90, pp: 10, anim: 'wave', description: 'Floods the field with garbage tokens.' }),
]

/**
 * Round-1 move ids (8-type chart) -> current ids. Used by save migration. Note
 * `function_call` was the old 70-power Tool move: it maps to Reasoning Effort, and
 * the id is reused for the new 45-power OpenAI move (only applied to v1 saves).
 */
export const LEGACY_MOVE_IDS: Record<string, string> = {
  tiny_myth: 'artifact',
  fable_flame: 'extended_thinking',
  logic_spark: 'graph_reason',
  proof_step: 'blank_infill',
  chain_of_thought: 'thinking_mode',
  tool_tap: 'function_call',
  function_call: 'reasoning_effort',
  web_search: 'grounding',
  low_latency: 'tailwind',
  burst_decode: 'le_chat',
  overclock: 'cool_breeze',
  fork_strike: 'expert_mix',
  weight_drop: 'tpu_slam',
  community_patch: 'long_context',
  pixel_beam: 'multimodal_beam',
  flash_frame: 'grounding',
}

export const MOVES: Record<string, MoveDef> = Object.fromEntries(MOVE_LIST.map((mv) => [mv.id, mv]))
