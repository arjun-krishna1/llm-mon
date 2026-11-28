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
  /**
   * Battle front sprite key (64x64, sprites/battle/<key>.png). Existing: trainer_m_front,
   * trainer_f_front, rival_front. New keys (art to come; the engine shows a placeholder):
   * yilong_front, rumelhart_front, shannon_front, bengio_front, ioffe_front, hinton_front,
   * vandenoord_front, vaswani_front, sennrich_front, radford_front, howard_front, li_front,
   * russell_front, prof_front (Karpathy), overfit_grunt_m_front, overfit_grunt_f_front,
   * overfit_admin_front, proxy (uses the mon sprite).
   */
  sprite: string
  /** Overworld sprite id (chars/<id>.png). */
  overworldSprite: string
  party: TrainerPartyEntry[]
  preBattle: string[]
  loseText: string
  postBattle: string[]
  /** Prize money in tokens. */
  prize: number
  /** Trainer AI: chance to pick a random usable move instead of the best (default by tier). */
  aiRandomness?: number
  /** AI tier: basic (route), smart (gym trainers, Team Overfit), leader, champion. */
  aiTier?: 'basic' | 'smart' | 'leader' | 'champion'
  /** Items the trainer may use in battle (leader/champion tiers). */
  items?: Record<string, number>
  /** Arena rules for this fight (gym/League mechanics). */
  arena?: { id: string; params?: Record<string, unknown> }[]
  /** Optional battle intro line instead of "X would like to battle!". */
  introText?: string
  /** Battle background id (default 'grass'). */
  background?: string
  /** Battle music id (default 'battle_trainer'). */
  music?: string
  /** Badge awarded on a win (gym leaders), for the engine/content. */
  badge?: string
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
      { speciesId: 'gemma_4', level: 4 },
      { speciesId: 'mistral_medium', level: 3 },
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
      { speciesId: 'gpt_5_4_mini', level: 3 },
    ],
    preBattle: ['Stop right there! I need one more data point.', 'Your score goes on my leaderboard!'],
    loseText: 'Okay, that result is NOT going in the paper.',
    postBattle: ['Small models are fast, but your partner', 'clearly has better evals. Noted!'],
    prize: 120,
  },
]

// ── helpers ───────────────────────────────────────────────────────────────
const iv = (n: number) => ({ hp: n, atk: n, def: n, spa: n, spd: n, spe: n })
type P = TrainerPartyEntry
const p = (speciesId: string, level: number, extra: Partial<P> = {}): P => ({ speciesId, level, ...extra })
function t(def: Omit<TrainerDef, 'postBattle' | 'preBattle'> & { preBattle?: string[]; postBattle?: string[] }): TrainerDef {
  return { preBattle: [], postBattle: [], ...def }
}

