// Trainer definitions. `preBattle` runs in the overworld when the trainer spots
// you; `loseText` is shown in battle when they lose; `postBattle` is what they
// say if you talk to them afterwards.

export interface TrainerPartyEntry {
  speciesId: string
  level: number
  /** Optional explicit moveset; default = last 4 learnset moves at that level. */
  moves?: string[]
}

export interface TrainerDef {
  id: string
  /** Trainer class shown before the name, e.g. "Young Founder". */
  trainerClass: string
  name: string
  /** Battle front sprite key (64x64). */
  sprite: 'trainer_m_front' | 'trainer_f_front'
  /** Overworld sprite id (chars/<id>.png). */
  overworldSprite: 'trainer_m' | 'trainer_f'
  party: TrainerPartyEntry[]
  preBattle: string[]
  loseText: string
  postBattle: string[]
  /** Prize money in tokens. */
  prize: number
}

const TRAINER_LIST: TrainerDef[] = [
  {
    id: 'route_101_a',
    trainerClass: 'Young Founder',
    name: 'Calvin',
    sprite: 'trainer_m_front',
    overworldSprite: 'trainer_m',
    party: [{ speciesId: 'gemma_4', level: 4 }],
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
    party: [
      { speciesId: 'gpt_5_4_mini', level: 3 },
      { speciesId: 'mistral_medium', level: 4 },
    ],
    preBattle: ['Stop right there! I need one more data point.', 'Your score goes on my leaderboard!'],
    loseText: 'Okay, that result is NOT going in the paper.',
    postBattle: ['Small models are fast, but your partner', 'clearly has better evals. Noted!'],
    prize: 120,
  },
]

export const TRAINERS: Record<string, TrainerDef> = Object.fromEntries(TRAINER_LIST.map((t) => [t.id, t]))
