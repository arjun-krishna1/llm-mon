// Enemy move choice. Wild/scripted: random usable move. Trainer: prefers KOs and
// super-effective hits, uses status moves only when they would do something.

import { getMove } from '../../data/index.ts'
import { STRUGGLE_ID } from '../../data/moves.ts'
import { chance, pick, type Rng } from './rng.ts'

export interface AiMoveOption {
  /** Index into the mon's move list. */
  index: number
  moveId: string
  /** Expected damage to the target (0 for status moves), already including accuracy. */
  expectedDamage: number
  /** Would the move's main effect do anything right now? (status not already set, stage not capped...) */
  effectUseful: boolean
}

export interface AiContext {
  kind: 'wild' | 'trainer' | 'scripted'
  options: AiMoveOption[]
  targetHp: number
  selfHpFraction: number
}

/** Returns the chosen move index, or -1 for Struggle (no usable moves). */
export function chooseEnemyMove(ctx: AiContext, rng: Rng): number {
  if (ctx.options.length === 0) return -1
  if (ctx.kind !== 'trainer') return pick(rng, ctx.options).index
  // A little unpredictability so trainers do not feel robotic.
  if (chance(rng, 0.1)) return pick(rng, ctx.options).index
  let best = ctx.options[0]
  let bestScore = -Infinity
  for (const opt of ctx.options) {
    const score = scoreOption(opt, ctx) + rng.next() * 2 // tiny tie-breaker
    if (score > bestScore) {
      bestScore = score
      best = opt
    }
  }
  return best.index
}

function scoreOption(opt: AiMoveOption, ctx: AiContext): number {
  const move = getMove(opt.moveId)
  if (move.id === STRUGGLE_ID) return 0
  if (move.category !== 'status') {
    let score = (opt.expectedDamage / Math.max(1, ctx.targetHp)) * 100
    if (opt.expectedDamage >= ctx.targetHp) score += 100
    return score
  }
  if (!opt.effectUseful) return -50
  if (move.healFraction) return ctx.selfHpFraction < 0.5 ? 90 : -20
  // Set-up / debuff moves are worth it early, less so once the target is low.
  return ctx.selfHpFraction > 0.5 ? 25 : 10
}
