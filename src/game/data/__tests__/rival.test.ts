// Rival tuning: Dana holds the type advantage. A sensible player (picks the
// strongest damaging move, switches nothing) with a Lv8 starter plus one Route 101
// catch should usually win; at Lv7 it should take some effort. A type-blind
// player (always the strongest move) should still have a fair chance at Lv8.
import { describe, expect, it } from 'vitest'
import { Battle, createMon, createRng, trainerBattleRequest, type BattleInput, type Rng } from '../../battle/core/index.ts'
import { effectiveness } from '../typechart.ts'
import type { MonInstance } from '../../types.ts'

const MATCHUPS: Array<[string, string]> = [['claude_fable', 'gpt_5_5'], ['gpt_5_5', 'glm'], ['glm', 'claude_fable']]

function pick(b: Battle, naive: boolean): BattleInput {
  const p = b.getPrompt()
  const v = b.getView()
  if (p.kind === 'learn_move') return { type: 'learn_move', forgetSlot: null }
  if (p.kind === 'switch') return { type: 'switch', partyIndex: v.playerParty.findIndex((m, i) => m.hp > 0 && i !== v.player.partyIndex) }
  let best = 0
  let score = -1
  v.player.moves.forEach((m, i) => {
    if (m.pp <= 0) return
    const stab = v.player.types.includes(m.type) ? 1.5 : 1
    const sc = naive ? m.power : m.power > 0 ? m.power * stab * effectiveness(m.type, v.enemy.types) : 1
    if (sc > score) { score = sc; best = i }
  })
  return { type: 'fight', moveIndex: best }
}

function winRate(mine: string, level: number, hers: string, rng: Rng, naive = false, n = 300): number {
  let wins = 0
  for (let i = 0; i < n; i++) {
    const party: MonInstance[] = [createMon(mine, level, rng), createMon('gemma_4', 5, rng)]
    const b = new Battle({ request: trainerBattleRequest(`rival_dana_${hers}`, rng), party, bag: {}, rng })
    b.start()
    let steps = 0
    while (b.getPrompt().kind !== 'end' && steps++ < 500) b.submit(pick(b, naive))
    if (b.result?.outcome === 'win') wins++
  }
  return wins / n
}

describe('rival Dana', () => {
  for (const [mine, hers] of MATCHUPS) {
    it(`${mine} vs rival_dana_${hers}`, () => {
      const rng = createRng(1234)
      const w8 = winRate(mine, 8, hers, rng)
      const w7 = winRate(mine, 7, hers, rng)
      const n8 = winRate(mine, 8, hers, rng, true)
      console.log(`${mine} vs ${hers}: Lv8 ${(w8 * 100).toFixed(0)}%  Lv7 ${(w7 * 100).toFixed(0)}%  Lv8 type-blind ${(n8 * 100).toFixed(0)}%`)
      expect(w8).toBeGreaterThan(0.6)
      expect(n8).toBeGreaterThan(0.4)
      expect(w7).toBeLessThan(0.97)
    })
  }
})