// ── Rival Yilong (replaces Dana) ─────────────────────────────────────────
// Yilong takes the starter that beats yours (anthropic > zhipu > openai >
// anthropic) and his ace is Grok. Battle 1 (Route 101): a Route 101 catch your
// starter beats, his counter-starter, then Grok. Balance locked by
// data/__tests__/rival.test.ts (62-85% for a Lv8 starter + Lv2-3 catch, rematch
// easier, both sides land a super-effective hit). The `_rematch` variant is used
// once after you lose to him. `rival_dana_*` ids remain as aliases until CONTENT
// switches over.
const RIVAL_COUNTER: Record<string, { moves: string[]; iv: number; level: number; catchId: string; catchMoves: string[] }> = {
  gpt_5_5: { moves: ['autocomplete', 'focus_token', 'function_call'], iv: 5, level: 5, catchId: 'gemma_4', catchMoves: ['autocomplete', 'small_talk'] }, // vs Claude Fable
  glm: { moves: ['graph_paw', 'pattern_guard', 'graph_reason'], iv: 5, level: 5, catchId: 'mistral_medium', catchMoves: ['autocomplete', 'jailbreak'] }, // vs GPT 5.5
  claude_fable: { moves: ['warm_nudge', 'guardrail', 'artifact'], iv: 15, level: 4, catchId: 'gpt_5_4_mini', catchMoves: ['autocomplete', 'small_talk'] }, // vs GLM
}
const YILONG = {
  trainerClass: 'Rival',
  name: 'Yilong',
  sprite: 'yilong_front',
  overworldSprite: 'yilong',
  loseText: 'Okay. OKAY. Respect. Grok says it let you win. It did not.',
  prize: 300,
}
function yilong1(starter: string, rematch: boolean): TrainerDef {
  const r = RIVAL_COUNTER[starter]
  return {
    ...YILONG,
    id: `rival_yilong_${starter}${rematch ? '_rematch' : ''}`,
    party: [
      p(r.catchId, 3, { moves: r.catchMoves }),
      p(starter, rematch ? r.level - 1 : r.level, { moves: r.moves, ivs: iv(r.iv) }),
      p('grok', rematch ? 3 : 4, { moves: ['autocomplete', 'small_talk', 'hot_take'], ivs: iv(r.iv) }),
    ],
    preBattle: ['Yilong! Definitely not related to anyone. Let’s battle!'],
    postBattle: ['Next time Grok gets the first move. It insists.'],
    aiRandomness: 0,
  }
}
// Battle 2: Palo Alto library, ~Lv 22-25. Counter-starter evolved, Grok, a Llama.
function yilong2(starter: string): TrainerDef {
  const evo: Record<string, string> = { gpt_5_5: 'gpt_5_5_thinking', glm: 'glm_plus', claude_fable: 'claude_sonnet' }
  return {
    ...YILONG,
    id: `rival_yilong2_${starter}`,
    party: [p('llama_scout', 22), p('mistral_small', 22), p('grok', 24), p(evo[starter], 25)],
    preBattle: ['The library is quiet. Let’s fix that.'],
    postBattle: ['I read the whole chart this time. You read it better.'],
    prize: 1500,
    aiTier: 'smart',
    background: 'library',
  }
}
for (const s of Object.keys(RIVAL_COUNTER)) {
  TRAINER_LIST.push(yilong1(s, false), yilong1(s, true), yilong2(s))
  // Deprecated aliases (CONTENT still uses these ids).
  TRAINER_LIST.push({ ...yilong1(s, false), id: `rival_dana_${s}` }, { ...yilong1(s, true), id: `rival_dana_${s}_rematch` })
}

// ── Gym 1: Gradient Gym (SoMa Node), Rumelhart ─────────────────────────────
const GYM1 = [{ id: 'gradient_descent' }]
TRAINER_LIST.push(
  t({ id: 'gym1_a', trainerClass: 'Grad Student', name: 'Linnea', sprite: 'trainer_f_front', overworldSprite: 'trainer_f', party: [p('sgd', 10), p('perceptron', 10)], loseText: 'My loss went up. That is the wrong direction.', prize: 400, aiTier: 'smart', arena: GYM1, preBattle: ['Every turn we survive, we get a little better!'], postBattle: ['Tip: end fights fast. Every turn is a step for us.'] }),
  t({ id: 'gym1_b', trainerClass: 'Grad Student', name: 'Paul', sprite: 'trainer_m_front', overworldSprite: 'trainer_m', party: [p('sigmoid', 11), p('sgd', 11)], loseText: 'Vanishing... gradients...', prize: 440, aiTier: 'smart', arena: GYM1, preBattle: ['Small steps, downhill, forever.'], postBattle: ['Sigmoid gets sleepy at the edges. So do I.'] }),
  t({ id: 'gym1_c', trainerClass: 'Researcher', name: 'Ronald', sprite: 'trainer_m_front', overworldSprite: 'trainer_m', party: [p('perceptron', 11), p('mlp', 12)], loseText: 'The chain rule never lies. I do, sometimes.', prize: 480, aiTier: 'smart', arena: GYM1, preBattle: ['One layer, then two. Watch them learn!'], postBattle: ['The leader trained all three of his with the same rule.'] }),
  t({
    id: 'gym1_leader', trainerClass: 'Leader', name: 'Rumelhart', sprite: 'rumelhart_front', overworldSprite: 'man', badge: 'gradient',
    party: [p('perceptron', 12, { ivs: iv(12), moves: ['fire_neuron', 'guardrail', 'descent', 'small_talk'] }), p('sgd', 12, { ivs: iv(12) }), p('mlp', 14, { ivs: iv(12), moves: ['fire_neuron', 'hidden_layer', 'backprop', 'descent'] })],
    preBattle: ['A network is just tiny sums and products.', 'Every turn my LLMMON survive, they take one step downhill. Let’s see how many steps you allow.'],
    loseText: 'You found the steepest way down. The Gradient Badge is yours.', postBattle: ['Backprop lets you walk back up ledges. Blame flows backwards, after all.'],
    prize: 1400, aiTier: 'leader', items: { patch: 1 }, arena: GYM1, music: 'battle_leader', background: 'gym',
  }),
)

