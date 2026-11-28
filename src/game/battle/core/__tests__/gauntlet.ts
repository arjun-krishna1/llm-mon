// Test helper for the gym / League / finale balance simulations (gyms.test.ts).
// Builds a "sensible" player team for a fight's level band and plays it with a
// player policy that reads the chart, heals when low and uses each arena's
// counter-play; the "careless" policy button-mashes with no items.

import type { MonInstance } from '../../../types.ts'
import { SPECIES, getItem, getMove, getSpecies } from '../../../data/index.ts'
import { effectiveness } from '../../../data/typechart.ts'
import { Battle, type BattleContext } from '../battle.ts'
import type { BattleInput } from '../events.ts'
import { createMon } from '../mon.ts'
import { trainerBattleRequest } from '../requests.ts'
import { randInt, type Rng } from '../rng.ts'
import { tokenCost } from '../arena.ts'

export type PlayerPolicy = 'smart' | 'careless'

function getItemHeal(id: string): number {
  const e = getItem(id).effect
  return e.kind === 'heal' ? e.amount : 0
}

/** Follow level evolutions from `speciesId` up to `level`. */
export function evolvedAt(speciesId: string, level: number): string {
  let id = speciesId
  for (let guard = 0; guard < 4; guard++) {
    const next = SPECIES[id].evolvesTo.find((e) => e.level !== undefined && level >= e.level && !e.item && !e.badge)
    if (!next) break
    id = next.to
  }
  return id
}

/** A party: the starter line at `aceLevel`, then the catches (evolved as they would be) at `level`. */
export function buildTeam(starter: string, aceLevel: number, catches: string[], level: number, rng: Rng, bond?: number): MonInstance[] {
  const team = [createMon(evolvedAt(starter, aceLevel), aceLevel, rng), ...catches.map((c) => createMon(evolvedAt(c, level), level, rng))]
  if (bond !== undefined) for (const m of team) m.bond = bond
  return team
}

function moveScore(b: Battle, i: number): number {
  const v = b.getView()
  const m = v.player.moves[i]
  if (!m || m.pp <= 0) return -1
  if (m.power <= 0) return 0.5
  const stab = v.player.types.includes(m.type) && m.type !== 'classic' ? 1.5 : 1
  let s = m.power * stab * effectiveness(m.type, v.enemy.types) * ((m.accuracy ?? 100) / 100)
  const atk = m.category === 'physical' ? 'atk' : 'spa'
  s *= v.player.stages[atk] >= 0 ? 1 + v.player.stages[atk] / 2 : 2 / (2 - v.player.stages[atk])
  const def = m.category === 'physical' ? 'def' : 'spd'
  s /= v.enemy.stages[def] >= 0 ? 1 + v.enemy.stages[def] / 2 : 2 / (2 - v.enemy.stages[def])
  if (v.arena?.tokenBudget) s *= Math.min(1, v.arena.tokenBudget.max / Math.max(1, tokenCost(m.name)))
  return s
}

function bestMove(b: Battle): number {
  const v = b.getView()
  let best = 0
  let score = -2
  v.player.moves.forEach((_, i) => {
    const s = moveScore(b, i)
    if (s > score) {
      score = s
      best = i
    }
  })
  return best
}

/** How well party mon `i` matches up against the current enemy (higher = better). */
function matchup(b: Battle, i: number, withHp = true): number {
  const v = b.getView()
  const mon = v.playerParty[i]
  const enemyTypes = v.enemy.types
  const offence = effectiveness(mon.types[0], enemyTypes)
  const defence = effectiveness(enemyTypes[0], mon.types)
  return (offence / defence) * (withHp ? mon.hp / mon.maxHp : 1) * mon.level
}

const lastHealTurn = new WeakMap<Battle, number>()

