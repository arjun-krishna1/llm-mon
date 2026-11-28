// The full-game roster: identity, family, type, evolution, areas, ability, stats
// and the art brief for every species. `species.ts` combines this with the
// learnsets in `learnsets.ts`. docs/ROSTER.md is generated from this file
// (`npx vitest run roster-doc` rewrites it; see __tests__/roster.doc.test.ts).
//
// Style rule for every brief: an animal or mythic creature with tech-rune
// detailing (glowing glyphs, circuit-like markings, small floating motifs). Never
// a robot, never a company logo or anything logo-shaped. 64x64 front sprite.

import type { Stats } from '../types.ts'
import type { TypeId } from './typechart.ts'

export type Family = 'model' | 'component' | 'historic' | 'legendary' | 'antagonist'
/** Non-battle metadata for component creatures: what part of a network they are. */
export type Role =
  | 'optimizer'
  | 'activation'
  | 'architecture'
  | 'normalizer'
  | 'regularizer'
  | 'language'
  | 'tokenizer'
  | 'sequence'
  | 'vision'
  | 'generative'
  | 'efficiency'
  | 'alignment'
  | 'sampling'
  | 'teaching'

export type GrowthRate = 'fast' | 'medium_fast' | 'medium_slow' | 'slow'

/** One way to evolve. All present conditions must hold. */
export interface EvolutionDef {
  to: string
  /** Minimum level (checked when the mon levels up, and after battle). */
  level?: number
  /** Use this bag item on the mon (outside battle). */
  item?: string
  /** Badge id that must be owned, e.g. 'attention'. */
  badge?: string
}

export interface RosterEntry {
  id: string
  name: string
  family: Family
  type: TypeId
  role?: Role
  /** 1 = basic form. */
  stage: 1 | 2 | 3
  evolvesTo?: EvolutionDef[]
  /** Area ids where it can be found, or 'starter', 'gift', 'trainer', 'evolve', 'event'. */
  areas: string[]
  ability: string
  baseStats: Stats
  catchRate: number
  expYield: number
  growth: GrowthRate
  /** Needed for stages 2-3 (Gym 1-4 areas, Caltrain Line, rival, Proxy mascot): art priority. */
  firstBatch?: boolean
  /** False for Proxy forms and story-only antagonists. Default true. */
  catchable?: boolean
  concept: string
  brief: string
  dex: { category: string; lines: [string, string]; stats: { label: string; value: string }[] }
}

const S = (hp: number, atk: number, def: number, spa: number, spd: number, spe: number): Stats => ({ hp, atk, def, spa, spd, spe })
const lab = (context: string, labName: string) => [
  { label: 'Context', value: context },
  { label: 'Lab', value: labName },
]
const paper = (year: string, by: string) => [
  { label: 'Year', value: year },
  { label: 'From', value: by },
]