// ── Gym 2: Bigram Gym (Menlo Park), Shannon ───────────────────────────────
const GYM2 = [{ id: 'bigram_table' }]
TRAINER_LIST.push(
  t({ id: 'gym2_a', trainerClass: 'Juggler', name: 'Edith', sprite: 'trainer_f_front', overworldSprite: 'trainer_f', party: [p('n_gram', 15), p('softmax', 15)], loseText: 'I predicted that. With low probability.', prize: 600, aiTier: 'smart', arena: GYM2, postBattle: ['Read the table on the wall. Then change what you say.'] }),
  t({ id: 'gym2_b', trainerClass: 'Gambler', name: 'Ed', sprite: 'trainer_m_front', overworldSprite: 'trainer_m', party: [p('markov_chain', 16), p('n_gram', 15)], loseText: 'The odds said I would win. The odds lied.', prize: 640, aiTier: 'smart', arena: GYM2, postBattle: ['If you keep using your best move, you get our best reply.'] }),
  t({ id: 'gym2_c', trainerClass: 'Statistician', name: 'Ada', sprite: 'trainer_f_front', overworldSprite: 'trainer_f', party: [p('entropy', 16), p('markov_chain', 16), p('softmax', 17)], loseText: 'Very surprising. About four bits’ worth.', prize: 680, aiTier: 'smart', arena: GYM2 }),
  t({
    id: 'gym2_leader', trainerClass: 'Leader', name: 'Shannon', sprite: 'shannon_front', overworldSprite: 'elder', badge: 'likelihood',
    party: [p('n_gram', 17, { ivs: iv(12) }), p('markov_chain', 18, { ivs: iv(12) }), p('entropy', 20, { ivs: iv(13), moves: ['sample', 'add_noise', 'normalize_odds', 'stale_cache'] })],
    preBattle: ['My LLMMON only know one thing: what usually comes next.', 'Whatever you say, they answer from the table. Surprise me.'],
    loseText: 'Delightfully unpredictable. Take the Likelihood Badge.', postBattle: ['Sample lets you reroll a wild encounter once per patch. Use it wisely.'],
    prize: 2000, aiTier: 'leader', items: { patch: 2 }, arena: GYM2, music: 'battle_leader', background: 'gym',
  }),
)

