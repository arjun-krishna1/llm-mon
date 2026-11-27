// Test helper: drive a Battle to completion with a simple policy.

import type { BattleRequest, MonInstance } from '../../../types.ts'
import { Battle } from '../battle.ts'
import type { BattleEvent, BattleInput } from '../events.ts'
import { randInt, type Rng } from '../rng.ts'
import { effectiveness } from '../../../data/typechart.ts'

export type Policy = 'random' | 'attack' | 'sensible'

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
  if (policy === 'sensible') {
    // Highest power x STAB x type multiplier: what a player who reads the chart does.
    let best = usable[0]
    let bestScore = -1
    for (const u of usable) {
      const stab = view.player.types.includes(u.m.type) ? 1.5 : 1
      const sc = u.m.power > 0 ? u.m.power * stab * effectiveness(u.m.type, view.enemy.types) : 1
      if (sc > bestScore) {
        bestScore = sc
        best = u
      }
    }
    return { type: 'fight', moveIndex: best.i }
  }
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
