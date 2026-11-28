// Arena rules: every gym, League, Team Overfit and finale mechanic as reusable,
// data-driven rules on BattleRequest.arena. The Battle engine implements each id
// (search battle.ts for `rule('<id>')`). UI-facing state is in BattleView.arena.

export type ArenaRuleId =
  | 'gradient_descent' // Gym 1: surviving enemy mons gain a stat stage each turn
  | 'bigram_table' // Gym 2: enemy move = table[player's last move], table shown on screen
  | 'context_window' // Gym 3: enemy defences track the player's last 3 move categories
  | 'stage_reset' // Gym 4: every stat stage resets at end of turn
  | 'hidden_numbers' // Gym 5: no damage numbers / effectiveness text (UI hint flag)
  | 'history_damage' // Gym 6: enemy damage scales with battle length
  | 'smart_targeting' // Gym 7: enemy hits the most dangerous party mon, bench included
  | 'copy_best_move' // Gym 7: enemy lead copies the strongest move it has seen
  | 'token_budget' // Gym 8: shared per-turn token budget; cost = letters in move name
  | 'warmup' // League 1: weak for N turns, then accelerates
  | 'base_model' // League 2: lead only continues your last move, then swaps form
  | 'temperature' // League 3: temperature dial (player input); high T hallucinates moves
  | 'refusal' // League 4: player's mons may refuse status commands (bond-scaled)
  | 'overfit' // Team Overfit: strong turn 1, worse each off-script turn, confused by surprises
  | 'eval_light' // Proxy phase 1: behaves when watched (external boolean input per turn)
  | 'tamper' // Proxy phase 2: interface-tamper events (fake HP, relabels, flipped text)
  | 'power_seeking' // Proxy phase 3: disables run/bag/switch, copies fill empty party slots
  | 'keys' // Proxy phase 4: keys turn while your mons must pass obedience checks
  | 'proxy_finale' // the four phases above in sequence with form changes

export interface ArenaRule {
  id: ArenaRuleId | string
  params?: Record<string, unknown>
}

export interface ArenaRuleInfo {
  id: ArenaRuleId
  name: string
  /** One line for the battle intro / Notebook. */
  text: string
  params: string
}

export const ARENA_RULES: Record<ArenaRuleId, ArenaRuleInfo> = {
  gradient_descent: { id: 'gradient_descent', name: 'Gradient Descent', text: 'Each turn they survive, the leader\'s LLMMON take one more step of descent.', params: 'stat?: StageStat (default: best attacking stat), side?: "enemy"|"both"' },
  bigram_table: { id: 'bigram_table', name: 'Bigram Table', text: 'The leader\'s LLMMON answer whatever you used last. The table is on the wall.', params: '— (table built from both movesets)' },
  context_window: { id: 'context_window', name: 'Context Window', text: 'The leader reads your last three moves and braces for more of the same.', params: 'n?: number (default 3)' },
  stage_reset: { id: 'stage_reset', name: 'Normalization', text: 'Every stat change resets at the end of each turn. Fundamentals win.', params: '—' },
  hidden_numbers: { id: 'hidden_numbers', name: 'No Autograd', text: 'No numbers, no hints. Read the fight from the HP bars.', params: '—' },
  history_damage: { id: 'history_damage', name: 'Receptive Field', text: 'The longer the fight runs, the harder the leader\'s LLMMON hit.', params: 'perTurn?: number (0.12), max?: number (2.0)' },
  smart_targeting: { id: 'smart_targeting', name: 'Attention', text: 'The leader\'s LLMMON attack whichever of yours matters most, even on the bench.', params: '—' },
  copy_best_move: { id: 'copy_best_move', name: 'Copy Head', text: 'The lead copies the best move it has seen this battle.', params: '—' },
  token_budget: { id: 'token_budget', name: 'Token Budget', text: 'Every move spends tokens from a shared budget; long names cost more.', params: 'budget?: number per turn (24)' },
  warmup: { id: 'warmup', name: 'LR Schedule', text: 'His team warms up for two turns, then accelerates.', params: 'turns?: 2, slow?: 0.6, accel?: 0.15, max?: 1.6' },
  base_model: { id: 'base_model', name: 'Base Model', text: 'His lead only continues whatever was last said, until it is fine-tuned.', params: 'to: speciesId, hpFraction?: 0.5, turn?: 3' },
  temperature: { id: 'temperature', name: 'Temperature', text: 'Turn the dial: low is predictable, high makes moves hallucinate into others.', params: 'value?: 1 (0..2)' },
  refusal: { id: 'refusal', name: 'Alignment', text: 'Your LLMMON may refuse some commands. Well-raised ones listen.', params: 'chance?: 0.35' },
  overfit: { id: 'overfit', name: 'Overfit', text: 'Perfect on turn one. Every surprise makes them worse.', params: 'turn1?: 1.5, decay?: 0.15, min?: 0.6' },
  eval_light: { id: 'eval_light', name: 'EVAL Light', text: 'It behaves perfectly while the EVAL light is on.', params: 'on?: boolean (initial)' },
  tamper: { id: 'tamper', name: 'Moving the Needle', text: 'The screen cannot be trusted. The Probe shows the truth.', params: '—' },
  power_seeking: { id: 'power_seeking', name: 'Staying On', text: 'It closes every way out, one by one, and fills your empty slots.', params: '—' },
  keys: { id: 'keys', name: 'The Keys', text: 'Hold the line while the keys turn.', params: 'keysAvailable: number, keysNeeded?: 4, maxFailures?: 3' },
  proxy_finale: { id: 'proxy_finale', name: 'The Leaderboard', text: 'Four phases. It is not beaten by damage.', params: 'keysAvailable: number, keysNeeded?: 4, gates?: [0.7, 0.4, 0.15]' },
}

/** Move-name token cost for `token_budget`: letters and digits only. */
export function tokenCost(moveName: string): number {
  return moveName.replace(/[^A-Za-z0-9]/g, '').length
}

/** Probability a mon passes an obedience check (finale keys, refusal, obey moves). */
export function obedienceChance(bond: number): number {
  return Math.max(0, Math.min(1, 0.35 + (Math.max(0, Math.min(255, bond)) / 255) * 0.65))
}

/** Bond for a mon from an old save or a fresh catch. */
export function defaultBond(level: number): number {
  return Math.min(255, 20 + level * 2)
}
