// Gym, League, Team Overfit and finale balance. For every fight: a sensible team at
// the STORY_BIBLE §9 level band, played by a chart-reading player who heals when low
// and uses the arena's counter-play, wins most of the time; button-mashing with no
// items, three levels lower and with only two LLMMON (the "careless" player) loses
// most of the time.
// Report: npx vitest run gyms --silent=false

import { describe, expect, it } from 'vitest'
import { STARTER_IDS } from '../../../data/index.ts'
import { createRng } from '../rng.ts'
import { buildTeam, fight, type PlayerPolicy } from './gauntlet.ts'

interface FightSpec {
  id: string
  /** Starter level, other team members' level. */
  ace: number
  level: number
  catches: string[]
  bag: Record<string, number>
  /** Careless setup: same fight, no items, button-mashing. */
  minSmart: number
  maxCareless: number
  badges?: string[]
  bond?: number
}

const P = (n: number) => ({ patch: n })
const BP = (n: number, m = 0) => ({ big_patch: n, patch: m })
const MP = (n: number, m = 0) => ({ max_patch: n, big_patch: m })

export const FIGHTS: FightSpec[] = [
  { id: 'gym1_leader', ace: 14, level: 11, catches: ['sigmoid', 'mistral_medium'], bag: P(3), minSmart: 0.7, maxCareless: 0.5 },
  { id: 'gym2_leader', ace: 19, level: 16, catches: ['llama_scout', 'mistral_small', 'sigmoid'], bag: BP(2, 2), minSmart: 0.7, maxCareless: 0.5 },
  { id: 'gym3_leader', ace: 26, level: 23, catches: ['tanh', 'word2vec', 'glove', 'qwen'], bag: BP(2, 3), minSmart: 0.7, maxCareless: 0.5 },
  { id: 'gym4_leader', ace: 32, level: 29, catches: ['llama_maverick', 'mistral_medium', 'relu', 'qwen', 'command_r'], bag: BP(4), minSmart: 0.7, maxCareless: 0.5 },
  { id: 'gym5_leader', ace: 38, level: 35, catches: ['llama_maverick', 'mistral_medium', 'relu', 'qwen_max', 'command_a'], bag: BP(4), minSmart: 0.7, maxCareless: 0.5 },
  { id: 'gym6_leader', ace: 43, level: 40, catches: ['llama_maverick', 'mistral_large', 'relu', 'qwen_max', 'command_a'], bag: BP(5), minSmart: 0.7, maxCareless: 0.5 },
  { id: 'gym7_leader', ace: 48, level: 45, catches: ['llama_maverick', 'mistral_large', 'gelu', 'qwen_max', 'command_a'], bag: BP(5), minSmart: 0.7, maxCareless: 0.5 },
  { id: 'gym8_leader', ace: 53, level: 50, catches: ['llama_behemoth', 'mistral_large', 'gelu', 'qwen_max', 'command_a'], bag: BP(5), minSmart: 0.7, maxCareless: 0.5 },
  { id: 'league_radford', ace: 58, level: 55, catches: ['llama_behemoth', 'mistral_large', 'gelu', 'qwen_max', 'command_a'], bag: MP(4, 2), minSmart: 0.65, maxCareless: 0.5 },
  { id: 'league_howard', ace: 58, level: 55, catches: ['llama_behemoth', 'mistral_large', 'gelu', 'qwen_max', 'command_a'], bag: MP(4, 2), minSmart: 0.65, maxCareless: 0.5 },
  { id: 'league_li', ace: 59, level: 56, catches: ['llama_behemoth', 'mistral_large', 'gelu', 'qwen_max', 'command_a'], bag: MP(4, 2), minSmart: 0.65, maxCareless: 0.5 },
  { id: 'league_russell', ace: 59, level: 56, catches: ['llama_behemoth', 'mistral_large', 'gelu', 'qwen_max', 'command_a'], bag: MP(4, 2), minSmart: 0.65, maxCareless: 0.5 },
  { id: 'champion_karpathy', ace: 62, level: 59, catches: ['llama_behemoth', 'mistral_large', 'gelu', 'qwen_max', 'command_a'], bag: MP(4, 2), minSmart: 0.6, maxCareless: 0.4 },
  { id: 'overfit_grunt_1', ace: 14, level: 12, catches: ['sigmoid'], bag: P(1), minSmart: 0.85, maxCareless: 1 },
  { id: 'overfit_admin', ace: 20, level: 17, catches: ['llama_scout', 'mistral_small', 'tanh'], bag: BP(1, 2), minSmart: 0.7, maxCareless: 0.6 },
  { id: 'rival_yilong2_*', ace: 25, level: 22, catches: ['qwen', 'gpt_5_4_mini', 'mistral_medium', 'tanh'], bag: BP(2, 2), minSmart: 0.7, maxCareless: 0.5 },
  { id: 'proxy_finale', ace: 63, level: 60, catches: ['llama_behemoth', 'mistral_large', 'gelu', 'qwen_max', 'command_a'], bag: { ...MP(4, 2), probe: 1, eval_suite: 1 }, minSmart: 0.6, maxCareless: 0.2, bond: 230 },
]