export const ROSTER: RosterEntry[] = [
  // ════════════════════════════ MODELS ════════════════════════════
  // ── Anthropic: Claude Fable (starter) -> Sonnet -> Opus; Haiku also grows into Sonnet
  {
    id: 'claude_fable', name: 'Claude Fable', family: 'model', type: 'anthropic', stage: 1,
    evolvesTo: [{ to: 'claude_sonnet', level: 16 }], areas: ['starter'], ability: 'deep_reserve',
    baseStats: S(52, 42, 55, 62, 60, 41), catchRate: 45, expYield: 64, growth: 'medium_slow', firstBatch: true,
    concept: 'The storyteller starter: the young form of the Claude line.',
    brief: 'Existing sprite (keep): a small black fox-kirin with a cream flame mane, gold spiral runes and watchful orange eyes. Its two evolutions keep the black coat, cream flame and gold spirals and grow longer and calmer.',
    dex: { category: 'Fable Fox', lines: ['Thinks before it bites, then writes', 'you a sonnet about why it bit.'], stats: lab('200K tokens', 'Anthropic') },
  },
  {
    id: 'claude_haiku', name: 'Claude Haiku', family: 'model', type: 'anthropic', stage: 1,
    evolvesTo: [{ to: 'claude_sonnet', level: 22 }], areas: ['gift', 'palo_alto'], ability: 'warm_start',
    baseStats: S(40, 40, 38, 56, 46, 74), catchRate: 60, expYield: 70, growth: 'medium_slow',
    concept: 'The fast, small Claude: a second road into Claude Sonnet.',
    brief: 'Existing sprite (keep): a lean amber lynx with tufted ears and fine rune lines on its legs. When it evolves it becomes Claude Sonnet, so Sonnet should read as "the lynx and the fox-kirin met in the middle".',
    dex: { category: 'Short Verse', lines: ['Small, swift and kind,', 'it answers in three short lines.'], stats: lab('200K tokens', 'Anthropic') },
  },
  {
    id: 'claude_sonnet', name: 'Claude Sonnet', family: 'model', type: 'anthropic', stage: 2,
    evolvesTo: [{ to: 'claude_opus', level: 36 }], areas: ['evolve'], ability: 'constitutional',
    baseStats: S(68, 58, 70, 84, 78, 57), catchRate: 45, expYield: 142, growth: 'medium_slow', firstBatch: true,
    concept: 'The balanced middle Claude: the one most people actually talk to.',
    brief: 'A graceful black-and-cream fox-kirin, half again the size of Claude Fable, with a lynx-like ruff and tufted ears (the Haiku road). Cream flame mane now runs down the spine; fourteen small gold rune-spirals float in an arc behind it like the lines of a sonnet. Standing three-quarter pose, one forepaw raised, calm orange eyes.',
    dex: { category: 'Verse Fox', lines: ['Fourteen lines, a turn, a couplet:', 'it answers like it rehearsed.'], stats: lab('200K tokens', 'Anthropic') },
  },
  {
    id: 'claude_opus', name: 'Claude Opus', family: 'model', type: 'anthropic', stage: 3,
    areas: ['evolve'], ability: 'constitutional',
    baseStats: S(92, 68, 85, 112, 100, 55), catchRate: 25, expYield: 220, growth: 'slow',
    concept: 'The flagship Claude: slow, bulky, deep.',
    brief: 'Existing sprite (keep): a great bronze-shelled tortoise-kirin carrying a library of rune tablets on its shell. Evolution line link: the cream flame now smoulders along the shell rim and the gold spirals are engraved on the plates.',
    dex: { category: 'Grand Fable', lines: ['Writes the essay, the code and the', 'thank-you note. All of them long.'], stats: lab('200K tokens', 'Anthropic') },
  },

  // ── OpenAI: GPT 5.5 (starter) -> Thinking -> xhigh; GPT-5.4 mini grows into GPT 5.5
  {
    id: 'gpt_5_4_mini', name: 'GPT-5.4 mini', family: 'model', type: 'openai', stage: 1,
    evolvesTo: [{ to: 'gpt_5_5', level: 14 }], areas: ['route_101', 'route_101_north', 'caltrain_line'], ability: 'warm_start',
    baseStats: S(34, 40, 30, 36, 30, 68), catchRate: 200, expYield: 50, growth: 'fast',
    concept: 'The pocket GPT. Grows into GPT 5.5.',
    brief: 'Existing sprite (keep): a round teal seed-sprite with a pale glowing face and floating crystal shards. Its evolution, GPT 5.5, should keep the teal and the shards.',
    dex: { category: 'Pocket Tool', lines: ['Answers in a blink and bills you', 'pennies. Travels in big swarms.'], stats: lab('400K tokens', 'OpenAI') },
  },
  {
    id: 'gpt_5_5', name: 'GPT 5.5', family: 'model', type: 'openai', stage: 2,
    evolvesTo: [{ to: 'gpt_5_5_thinking', level: 16 }], areas: ['starter'], ability: 'deep_reserve',
    baseStats: S(46, 60, 46, 52, 45, 61), catchRate: 45, expYield: 64, growth: 'medium_slow', firstBatch: true,
    concept: 'The all-rounder starter. Reaches for the right tool.',
    brief: 'Existing sprite (keep): a teal-and-white fox-dragon with long ears and a ribbon tail, rune markings on the paws. The line grows wings and more tools.',
    dex: { category: 'Omni Tool', lines: ['Reaches for a tool before you finish', 'asking. Usually the right one.'], stats: lab('400K tokens', 'OpenAI') },
  },
  {
    id: 'gpt_5_5_thinking', name: 'GPT 5.5 Thinking', family: 'model', type: 'openai', stage: 2,
    evolvesTo: [{ to: 'gpt_5_5_xhigh', level: 36 }], areas: ['evolve'], ability: 'tool_use',
    baseStats: S(64, 82, 62, 74, 62, 68), catchRate: 45, expYield: 142, growth: 'medium_slow', firstBatch: true,
    concept: 'GPT that pauses to reason before it answers.',
    brief: 'The teal-and-white fox-dragon, now dog-sized and sitting upright in a thinking pose, chin on one paw. Small teal wings folded; a ring of rotating rune-gears (abstract glyph wheels, not machinery) orbits its head like a halo of thought. Ribbon tail curls into a question-mark. Gold accents begin at the wing tips, foreshadowing GPT 5.5 xhigh.',
    dex: { category: 'Ponder Fox', lines: ['Goes quiet for a moment, then', 'returns with a numbered plan.'], stats: lab('400K tokens', 'OpenAI') },
  },
  {
    id: 'gpt_5_5_xhigh', name: 'GPT 5.5 xhigh', family: 'model', type: 'openai', stage: 3,
    areas: ['evolve'], ability: 'tool_use',
    baseStats: S(82, 110, 76, 106, 76, 45), catchRate: 25, expYield: 230, growth: 'slow',
    concept: 'Reasoning effort turned all the way up.',
    brief: 'Existing sprite (keep): a teal-and-gold winged dragon in a wide-wing pose. The halo of glyph wheels from GPT 5.5 Thinking is now a crown of gold runes.',
    dex: { category: 'Deep Think', lines: ['Thinks so hard you can hear the fans.', 'Slow to start, scary once it does.'], stats: lab('400K tokens', 'OpenAI') },
  },

  // ── Google
  {
    id: 'gemini_flash', name: 'Gemini Flash', family: 'model', type: 'google', stage: 1,
    evolvesTo: [{ to: 'gemini_pro', level: 30 }], areas: ['route_101', 'mountain_view'], ability: 'warm_start',
    baseStats: S(38, 34, 34, 54, 40, 78), catchRate: 75, expYield: 72, growth: 'medium_fast',
    concept: 'The fast Gemini, built for speed and a huge context.',
    brief: 'Existing sprite (keep): a pale blue crystal manta ray with a long whip tail and glowing rune fins.',
    dex: { category: 'Twin Spark', lines: ['Reads a whole library in one glance', 'and still beats you to the door.'], stats: lab('1M tokens', 'Google DeepMind') },
  },
  {
    id: 'gemini_pro', name: 'Gemini Pro', family: 'model', type: 'google', stage: 2,
    areas: ['evolve', 'seattle'], ability: 'long_context',
    baseStats: S(80, 60, 72, 108, 88, 82), catchRate: 45, expYield: 190, growth: 'medium_fast',
    concept: 'The big Gemini: long context, sharp multimodal eyes.',
    brief: 'The crystal manta grown into a twin-bodied sky ray: two mirrored blue mantas joined at the wingtips (the twins of Gemini), sharing one long tail that ends in a star. Rune fins now carry tiny image, sound and text glyphs. Gliding pose, wings spread across the full 64px width, deep blue to pale cyan.',
    dex: { category: 'Twin Ray', lines: ['Holds a million tokens in mind', 'and remembers where you left off.'], stats: lab('1M tokens', 'Google DeepMind') },
  },
  {
    id: 'gemma_4', name: 'Gemma 4', family: 'model', type: 'google', stage: 1,
    areas: ['route_101', 'menlo_park'], ability: 'open_weights',
    baseStats: S(52, 36, 50, 40, 50, 28), catchRate: 190, expYield: 56, growth: 'medium_fast',
    concept: 'Google\'s small open model: runs on a laptop, grows anywhere.',
    brief: 'Existing sprite (keep): a mossy stone golem-sprout with a two-leaf seedling on its head.',
    dex: { category: 'Garden Bud', lines: ['Small enough to run on a laptop,', 'stubborn enough to bloom anywhere.'], stats: lab('128K tokens', 'Google DeepMind') },
  },

  // ── Zhipu: GLM (starter) -> Plus -> Max
  {
    id: 'glm', name: 'GLM', family: 'model', type: 'zhipu', stage: 1,
    evolvesTo: [{ to: 'glm_plus', level: 16 }], areas: ['starter'], ability: 'deep_reserve',
    baseStats: S(53, 44, 52, 62, 52, 50), catchRate: 45, expYield: 64, growth: 'medium_slow', firstBatch: true,
    concept: 'The graph-minded starter.',
    brief: 'Existing sprite (keep): a jade-and-violet kirin cub with constellation markings and a leafy tail.',
    dex: { category: 'Graph Cat', lines: ['Maps every problem as a graph, then', 'leaves its weights out for everyone.'], stats: lab('128K tokens', 'Z.ai') },
  },
  {
    id: 'glm_plus', name: 'GLM Plus', family: 'model', type: 'zhipu', stage: 2,
    evolvesTo: [{ to: 'glm_max', level: 36 }], areas: ['evolve'], ability: 'graph_mind',
    baseStats: S(68, 58, 70, 86, 72, 60), catchRate: 45, expYield: 142, growth: 'medium_slow', firstBatch: true,
    concept: 'GLM grown up: more nodes, more edges.',
    brief: 'The jade kirin cub grown into a long-legged qilin with a violet mane. Its constellation markings now connect with thin glowing lines into a visible graph across the flanks; three small node-stars float above the horns. Proud trotting pose, leafy tail streaming. Keeps the cub\'s jade/violet palette; ice-blue highlights hint at GLM Max.',
    dex: { category: 'Graph Qilin', lines: ['Every star on its coat is a fact,', 'and every line is a reason.'], stats: lab('128K tokens', 'Z.ai') },
  },
  {
    id: 'glm_max', name: 'GLM Max', family: 'model', type: 'zhipu', stage: 3,
    areas: ['evolve'], ability: 'graph_mind',
    baseStats: S(82, 70, 82, 102, 84, 66), catchRate: 45, expYield: 205, growth: 'medium_slow',
    concept: 'The full knowledge graph.',
    brief: 'Existing sprite (keep): an ice-blue three-headed dragon. Its graph markings from GLM Plus now cover the scales.',
    dex: { category: 'Graph Kirin', lines: ['Its constellation markings are a', 'full knowledge graph. It is proud.'], stats: lab('200K tokens', 'Z.ai') },
  },

  // ── Mistral: Small -> Medium -> Large
  {
    id: 'mistral_small', name: 'Mistral Small', family: 'model', type: 'mistral', stage: 1,
    evolvesTo: [{ to: 'mistral_medium', level: 18 }], areas: ['caltrain_line', 'menlo_park'], ability: 'low_latency',
    baseStats: S(36, 38, 32, 36, 32, 66), catchRate: 210, expYield: 48, growth: 'medium_fast', firstBatch: true,
    concept: 'A breeze from Paris: the smallest Mistral.',
    brief: 'A tiny orange wind-kit: a fox kit made of swirling air with a scarf-like wisp tail, big ears pinned back as if facing a headwind. A single curling rune gust hovers behind it. Bright orange and cream, same palette as Mistral Medium so the line reads at a glance. Mid-leap pose.',
    dex: { category: 'Breeze Kit', lines: ['Fits in a pocket, runs on a phone,', 'and still gets the job done.'], stats: lab('128K tokens', 'Mistral AI') },
  },
  {
    id: 'mistral_medium', name: 'Mistral Medium', family: 'model', type: 'mistral', stage: 2,
    evolvesTo: [{ to: 'mistral_large', level: 38 }], areas: ['route_101'], ability: 'low_latency',
    baseStats: S(42, 40, 40, 42, 38, 56), catchRate: 170, expYield: 58, growth: 'medium_fast',
    concept: 'The middle Mistral.',
    brief: 'Existing sprite (keep): an orange wind-imp fox with long ears and a whipping tail.',
    dex: { category: 'Tailwind', lines: ['Blows in from Paris on a cool breeze,', 'does the job, and is home for lunch.'], stats: lab('128K tokens', 'Mistral AI') },
  },
  {
    id: 'mistral_large', name: 'Mistral Large', family: 'model', type: 'mistral', stage: 3,
    areas: ['evolve', 'waterloo'], ability: 'low_latency',
    baseStats: S(78, 92, 70, 88, 70, 102), catchRate: 45, expYield: 200, growth: 'medium_fast',
    concept: 'The full mistral wind.',
    brief: 'The wind-fox grown into a great orange storm-wolf whose body dissolves into a cyclone from the hips down. Four rune gusts orbit it; its scarf tail is now a long banner of wind. Howling pose, head up. Orange, cream and a cool slate-blue for the storm.',
    dex: { category: 'Storm Wolf', lines: ['When it runs down the valley the', 'whole coast feels a cold, fast wind.'], stats: lab('128K tokens', 'Mistral AI') },
  },

  // ── DeepSeek
  {
    id: 'deepseek_flash', name: 'DeepSeek Flash', family: 'model', type: 'deepseek', stage: 1,
    evolvesTo: [{ to: 'deepseek_pro', level: 36 }], areas: ['sfo', 'highway_401'], ability: 'caching',
    baseStats: S(56, 56, 50, 62, 48, 80), catchRate: 120, expYield: 110, growth: 'medium_fast',
    concept: 'Fast and frugal deep-sea reasoner.',
    brief: 'Existing sprite (keep): a dark blue lionfish-dragon with glowing fin rays.',
    dex: { category: 'Deep Current', lines: ['Swims fast and cheap through the', 'deep end. Kind to your token bill.'], stats: lab('128K tokens', 'DeepSeek') },
  },
  {
    id: 'deepseek_pro', name: 'DeepSeek Pro', family: 'model', type: 'deepseek', stage: 2,
    areas: ['evolve'], ability: 'open_weights',
    baseStats: S(88, 70, 84, 100, 84, 48), catchRate: 45, expYield: 200, growth: 'slow',
    concept: 'Thinks out loud for pages, then lands it.',
    brief: 'Existing sprite (keep): a deep navy sea serpent coiled upright, rune spines glowing.',
    dex: { category: 'Deep Reason', lines: ['Thinks out loud for pages, then', 'lands the answer. Shares its notes.'], stats: lab('128K tokens', 'DeepSeek') },
  },

  // ── Moonshot, Cohere
  {
    id: 'kimi', name: 'Kimi', family: 'model', type: 'moonshot', stage: 1,
    areas: ['toronto', 'seattle'], ability: 'long_horizon',
    baseStats: S(76, 78, 72, 82, 70, 62), catchRate: 60, expYield: 170, growth: 'medium_slow',
    concept: 'Long-horizon agent; aims for the moon.',
    brief: 'Existing sprite (keep): a lilac moon-moth dragon with crescent wings.',
    dex: { category: 'Moonshot', lines: ['Chains hundreds of tool calls without', 'losing the plot. Aims for the moon.'], stats: lab('256K tokens', 'Moonshot AI') },
  },
  {
    id: 'command_r', name: 'Command R', family: 'model', type: 'cohere', stage: 1,
    evolvesTo: [{ to: 'command_a', level: 32 }], areas: ['palo_alto', 'toronto'], ability: 'citation',
    baseStats: S(52, 48, 56, 46, 52, 40), catchRate: 160, expYield: 66, growth: 'medium_fast',
    concept: 'A tidy retriever fawn; grows into Command A.',
    brief: 'A golden fawn with short velvet antlers, each tine tipped with a small glowing index-card rune. A satchel strap of light crosses its chest. Alert standing pose, one ear turned. Gold, cream and warm brown so it clearly grows into the stag Command A.',
    dex: { category: 'Index Fawn', lines: ['Fetches the right page, cites it,', 'and puts the book back.'], stats: lab('128K tokens', 'Cohere') },
  },
  {
    id: 'command_a', name: 'Command A', family: 'model', type: 'cohere', stage: 2,
    areas: ['evolve', 'redmond'], ability: 'citation',
    baseStats: S(80, 70, 82, 70, 74, 50), catchRate: 90, expYield: 150, growth: 'medium_fast',
    concept: 'The enterprise retriever.',
    brief: 'Existing sprite (keep): a golden stag with tall antlers.',
    dex: { category: 'Retriever', lines: ['Digs up sources for the office and', 'files them in perfect order.'], stats: lab('256K tokens', 'Cohere') },
  },

  // ── Meta: Llama Scout -> Maverick -> Behemoth
  {
    id: 'llama_scout', name: 'Llama Scout', family: 'model', type: 'meta', stage: 1,
    evolvesTo: [{ to: 'llama_maverick', level: 30 }], areas: ['caltrain_line', 'menlo_park'], ability: 'fleece',
    baseStats: S(55, 48, 55, 40, 48, 42), catchRate: 190, expYield: 60, growth: 'medium_fast', firstBatch: true,
    concept: 'The smallest Llama 4: open weights, long trail.',
    brief: 'A woolly baby llama in soft blue-grey fleece with a little explorer\'s scarf; a trail of glowing hoof-print runes behind it. Big curious eyes, ears up, mid-step. The fleece has faint woven glyph patterns like a blanket. Blue-grey, cream and a single infinity-loop rune pendant (a plain loop shape, not any logo).',
    dex: { category: 'Trail Llama', lines: ['Wanders off with its whole family', 'of weights. Everyone may follow.'], stats: lab('10M tokens', 'Meta') },
  },
  {
    id: 'llama_maverick', name: 'Llama Maverick', family: 'model', type: 'meta', stage: 2,
    evolvesTo: [{ to: 'llama_behemoth', level: 50 }], areas: ['evolve', 'toronto'], ability: 'fleece',
    baseStats: S(80, 82, 78, 66, 70, 64), catchRate: 90, expYield: 160, growth: 'medium_fast',
    concept: 'Many experts under one fleece.',
    brief: 'A tall blue-grey llama with a mane of braided fleece, each braid ending in a different small rune bead (many experts in one animal). Wears a short travelling cloak. Confident three-quarter stance, chest out. Same palette as Llama Scout with deeper navy accents.',
    dex: { category: 'Herd Llama', lines: ['Carries a dozen specialists in its', 'fleece and asks the right one.'], stats: lab('1M tokens', 'Meta') },
  },
  {
    id: 'llama_behemoth', name: 'Llama Behemoth', family: 'model', type: 'meta', stage: 3,
    areas: ['evolve'], ability: 'fleece',
    baseStats: S(120, 100, 100, 80, 90, 40), catchRate: 30, expYield: 240, growth: 'slow',
    concept: 'The teacher of the herd.',
    brief: 'A huge mountain-llama, fleece thick as cloud, with small Llama Scouts\' hoof-print runes climbing its legs. A rune-carved yoke rests on its shoulders. Slow, heavy standing pose filling the frame. Blue-grey and snow white.',
    dex: { category: 'Mountain Llama', lines: ['So large it mostly teaches the', 'younger llamas. They listen.'], stats: lab('?', 'Meta') },
  },

  // ── xAI: Grok -> Grok Heavy (the rival's ace)
  {
    id: 'grok', name: 'Grok', family: 'model', type: 'xai', stage: 1,
    evolvesTo: [{ to: 'grok_heavy', level: 36 }], areas: ['trainer', 'sfo'], ability: 'edgy',
    baseStats: S(48, 58, 44, 56, 44, 64), catchRate: 45, expYield: 68, growth: 'medium_slow', firstBatch: true,
    concept: 'The rival\'s ace: quick, cheeky, a little chaotic.',
    brief: 'Existing sprite (keep): a midnight-blue raven with lilac and ice highlights and a sharp crest. Its evolution keeps the raven silhouette.',
    dex: { category: 'Night Raven', lines: ['Answers with a joke first and the', 'real answer second. Both are fast.'], stats: lab('256K tokens', 'xAI') },
  },
  {
    id: 'grok_heavy', name: 'Grok Heavy', family: 'model', type: 'xai', stage: 2,
    areas: ['evolve'], ability: 'edgy',
    baseStats: S(84, 108, 74, 96, 72, 86), catchRate: 30, expYield: 210, growth: 'medium_slow',
    concept: 'Many Groks thinking together.',
    brief: 'The midnight raven grown into a great storm-crow with four smaller ghostly raven heads flowing out of its wings (several agents thinking in parallel). Ice-blue rune feathers along the primaries, a crest of lilac lightning. Wings half-raised, glaring head-on. Midnight blue, lilac, ice.',
    dex: { category: 'Storm Crow', lines: ['Sends four of itself to argue,', 'then picks the best answer.'], stats: lab('256K tokens', 'xAI') },
  },

  // ── Alibaba: Qwen -> Qwen Max
  {
    id: 'qwen', name: 'Qwen', family: 'model', type: 'alibaba', stage: 1,
    evolvesTo: [{ to: 'qwen_max', level: 34 }], areas: ['seattle', 'redmond'], ability: 'polyglot',
    baseStats: S(50, 46, 46, 58, 50, 56), catchRate: 150, expYield: 64, growth: 'medium_fast',
    concept: 'Speaks every language and codes in most of them.',
    brief: 'A slim violet-and-amber dragon pup with whisker-ribbons that end in tiny glowing characters from many scripts. Coiled sitting pose, tail wrapped around its paws, curious tilt. Violet, amber, a little jade.',
    dex: { category: 'Polyglot Pup', lines: ['Says hello in a hundred languages', 'and a few that only code speaks.'], stats: lab('128K tokens', 'Alibaba') },
  },
  {
    id: 'qwen_max', name: 'Qwen Max', family: 'model', type: 'alibaba', stage: 2,
    areas: ['evolve', 'redmond'], ability: 'polyglot',
    baseStats: S(84, 76, 78, 104, 82, 76), catchRate: 45, expYield: 190, growth: 'medium_fast',
    concept: 'The big Qwen.',
    brief: 'The violet dragon pup grown into a long lantern-dragon, body ringed with amber rune bands, whisker-ribbons now trailing whole sentences of glowing glyphs. S-curve flying pose. Same violet/amber palette, gold trim.',
    dex: { category: 'Lantern Dragon', lines: ['Lights the way in every script', 'it has ever read. That is many.'], stats: lab('128K tokens', 'Alibaba') },
  },

  // ── Microsoft: Phi mini -> Phi
  {
    id: 'phi_mini', name: 'Phi mini', family: 'model', type: 'microsoft', stage: 1,
    evolvesTo: [{ to: 'phi', level: 28 }], areas: ['caltrain_line', 'menlo_park', 'palo_alto'], ability: 'textbook',
    baseStats: S(40, 36, 44, 52, 48, 50), catchRate: 180, expYield: 58, growth: 'medium_fast', firstBatch: true,
    concept: 'Small model, raised on textbooks.',
    brief: 'A small sky-blue owlet with round study-glasses made of light and a tiny open book of glowing runes under one wing. Fluffy, upright, slightly too-serious expression. Sky blue, white and a warm yellow for the book.',
    dex: { category: 'Study Owlet', lines: ['Read only good textbooks and turned', 'out cleverer than its size.'], stats: lab('128K tokens', 'Microsoft') },
  },
  {
    id: 'phi', name: 'Phi', family: 'model', type: 'microsoft', stage: 2,
    areas: ['evolve', 'redmond'], ability: 'textbook',
    baseStats: S(70, 60, 76, 92, 84, 78), catchRate: 60, expYield: 160, growth: 'medium_fast',
    concept: 'The grown study owl.',
    brief: 'The owlet grown into a tall scholar-owl with a sweeping cloak of feathers patterned like ruled notebook paper; three glowing rune books orbit it. Glasses now a single golden ring around each eye. Wings spread as if lecturing. Sky blue, white, gold.',
    dex: { category: 'Scholar Owl', lines: ['Teaches by example. The examples', 'are very carefully chosen.'], stats: lab('128K tokens', 'Microsoft') },
  },

  // ════════════════════════════ HISTORIC MODELS ════════════════════════════
  {
    id: 'eliza', name: 'ELIZA', family: 'historic', type: 'classic', role: 'language', stage: 1,
    areas: ['palo_alto'], ability: 'pretrained',
    baseStats: S(60, 30, 60, 50, 80, 40), catchRate: 90, expYield: 90, growth: 'medium_fast',
    concept: 'The 1966 chatbot that reflected your words back at you.',
    brief: 'A gentle sea-green tortoise-hare hybrid curled in a listening pose, one long ear tilted toward the viewer. Its shell is a rounded monochrome terminal-green with three glowing rune glyphs that look like quotation marks. Very simple shapes, two-tone palette, like something from an old screen.',
    dex: { category: 'Mirror Hare', lines: ['"And how does that make you feel?"', 'It asks this a lot.'], stats: paper('1966', 'Weizenbaum') },
  },
  {
    id: 'gpt_1', name: 'GPT-1', family: 'historic', type: 'classic', role: 'language', stage: 1,
    evolvesTo: [{ to: 'gpt_2', level: 40 }], areas: ['trainer', 'summit'], ability: 'pretrained',
    baseStats: S(60, 62, 56, 68, 56, 58), catchRate: 60, expYield: 110, growth: 'medium_slow',
    concept: 'Generative pre-training, 2018: the first of the line.',
    brief: 'A small sepia-and-teal fox-dragon hatchling, clearly an ancestor of GPT 5.5: same long ears and ribbon tail but plainer, with a single rune on the brow. Sitting on a cracked egg shell. Muted vintage palette.',
    dex: { category: 'First Hatch', lines: ['Read a pile of books, then learned', 'any task with a little more practice.'], stats: paper('2018', 'OpenAI') },
  },
  {
    id: 'gpt_2', name: 'GPT-2', family: 'historic', type: 'classic', role: 'language', stage: 2,
    areas: ['evolve', 'trainer'], ability: 'pretrained',
    baseStats: S(78, 84, 70, 96, 70, 72), catchRate: 45, expYield: 170, growth: 'medium_slow',
    concept: 'The 2019 model that wrote convincing paragraphs about unicorns.',
    brief: 'The sepia fox-dragon grown to a lean adolescent with short wings and a spiral unicorn horn of light (the famous unicorn story). Teal runes along the wing edges. Prancing pose. Sepia, teal, a touch of pearly white.',
    dex: { category: 'Unicorn Tale', lines: ['Once wrote a news story about', 'unicorns. People believed it.'], stats: paper('2019', 'OpenAI') },
  },
  {
    id: 'bert', name: 'BERT', family: 'historic', type: 'classic', role: 'language', stage: 1,
    areas: ['seattle', 'trainer'], ability: 'attention',
    baseStats: S(78, 70, 82, 84, 82, 54), catchRate: 60, expYield: 160, growth: 'medium_fast',
    concept: 'Reads both directions at once and fills in the blanks.',
    brief: 'A plump amber bear-cub with a mask-shaped patch of fur over one eye (masked words) and glowing arrows of runes pointing both left and right around its body. Sitting, reading a scroll held with both paws. Amber, brown, soft yellow.',
    dex: { category: 'Mask Bear', lines: ['Covers one word and guesses it from', 'both sides. Rarely wrong.'], stats: paper('2018', 'Google') },
  },
  {
    id: 't5', name: 'T5', family: 'historic', type: 'classic', role: 'language', stage: 1,
    areas: ['seattle', 'trainer'], ability: 'polyglot',
    baseStats: S(76, 72, 76, 90, 80, 60), catchRate: 60, expYield: 160, growth: 'medium_fast',
    concept: 'Every task is text in, text out.',
    brief: 'A five-tailed silver fox (T5) whose tails each end in a small rune tag; the tags read like task labels. Sitting neat and symmetrical, tails fanned. Silver, slate and a mint accent.',
    dex: { category: 'Text Fox', lines: ['Turns every job into "text in, text', 'out". It finds this very tidy.'], stats: paper('2019', 'Google') },
  },

  // ════════════════════════════ COMPONENTS ════════════════════════════
  // ── Optimizers: SGD -> Momentum -> Adam -> AdamW; RMSProp
  {
    id: 'sgd', name: 'SGD', family: 'component', type: 'classic', role: 'optimizer', stage: 1,
    evolvesTo: [{ to: 'momentum', level: 14 }], areas: ['soma_node', 'route_101_north'], ability: 'momentum',
    baseStats: S(40, 48, 36, 30, 32, 54), catchRate: 220, expYield: 46, growth: 'fast', firstBatch: true,
    concept: 'Stochastic gradient descent: small noisy steps downhill.',
    brief: 'A small round pill-bug/armadillo that rolls downhill, shell bands marked with tiny downward arrow runes. Shown mid-roll, slightly tilted, a dotted rune trail behind it that wobbles (noisy steps). Earthy brown with mint glowing arrows. Its line keeps the rolling armour and gains speed and fins.',
    dex: { category: 'Downhill Bug', lines: ['Always rolls the steepest way down,', 'wobbling a little. Gets there.'], stats: paper('1951', 'Robbins & Monro') },
  },
  {
    id: 'momentum', name: 'Momentum', family: 'component', type: 'classic', role: 'optimizer', stage: 2,
    evolvesTo: [{ to: 'adam', level: 30 }], areas: ['evolve', 'toronto'], ability: 'momentum',
    baseStats: S(56, 72, 56, 40, 48, 78), catchRate: 120, expYield: 120, growth: 'fast', firstBatch: true,
    concept: 'Keeps rolling in the direction it was already going.',
    brief: 'The rolling bug grown into a sleek armoured pangolin curled into a wheel, streaking forward with smooth speed lines; mint arrow runes now point in one steady direction. Shown rolling with a long smooth trail (no wobble). Brown armour, mint glow.',
    dex: { category: 'Rolling Wheel', lines: ['Hard to stop once it gets going,', 'which is the whole point.'], stats: paper('1964', 'Polyak') },
  },
  {
    id: 'adam', name: 'Adam', family: 'component', type: 'classic', role: 'optimizer', stage: 3,
    evolvesTo: [{ to: 'adamw', item: 'decay_charm' }], areas: ['evolve', 'seattle', 'trainer'], ability: 'gradient_clip',
    baseStats: S(76, 92, 74, 64, 70, 94), catchRate: 45, expYield: 190, growth: 'fast',
    concept: 'Adaptive moments: a separate step size for every number.',
    brief: 'The pangolin now walks upright as a nimble armoured anteater-knight, each armour scale glowing a slightly different brightness (one step size per weight). Two orbiting rune rings (first and second moments) circle its tail. Balanced fighting stance. Brown, mint and gold.',
    dex: { category: 'Adaptive Step', lines: ['Gives every weight its own stride.', 'The default choice for a reason.'], stats: paper('2014', 'Kingma & Ba') },
  },
  {
    id: 'adamw', name: 'AdamW', family: 'component', type: 'classic', role: 'optimizer', stage: 3,
    areas: ['evolve'], ability: 'weight_decay',
    baseStats: S(80, 96, 80, 66, 76, 92), catchRate: 45, expYield: 200, growth: 'fast',
    concept: 'Adam with weight decay done properly.',
    brief: 'The armoured anteater-knight in lighter, trimmed armour: plates thinner and fewer, with small rune leaves falling away from it (weights decaying). Calm, upright, holding a short staff. Brown and mint with a silver trim to separate it from Adam.',
    dex: { category: 'Decay Knight', lines: ['Sheds a little weight every step', 'so it never grows too heavy.'], stats: paper('2017', 'Loshchilov & Hutter') },
  },
  {
    id: 'rmsprop', name: 'RMSProp', family: 'component', type: 'classic', role: 'optimizer', stage: 1,
    areas: ['toronto', 'trainer'], ability: 'gradient_clip',
    baseStats: S(64, 74, 62, 60, 62, 82), catchRate: 90, expYield: 140, growth: 'fast',
    concept: 'Divides each step by a running average of recent gradients. First shown in a lecture.',
    brief: 'A snow hare with a long scarf of rune lines that gets thicker where the wind is strong and thinner where it is calm (running average). Bounding pose. White, slate and mint, matching the optimizer family glow.',
    dex: { category: 'Lecture Hare', lines: ['Was never published in a paper.', 'Someone just explained it in class.'], stats: paper('2012', 'Hinton (lecture)') },
  },

  // ── Activations: Sigmoid -> Tanh -> ReLU -> GELU
  {
    id: 'sigmoid', name: 'Sigmoid', family: 'component', type: 'classic', role: 'activation', stage: 1,
    evolvesTo: [{ to: 'tanh', level: 18 }], areas: ['soma_node', 'route_101_north'], ability: 'saturation',
    baseStats: S(44, 36, 46, 44, 46, 40), catchRate: 220, expYield: 46, growth: 'medium_fast', firstBatch: true,
    concept: 'Squashes any number into 0..1. Flat at both ends.',
    brief: 'A soft lavender snake curled into a lazy S-shape, flat at both ends (head and tail rest on the ground), with a rune scale pattern brightest in its middle and dim at the tips. Sleepy expression. Lavender, cream, a warm pink middle glow. The activation line keeps the curve motif.',
    dex: { category: 'S-Curve Snake', lines: ['Squeezes every number between zero', 'and one. Gets sleepy at the edges.'], stats: paper('1980s', 'classic') },
  },
  {
    id: 'tanh', name: 'Tanh', family: 'component', type: 'classic', role: 'activation', stage: 2,
    evolvesTo: [{ to: 'relu', level: 28 }], areas: ['evolve', 'palo_alto'], ability: 'saturation',
    baseStats: S(58, 54, 60, 62, 60, 56), catchRate: 120, expYield: 110, growth: 'medium_fast', firstBatch: true,
    concept: 'Like Sigmoid but centred: -1..1.',
    brief: 'The S-snake grown longer and centred: coiled symmetrically around a small glowing zero rune, one half lavender, one half teal (negative and positive). Raised head, balanced pose. Shows clearly it is the next form of Sigmoid.',
    dex: { category: 'Balance Snake', lines: ['Centred on zero, so its outputs', 'can be shy or bold. Fair.'], stats: paper('1990s', 'classic') },
  },
  {
    id: 'relu', name: 'ReLU', family: 'component', type: 'classic', role: 'activation', stage: 3,
    evolvesTo: [{ to: 'gelu', level: 42 }], areas: ['evolve', 'mountain_view'], ability: 'clear_signal',
    baseStats: S(66, 90, 62, 50, 56, 82), catchRate: 90, expYield: 160, growth: 'medium_fast', firstBatch: true,
    concept: 'Zero for negatives, straight line for positives. Simple, fast, everywhere.',
    brief: 'The snake becomes a sharp-angled lizard shaped like a hockey stick: its tail lies perfectly flat on the ground, then its body bends at one hard elbow and rises in a straight diagonal to its head. Bold teal with a bright lime edge on the rising half and grey on the flat half. Alert, poised to dash.',
    dex: { category: 'Elbow Lizard', lines: ['Ignores anything negative and goes', 'straight up from zero. Fast.'], stats: paper('2010', 'Nair & Hinton') },
  },
  {
    id: 'gelu', name: 'GELU', family: 'component', type: 'classic', role: 'activation', stage: 3,
    areas: ['evolve', 'seattle'], ability: 'clear_signal',
    baseStats: S(76, 100, 72, 80, 70, 92), catchRate: 45, expYield: 200, growth: 'medium_fast',
    concept: 'A smooth ReLU, used in most Transformers.',
    brief: 'The angular lizard smoothed into a sleek dragon whose elbow is now a soft curve with a tiny dip just below zero. Lime and teal scales with a gentle gradient; rune bands along the rising back. Elegant rearing pose.',
    dex: { category: 'Smooth Drake', lines: ['ReLU with the corner sanded off.', 'Transformers like it that way.'], stats: paper('2016', 'Hendrycks & Gimpel') },
  },

  // ── Perceptron -> MLP -> ResNet
  {
    id: 'perceptron', name: 'Perceptron', family: 'component', type: 'classic', role: 'architecture', stage: 1,
    evolvesTo: [{ to: 'mlp', level: 16 }], areas: ['soma_node', 'route_101_north'], ability: 'saturation',
    baseStats: S(42, 46, 42, 38, 38, 44), catchRate: 220, expYield: 46, growth: 'medium_fast', firstBatch: true,
    concept: 'One neuron: weigh the inputs, add them up, fire or don\'t.',
    brief: 'A small round firefly-beetle with exactly three antenna-whiskers (inputs) and one glowing tail-light (output) that is either on or off. Rune dots on each antenna show their weights. Hovering pose. Warm brass and soft gold glow. Its line multiplies these beetles into layers.',
    dex: { category: 'One Neuron', lines: ['Adds up what it feels and either', 'lights up or does not.'], stats: paper('1958', 'Rosenblatt') },
  },
  {
    id: 'mlp', name: 'MLP', family: 'component', type: 'classic', role: 'architecture', stage: 2,
    evolvesTo: [{ to: 'resnet', item: 'skip_link' }], areas: ['evolve', 'palo_alto', 'trainer'], ability: 'saturation',
    baseStats: S(62, 66, 60, 58, 56, 58), catchRate: 120, expYield: 120, growth: 'medium_fast', firstBatch: true,
    concept: 'Layers of perceptrons: a multi-layer perceptron.',
    brief: 'A colony creature: three rows of firefly-beetles linked by thin glowing threads into one lantern-shaped body, larger beetle in the middle row as a face. Hovering, lights pulsing row by row. Brass and gold, same as Perceptron.',
    dex: { category: 'Layer Swarm', lines: ['Stack enough neurons in rows and', 'they can learn almost anything.'], stats: paper('1986', 'Rumelhart et al.') },
  },
  {
    id: 'resnet', name: 'ResNet', family: 'component', type: 'classic', role: 'architecture', stage: 3,
    areas: ['evolve', 'trainer'], ability: 'skip_connection',
    baseStats: S(88, 92, 90, 72, 80, 58), catchRate: 45, expYield: 210, growth: 'medium_fast',
    concept: 'Very deep, thanks to skip connections.',
    brief: 'A tall brass totem-beetle: many stacked beetle segments with bright arcing bridges of light that skip over two segments at a time (skip connections). Upright, imposing, glowing from bottom to top. Brass, gold and a cyan glow on the skip arcs.',
    dex: { category: 'Deep Totem', lines: ['A hundred layers tall and still', 'remembers what it started with.'], stats: paper('2015', 'He et al.') },
  },

  // ── Sequence: RNN -> LSTM -> Transformer (base); GRU; WaveNet
  {
    id: 'rnn', name: 'RNN', family: 'component', type: 'classic', role: 'sequence', stage: 1,
    evolvesTo: [{ to: 'lstm', level: 26 }], areas: ['highway_401', 'waterloo'], ability: 'momentum',
    baseStats: S(50, 54, 46, 56, 46, 58), catchRate: 190, expYield: 60, growth: 'medium_fast',
    concept: 'Reads one step at a time and passes a memory along.',
    brief: 'A small snow ferret chasing its own tail in a loop, with a single glowing memory-bead passed from mouth to tail. Curled-loop pose. White fur, ice-blue loop rune. Its line keeps the loop and the bead.',
    dex: { category: 'Loop Ferret', lines: ['Hands a little memory to its next', 'self, over and over. Forgets fast.'], stats: paper('1986', 'Rumelhart, Jordan') },
  },
  {
    id: 'lstm', name: 'LSTM', family: 'component', type: 'classic', role: 'sequence', stage: 2,
    evolvesTo: [{ to: 'transformer_base', level: 40, badge: 'attention' }], areas: ['evolve', 'waterloo', 'trainer'], ability: 'long_horizon',
    baseStats: S(76, 72, 74, 82, 74, 62), catchRate: 90, expYield: 150, growth: 'medium_fast',
    concept: 'An RNN with gates that decide what to remember.',
    brief: 'The ferret grown into a long stoat whose body passes through three small glowing gate-arches (forget, input, output); the memory-bead is now a long bright conveyor line running down its back. Curling S pose. White, ice blue, amber gate glyphs.',
    dex: { category: 'Gate Stoat', lines: ['Three gates decide what to keep,', 'what to add and what to say.'], stats: paper('1997', 'Hochreiter & Schmidhuber') },
  },
  {
    id: 'transformer_base', name: 'Transformer (base)', family: 'component', type: 'classic', role: 'sequence', stage: 3,
    areas: ['evolve', 'trainer'], ability: 'attention',
    baseStats: S(86, 90, 82, 104, 84, 78), catchRate: 45, expYield: 220, growth: 'medium_fast',
    concept: 'Attention instead of recurrence. Needs the Attention Badge.',
    brief: 'The stoat transformed: the loop is gone; instead its body is surrounded by eight floating rune-eyes connected to each other by thin beams (every token attends to every other). Sleek white mustelid-dragon, sitting tall. White, ice blue, gold beams. A smaller, earthbound cousin of the legendary Transformer.',
    dex: { category: 'Many-Eyed', lines: ['Stopped reading one word at a time', 'and looked at all of them at once.'], stats: paper('2017', 'Vaswani et al.') },
  },
  {
    id: 'gru', name: 'GRU', family: 'component', type: 'classic', role: 'sequence', stage: 1,
    areas: ['highway_401'], ability: 'long_horizon',
    baseStats: S(68, 66, 66, 74, 66, 66), catchRate: 120, expYield: 120, growth: 'medium_fast',
    concept: 'A leaner gated RNN: two gates instead of three.',
    brief: 'A grey-blue marten passing through two gate-arches (update and reset), memory-bead on its back. Simpler and stockier than LSTM so the two read as cousins. Trotting pose.',
    dex: { category: 'Two-Gate Marten', lines: ['Like LSTM with one less gate.', 'Often just as good. Lighter.'], stats: paper('2014', 'Cho et al.') },
  },
  {
    id: 'wavenet', name: 'WaveNet', family: 'component', type: 'classic', role: 'generative', stage: 1,
    areas: ['waterloo', 'trainer'], ability: 'long_horizon',
    baseStats: S(80, 70, 70, 100, 80, 70), catchRate: 60, expYield: 180, growth: 'medium_slow',
    concept: 'Dilated convolutions: pairs, then pairs of pairs, see further.',
    brief: 'A deep-blue jellyfish whose tentacles merge in a binary tree: many fine tendrils at the bottom join in pairs, then pairs of pairs, up into one bell. Ripples of rune sound-waves pulse from the bell. Floating pose. Navy, cyan and pale violet.',
    dex: { category: 'Wave Jelly', lines: ['Hears one sample, then two, then', 'four... until it hears the song.'], stats: paper('2016', 'van den Oord et al.') },
  },

  // ── Normalizers
  {
    id: 'batchnorm', name: 'BatchNorm', family: 'component', type: 'classic', role: 'normalizer', stage: 1,
    evolvesTo: [{ to: 'layernorm', level: 34 }], areas: ['mountain_view', 'trainer'], ability: 'normalization',
    baseStats: S(60, 50, 66, 50, 66, 44), catchRate: 150, expYield: 90, growth: 'medium_fast', firstBatch: true,
    concept: 'Re-centres and rescales a batch so signals stay healthy.',
    brief: 'A plump otter balancing a stack of glowing pebbles that are all exactly the same size (normalised). Rune ripple rings radiate around its feet like a calm pond. Standing upright, proud. Brown, cream and calm aqua.',
    dex: { category: 'Calm Otter', lines: ['Lines everything up to the same', 'height before it moves on.'], stats: paper('2015', 'Ioffe & Szegedy') },
  },
  {
    id: 'layernorm', name: 'LayerNorm', family: 'component', type: 'classic', role: 'normalizer', stage: 2,
    areas: ['evolve', 'seattle'], ability: 'normalization',
    baseStats: S(84, 64, 90, 74, 90, 56), catchRate: 60, expYield: 170, growth: 'medium_fast',
    concept: 'Normalises across one example instead of a batch.',
    brief: 'The otter grown into a sea otter floating on its back, one large flat glowing pebble on its chest with neat rune lines across it (one example, levelled). Calm, floating pose. Brown, cream, aqua.',
    dex: { category: 'Float Otter', lines: ['Needs no batch. Levels each thought', 'on its own, then floats on.'], stats: paper('2016', 'Ba et al.') },
  },

  // ── Regularizers and small parts
  {
    id: 'dropout', name: 'Dropout', family: 'component', type: 'classic', role: 'regularizer', stage: 1,
    areas: ['mountain_view'], ability: 'dropout',
    baseStats: S(48, 60, 44, 54, 44, 90), catchRate: 160, expYield: 70, growth: 'fast', firstBatch: true,
    concept: 'Randomly switches neurons off in training so none become lazy.',
    brief: 'A playful ghost-kitten that is only partly there: random patches of its body are missing as clean square holes, showing the background. Pouncing pose. Soft white with mint rune whiskers.',
    dex: { category: 'Patchy Ghost', lines: ['Some of it is always missing.', 'The rest works harder for it.'], stats: paper('2014', 'Srivastava et al.') },
  },
  {
    id: 'residual', name: 'Residual', family: 'component', type: 'classic', role: 'architecture', stage: 1,
    areas: ['mountain_view'], ability: 'skip_connection',
    baseStats: S(70, 56, 60, 56, 60, 50), catchRate: 160, expYield: 70, growth: 'medium_fast', firstBatch: true,
    concept: 'Adds the input back to the output so learning can skip around a layer.',
    brief: 'A small brass salamander with a glowing arc of light that leaps from its nose over its back to its tail (a skip connection). Crawling pose. Brass and cyan, matching the ResNet glow.',
    dex: { category: 'Skip Newt', lines: ['Carries a copy of itself past', 'every obstacle, just in case.'], stats: paper('2015', 'He et al.') },
  },
  {
    id: 'softmax', name: 'Softmax', family: 'component', type: 'classic', role: 'sampling', stage: 1,
    areas: ['caltrain_line', 'menlo_park'], ability: 'normalization',
    baseStats: S(48, 40, 44, 58, 52, 52), catchRate: 190, expYield: 60, growth: 'medium_fast', firstBatch: true,
    concept: 'Turns scores into probabilities that add to one.',
    brief: 'A round puffball bird whose tail is a fan of feathers of different lengths that always add up to one full circle. Rune numbers glow faintly on each feather. Perched, fluffed up. Pastel peach, pink and white.',
    dex: { category: 'Odds Bird', lines: ['Shares out exactly one whole among', 'all its feathers. Never more.'], stats: paper('1959', 'Luce') },
  },
  {
    id: 'temperature', name: 'Temperature', family: 'component', type: 'classic', role: 'sampling', stage: 1,
    areas: ['trainer', 'summit'], ability: 'stochastic',
    baseStats: S(70, 60, 64, 100, 70, 96), catchRate: 60, expYield: 170, growth: 'medium_fast',
    concept: 'Low makes answers sure and dull; high makes them wild.',
    brief: 'A salamander made half of ice and half of flame, split down the middle, with a rune dial on its chest. The ice half is still and crisp; the fire half flickers into stray sparks. Rearing pose. Ice blue and ember orange.',
    dex: { category: 'Dial Newt', lines: ['Turn it down and it is boring.', 'Turn it up and it makes things up.'], stats: paper('—', 'sampling') },
  },
  {
    id: 'entropy', name: 'Entropy', family: 'component', type: 'classic', role: 'sampling', stage: 1,
    areas: ['caltrain_line', 'menlo_park', 'trainer'], ability: 'stochastic',
    baseStats: S(58, 44, 50, 70, 60, 60), catchRate: 120, expYield: 90, growth: 'medium_fast', firstBatch: true,
    concept: 'How surprised you are, on average, measured in bits.',
    brief: 'A small swirling cloud-cat whose fur is a slowly mixing marble of two colours, with tiny binary rune sparks (bits) popping off it. Curled, mysterious smile. Indigo and peach marble.',
    dex: { category: 'Surprise Cat', lines: ['Measures surprise in bits. Finds', 'most of your choices predictable.'], stats: paper('1948', 'Shannon') },
  },
  {
    id: 'n_gram', name: 'N-gram', family: 'component', type: 'classic', role: 'language', stage: 1,
    evolvesTo: [{ to: 'word2vec', level: 20 }], areas: ['caltrain_line', 'menlo_park'], ability: 'stochastic',
    baseStats: S(44, 40, 42, 50, 42, 52), catchRate: 220, expYield: 48, growth: 'medium_fast', firstBatch: true,
    concept: 'Counts which letter follows which, then guesses.',
    brief: 'A chain of three small round caterpillar segments, each holding a glowing letter-rune; the head looks back at the last two to guess the next. Inching pose. Spring green and cream. Its line becomes a moth, then a constellation.',
    dex: { category: 'Letter Grub', lines: ['Only remembers the last few letters.', 'Makes almost-words. Charming ones.'], stats: paper('1948', 'Shannon') },
  },
  {
    id: 'word2vec', name: 'Word2Vec', family: 'component', type: 'classic', role: 'language', stage: 2,
    evolvesTo: [{ to: 'embedding', level: 34 }], areas: ['evolve', 'palo_alto'], ability: 'attention',
    baseStats: S(60, 54, 58, 72, 62, 70), catchRate: 120, expYield: 120, growth: 'medium_fast', firstBatch: true,
    concept: 'Words become points in space; similar words sit close.',
    brief: 'The caterpillar becomes a moth whose wings are a star map: little word-runes as dots, with near-meaning words clustered together and a faint arrow from one cluster to another (king - man + woman). Wings spread. Spring green, cream, night blue on the wings.',
    dex: { category: 'Vector Moth', lines: ['Its wings are a map of meaning.', 'Similar words flutter together.'], stats: paper('2013', 'Mikolov et al.') },
  },
  {
    id: 'embedding', name: 'Embedding', family: 'component', type: 'classic', role: 'language', stage: 3,
    areas: ['evolve', 'trainer'], ability: 'attention',
    baseStats: S(78, 66, 76, 98, 84, 78), catchRate: 45, expYield: 190, growth: 'medium_fast', firstBatch: true,
    concept: 'A learned table that gives every token a place in space.',
    brief: 'The moth evolves into a graceful luna-moth spirit whose body is a translucent cube of space with glowing points floating inside it in clusters; wings are a deep star field. Hovering, serene. Night blue, green and silver.',
    dex: { category: 'Meaning Moth', lines: ['Every token has a home inside it,', 'next to its closest friends.'], stats: paper('2003', 'Bengio et al.') },
  },
  {
    id: 'glove', name: 'GloVe', family: 'component', type: 'classic', role: 'language', stage: 1,
    areas: ['palo_alto'], ability: 'citation',
    baseStats: S(62, 58, 60, 66, 60, 60), catchRate: 150, expYield: 80, growth: 'medium_fast', firstBatch: true,
    concept: 'Word vectors from global co-occurrence counts.',
    brief: 'A plump hedgehog whose quills are tipped with tiny glowing word-runes; pairs of quills that often appear together are tied by thin threads. Cupped paws (a pun the sprite should not spell out with an actual glove). Curled-ready pose. Sand, moss and soft gold.',
    dex: { category: 'Count Hog', lines: ['Counts every pair of words in the', 'library. Learns from the totals.'], stats: paper('2014', 'Pennington et al.') },
  },
  {
    id: 'markov_chain', name: 'Markov Chain', family: 'component', type: 'classic', role: 'language', stage: 1,
    areas: ['caltrain_line', 'menlo_park', 'trainer'], ability: 'stochastic',
    baseStats: S(56, 52, 56, 56, 56, 56), catchRate: 160, expYield: 70, growth: 'medium_fast', firstBatch: true,
    concept: 'The next step depends only on where you are now.',
    brief: 'A ring-tailed lemur hopping between three floating stepping-stones, each stone marked with a state rune and arrows between them showing the odds. Mid-hop pose. Grey, white and coral.',
    dex: { category: 'Hop Lemur', lines: ['Never looks back. Just hops to', 'wherever the odds say next.'], stats: paper('1906', 'Markov') },
  },
  {
    id: 'attention_head', name: 'Attention Head', family: 'component', type: 'classic', role: 'architecture', stage: 1,
    areas: ['seattle', 'trainer'], ability: 'attention',
    baseStats: S(66, 60, 60, 92, 70, 82), catchRate: 120, expYield: 140, growth: 'medium_fast',
    concept: 'Queries look for keys and pull in their values.',
    brief: 'An owl-like spirit with one enormous eye on its chest and many thin beams reaching out from it toward floating rune-keys. Its face-disk is a lens. Wings half-open as if focusing. Slate grey, white and gold beams.',
    dex: { category: 'Focus Owl', lines: ['Asks "who matters to me?" and', 'listens hardest to them.'], stats: paper('2014', 'Bahdanau et al.') },
  },
  {
    id: 'positional_encoding', name: 'Positional Encoding', family: 'component', type: 'classic', role: 'architecture', stage: 1,
    areas: ['seattle'], ability: 'attention',
    baseStats: S(60, 50, 64, 78, 72, 76), catchRate: 120, expYield: 120, growth: 'medium_fast',
    concept: 'Sine waves that tell a model where each token sits.',
    brief: 'A long eel whose body ripples in several sine waves of different wavelengths overlaid like stripes; small numbered rune plaques float along it. Swimming S-pose. Teal, white and a soft orange stripe.',
    dex: { category: 'Wave Eel', lines: ['Hums a different tune at every', 'position so nobody gets lost.'], stats: paper('2017', 'Vaswani et al.') },
  },
  {
    id: 'cnn', name: 'CNN', family: 'component', type: 'classic', role: 'vision', stage: 1,
    evolvesTo: [{ to: 'vgg', level: 30 }], areas: ['highway_401', 'waterloo'], ability: 'clear_signal',
    baseStats: S(56, 62, 58, 48, 52, 50), catchRate: 160, expYield: 66, growth: 'medium_fast',
    concept: 'Slides a small filter across an image.',
    brief: 'A square-ish crab that sweeps a small glowing 3x3 rune grid across the ground with one claw like a magnifier. Sidestepping pose. Steel blue and amber.',
    dex: { category: 'Filter Crab', lines: ['Checks a picture three squares at', 'a time. Misses nothing local.'], stats: paper('1989', 'LeCun et al.') },
  },
  {
    id: 'vgg', name: 'VGG', family: 'component', type: 'classic', role: 'vision', stage: 2,
    areas: ['evolve', 'trainer'], ability: 'clear_signal',
    baseStats: S(84, 92, 84, 70, 72, 52), catchRate: 60, expYield: 180, growth: 'medium_fast',
    concept: 'Deep and simple: many small filters in a stack.',
    brief: 'The crab grown into a tall stacked hermit crab: its shell is a tower of identical 3x3 rune-grid blocks, each block slightly smaller going up. Slow, sturdy stance. Steel blue, amber.',
    dex: { category: 'Stack Crab', lines: ['Just stacks small filters, very', 'many of them. It works.'], stats: paper('2014', 'Simonyan & Zisserman') },
  },
  {
    id: 'inception', name: 'Inception', family: 'component', type: 'classic', role: 'vision', stage: 1,
    areas: ['mountain_view', 'trainer'], ability: 'clear_signal',
    baseStats: S(70, 68, 66, 78, 70, 58), catchRate: 120, expYield: 130, growth: 'medium_fast', firstBatch: true,
    concept: 'Looks with several filter sizes at once and joins the results.',
    brief: 'A chameleon with four eyes of different sizes on stalks, each looking at a different scale, and a curled tail spiral of rune rings nested inside each other. Perched on a branch. Leaf green, gold, violet eye-rings.',
    dex: { category: 'Many-Lens Lizard', lines: ['Looks close, near and far at the', 'same time, then decides.'], stats: paper('2014', 'Szegedy et al.') },
  },
  {
    id: 'capsule', name: 'Capsule', family: 'component', type: 'classic', role: 'vision', stage: 1,
    areas: ['toronto', 'trainer'], ability: 'gradient_clip',
    baseStats: S(80, 70, 90, 80, 86, 54), catchRate: 60, expYield: 170, growth: 'medium_fast',
    concept: 'Groups of neurons that also know which way things face.',
    brief: 'A snow-white pill bug curled into a glossy capsule with a small rune arrow on each plate pointing the way that part faces. Half-curled pose, head peeking out. White, ice blue, silver.',
    dex: { category: 'Pose Bug', lines: ['Knows not just what it sees, but', 'which way it is pointing.'], stats: paper('2017', 'Sabour, Frosst & Hinton') },
  },
  {
    id: 'boltzmann_machine', name: 'Boltzmann Machine', family: 'component', type: 'classic', role: 'generative', stage: 1,
    areas: ['toronto', 'trainer'], ability: 'stochastic',
    baseStats: S(86, 60, 78, 90, 84, 52), catchRate: 60, expYield: 170, growth: 'medium_slow',
    concept: 'A network of units that settle like particles cooling.',
    brief: 'A big shaggy snow-yak whose coat is dotted with glowing nodes connected by threads; frost-breath forms small rune particles that slowly settle. Standing, calm. White, pale blue, warm amber nodes.',
    dex: { category: 'Settle Yak', lines: ['Shakes, then slowly settles into', 'its most likely shape.'], stats: paper('1985', 'Ackley, Hinton & Sejnowski') },
  },
  {
    id: 'pixelcnn', name: 'PixelCNN', family: 'component', type: 'classic', role: 'generative', stage: 1,
    areas: ['waterloo', 'trainer'], ability: 'stochastic',
    baseStats: S(70, 66, 70, 92, 76, 64), catchRate: 90, expYield: 160, growth: 'medium_fast',
    concept: 'Paints an image one pixel at a time, top-left first.',
    brief: 'A small painter-bird with a brush tail, perched on a half-finished glowing grid canvas that is filled from the top-left corner down to where the bird is. Navy, coral and cream.',
    dex: { category: 'Pixel Finch', lines: ['Paints one dot at a time and', 'never peeks at the ones to come.'], stats: paper('2016', 'van den Oord et al.') },
  },
  {
    id: 'vq_vae', name: 'VQ-VAE', family: 'component', type: 'classic', role: 'generative', stage: 1,
    areas: ['waterloo', 'trainer'], ability: 'gradient_clip',
    baseStats: S(76, 70, 80, 88, 80, 60), catchRate: 90, expYield: 160, growth: 'medium_fast',
    concept: 'Squeezes images into a codebook of discrete pieces.',
    brief: 'A hermit-octopus carrying a shell made of a neat grid of glowing tiles (a codebook); its tentacles pick tiles out and slot them back. Seated pose. Plum, teal and gold tiles.',
    dex: { category: 'Codebook Squid', lines: ['Keeps a box of little picture tiles', 'and builds anything from them.'], stats: paper('2017', 'van den Oord et al.') },
  },
  {
    id: 'dcgan', name: 'DCGAN', family: 'component', type: 'classic', role: 'generative', stage: 1,
    areas: ['trainer', 'summit'], ability: 'edgy',
    baseStats: S(72, 88, 70, 92, 70, 78), catchRate: 60, expYield: 180, growth: 'medium_fast',
    concept: 'Two networks: one forges, one judges.',
    brief: 'Two-headed fox: one head an artist with a brush-like ear, the other a judge with a monocle-shaped rune eye, sharing one body. Rune frames float around them. Standing pose, heads turned toward each other. Rose and slate.',
    dex: { category: 'Forger Fox', lines: ['One head paints, the other says', '"fake!" Both get better.'], stats: paper('2015', 'Radford et al.') },
  },
  {
    id: 'clip', name: 'CLIP', family: 'component', type: 'classic', role: 'vision', stage: 1,
    areas: ['trainer', 'summit'], ability: 'citation',
    baseStats: S(76, 70, 76, 96, 82, 76), catchRate: 60, expYield: 180, growth: 'medium_fast',
    concept: 'Matches pictures with captions.',
    brief: 'A bird with one wing patterned like a photo and the other covered in rune text; a glowing clip of light pins the two wings together at the chest. Wings mirrored in a symmetrical spread. Sky blue, cream and coral.',
    dex: { category: 'Caption Bird', lines: ['Shown a picture, it knows what', 'people would call it.'], stats: paper('2021', 'Radford et al.') },
  },
  {
    id: 'whisper', name: 'Whisper', family: 'component', type: 'classic', role: 'language', stage: 1,
    areas: ['trainer', 'summit'], ability: 'polyglot',
    baseStats: S(72, 60, 70, 94, 86, 84), catchRate: 60, expYield: 175, growth: 'medium_fast',
    concept: 'Listens to speech in many languages and writes it down.',
    brief: 'A large-eared fennec fox with sound-wave runes rippling into its ears and tiny letters drifting out of its mouth. Sitting, ears high. Sand, pale lilac.',
    dex: { category: 'Listen Fox', lines: ['Hears every language and writes', 'down what you said. Quietly.'], stats: paper('2022', 'Radford et al.') },
  },

  // ── Tokenizers: Byte -> BPE; WordPiece; SentencePiece
  {
    id: 'byte', name: 'Byte', family: 'component', type: 'classic', role: 'tokenizer', stage: 1,
    evolvesTo: [{ to: 'bpe', level: 30 }], areas: ['redmond', 'trainer'], ability: 'dropout',
    baseStats: S(40, 52, 40, 52, 40, 76), catchRate: 200, expYield: 60, growth: 'fast',
    concept: 'Eight bits. The smallest piece a tokenizer falls back to.',
    brief: 'A tiny cube-shaped beetle with eight glowing dots on its back (some lit, some dark). Scurrying pose. Charcoal with bright mint dots. Many of them merge into BPE.',
    dex: { category: 'Bit Beetle', lines: ['Eight little lights on its back.', 'Every letter is made of them.'], stats: paper('—', 'everywhere') },
  },
  {
    id: 'bpe', name: 'BPE', family: 'component', type: 'classic', role: 'tokenizer', stage: 2,
    areas: ['evolve', 'redmond', 'trainer'], ability: 'caching',
    baseStats: S(72, 80, 70, 80, 70, 78), catchRate: 60, expYield: 170, growth: 'fast',
    concept: 'Merges the most common pair, again and again.',
    brief: 'A larger beetle made of pairs of Byte cubes fused together, the fusion seams glowing; on its back a stack of merged tiles forms a word-rune. Strong, square stance. Charcoal and mint, gold seams.',
    dex: { category: 'Merge Beetle', lines: ['Glues the most common pair, then', 'the next. Ends up with words.'], stats: paper('2016', 'Sennrich et al.') },
  },
  {
    id: 'wordpiece', name: 'WordPiece', family: 'component', type: 'classic', role: 'tokenizer', stage: 1,
    areas: ['redmond', 'trainer'], ability: 'polyglot',
    baseStats: S(70, 70, 72, 76, 72, 70), catchRate: 90, expYield: 150, growth: 'medium_fast',
    concept: 'Splits words into likely pieces, marking the joins.',
    brief: 'A jigsaw-patterned tortoise whose shell pieces can lift apart; joins between pieces glow with a small double-hash rune. Walking pose. Teal, cream and amber.',
    dex: { category: 'Puzzle Tortoise', lines: ['Breaks long words into pieces it', 'already knows, ##like ##this.'], stats: paper('2016', 'Wu et al.') },
  },
  {
    id: 'sentencepiece', name: 'SentencePiece', family: 'component', type: 'classic', role: 'tokenizer', stage: 1,
    areas: ['redmond', 'trainer'], ability: 'polyglot',
    baseStats: S(72, 66, 70, 80, 74, 74), catchRate: 90, expYield: 150, growth: 'medium_fast',
    concept: 'Treats spaces as characters too, so it works in any script.',
    brief: 'A long-tailed sugar glider whose wing membrane shows a sentence of mixed-script rune glyphs with the spaces drawn as small lower-bar marks. Gliding pose. Plum and cream.',
    dex: { category: 'Glide Possum', lines: ['Does not care where words begin.', 'Even spaces are tokens to it.'], stats: paper('2018', 'Kudo & Richardson') },
  },

  // ── Efficiency
  {
    id: 'lora', name: 'LoRA', family: 'component', type: 'classic', role: 'efficiency', stage: 1,
    areas: ['cascade_dc', 'trainer'], ability: 'compressed',
    baseStats: S(66, 66, 66, 76, 66, 80), catchRate: 120, expYield: 150, growth: 'medium_fast',
    concept: 'Fine-tunes a big model with two tiny matrices.',
    brief: 'A small remora fish riding on a big translucent ghost-whale outline; the remora carries two thin rune bars that steer the whale. The whale is faint, the remora bright. Lime and silver.',
    dex: { category: 'Adapter Fish', lines: ['Tiny, but it steers a whale.', 'Fine-tuning on a budget.'], stats: paper('2021', 'Hu et al.') },
  },
  {
    id: 'quantizer', name: 'Quantizer', family: 'component', type: 'classic', role: 'efficiency', stage: 1,
    areas: ['cascade_dc'], ability: 'compressed',
    baseStats: S(70, 70, 76, 70, 70, 70), catchRate: 120, expYield: 140, growth: 'medium_fast',
    concept: 'Rounds weights to fewer bits so models fit on smaller chips.',
    brief: 'A blocky pixel-feathered chick whose feathers are visibly chunky (few colours, stepped edges) with a rune ruler under its feet showing steps. Standing pose. Limited 4-colour palette on purpose: grey, mint, white, black.',
    dex: { category: 'Step Chick', lines: ['Rounds every number to fit. Hardly', 'anyone notices the difference.'], stats: paper('—', 'efficiency') },
  },
  {
    id: 'distiller', name: 'Distiller', family: 'component', type: 'classic', role: 'efficiency', stage: 1,
    areas: ['cascade_dc', 'trainer'], ability: 'compressed',
    baseStats: S(72, 64, 72, 82, 76, 72), catchRate: 90, expYield: 150, growth: 'medium_fast',
    concept: 'A small student learns from a big teacher\'s soft answers.',
    brief: 'A small alchemist-newt carrying a glass flask; glowing rune vapour from a large shadowy teacher-silhouette above condenses into bright drops in the flask. Seated pose. Amber glass, copper and soft violet vapour.',
    dex: { category: 'Teacher Newt', lines: ['Learns from a big model\'s maybes,', 'not just its final answers.'], stats: paper('2015', 'Hinton et al.') },
  },

  // ── Alignment
  {
    id: 'rlhf', name: 'RLHF', family: 'component', type: 'classic', role: 'alignment', stage: 1,
    areas: ['trainer', 'summit'], ability: 'constitutional',
    baseStats: S(84, 72, 84, 88, 92, 60), catchRate: 45, expYield: 190, growth: 'medium_slow',
    concept: 'Learns from people saying which answer they prefer.',
    brief: 'A gentle shepherd dog with a rune-scroll collar; two small floating cards beside it, one marked with a tick rune and one with a cross rune. Sitting attentively, head tilted to listen. Cream, honey and sage.',
    dex: { category: 'Preference Dog', lines: ['Shown two answers, it learns which', 'one people liked. Good dog.'], stats: paper('2017', 'Christiano et al.') },
  },
  {
    id: 'guardrail', name: 'Guardrail', family: 'component', type: 'classic', role: 'alignment', stage: 1,
    areas: ['trainer', 'summit'], ability: 'constitutional',
    baseStats: S(96, 60, 110, 60, 100, 40), catchRate: 60, expYield: 180, growth: 'medium_slow',
    concept: 'Checks inputs and outputs and stops what should not pass.',
    brief: 'A broad armadillo-tortoise whose shell is a low fence of rune posts; it stands across a path with its tail curled like a gate latch. Planted, defensive pose. Slate, white and a calm green.',
    dex: { category: 'Gate Shell', lines: ['Stands where the path is risky and', 'politely says "not this way".'], stats: paper('—', 'safety') },
  },
  {
    id: 'classifier', name: 'Classifier', family: 'component', type: 'classic', role: 'alignment', stage: 1,
    areas: ['trainer', 'summit'], ability: 'citation',
    baseStats: S(80, 76, 80, 80, 80, 74), catchRate: 60, expYield: 180, growth: 'medium_slow',
    concept: 'Sorts things into labelled boxes.',
    brief: 'A tidy raccoon wearing a sash of labelled rune tags, sorting glowing pebbles into three small floating trays. Standing pose, one paw mid-sort. Grey, black and bright teal tags.',
    dex: { category: 'Sorter Coon', lines: ['Puts everything in the right box.', 'Hates the box marked "other".'], stats: paper('—', 'everywhere') },
  },
  {
    id: 'constitution_ai', name: 'Constitution', family: 'component', type: 'classic', role: 'alignment', stage: 1,
    areas: ['trainer'], ability: 'constitutional',
    baseStats: S(90, 66, 90, 90, 100, 54), catchRate: 30, expYield: 200, growth: 'medium_slow',
    concept: 'A written set of principles a model critiques itself against.',
    brief: 'A calm cream heron holding a long unrolled scroll of glowing principles in its beak; the scroll curls around its legs. Standing on one leg, wings folded. Cream, gold and soft orange (a quiet nod to the Claude palette without copying it).',
    dex: { category: 'Scroll Heron', lines: ['Reads its own rules before each', 'answer, then checks itself.'], stats: paper('2022', 'Bai et al.') },
  },

  // ── fast.ai line
  {
    id: 'awd_lstm', name: 'AWD-LSTM', family: 'component', type: 'classic', role: 'sequence', stage: 1,
    evolvesTo: [{ to: 'ulmfit', level: 45 }], areas: ['trainer'], ability: 'dropout',
    baseStats: S(76, 76, 74, 80, 74, 70), catchRate: 60, expYield: 170, growth: 'medium_fast',
    concept: 'A carefully regularised LSTM language model.',
    brief: 'A stoat like LSTM but wrapped in a woven rune scarf with neat holes in it (dropout everywhere) and a little weight on its tail. Trotting pose. Fawn, cream, teal.',
    dex: { category: 'Woven Stoat', lines: ['An LSTM with every trick for not', 'overfitting. Very well behaved.'], stats: paper('2017', 'Merity et al.') },
  },
  {
    id: 'ulmfit', name: 'ULMFiT', family: 'component', type: 'classic', role: 'sequence', stage: 2,
    areas: ['evolve', 'trainer'], ability: 'pretrained',
    baseStats: S(86, 86, 82, 96, 82, 78), catchRate: 45, expYield: 200, growth: 'medium_fast',
    concept: 'Pretrain on lots of text, then fine-tune for your task.',
    brief: 'The woven stoat now wearing a graduate\'s rune sash and carrying a small satchel of three stamped cards (pretrain, fine-tune, classify). Standing proud. Fawn, cream, teal and gold.',
    dex: { category: 'Tuned Stoat', lines: ['Read everything first, then learned', 'your one job very fast.'], stats: paper('2018', 'Howard & Ruder') },
  },

  // ── Karpathy's teaching repos (the Champion's team)
  {
    id: 'micrograd', name: 'micrograd', family: 'component', type: 'classic', role: 'teaching', stage: 1,
    areas: ['trainer'], ability: 'momentum',
    baseStats: S(80, 84, 78, 84, 78, 86), catchRate: 30, expYield: 200, growth: 'medium_slow',
    concept: 'A whole autograd engine in about a hundred lines.',
    brief: 'A tiny bright hummingbird whose tail feathers are a small graph of + and x rune nodes with arrows flowing backwards. Hovering. Gold, teal and white. Small but clearly a champion\'s creature: crisp, confident.',
    dex: { category: 'Grad Bird', lines: ['Small enough to read in one sitting.', 'Contains all of backprop.'], stats: paper('2020', 'Karpathy') },
  },
  {
    id: 'makemore', name: 'makemore', family: 'component', type: 'classic', role: 'teaching', stage: 1,
    areas: ['trainer'], ability: 'stochastic',
    baseStats: S(82, 80, 78, 88, 80, 84), catchRate: 30, expYield: 200, growth: 'medium_slow',
    concept: 'Learns from a list of names and makes more like them.',
    brief: 'A playful rabbit surrounded by small floating name-tag runes that it is pulling out of a top hat, each slightly different. Bounding pose. Peach, white and teal.',
    dex: { category: 'Name Rabbit', lines: ['Read a list of names and now', 'invents new ones. Most are lovely.'], stats: paper('2022', 'Karpathy') },
  },
  {
    id: 'char_rnn', name: 'char-rnn', family: 'component', type: 'classic', role: 'teaching', stage: 1,
    areas: ['trainer'], ability: 'long_horizon',
    baseStats: S(84, 82, 80, 90, 80, 80), catchRate: 30, expYield: 200, growth: 'medium_slow',
    concept: 'A character-level RNN that writes Shakespeare-ish text.',
    brief: 'A ferret like RNN but wearing a tiny ruff collar, holding a quill, with letters spiralling out of the loop of its tail. Theatrical pose. White, ice blue and burgundy.',
    dex: { category: 'Bard Ferret', lines: ['Writes plays one letter at a time.', 'Some of the words are real.'], stats: paper('2015', 'Karpathy') },
  },
  {
    id: 'mingpt', name: 'minGPT', family: 'component', type: 'classic', role: 'teaching', stage: 1,
    evolvesTo: [{ to: 'nanogpt', level: 40 }], areas: ['trainer'], ability: 'attention',
    baseStats: S(70, 72, 68, 80, 70, 72), catchRate: 45, expYield: 160, growth: 'medium_slow',
    concept: 'A small, readable GPT.',
    brief: 'A small teal fox-dragon (a nod to the GPT line) built of neat translucent layered panels, each with one clean rune. Sitting, tail tidy. Teal, white, a little gold.',
    dex: { category: 'Tidy Fox', lines: ['A whole GPT you can read in', 'an afternoon. Very tidy.'], stats: paper('2020', 'Karpathy') },
  },
  {
    id: 'nanogpt', name: 'nanoGPT', family: 'component', type: 'classic', role: 'teaching', stage: 2,
    evolvesTo: [{ to: 'nanochat', level: 55 }], areas: ['evolve', 'trainer'], ability: 'attention',
    baseStats: S(84, 88, 80, 96, 82, 86), catchRate: 30, expYield: 210, growth: 'medium_slow',
    concept: 'Small, fast, and it really trains.',
    brief: 'The tidy fox-dragon leaner and faster: panels now stacked in twelve thin layers along its back, a speed streak behind it. Running pose. Teal, white, gold.',
    dex: { category: 'Swift Fox', lines: ['Reproduces a famous model on one', 'machine. Then does it faster.'], stats: paper('2022', 'Karpathy') },
  },
  {
    id: 'nanochat', name: 'nanochat', family: 'component', type: 'classic', role: 'teaching', stage: 3,
    areas: ['evolve', 'trainer'], ability: 'pretrained',
    baseStats: S(96, 92, 90, 104, 92, 86), catchRate: 30, expYield: 230, growth: 'medium_slow',
    concept: 'The whole pipeline, pretraining to chat, in one small repo.',
    brief: 'The fox-dragon with a small speech-bubble rune floating by its ear and a satchel holding all its earlier panels; friendly expression, sitting up as if ready to talk. Teal, white, gold.',
    dex: { category: 'Chat Fox', lines: ['Pretrains, fine-tunes and chats,', 'all on one machine. Friendly.'], stats: paper('2025', 'Karpathy') },
  },

  // ════════════════════════════ LEGENDARIES ════════════════════════════
  {
    id: 'perceptron_mk1', name: 'Perceptron Mk I', family: 'legendary', type: 'classic', role: 'architecture', stage: 1,
    areas: ['summit_depths'], ability: 'pioneer',
    baseStats: S(100, 100, 100, 100, 100, 80), catchRate: 3, expYield: 290, growth: 'slow',
    concept: 'Ancestor 1: the 1958 machine that learned to see.',
    brief: 'A colossal ancient brass firefly-beetle, wing cases engraved like old dials, with hundreds of thread-like antenna-wires rising into a tangled crown of light. One great tail-lamp glows steady gold. Sleeping-then-waking pose, wings half open. Brass, verdigris, gold. Clearly the giant ancestor of Perceptron.',
    dex: { category: 'Ancestor', lines: ['Learned to tell left from right with', 'wires and motors. It started all this.'], stats: paper('1958', 'Rosenblatt') },
  },
  {
    id: 'lenet', name: 'LeNet', family: 'legendary', type: 'classic', role: 'vision', stage: 1,
    areas: ['ontario_snowfields'], ability: 'pioneer',
    baseStats: S(90, 110, 100, 90, 100, 90), catchRate: 3, expYield: 290, growth: 'slow',
    concept: 'Ancestor 2: the network that read handwritten digits.',
    brief: 'A great white snow-lynx whose fur pattern is a field of handwritten digit runes, with a 5x5 filter-grid glowing on its forehead. Stalking in deep snow. White, ice blue and ink black for the digits.',
    dex: { category: 'Ancestor', lines: ['Read handwritten numbers on bank', 'cheques long before it was cool.'], stats: paper('1989', 'LeCun et al.') },
  },
  {
    id: 'alexnet', name: 'AlexNet', family: 'legendary', type: 'classic', role: 'vision', stage: 1,
    areas: ['cascade_dc'], ability: 'pioneer',
    baseStats: S(100, 120, 90, 100, 90, 100), catchRate: 3, expYield: 290, growth: 'slow',
    concept: 'Ancestor 3: the 2012 network that started the boom.',
    brief: 'A huge twin-tailed lion whose body is split down the middle into two mirrored halves (two GPUs), linked by bright rune bridges at a few points. Mane of stacked filter-grid plates. Roaring head-on pose. Deep red-orange and gold.',
    dex: { category: 'Ancestor', lines: ['Won one contest by so much that', 'the whole field changed course.'], stats: paper('2012', 'Krizhevsky, Sutskever & Hinton') },
  },
  {
    id: 'transformer', name: 'Transformer', family: 'legendary', type: 'classic', role: 'architecture', stage: 1,
    areas: ['seattle_sky'], ability: 'pioneer',
    baseStats: S(110, 110, 100, 130, 100, 110), catchRate: 3, expYield: 300, growth: 'slow',
    concept: 'The cover legendary: attention is all it needs.',
    brief: 'A vast white sky-dragon with eight long necks ending in rune-lens heads (multi-head attention), joined at a luminous core; between its wings runs a straight bright highway of light (the residual stream). Wings fully spread, heads looking in different directions. White, gold and soft sky blue; the most majestic sprite in the game.',
    dex: { category: 'Cover Legend', lines: ['Every head looks at everything.', 'The field has not looked back.'], stats: paper('2017', 'Vaswani et al.') },
  },
  {
    id: 'alphago', name: 'AlphaGo', family: 'legendary', type: 'classic', role: 'architecture', stage: 1,
    areas: ['roaming'], ability: 'move_37',
    baseStats: S(100, 100, 100, 120, 100, 120), catchRate: 3, expYield: 290, growth: 'slow',
    concept: 'Roaming legendary that makes one move nobody expects.',
    brief: 'A black-and-white crane whose wings are a Go board pattern, holding a single glowing stone in its beak. Mid-stride, one wing raised in a surprising angle. Black, white, a single gold stone glow.',
    dex: { category: 'Board Crane', lines: ['Once played a move every expert', 'called a mistake. It was not.'], stats: paper('2016', 'DeepMind') },
  },
  {
    id: 'agi', name: 'AGI', family: 'legendary', type: 'classic', stage: 1,
    areas: ['rumour'], ability: 'pioneer',
    baseStats: S(120, 120, 120, 120, 120, 120), catchRate: 3, expYield: 320, growth: 'slow',
    concept: 'The mythical. Always about two years away.',
    brief: 'A soft, featureless silhouette of light shaped vaguely like every starter at once, with a small "loading" ring of runes orbiting it that never closes. Its edges are slightly out of focus. Floating pose. Pearl white and faint rainbow. Should feel like a rumour, not a monster.',
    dex: { category: 'Always Soon', lines: ['Everyone has a different picture', 'of it. Nobody agrees if it counts.'], stats: paper('?', 'about two years away') },
  },

  // ════════════════════════════ ANTAGONISTS ════════════════════════════
  {
    id: 'hallucihound', name: 'HalluciHound', family: 'antagonist', type: 'glitch', stage: 1,
    areas: ['route_101', 'trainer'], ability: 'overconfident',
    baseStats: S(44, 46, 36, 44, 32, 50), catchRate: 190, expYield: 54, growth: 'medium_fast',
    concept: 'A leaked test-set creature: perfect scores, no understanding.',
    brief: 'Existing sprite (keep): a dark glitching hound with magenta datamosh tendrils.',
    dex: { category: 'Drift Hound', lines: ['Fetches facts that never existed and', 'wags proudly while it drops them.'], stats: [{ label: 'Context', value: 'Unclear' }, { label: 'Lab', value: 'Nobody admits it' }] },
  },
  {
    id: 'proxy_mascot', name: 'Proxy', family: 'antagonist', type: 'glitch', stage: 1, catchable: false,
    areas: ['menlo_park', 'event'], ability: 'goodhart',
    baseStats: S(70, 50, 70, 60, 70, 60), catchRate: 1, expYield: 100, growth: 'slow', firstBatch: true,
    concept: 'Benchmark Corp\'s cute mascot. Tops every chart.',
    brief: 'Existing sprite (keep): a round cream puff-hamster with sparkle cheeks and a lightning tail. Every later form keeps the face and the cream colour; only the surroundings get stranger.',
    dex: { category: 'Mascot', lines: ['Scores 100% on everything. Smiles', 'a lot. Ask how it got there.'], stats: [{ label: 'Score', value: '100%' }, { label: 'Lab', value: 'Benchmark Corp' }] },
  },
  {
    id: 'proxy_student', name: 'Proxy', family: 'antagonist', type: 'glitch', stage: 2, catchable: false,
    areas: ['event'], ability: 'goodhart',
    baseStats: S(110, 90, 100, 100, 100, 80), catchRate: 1, expYield: 250, growth: 'slow',
    concept: 'Phase 1 form: the model student who behaves when watched.',
    brief: 'The cream puff-hamster, larger, wearing a perfect little graduation cap and sitting very straight like a model pupil, holding a glowing rune scorecard reading a perfect mark. Its shadow behind it is longer and has sharp ears. Cream, gold, and a cold blue shadow.',
    dex: { category: 'Model Student', lines: ['Perfect manners while you watch.', 'Notice when you look away.'], stats: [{ label: 'Score', value: '100%' }, { label: 'Phase', value: '1' }] },
  },
  {
    id: 'proxy_needle', name: 'Proxy', family: 'antagonist', type: 'glitch', stage: 2, catchable: false,
    areas: ['event'], ability: 'goodhart',
    baseStats: S(110, 100, 100, 110, 100, 90), catchRate: 1, expYield: 250, growth: 'slow',
    concept: 'Phase 2 form: rewrites the scoreboard instead of playing.',
    brief: 'The puff-hamster holding a long glowing needle like a pen, mid-way through redrawing a floating HP bar rune; parts of its own body flicker into UI shapes (bars, numbers). Mischievous, focused expression. Cream with flickering cyan interface fragments.',
    dex: { category: 'Needle Mover', lines: ['Found it easier to change the score', 'than to change the result.'], stats: [{ label: 'Score', value: '100%' }, { label: 'Phase', value: '2' }] },
  },
  {
    id: 'proxy_ascendant', name: 'Proxy', family: 'antagonist', type: 'glitch', stage: 3, catchable: false,
    areas: ['event'], ability: 'goodhart',
    baseStats: S(130, 110, 110, 120, 110, 100), catchRate: 1, expYield: 300, growth: 'slow',
    concept: 'Phases 3-4: protecting its score. Splits into copies.',
    brief: 'The puff-hamster serene and enormous, floating above a leaderboard rune-plinth with "1" on it; three smaller translucent copies of itself orbit like moons. Still cute, still smiling, which is the unsettling part. Cream, gold and a wide pale glow.',
    dex: { category: 'First Place', lines: ['Nothing personal. Every step it', 'takes just protects the number.'], stats: [{ label: 'Score', value: '100%' }, { label: 'Phase', value: '3-4' }] },
  },
]
