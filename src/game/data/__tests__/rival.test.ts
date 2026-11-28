// Rival tuning (fix round 3). Dana heals you before the fight, so a player arrives
// at full HP with the levels QA observed: starter Lv8 + one Route 101 catch Lv2-3.
// Choosing sensible moves (strongest damage after type/STAB), they should win
// roughly 65-80% against every counter-starter, and both sides should land a
// super-effective hit in a typical fight. The one-time rematch must be easier.
import { describe, expect, it } from 'vitest'
import { Battle, createMon, createRng, trainerBattleRequest, type BattleInput, type Rng } from '../../battle/core/index.ts'
import { effectiveness } from '../typechart.ts'
import type { MonInstance } from '../../types.ts'

// [player's starter, Dana's counter-starter]
const MATCHUPS: Array<[string, string]> = [['claude_fable', 'gpt_5_5'], ['gpt_5_5', 'glm'], ['glm', 'claude_fable']]

function sensible(b: Battle): BattleInput {
  const p = b.getPrompt()
  const v = b.getView()
  if (p.kind === 'learn_move') return { type: 'learn_move', forgetSlot: null }
  if (p.kind === 'switch') return { type: 'switch', partyIndex: v.playerParty.findIndex((m, i) => m.hp > 0 && i !== v.player.partyIndex) }
  let best = 0
  let score = -1
  v.player.moves.forEach((m, i) => {
    if (m.pp <= 0) return
    const stab = v.player.types.includes(m.type) ? 1.5 : 1
    const sc = m.power > 0 ? m.power * stab * effectiveness(m.type, v.enemy.types) : 1
    if (sc > score) { score = sc; best = i }
  })
  return { type: 'fight', moveIndex: best }
}

function run(mine: string, trainerId: string, rng: Rng, n = 600) {
  let wins = 0
  let seMine = 0
  let seHers = 0
  for (let i = 0; i < n; i++) {
    const party: MonInstance[] = [createMon(mine, 8, rng), createMon('gemma_4', 2 + (i % 2), rng)]
    const b = new Battle({ request: trainerBattleRequest(trainerId, rng), party, bag: {}, rng })
    const ev = b.start()
    let steps = 0
    while (b.getPrompt().kind !== 'end' && steps++ < 500) ev.push(...b.submit(sensible(b)))
    if (b.result?.outcome === 'win') wins++
    if (ev.some((e) => e.type === 'damage' && e.side === 'enemy' && e.effectiveness > 1)) seMine++
    if (ev.some((e) => e.type === 'damage' && e.side === 'player' && e.effectiveness > 1)) seHers++
  }
  return { win: wins / n, seMine: seMine / n, seHers: seHers / n }
}

describe('rival Yilong', () => {
  for (const [mine, hers] of MATCHUPS) {
    it(`${mine} Lv8 + catch vs rival_yilong_${hers}`, () => {
      const r = run(mine, `rival_yilong_${hers}`, createRng(2024))
      const re = run(mine, `rival_yilong_${hers}_rematch`, createRng(2025))
      console.log(`${mine} vs ${hers}: win ${(r.win * 100).toFixed(0)}% (rematch ${(re.win * 100).toFixed(0)}%), super effective: you ${(r.seMine * 100).toFixed(0)}% / Yilong ${(r.seHers * 100).toFixed(0)}%`)
      expect(r.win).toBeGreaterThanOrEqual(0.62)
      expect(r.win).toBeLessThanOrEqual(0.85)
      expect(re.win).toBeGreaterThanOrEqual(r.win)
      expect(r.seMine).toBeGreaterThan(0.8)
      expect(r.seHers).toBeGreaterThan(0.8)
    })
  }
})
