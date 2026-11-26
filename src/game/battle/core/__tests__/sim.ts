// Test helper: drive a Battle to completion with a simple policy.

import type { BattleRequest, MonInstance } from '../../../types.ts'
import { Battle } from '../battle.ts'
import type { BattleEvent, BattleInput } from '../events.ts'
import { randInt, type Rng } from '../rng.ts'

export type Policy = 'random' | 'attack'

export interface SimResult {
  battle: Battle
  events: BattleEvent[]
  turns: number
  outcome: string
}

/** Picks an input for the current prompt. 'attack' = random damaging move with PP. */
export function chooseInput(battle: Battle, rng: Rng, policy: Policy): BattleInput {
  const prompt = battle.getPrompt()
  const view = battle.getView()
  if (prompt.kind === 'learn_move') {
    const r = randInt(rng, 5)
    return { type: 'learn_move', forgetSlot: r === 4 ? null : r }
  }
  if (prompt.kind === 'switch') {
    const idx = view.playerParty.findIndex((m, i) => m.hp > 0 && i !== view.player.partyIndex)
    return { type: 'switch', partyIndex: idx }
  }
  const moves = view.player.moves
  const usable = moves.map((m, i) => ({ m, i })).filter(({ m }) => m.pp > 0)
  if (usable.length === 0) return { type: 'fight', moveIndex: 0 }
  if (policy === 'attack') {
    const dmg = usable.filter(({ m }) => m.power > 0)
    const pool = dmg.length ? dmg : usable
    return { type: 'fight', moveIndex: pool[randInt(rng, pool.length)].i }
  }
  return { type: 'fight', moveIndex: usable[randInt(rng, usable.length)].i }
}

export function simulate(request: BattleRequest, party: MonInstance[], rng: Rng, policy: Policy = 'random', bag: Record<string, number> = {}, maxSteps = 500): SimResult {
  const battle = new Battle({ request, party, bag, rng })
  const events = battle.start()
  let steps = 0
  while (battle.getPrompt().kind !== 'end') {
    if (++steps > maxSteps) throw new Error('battle did not finish')
    events.push(...battle.submit(chooseInput(battle, rng, policy)))
  }
  return { battle, events, turns: battle.turn, outcome: battle.result!.outcome }
}