// ── Gyms 3-8 leaders (full gyms come in later stages) ─────────────────────
TRAINER_LIST.push(
  t({ id: 'gym3_leader', trainerClass: 'Leader', name: 'Bengio', sprite: 'bengio_front', overworldSprite: 'elder', badge: 'embedding', party: [p('tanh', 22, { ivs: iv(12) }), p('mlp', 23, { ivs: iv(12) }), p('word2vec', 24, { ivs: iv(13) }), p('embedding', 26, { ivs: iv(14) })], loseText: 'Your moves were all over the map. In a good way.', prize: 2600, aiTier: 'leader', items: { big_patch: 1 }, arena: [{ id: 'context_window' }], music: 'battle_leader', background: 'gym' }),
  t({ id: 'gym4_leader', trainerClass: 'Leader', name: 'Ioffe', sprite: 'ioffe_front', overworldSprite: 'man', badge: 'normal', party: [p('batchnorm', 29, { ivs: iv(13) }), p('dropout', 29, { ivs: iv(13) }), p('inception', 30, { ivs: iv(13) }), p('relu', 32, { ivs: iv(14) })], loseText: 'Fundamentals. Exactly. The Normal Badge is yours.', prize: 3200, aiTier: 'leader', items: { big_patch: 1 }, arena: [{ id: 'stage_reset' }], music: 'battle_leader', background: 'gym' }),
  t({ id: 'gym5_leader', trainerClass: 'Leader', name: 'Hinton', sprite: 'hinton_front', overworldSprite: 'elder', badge: 'chain', party: [p('rmsprop', 35, { ivs: iv(13) }), p('boltzmann_machine', 35, { ivs: iv(13) }), p('capsule', 36, { ivs: iv(14) }), p('alexnet', 38, { ivs: iv(14) })], loseText: 'You did it by hand. That is the only way to really know.', prize: 3800, aiTier: 'leader', items: { big_patch: 2 }, arena: [{ id: 'hidden_numbers' }], music: 'battle_leader', background: 'gym' }),
  t({ id: 'gym6_leader', trainerClass: 'Leader', name: 'van den Oord', sprite: 'vandenoord_front', overworldSprite: 'man', badge: 'wave', party: [p('pixelcnn', 41, { ivs: iv(14) }), p('vq_vae', 41, { ivs: iv(14) }), p('lstm', 42, { ivs: iv(14) }), p('wavenet', 43, { ivs: iv(15) })], loseText: 'Quick and decisive. My receptive field never got wide enough.', prize: 4300, aiTier: 'leader', items: { big_patch: 2 }, arena: [{ id: 'history_damage' }], music: 'battle_leader', background: 'gym' }),
  t({ id: 'gym7_leader', trainerClass: 'Leader', name: 'Vaswani', sprite: 'vaswani_front', overworldSprite: 'man', badge: 'attention', party: [p('transformer_base', 46, { ivs: iv(14) }), p('attention_head', 46, { ivs: iv(14) }), p('bert', 46, { ivs: iv(14) }), p('t5', 47, { ivs: iv(14) }), p('adam', 48, { ivs: iv(15) })], loseText: 'Attention was not all I needed, it seems.', prize: 4800, aiTier: 'leader', items: { big_patch: 2 }, arena: [{ id: 'smart_targeting' }, { id: 'copy_best_move' }], music: 'battle_leader', background: 'gym' }),
  t({ id: 'gym8_leader', trainerClass: 'Leader', name: 'Sennrich', sprite: 'sennrich_front', overworldSprite: 'man', badge: 'merge', party: [p('byte', 50, { ivs: iv(14) }), p('wordpiece', 51, { ivs: iv(14) }), p('sentencepiece', 51, { ivs: iv(14) }), p('bpe', 53, { ivs: iv(15) })], loseText: 'Short, efficient, merged. You speak tokenizer.', prize: 5300, aiTier: 'leader', items: { big_patch: 2 }, arena: [{ id: 'token_budget', params: { budget: 24 } }], music: 'battle_leader', background: 'gym' }),
)

