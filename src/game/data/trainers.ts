// Trainer definitions. `preBattle` runs in the overworld when the trainer spots
// you; `loseText` is shown in battle when they lose; `postBattle` is what they
// say if you talk to them afterwards.

export interface TrainerPartyEntry {
  speciesId: string
  level: number
  /** Optional explicit moveset; default = last 4 learnset moves at that level. */
  moves?: string[]
  /** Optional fixed IVs (0-15) instead of random ones. */
  ivs?: Partial<Record<'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe', number>>
  /** Optional PP overrides per move id (e.g. a move it has only just learned). */
  pp?: Record<string, number>
}

export interface TrainerDef {
  id: string
  /** Trainer class shown before the name, e.g. "Young Founder". */
  trainerClass: string
  name: string
  /** Battle front sprite key (64x64). */
  sprite: 'trainer_m_front' | 'trainer_f_front' | 'rival_front'
  /** Overworld sprite id (chars/<id>.png). */
  overworldSprite: 'trainer_m' | 'trainer_f' | 'rival'
  party: TrainerPartyEntry[]
  preBattle: string[]
  loseText: string
  postBattle: string[]
  /** Prize money in tokens. */
  prize: number
  /** Trainer AI: chance to pick a random usable move instead of the best (default 0.1). */
  aiRandomness?: number
}

// Each route trainer carries a pair that shows off the type web: whichever
// starter you picked, one of their mons is weak to it or hits it hard.
const TRAINER_LIST: TrainerDef[] = [
  {
    id: 'route_101_a',
    trainerClass: 'Young Founder',
    name: 'Calvin',
    sprite: 'trainer_m_front',
    overworldSprite: 'trainer_m',
    // Gemma 4 (Anthropic beats Google), Mistral Medium (OpenAI beats Mistral; Mistral beats Zhipu)
    party: [
      { speciesId: 'gemma_4', level: 3 },
      { speciesId: 'mistral_medium', level: 4 },
    ],
    preBattle: ['Hey! You look like a seed-stage trainer.', 'Let me demo my LLMMON. No slides, just vibes!'],
    loseText: 'My demo crashed on stage...',
    postBattle: ['Investors say losing is "valuable signal".', 'I am collecting a LOT of signal today.'],
    prize: 96,
  },
  {
    id: 'route_101_b',
    trainerClass: 'Benchmarker',
    name: 'Tiana',
    sprite: 'trainer_f_front',
    overworldSprite: 'trainer_f',
    // Mistral Medium (OpenAI beats Mistral; Mistral beats Zhipu), GPT-5.4 mini (Zhipu beats OpenAI; OpenAI beats Anthropic)
    party: [
      { speciesId: 'mistral_medium', level: 3 },
      { speciesId: 'gpt_5_4_mini', level: 4 },
    ],
    preBattle: ['Stop right there! I need one more data point.', 'Your score goes on my leaderboard!'],
    loseText: 'Okay, that result is NOT going in the paper.',
    postBattle: ['Small models are fast, but your partner', 'clearly has better evals. Noted!'],
    prize: 120,
  },
]

// The rival: neighbour Dana takes the starter that beats yours (anthropic > zhipu
// > openai > anthropic). Same shape for every matchup: her starter Lv5 with its
// lab move at full PP + one Route 101 catch Lv4 that your starter hits super
// effectively. Lv5 (not 7) because the counter-starter both hits you 2x and
// resists your lab move; that is the whole difficulty, no PP tricks needed.
// Fixed IVs even out the three matchups (balance locked by
// data/__tests__/rival.test.ts). The `_rematch` variant (starter one level lower)
// is used once after you lose to her.
const RIVAL_PARTY: Record<string, { moves: string[]; iv: number; catchId: string }> = {
  gpt_5_5: { moves: ['autocomplete', 'focus_token', 'function_call'], iv: 15, catchId: 'gemma_4' }, // vs Claude Fable
  glm: { moves: ['graph_paw', 'pattern_guard', 'graph_reason'], iv: 10, catchId: 'mistral_medium' }, // vs GPT 5.5
  claude_fable: { moves: ['warm_nudge', 'guardrail', 'artifact'], iv: 10, catchId: 'gpt_5_4_mini' }, // vs GLM
}
function rival(starter: string, rematch: boolean): TrainerDef {
  const r = RIVAL_PARTY[starter]
  const iv = r.iv
  return {
    id: `rival_dana_${starter}${rematch ? '_rematch' : ''}`,
    trainerClass: 'Rival',
    name: 'Dana',
    sprite: 'rival_front',
    overworldSprite: 'rival',
    party: [
      { speciesId: r.catchId, level: 4, moves: ['autocomplete', 'small_talk'] },
      { speciesId: starter, level: rematch ? 4 : 5, moves: r.moves, ivs: { hp: iv, atk: iv, def: iv, spa: iv, spd: iv, spe: iv } },
    ],
    preBattle: ['Ready or not, here I come!'],
    loseText: 'Wow. Okay. That was a really good battle. I’m still beating you next time.',
    postBattle: ['Next time I’m reading the whole chart.'],
    prize: 300,
    aiRandomness: 0,
  }
}
for (const s of Object.keys(RIVAL_PARTY)) TRAINER_LIST.push(rival(s, false), rival(s, true))

export const TRAINERS: Record<string, TrainerDef> = Object.fromEntries(TRAINER_LIST.map((t) => [t.id, t]))
