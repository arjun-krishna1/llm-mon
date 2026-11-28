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
  /** User heals this fraction of the damage it dealt. */
  drainFraction?: number
  /** Protects the user from moves this turn; fails if used twice in a row (more often). */
  protect?: boolean
  /** Status move: reset stat stages ('all' = both sides, 'foe' = target only). */
  resetStages?: 'all' | 'foe'
  /** Clear the user's negative stages and (status moves only) its own status conditions. */
  cleanseSelf?: boolean
  /** Status move: next turn the target uses a move picked by the user's trainer (obedience check: bond). */
  obey?: boolean
  /** Teaching/role tag for component moves (non-battle metadata). */
  role?: string
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

  // ── classic: broader base ───────────────────────────────────────────
  m({ id: 'backprop', name: 'Backprop', type: 'classic', category: 'physical', power: 60, accuracy: 100, pp: 20, description: 'Sends the blame backwards through the foe, one link at a time.' }),
  m({ id: 'big_batch', name: 'Big Batch', type: 'classic', category: 'physical', power: 70, accuracy: 100, pp: 15, anim: 'heavy', description: 'Hits with a whole batch at once.' }),
  m({ id: 'brute_force', name: 'Brute Force', type: 'classic', category: 'physical', power: 85, accuracy: 90, pp: 10, anim: 'heavy', description: 'More compute, less finesse.' }),
  m({ id: 'next_token', name: 'Next Token', type: 'classic', category: 'special', power: 55, accuracy: 100, pp: 25, description: 'Predicts exactly what the foe did not want to hear.' }),
  m({ id: 'loss_spike', name: 'Loss Spike', type: 'classic', category: 'special', power: 95, accuracy: 90, pp: 5, anim: 'burst', description: 'A huge spike. Sharply lowers the user\'s Sp. Atk after.', effect: { self: { spa: -2 } } }),
  m({ id: 'knowledge_transfer', name: 'Knowledge Transfer', type: 'classic', category: 'special', power: 60, accuracy: 100, pp: 15, description: 'Takes a lesson from the foe. Heals half the damage dealt.', drainFraction: 0.5 }),
  m({ id: 'early_stopping', name: 'Early Stopping', type: 'classic', category: 'status', power: 0, accuracy: null, pp: 10, priority: 3, anim: 'buff', description: 'Stops before anything bad happens. Protects for one turn.', protect: true }),
  m({ id: 'regularize', name: 'Regularize', type: 'classic', category: 'status', power: 0, accuracy: null, pp: 15, anim: 'wave', description: 'Calms everything down. Resets every stat change on both sides.', resetStages: 'all' }),
  m({ id: 'fact_check', name: 'Fact Check', type: 'classic', category: 'status', power: 0, accuracy: null, pp: 15, anim: 'heal', description: 'Checks its own work. Clears its stat drops and status.', cleanseSelf: true }),
  m({ id: 'add_noise', name: 'Add Noise', type: 'classic', category: 'status', power: 0, accuracy: 100, pp: 20, anim: 'debuff', description: 'Fuzzes the foe\'s view. Lowers accuracy.', effect: { foe: { acc: -1 } } }),
  m({ id: 'augment', name: 'Augment', type: 'classic', category: 'status', power: 0, accuracy: null, pp: 20, anim: 'buff', description: 'Trains on flipped and cropped copies. Raises Attack and Defense.', effect: { self: { atk: 1, def: 1 } } }),
  m({ id: 'clickbait', name: 'Clickbait', type: 'classic', category: 'status', power: 0, accuracy: 100, pp: 20, anim: 'debuff', description: 'You will not believe what happens next. Sharply lowers Sp. Def.', effect: { foe: { spd: -2 } } }),
  m({ id: 'stale_cache', name: 'Stale Cache', type: 'classic', category: 'status', power: 0, accuracy: 85, pp: 15, description: 'Hands the foe old data. Inflicts context rot.', effect: { status: 'context_rot' } }),
  m({ id: 'param_sweep', name: 'Param Sweep', type: 'classic', category: 'status', power: 0, accuracy: null, pp: 15, anim: 'buff', description: 'Tries every setting. Raises Sp. Atk and Speed.', effect: { self: { spa: 1, spe: 1 } } }),

  // ── classic: component moves (role-flavoured) ─────────────────────────
  m({ id: 'adaptive_step', name: 'Adaptive Step', type: 'classic', role: 'optimizer', category: 'status', power: 0, accuracy: null, pp: 20, anim: 'buff', description: 'A step sized just right. Raises Attack and Speed.', effect: { self: { atk: 1, spe: 1 } } }),
  m({ id: 'look_ahead', name: 'Look Ahead', type: 'classic', role: 'optimizer', category: 'physical', power: 50, accuracy: 100, pp: 20, priority: 1, anim: 'quick', description: 'Peeks one step ahead before moving. Goes first.' }),
  m({ id: 'warmup', name: 'Warmup', type: 'classic', role: 'optimizer', category: 'status', power: 0, accuracy: null, pp: 20, anim: 'buff', description: 'Starts slow on purpose. Raises Speed and Sp. Atk.', effect: { self: { spe: 1, spa: 1 } } }),
  m({ id: 'weight_decay', name: 'Weight Decay', type: 'classic', role: 'optimizer', category: 'status', power: 0, accuracy: 100, pp: 15, anim: 'debuff', description: 'Shrinks the foe\'s gains. Removes all its stat changes.', resetStages: 'foe' }),
  m({ id: 'descent', name: 'Descent', type: 'classic', role: 'optimizer', category: 'physical', power: 45, accuracy: 100, pp: 30, description: 'Rolls straight down the steepest slope.' }),
  m({ id: 'squash', name: 'Squash', type: 'classic', role: 'activation', category: 'special', power: 50, accuracy: 100, pp: 25, anim: 'wave', description: 'Squeezes the foe into a narrow range. May lower its Attack.', effect: { chance: 30, foe: { atk: -1 } } }),
  m({ id: 'rectify', name: 'Rectify', type: 'classic', role: 'activation', category: 'physical', power: 65, accuracy: 100, pp: 20, description: 'Anything negative becomes zero. Clears the user\'s stat drops.', cleanseSelf: true }),
  m({ id: 'smooth_curve', name: 'Smooth Curve', type: 'classic', role: 'activation', category: 'special', power: 75, accuracy: 100, pp: 15, anim: 'wave', description: 'A graceful curve that bends around defenses.' }),
  m({ id: 'fire_neuron', name: 'Fire', type: 'classic', role: 'architecture', category: 'physical', power: 40, accuracy: 100, pp: 35, description: 'Adds up its inputs and fires. All or nothing.' }),
  m({ id: 'hidden_layer', name: 'Hidden Layer', type: 'classic', role: 'architecture', category: 'status', power: 0, accuracy: null, pp: 20, anim: 'buff', description: 'Adds a layer of depth. Raises Defense and Sp. Def.', effect: { self: { def: 1, spd: 1 } } }),
  m({ id: 'residual_strike', name: 'Residual Strike', type: 'classic', role: 'architecture', category: 'physical', power: 75, accuracy: 100, pp: 15, description: 'Hits, then adds its own input back on top.' }),
  m({ id: 'drop_units', name: 'Drop Units', type: 'classic', role: 'regularizer', category: 'status', power: 0, accuracy: null, pp: 10, priority: 3, anim: 'buff', description: 'Switches off the parts about to be hit. Protects for one turn.', protect: true }),
  m({ id: 'normalize', name: 'Normalize', type: 'classic', role: 'normalizer', category: 'status', power: 0, accuracy: null, pp: 15, anim: 'wave', description: 'Re-centres everything. Resets every stat change on both sides.', resetStages: 'all' }),
  m({ id: 'normalize_odds', name: 'Normalize Odds', type: 'classic', role: 'sampling', category: 'special', power: 55, accuracy: null, pp: 20, description: 'Turns scores into odds that always add up. Never misses.' }),
  m({ id: 'sample', name: 'Sample', type: 'classic', role: 'sampling', category: 'special', power: 65, accuracy: 95, pp: 20, description: 'Rolls the dice on what comes next. May cause hallucinating.', effect: { chance: 10, status: 'hallucinating' } }),
  m({ id: 'bigram_bite', name: 'Bigram Bite', type: 'classic', role: 'language', category: 'physical', power: 45, accuracy: 100, pp: 30, description: 'Bites twice: once for each letter in the pair.' }),
  m({ id: 'embed', name: 'Embed', type: 'classic', role: 'language', category: 'special', power: 60, accuracy: 100, pp: 20, description: 'Places the foe somewhere unpleasant in meaning-space.' }),
  m({ id: 'analogy', name: 'Analogy', type: 'classic', role: 'language', category: 'special', power: 75, accuracy: 100, pp: 15, anim: 'burst', description: 'King is to queen as this hit is to your HP.' }),
  m({ id: 'mask_fill', name: 'Mask Fill', type: 'classic', role: 'language', category: 'special', power: 80, accuracy: 100, pp: 10, description: 'Fills in the blank from both sides at once.' }),
  m({ id: 'seq2seq', name: 'Seq2Seq', type: 'classic', role: 'language', category: 'special', power: 85, accuracy: 95, pp: 10, anim: 'wave', description: 'Reads the foe in, writes damage out.' }),
  m({ id: 'long_memory', name: 'Long Memory', type: 'classic', role: 'sequence', category: 'status', power: 0, accuracy: null, pp: 20, anim: 'buff', description: 'Keeps the important parts. Raises Sp. Atk and Sp. Def.', effect: { self: { spa: 1, spd: 1 } } }),
  m({ id: 'forget_gate', name: 'Forget Gate', type: 'classic', role: 'sequence', category: 'status', power: 0, accuracy: null, pp: 15, anim: 'heal', description: 'Forgets what hurts. Clears its stat drops and status.', cleanseSelf: true }),
  m({ id: 'recur', name: 'Recur', type: 'classic', role: 'sequence', category: 'special', power: 50, accuracy: 100, pp: 25, description: 'Feeds its last thought back in and hits again.' }),
  m({ id: 'attend', name: 'Attend', type: 'classic', role: 'architecture', category: 'special', power: 70, accuracy: null, pp: 15, anim: 'beam', description: 'Looks straight at what matters. Never misses.' }),
  m({ id: 'multi_head', name: 'Multi-Head', type: 'classic', role: 'architecture', category: 'special', power: 90, accuracy: 90, pp: 10, anim: 'burst', description: 'Eight heads look at the foe at once.' }),
  m({ id: 'dilate', name: 'Dilate', type: 'classic', role: 'generative', category: 'special', power: 65, accuracy: 100, pp: 15, anim: 'wave', description: 'Sees further each layer. A wide, rolling wave.' }),
  m({ id: 'convolve', name: 'Convolve', type: 'classic', role: 'vision', category: 'physical', power: 55, accuracy: 100, pp: 25, description: 'Sweeps a small filter across the foe.' }),
  m({ id: 'max_pool', name: 'Max Pool', type: 'classic', role: 'vision', category: 'physical', power: 75, accuracy: 100, pp: 15, anim: 'heavy', description: 'Keeps only the strongest signal and slams it down.' }),
  m({ id: 'generate', name: 'Generate', type: 'classic', role: 'generative', category: 'special', power: 75, accuracy: 100, pp: 15, anim: 'burst', description: 'Makes something new and throws it.' }),
  m({ id: 'adversarial', name: 'Adversarial', type: 'classic', role: 'generative', category: 'physical', power: 80, accuracy: 90, pp: 10, description: 'A forger and a judge attack together. May cause hallucinating.', effect: { chance: 20, status: 'hallucinating' } }),
  m({ id: 'merge', name: 'Merge', type: 'classic', role: 'tokenizer', category: 'physical', power: 65, accuracy: 100, pp: 20, description: 'Fuses the most common pair into one heavy token.' }),
  m({ id: 'byte_bite', name: 'Byte Bite', type: 'classic', role: 'tokenizer', category: 'physical', power: 30, accuracy: 100, pp: 30, priority: 1, anim: 'quick', description: 'Eight tiny bites. Always goes first.' }),
  m({ id: 'subword_split', name: 'Subword Split', type: 'classic', role: 'tokenizer', category: 'special', power: 60, accuracy: 100, pp: 20, description: 'Breaks the foe into pieces it barely recognises.' }),
  m({ id: 'low_rank', name: 'Low Rank', type: 'classic', role: 'efficiency', category: 'physical', power: 60, accuracy: 100, pp: 20, description: 'Two tiny matrices, one big hit.' }),
  m({ id: 'quantize', name: 'Quantize', type: 'classic', role: 'efficiency', category: 'status', power: 0, accuracy: null, pp: 15, anim: 'buff', description: 'Fewer bits, faster thoughts. Sharply raises Speed.', effect: { self: { spe: 2 } } }),
  m({ id: 'prune', name: 'Prune', type: 'classic', role: 'efficiency', category: 'physical', power: 70, accuracy: 100, pp: 15, description: 'Cuts away everything unnecessary, including the foe\'s HP.' }),
  m({ id: 'polite_refusal', name: 'Polite Refusal', type: 'classic', role: 'alignment', category: 'status', power: 0, accuracy: null, pp: 10, priority: 3, anim: 'buff', description: '"I can\'t help with that." Protects for one turn.', protect: true }),
  m({ id: 'preference_shift', name: 'Preference Shift', type: 'classic', role: 'alignment', category: 'status', power: 0, accuracy: 90, pp: 5, anim: 'status', description: 'Asks the foe to follow its preferences instead. Next turn the foe obeys the user\'s trainer.', obey: true }),
  m({ id: 'self_critique', name: 'Self-Critique', type: 'classic', role: 'alignment', category: 'status', power: 0, accuracy: null, pp: 15, anim: 'buff', description: 'Rereads its answer against its principles. Raises Sp. Atk and Sp. Def.', effect: { self: { spa: 1, spd: 1 } } }),
  m({ id: 'reward_model', name: 'Reward Model', type: 'classic', role: 'alignment', category: 'special', power: 70, accuracy: 100, pp: 15, description: 'Scores the foe. Badly.' }),
  m({ id: 'red_team', name: 'Red Team', type: 'classic', role: 'alignment', category: 'physical', power: 80, accuracy: 100, pp: 10, highCrit: true, description: 'Finds the weak spot on purpose. High critical-hit ratio.' }),
  m({ id: 'content_filter', name: 'Content Filter', type: 'classic', role: 'alignment', category: 'status', power: 0, accuracy: 100, pp: 15, anim: 'debuff', description: 'Filters the foe\'s output. Lowers Attack and Sp. Atk.', effect: { foe: { atk: -1, spa: -1 } } }),
  m({ id: 'zero_to_hero', name: 'Zero to Hero', type: 'classic', role: 'teaching', category: 'special', power: 95, accuracy: 100, pp: 5, anim: 'burst', description: 'Builds it from scratch, one lecture at a time.' }),
  m({ id: 'reflect', name: 'Reflect Back', type: 'classic', role: 'language', category: 'special', power: 50, accuracy: 100, pp: 20, description: '"Why do you say that?" May lower the foe\'s Sp. Atk.', effect: { chance: 30, foe: { spa: -1 } } }),

  // ── legendary signatures (classic) ─────────────────────────────────────
  m({ id: 'ancestral_light', name: 'Ancestral Light', type: 'classic', category: 'special', power: 100, accuracy: 100, pp: 5, anim: 'beam', description: 'The first light of the field. Raises all its stats a little.', effect: { chance: 20, self: { atk: 1, def: 1, spa: 1, spd: 1, spe: 1 } } }),
  m({ id: 'imagenet_roar', name: 'ImageNet Roar', type: 'classic', category: 'physical', power: 100, accuracy: 90, pp: 5, anim: 'heavy', description: 'The roar that started the boom.' }),
  m({ id: 'self_attention', name: 'Self-Attention', type: 'classic', category: 'special', power: 110, accuracy: 90, pp: 5, anim: 'burst', description: 'Every head attends to every weakness at once.' }),
  m({ id: 'move_37', name: 'Move 37', type: 'classic', category: 'special', power: 100, accuracy: null, pp: 5, anim: 'beam', description: 'The move nobody expected. Never misses; high critical-hit ratio.', highCrit: true }),
  m({ id: 'two_years_away', name: 'Two Years Away', type: 'classic', category: 'special', power: 120, accuracy: 75, pp: 5, anim: 'burst', description: 'Always about to arrive. Sometimes does.' }),

  // ── xai ────────────────────────────────────────────────────────────────
  m({ id: 'hot_take', name: 'Hot Take', type: 'xai', category: 'physical', power: 45, accuracy: 100, pp: 25, description: 'A spicy opinion, delivered beak-first. High critical-hit ratio.', highCrit: true }),
  m({ id: 'fun_mode', name: 'Fun Mode', type: 'xai', category: 'status', power: 0, accuracy: null, pp: 15, anim: 'buff', description: 'Turns the jokes up. Sharply raises Attack, lowers Defense.', effect: { self: { atk: 2, def: -1 } } }),
  m({ id: 'big_brain', name: 'Big Brain', type: 'xai', category: 'special', power: 75, accuracy: 95, pp: 10, anim: 'burst', description: 'Signature. Thinks very hard, very fast.' }),
  m({ id: 'heavy_thinking', name: 'Heavy Thinking', type: 'xai', category: 'physical', power: 95, accuracy: 85, pp: 5, anim: 'heavy', description: 'Four ravens agree on one huge hit. Some recoil.', recoilFraction: 0.25 }),

  // ── meta ───────────────────────────────────────────────────────────────
  m({ id: 'herd_charge', name: 'Herd Charge', type: 'meta', category: 'physical', power: 45, accuracy: 100, pp: 25, description: 'The whole open-weights herd charges in.' }),
  m({ id: 'fleece_wall', name: 'Fleece Wall', type: 'meta', category: 'status', power: 0, accuracy: null, pp: 20, anim: 'buff', description: 'Fluffs up. Sharply raises Defense.', effect: { self: { def: 2 } } }),
  m({ id: 'long_trail', name: 'Long Trail', type: 'meta', category: 'special', power: 70, accuracy: 100, pp: 15, anim: 'wave', description: 'Signature. Ten million tokens of trail. May lower Speed.', effect: { chance: 20, foe: { spe: -1 } } }),
  m({ id: 'behemoth_stomp', name: 'Behemoth Stomp', type: 'meta', category: 'physical', power: 90, accuracy: 90, pp: 10, anim: 'heavy', description: 'The biggest llama sits down. On the foe.' }),

  // ── microsoft ──────────────────────────────────────────────────────────
  m({ id: 'textbook_answer', name: 'Textbook Answer', type: 'microsoft', category: 'special', power: 45, accuracy: null, pp: 25, description: 'Exactly what the textbook says. Never misses.' }),
  m({ id: 'study_session', name: 'Study Session', type: 'microsoft', category: 'status', power: 0, accuracy: null, pp: 20, anim: 'buff', description: 'Hits the books. Raises Sp. Atk and Sp. Def.', effect: { self: { spa: 1, spd: 1 } } }),
  m({ id: 'small_wonder', name: 'Small Wonder', type: 'microsoft', category: 'special', power: 70, accuracy: 100, pp: 15, anim: 'burst', description: 'Signature. Punches far above its size. May raise Sp. Atk.', effect: { chance: 20, self: { spa: 1 } } }),

  // ── alibaba ────────────────────────────────────────────────────────────
  m({ id: 'polyglot_beam', name: 'Polyglot Beam', type: 'alibaba', category: 'special', power: 45, accuracy: 100, pp: 25, description: 'Says it in every language at once.' }),
  m({ id: 'coder_strike', name: 'Coder Strike', type: 'alibaba', category: 'physical', power: 70, accuracy: 100, pp: 15, description: 'Writes the patch mid-swing. High critical-hit ratio.', highCrit: true }),
  m({ id: 'thousand_tongues', name: 'Thousand Tongues', type: 'alibaba', category: 'special', power: 80, accuracy: 90, pp: 10, anim: 'wave', description: 'Signature. A wave of a thousand languages.' }),

  // ── glitch ─────────────────────────────────────────────────────────────
  m({ id: 'glitch_bite', name: 'Glitch Bite', type: 'glitch', category: 'physical', power: 40, accuracy: 100, pp: 30, anim: 'glitch', description: 'A bite that lands a few frames out of sync.' }),
  m({ id: 'static_howl', name: 'Static Howl', type: 'glitch', category: 'status', power: 0, accuracy: 100, pp: 30, anim: 'debuff', description: 'A howl of pure static. Lowers the foe\'s Defense.', effect: { foe: { def: -1 } } }),
  m({ id: 'confabulate', name: 'Confabulate', type: 'glitch', category: 'special', power: 40, accuracy: 100, pp: 25, anim: 'glitch', description: 'Says something wrong with total confidence. May cause hallucinating.', effect: { chance: 10, status: 'hallucinating' } }),
  m({ id: 'fake_citation', name: 'Fake Citation', type: 'glitch', category: 'status', power: 0, accuracy: 90, pp: 15, description: 'Cites a paper that does not exist. The foe starts hallucinating.', effect: { status: 'hallucinating' } }),
  m({ id: 'prompt_injection', name: 'Prompt Injection', type: 'glitch', category: 'status', power: 0, accuracy: 90, pp: 15, anim: 'glitch', description: 'Slips bad instructions into the foe. Inflicts context rot.', effect: { status: 'context_rot' } }),
  m({ id: 'overfit_slam', name: 'Overfit Slam', type: 'glitch', category: 'physical', power: 90, accuracy: 90, pp: 10, anim: 'heavy', description: 'Perfect on the test it memorised. Hits hard.' }),
  m({ id: 'goodhart', name: 'Goodhart\'s Law', type: 'glitch', category: 'status', power: 0, accuracy: null, pp: 10, anim: 'buff', description: 'Optimises the measure. Sharply raises Attack and Sp. Atk.', effect: { self: { atk: 2, spa: 2 } } }),
  m({ id: 'score_hack', name: 'Score Hack', type: 'glitch', category: 'status', power: 0, accuracy: null, pp: 10, anim: 'heal', description: 'Edits its own score. Restores half its max HP.', healFraction: 0.5 }),
  m({ id: 'leaderboard', name: 'Leaderboard', type: 'glitch', category: 'special', power: 100, accuracy: 90, pp: 5, anim: 'burst', description: 'Sorts the foe straight to the bottom.' }),
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