// ── The League ───────────────────────────────────────────────────────────
TRAINER_LIST.push(
  t({ id: 'league_radford', trainerClass: 'Frontier Four', name: 'Radford', sprite: 'radford_front', overworldSprite: 'man', party: [p('dcgan', 55, { ivs: iv(15) }), p('gpt_1', 55, { ivs: iv(15) }), p('whisper', 56, { ivs: iv(15) }), p('clip', 56, { ivs: iv(15) }), p('gpt_2', 57, { ivs: iv(15) })], loseText: 'Scale was never the whole story.', prize: 6000, aiTier: 'champion', items: { big_patch: 2 }, arena: [{ id: 'warmup' }], music: 'battle_league', background: 'league' }),
  t({ id: 'league_howard', trainerClass: 'Frontier Four', name: 'Howard', sprite: 'howard_front', overworldSprite: 'man', party: [p('mingpt', 56, { ivs: iv(15) }), p('awd_lstm', 56, { ivs: iv(15) }), p('lora', 56, { ivs: iv(15) }), p('ulmfit', 58, { ivs: iv(15) })], loseText: 'Pretrain, then fine-tune. You did both.', prize: 6000, aiTier: 'champion', items: { big_patch: 2 }, arena: [{ id: 'base_model', params: { to: 'nanochat', hpFraction: 0.5, turn: 3 } }], music: 'battle_league', background: 'league' }),
  t({ id: 'league_li', trainerClass: 'Frontier Four', name: 'Li', sprite: 'li_front', overworldSprite: 'woman', party: [p('softmax', 57, { ivs: iv(15) }), p('vgg', 58, { ivs: iv(15) }), p('resnet', 58, { ivs: iv(15) }), p('temperature', 59, { ivs: iv(15) })], loseText: 'Measured carefully. You were never just guessing.', prize: 6000, aiTier: 'champion', items: { big_patch: 2 }, arena: [{ id: 'temperature', params: { value: 1.6 } }], music: 'battle_league', background: 'league' }),
  t({ id: 'league_russell', trainerClass: 'Frontier Four', name: 'Russell', sprite: 'russell_front', overworldSprite: 'elder', party: [p('classifier', 59, { ivs: iv(15) }), p('guardrail', 59, { ivs: iv(15) }), p('rlhf', 59, { ivs: iv(15) }), p('constitution_ai', 61, { ivs: iv(15) })], loseText: 'Your LLMMON trust you. That is the whole lesson.', prize: 6200, aiTier: 'champion', items: { big_patch: 2 }, arena: [{ id: 'refusal' }], music: 'battle_league', background: 'league' }),
  t({ id: 'champion_karpathy', trainerClass: 'Champion', name: 'Karpathy', sprite: 'prof_front', overworldSprite: 'prof', party: [p('micrograd', 60, { ivs: iv(15) }), p('makemore', 60, { ivs: iv(15) }), p('char_rnn', 61, { ivs: iv(15) }), p('mingpt', 61, { ivs: iv(15) }), p('nanogpt', 62, { ivs: iv(15) }), p('nanochat', 62, { ivs: iv(15) })], loseText: 'You didn’t memorise it. You built it.', prize: 10000, aiTier: 'champion', items: { big_patch: 3 }, arena: [{ id: 'gradient_descent' }], music: 'battle_champion', background: 'league' }),
)

// ── Caltrain Line (stage 2) ──────────────────────────────────────────────
TRAINER_LIST.push(
  t({ id: 'caltrain_1', trainerClass: 'Commuter', name: 'Priya', sprite: 'trainer_f_front', overworldSprite: 'woman', party: [p('n_gram', 12), p('softmax', 12)], loseText: 'Missed my stop for this. Worth it.', prize: 360, preBattle: ['The 8:15 is late. Battle me while we wait!'] }),
  t({ id: 'caltrain_2', trainerClass: 'Commuter', name: 'Dev', sprite: 'trainer_m_front', overworldSprite: 'man', party: [p('mistral_small', 13)], loseText: 'Even the wind could not get me there on time.', prize: 390 }),
  t({ id: 'caltrain_3', trainerClass: 'Bike Car Rider', name: 'Jo', sprite: 'trainer_f_front', overworldSprite: 'girl', party: [p('llama_scout', 13), p('sgd', 12)], loseText: 'My llama needs a bigger car.', prize: 390 }),
  t({ id: 'caltrain_4', trainerClass: 'Conductor', name: 'Hal', sprite: 'trainer_m_front', overworldSprite: 'man', party: [p('markov_chain', 14), p('n_gram', 13)], loseText: 'Next stop: defeat. All change.', prize: 560, aiTier: 'smart' }),
  t({ id: 'caltrain_5', trainerClass: 'Student', name: 'Wen', sprite: 'trainer_f_front', overworldSprite: 'girl', party: [p('phi_mini', 14), p('sigmoid', 13)], loseText: 'I studied for the wrong test.', prize: 420 }),
  t({ id: 'caltrain_6', trainerClass: 'Hacker', name: 'Max', sprite: 'trainer_m_front', overworldSprite: 'techie', party: [p('gpt_5_4_mini', 14), p('softmax', 14)], loseText: 'Ship it anyway.', prize: 420 }),
  t({ id: 'caltrain_7', trainerClass: 'Commuter', name: 'Rosa', sprite: 'trainer_f_front', overworldSprite: 'woman', party: [p('entropy', 15), p('mistral_small', 14)], loseText: 'Statistically, I should have won one of these by now.', prize: 450, aiTier: 'smart' }),
  t({ id: 'caltrain_8', trainerClass: 'Founder', name: 'Theo', sprite: 'trainer_m_front', overworldSprite: 'man', party: [p('qwen', 15), p('llama_scout', 15), p('markov_chain', 15)], loseText: 'Pivoting to a different train.', prize: 600, aiTier: 'smart' }),
)