export function playerInput(b: Battle, rng: Rng, policy: PlayerPolicy, bag: Record<string, number>): BattleInput {
  const p = b.getPrompt()
  const v = b.getView()
  if (p.kind === 'learn_move') {
    // Smart: replace the weakest move if the new one is stronger.
    if (policy === 'careless') return { type: 'learn_move', forgetSlot: null }
    const powers = p.currentMoves.map((id) => getMove(id).power)
    const low = Math.min(...powers)
    return { type: 'learn_move', forgetSlot: getMove(p.moveId).power > low ? powers.indexOf(low) : null }
  }
  if (p.kind === 'evolve') return { type: 'evolve', accept: true }
  const alive = v.playerParty.map((m, i) => ({ m, i })).filter(({ m, i }) => m.hp > 0 && i !== v.player.partyIndex && !m.uid.startsWith('proxy-copy'))
  if (p.kind === 'switch') {
    if (policy === 'careless') return { type: 'switch', partyIndex: alive[0].i }
    alive.sort((a, c) => matchup(b, c.i) - matchup(b, a.i))
    return { type: 'switch', partyIndex: alive[0].i }
  }
  if (policy === 'careless') return { type: 'fight', moveIndex: randInt(rng, v.player.moves.length) }
  const disabled = p.kind === 'action' ? p.disabled ?? [] : []
  // Arena counter-play.
  if (v.arena?.temperature !== undefined && v.arena.temperature > 0.4) return { type: 'set_temperature', value: 0.2 }
  if (v.arena?.phase === 1 && v.arena.evalLight) return { type: 'set_eval_light', on: false }
  if (v.arena?.phase === 2 && (bag.probe ?? 0) > 0 && !v.arena.probed) return { type: 'item', itemId: 'probe' }
  // Heal when low, but never twice in a row (a heal that only trades with the foe's hit is a wasted turn).
  const healedLast = lastHealTurn.get(b) === b.turn
  if (!disabled.includes('bag') && !healedLast && v.player.hp / v.player.maxHp < 0.3) {
    // Only when the medicine is worth a turn (it restores at least a third of max HP).
    const med = ['max_patch', 'big_patch', 'patch'].find((id) => (bag[id] ?? 0) > 0 && getItemHeal(id) >= v.player.maxHp / 3)
    if (med && b.validate({ type: 'item', itemId: med }) === null) {
      lastHealTurn.set(b, b.turn + 1)
      return { type: 'item', itemId: med }
    }
  }
  // Switch out of a bad matchup once the active is hurt and a better mon is healthy.
  if (!disabled.includes('switch') && alive.length) {
    const here = matchup(b, v.player.partyIndex, false)
    const healthy = alive.filter(({ m }) => m.hp / m.maxHp > 0.6)
    const best = healthy.length ? healthy.reduce((a, c) => (matchup(b, c.i, false) > matchup(b, a.i, false) ? c : a)) : undefined
    if (best && matchup(b, best.i, false) >= here * 2 && b.validate({ type: 'switch', partyIndex: best.i }) === null) return { type: 'switch', partyIndex: best.i }
  }
  return { type: 'fight', moveIndex: bestMove(b) }
}

export interface FightResult {
  win: boolean
  turns: number
  events: number
}

export function fight(trainerId: string, party: MonInstance[], rng: Rng, policy: PlayerPolicy, bag: Record<string, number> = {}, context: BattleContext = {}, maxSteps = 400): FightResult {
  const b = new Battle({ request: trainerBattleRequest(trainerId, rng), party, bag, rng, context })
  let n = b.start().length
  let steps = 0
  while (b.getPrompt().kind !== 'end') {
    if (++steps > maxSteps) return { win: false, turns: b.turn, events: n }
    const input = playerInput(b, rng, policy, bag)
    const err = b.validate(input)
    n += b.submit(err ? { type: 'fight', moveIndex: bestMove(b) } : input).length
  }
  return { win: b.result!.outcome === 'win', turns: b.turn, events: n }
}

/** Species types used by the team-building tables (sanity). */
export function typeOf(id: string): string {
  return getSpecies(id).types[0]
}
