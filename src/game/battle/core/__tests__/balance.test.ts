// Balance report. Run alone with: npx vitest run balance
// Prints win-rate / average turns / HP left for a Lv5 starter vs each Route 101 wild.

import { describe, expect, it } from 'vitest'
import { ENCOUNTER_TABLES, STARTER_IDS, getSpecies, typeMultiplier } from '../../../data/index.ts'
import { createMon } from '../mon.ts'
import { trainerBattleRequest, tutorialBattleRequest, wildBattleRequest } from '../requests.ts'
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

function measure(starter: string, foe: string, level: number, policy: Policy, starterLevel = 5): Row {
  let wins = 0
  let turns = 0
  let hp = 0
  for (let i = 0; i < N; i++) {
    const rng = createRng(i * 7919 + level)
    const party = [createMon(starter, starterLevel, rng)]
    const req = foe === 'hallucihound' ? tutorialBattleRequest(rng, level) : wildBattleRequest(createMon(foe, level, rng))
    const r = simulate(req, party, rng, policy)
    if (r.outcome === 'win') wins++
    turns += r.turns
    hp += party[0].hp / r.battle.getView().player.maxHp
  }
  return { starter: starterLevel === 5 ? starter : `${starter} L${starterLevel}`, foe: `${foe} L${level}`, policy, winRate: Math.round((100 * wins) / N), avgTurns: +(turns / N).toFixed(1), hpLeft: Math.round((100 * hp) / N) }
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

  // Wilds learn a lab move by Lv4, so a wild whose lab beats your starter's is a real
  // threat at Lv5 (that is the point of the chart) but fine one level later.
  const threat = (starter: string, foe: string) => typeMultiplier(getSpecies(foe.split(' ')[0]).types[0], getSpecies(starter.split(' ')[0]).types[0]) > 1
  for (const starter of STARTER_IDS)
    for (const slot of ENCOUNTER_TABLES.route_101.slots) if (threat(starter, slot.speciesId)) rows.push(measure(starter, slot.speciesId, slot.maxLevel, 'attack', 6))

  it('a Lv5 starter attacking sensibly beats every Route 101 wild (threats: 70%+, and 90%+ at Lv6)', () => {
    for (const r of rows.filter((r) => r.policy === 'attack' && !r.foe.startsWith('hallucihound'))) {
      const lv6 = r.starter.endsWith('L6')
      const min = lv6 ? 90 : threat(r.starter, r.foe) && r.foe.endsWith('L4') ? 70 : 95
      expect(r.winRate, `${r.starter} vs ${r.foe}`).toBeGreaterThanOrEqual(min)
    }
  })

  it('even button-mashing wins against common Lv2-3 wilds', () => {
    for (const r of rows.filter((r) => r.policy === 'random' && !r.foe.startsWith('gemini') && !r.foe.endsWith('L4'))) expect(r.winRate, `${r.starter} vs ${r.foe}`).toBeGreaterThanOrEqual(90)
  })

  it('route trainers: Lv7 starter reading the chart wins 90%+, Lv6 75%+', () => {
    const report: string[] = []
    for (const starter of STARTER_IDS)
      for (const lv of [6, 7])
        for (const t of ['route_101_a', 'route_101_b']) {
          let wins = 0
          for (let i = 0; i < N; i++) {
            const rng = createRng(i * 31 + lv)
            if (simulate(trainerBattleRequest(t, rng), [createMon(starter, lv, rng)], rng, 'sensible').outcome === 'win') wins++
          }
          report.push(`${starter} L${lv} vs ${t}: ${Math.round((100 * wins) / N)}%`)
          expect(wins / N, `${starter} L${lv} vs ${t}`).toBeGreaterThanOrEqual(lv === 7 ? 0.9 : 0.75)
        }
    console.log(report.join('\n'))
  })
})
