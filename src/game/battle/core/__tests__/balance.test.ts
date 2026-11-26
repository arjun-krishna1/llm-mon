// Balance report. Run alone with: npx vitest run balance
// Prints win-rate / average turns / HP left for a Lv5 starter vs each Route 101 wild.

import { describe, expect, it } from 'vitest'
import { ENCOUNTER_TABLES, STARTER_IDS } from '../../../data/index.ts'
import { createMon } from '../mon.ts'
import { tutorialBattleRequest, wildBattleRequest } from '../requests.ts'
import { createRng } from '../rng.ts'
import { simulate, type Policy } from './sim.ts'

const N = 200

interface Row {
  starter: string
  foe: string
  policy: Policy
  winRate: number
  avgTurns: number
  hpLeft: number
}

function measure(starter: string, foe: string, level: number, policy: Policy): Row {
  let wins = 0
  let turns = 0
  let hp = 0
  for (let i = 0; i < N; i++) {
    const rng = createRng(i * 7919 + level)
    const party = [createMon(starter, 5, rng)]
    const req = foe === 'hallucihound' ? tutorialBattleRequest(rng, level) : wildBattleRequest(createMon(foe, level, rng))
    const r = simulate(req, party, rng, policy)
    if (r.outcome === 'win') wins++
    turns += r.turns
    hp += party[0].hp / r.battle.getView().player.maxHp
  }
  return { starter, foe: `${foe} L${level}`, policy, winRate: Math.round((100 * wins) / N), avgTurns: +(turns / N).toFixed(1), hpLeft: Math.round((100 * hp) / N) }
}

describe('balance', () => {
  const rows: Row[] = []
  for (const starter of STARTER_IDS) {
    for (const lvl of [2, 3]) rows.push(measure(starter, 'hallucihound', lvl, 'attack'))
    for (const slot of ENCOUNTER_TABLES.route_101.slots)
      for (let lvl = slot.minLevel; lvl <= slot.maxLevel; lvl++) for (const p of ['attack', 'random'] as Policy[]) rows.push(measure(starter, slot.speciesId, lvl, p))
  }

  it('prints the report', () => {
    console.table(rows)
  })

  it('first fight takes 2-4 turns and is always won', () => {
    for (const r of rows.filter((r) => r.foe.startsWith('hallucihound'))) {
      expect(r.winRate).toBe(100)
      expect(r.avgTurns).toBeGreaterThanOrEqual(2)
      expect(r.avgTurns).toBeLessThanOrEqual(4)
    }
  })

  it('a Lv5 starter attacking sensibly beats every Route 101 wild', () => {
    for (const r of rows.filter((r) => r.policy === 'attack')) expect(r.winRate, `${r.starter} vs ${r.foe}`).toBeGreaterThanOrEqual(95)
  })

  it('even button-mashing wins against common Lv2-3 wilds', () => {
    for (const r of rows.filter((r) => r.policy === 'random' && !r.foe.startsWith('gemini') && !r.foe.endsWith('L4'))) expect(r.winRate, `${r.starter} vs ${r.foe}`).toBeGreaterThanOrEqual(90)
  })
})