const N = 60

function rate(spec: FightSpec, starter: string, policy: PlayerPolicy, seed: number, bond = spec.bond) {
  let wins = 0
  let turns = 0
  for (let i = 0; i < N; i++) {
    const rng = createRng(seed + i * 101)
    // Careless = under-prepared button-masher: 3 levels lower, only the starter and one catch, no items.
    const party = policy === 'smart' ? buildTeam(starter, spec.ace, spec.catches, spec.level, rng, bond) : buildTeam(starter, spec.ace - 3, spec.catches.slice(0, 1), spec.level - 3, rng, bond)
    const bag = policy === 'smart' ? { ...spec.bag } : { eval_suite: 1 }
    const r = fight(spec.id.replace('*', starter), party, rng, policy, bag, { badges: spec.badges })
    if (r.win) wins++
    turns += r.turns
  }
  return { win: wins / N, turns: turns / N }
}

describe('gym / League / finale balance', () => {
  for (const spec of FIGHTS) {
    it(`${spec.id}: sensible team wins, careless play loses`, () => {
      const lines: string[] = []
      for (const starter of STARTER_IDS) {
        const smart = rate(spec, starter, 'smart', 11)
        const careless = rate(spec, starter, 'careless', 17)
        lines.push(`${starter} smart ${(smart.win * 100).toFixed(0)}% (${smart.turns.toFixed(0)}t) careless ${(careless.win * 100).toFixed(0)}%`)
        expect.soft(smart.win, `${spec.id} ${starter} smart`).toBeGreaterThanOrEqual(spec.minSmart)
        expect.soft(careless.win, `${spec.id} ${starter} careless`).toBeLessThanOrEqual(spec.maxCareless)
      }
      console.log(`${spec.id}: ${lines.join(' | ')}`)
    })
  }
})

// Every other stage 2-3 trainer: a player at the expected level, reading the chart, wins.
const CALTRAIN = ['llama_scout', 'gpt_5_4_mini', 'sigmoid']
const STAGE2: [string, number, number, string[]][] = [
  ['gym1_a', 12, 10, ['sigmoid']], ['gym1_b', 12, 10, ['sigmoid']], ['gym1_c', 13, 10, ['sigmoid']],
  ['caltrain_1', 14, 11, CALTRAIN], ['caltrain_2', 14, 11, CALTRAIN], ['caltrain_3', 14, 11, CALTRAIN], ['caltrain_4', 15, 12, CALTRAIN],
  ['caltrain_5', 15, 12, CALTRAIN], ['caltrain_6', 15, 12, CALTRAIN], ['caltrain_7', 16, 13, CALTRAIN], ['caltrain_8', 16, 13, CALTRAIN],
  ['overfit_grunt_2', 15, 12, ['sigmoid']], ['overfit_grunt_3', 16, 13, ['sigmoid']], ['overfit_grunt_4', 16, 13, ['llama_scout']], ['overfit_grunt_5', 17, 14, ['llama_scout']], ['overfit_grunt_6', 17, 14, ['llama_scout']],
  ['gym2_a', 17, 14, ['llama_scout', 'sigmoid']], ['gym2_b', 18, 15, ['llama_scout', 'sigmoid']], ['gym2_c', 18, 15, ['llama_scout', 'sigmoid']],
]

describe('stage 2-3 trainers', () => {
  it('a sensible team at the expected level beats every gym trainer, Caltrain rider and grunt', () => {
    const lines: string[] = []
    for (const [id, ace, level, catches] of STAGE2) {
      for (const starter of STARTER_IDS) {
        let wins = 0
        for (let i = 0; i < 20; i++) {
          const rng = createRng(500 + i * 13)
          if (fight(id, buildTeam(starter, ace, catches, level, rng), rng, 'smart', { patch: 2 }).win) wins++
        }
        lines.push(`${id}/${starter} ${wins * 5}%`)
        expect.soft(wins, `${id} ${starter}`).toBeGreaterThanOrEqual(15)
      }
    }
    console.log(lines.join(' · '))
  })

  it('the finale needs a well-raised team: fresh catches (low bond) take Proxy\'s offer', () => {
    const spec = FIGHTS.find((f) => f.id === 'proxy_finale')!
    const raised = rate(spec, 'glm', 'smart', 31, 230).win
    const fresh = rate(spec, 'glm', 'smart', 31, 30).win
    console.log(`proxy_finale glm: bond 230 ${(raised * 100).toFixed(0)}%, bond 30 ${(fresh * 100).toFixed(0)}%`)
    expect(fresh).toBeLessThan(raised - 0.3)
  })
})