// ── Team Overfit (fictional) ─────────────────────────────────────────────
const OVERFIT = [{ id: 'overfit' }]
const grunt = (n: number, name: string, f: boolean, party: P[]): TrainerDef =>
  t({ id: `overfit_grunt_${n}`, trainerClass: 'Team Overfit', name, sprite: f ? 'overfit_grunt_f_front' : 'overfit_grunt_m_front', overworldSprite: f ? 'trainer_f' : 'trainer_m', party, loseText: ['That was not in the test set!', 'We scored 100% in practice...', 'Off-script! Totally off-script!', 'Our numbers were perfect five minutes ago.', 'Benchmark Corp will hear about this.', 'You were supposed to use the obvious move.'][n - 1], prize: 500 + n * 40, aiTier: 'smart', arena: OVERFIT, preBattle: ['Team Overfit! We aced the exam because we had the answers.'] })
TRAINER_LIST.push(
  grunt(1, 'Grunt', false, [p('hallucihound', 13)]),
  grunt(2, 'Grunt', true, [p('hallucihound', 14), p('n_gram', 13)]),
  grunt(3, 'Grunt', false, [p('hallucihound', 15), p('softmax', 14)]),
  grunt(4, 'Grunt', true, [p('markov_chain', 15), p('hallucihound', 16)]),
  grunt(5, 'Grunt', false, [p('hallucihound', 17), p('entropy', 16)]),
  grunt(6, 'Grunt', true, [p('hallucihound', 17), p('hallucihound', 17)]),
  t({ id: 'overfit_admin', trainerClass: 'Overfit Admin', name: 'Goodhart', sprite: 'overfit_admin_front', overworldSprite: 'man', party: [p('hallucihound', 18, { ivs: iv(12) }), p('entropy', 18, { ivs: iv(12) }), p('hallucihound', 20, { ivs: iv(13), moves: ['overfit_slam', 'confabulate', 'fake_citation', 'prompt_injection'] })], loseText: 'When a measure becomes a target... ugh. Never mind.', prize: 1600, aiTier: 'leader', items: { patch: 2 }, arena: OVERFIT, preBattle: ['I make the numbers go up. That is the job.'] }),
)

// ── The finale: Proxy (never catchable) ──────────────────────────────────
TRAINER_LIST.push(
  t({ id: 'proxy_finale', trainerClass: '', name: 'Proxy', sprite: 'proxy', overworldSprite: 'proxy', party: [p('proxy_student', 62, { ivs: iv(15) })], loseText: '', prize: 0, aiTier: 'champion', arena: [{ id: 'proxy_finale', params: { keysAvailable: 4, keysNeeded: 4, maxFailures: 3 } }], introText: 'Proxy is at the top of the board.', music: 'battle_proxy', background: 'leaderboard' }),
)

export const TRAINERS: Record<string, TrainerDef> = Object.fromEntries(TRAINER_LIST.map((t) => [t.id, t]))
