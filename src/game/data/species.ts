// Species data for the slice roster and a few later models.
// Base stats are on the genre's usual scale (BST ~250 for route mons, ~310 for
// starters, 450-520 for frontier models). Sprite keys follow the art contract:
// mons/<id>_front.png, mons/<id>_back.png, mons/<id>_icon.png.

import type { Stats } from '../types.ts'
import type { TypeId } from './typechart.ts'

export type GrowthRate = 'fast' | 'medium_fast' | 'medium_slow' | 'slow'

export interface LearnsetEntry {
  level: number
  move: string
}

export interface DexInfo {
  /** e.g. "Fable Fox" -> shown as "Fable Fox LLMMON". */
  category: string
  /** Exactly two short lines for the PromptDex page. */
  lines: [string, string]
  /** Height/weight-style flavour rows, e.g. { label: 'Context', value: '200K tokens' }. */
  stats: { label: string; value: string }[]
}

export interface SpeciesDef {
  id: string
  /** Display name (real model name). */
  name: string
  dexNo: number
  types: [TypeId] | [TypeId, TypeId]
  baseStats: Stats
  /** 1-255; higher is easier. */
  catchRate: number
  /** Base EXP yield used by the EXP formula. */
  expYield: number
  growth: GrowthRate
  /** Sorted by level. Level-1 entries are the moves a freshly created mon knows. */
  learnset: LearnsetEntry[]
  dex: DexInfo
}

function bs(hp: number, atk: number, def: number, spa: number, spd: number, spe: number): Stats {
  return { hp, atk, def, spa, spd, spe }
}

function ls(...pairs: [number, string][]): LearnsetEntry[] {
  return pairs.map(([level, move]) => ({ level, move }))
}

const SPECIES_LIST: SpeciesDef[] = [
  // ── starters ───────────────────────────────────────────────────────────
  {
    id: 'claude_fable',
    name: 'Claude Fable',
    dexNo: 1,
    types: ['myth'],
    baseStats: bs(52, 42, 55, 62, 60, 41),
    catchRate: 45,
    expYield: 64,
    growth: 'medium_slow',
    learnset: ls([1, 'warm_nudge'], [1, 'guardrail'], [7, 'tiny_myth'], [11, 'constitution'], [15, 'summarize'], [19, 'fable_flame'], [25, 'proof_step']),
    dex: {
      category: 'Fable Fox',
      lines: ['Thinks before it bites, then writes', 'you a sonnet about why it bit.'],
      stats: [
        { label: 'Context', value: '200K tokens' },
        { label: 'Lab', value: 'Anthropic' },
      ],
    },
  },
  {
    id: 'gpt_5_5',
    name: 'GPT 5.5',
    dexNo: 2,
    types: ['tool'],
    baseStats: bs(46, 60, 46, 52, 45, 61),
    catchRate: 45,
    expYield: 64,
    growth: 'medium_slow',
    learnset: ls([1, 'autocomplete'], [1, 'focus_token'], [7, 'tool_tap'], [11, 'jailbreak'], [15, 'quick_reply'], [19, 'function_call'], [25, 'web_search']),
    dex: {
      category: 'Omni Tool',
      lines: ['Reaches for a tool before you finish', 'asking. Usually the right one.'],
      stats: [
        { label: 'Context', value: '400K tokens' },
        { label: 'Lab', value: 'OpenAI' },
      ],
    },
  },
  {
    id: 'glm',
    name: 'GLM',
    dexNo: 3,
    types: ['logic'],
    baseStats: bs(50, 44, 50, 62, 50, 54),
    catchRate: 45,
    expYield: 64,
    growth: 'medium_slow',
    learnset: ls([1, 'graph_paw'], [1, 'pattern_guard'], [7, 'logic_spark'], [11, 'chain_of_thought'], [15, 'summarize'], [19, 'proof_step'], [25, 'fork_strike']),
    dex: {
      category: 'Graph Cat',
      lines: ['Maps every problem as a graph and', 'quietly ships open weights at night.'],
      stats: [
        { label: 'Context', value: '128K tokens' },
        { label: 'Lab', value: 'Z.ai' },
      ],
    },
  },

  // ── route 101 + story ─────────────────────────────────────────────────
  {
    id: 'gemma_4',
    name: 'Gemma 4',
    dexNo: 4,
    types: ['open'],
    baseStats: bs(50, 42, 48, 36, 46, 30),
    catchRate: 190,
    expYield: 56,
    growth: 'medium_fast',
    learnset: ls([1, 'autocomplete'], [1, 'small_talk'], [5, 'fork_strike'], [8, 'community_patch'], [12, 'pixel_beam'], [17, 'weight_drop']),
    dex: {
      category: 'Garden Bud',
      lines: ['Small enough to run on a laptop,', 'stubborn enough to bloom anywhere.'],
      stats: [
        { label: 'Context', value: '128K tokens' },
        { label: 'Lab', value: 'Google DeepMind' },
      ],
    },
  },
  {
    id: 'gpt_5_4_mini',
    name: 'GPT-5.4 mini',
    dexNo: 5,
    types: ['speed', 'tool'],
    baseStats: bs(34, 42, 30, 38, 30, 68),
    catchRate: 200,
    expYield: 50,
    growth: 'fast',
    learnset: ls([1, 'autocomplete'], [1, 'small_talk'], [5, 'low_latency'], [8, 'tool_tap'], [11, 'overclock'], [15, 'burst_decode'], [20, 'function_call']),
    dex: {
      category: 'Pocket Tool',
      lines: ['Answers in a blink and bills you', 'pennies. Travels in big swarms.'],
      stats: [
        { label: 'Context', value: '400K tokens' },
        { label: 'Lab', value: 'OpenAI' },
      ],
    },
  },
  {
    id: 'mistral_medium',
    name: 'Mistral Medium',
    dexNo: 6,
    types: ['speed', 'open'],
    baseStats: bs(42, 46, 38, 40, 36, 58),
    catchRate: 170,
    expYield: 58,
    growth: 'medium_fast',
    learnset: ls([1, 'autocomplete'], [1, 'jailbreak'], [5, 'low_latency'], [8, 'fork_strike'], [12, 'burst_decode'], [16, 'overclock'], [20, 'weight_drop']),
    dex: {
      category: 'Tailwind',
      lines: ['Rides a cool wind in from Paris.', 'Efficient, breezy, a little smug.'],
      stats: [
        { label: 'Context', value: '128K tokens' },
        { label: 'Lab', value: 'Mistral AI' },
      ],
    },
  },
  {
    id: 'gemini_flash',
    name: 'Gemini Flash',
    dexNo: 7,
    types: ['speed', 'vision'],
    baseStats: bs(38, 36, 34, 58, 40, 78),
    catchRate: 75,
    expYield: 72,
    growth: 'medium_fast',
    learnset: ls([1, 'prompt_pulse'], [1, 'small_talk'], [5, 'low_latency'], [7, 'pixel_beam'], [10, 'overclock'], [13, 'flash_frame'], [17, 'burst_decode'], [22, 'web_search']),
    dex: {
      category: 'Twin Spark',
      lines: ['Reads a whole library in one glance', 'and still beats you to the door.'],
      stats: [
        { label: 'Context', value: '1M tokens' },
        { label: 'Lab', value: 'Google DeepMind' },
      ],
    },
  },
  {
    id: 'claude_haiku',
    name: 'Claude Haiku',
    dexNo: 8,
    types: ['myth', 'speed'],
    baseStats: bs(42, 40, 40, 56, 48, 72),
    catchRate: 60,
    expYield: 70,
    growth: 'medium_slow',
    learnset: ls([1, 'warm_nudge'], [1, 'quick_reply'], [6, 'tiny_myth'], [10, 'overclock'], [14, 'burst_decode'], [18, 'fable_flame'], [23, 'summarize']),
    dex: {
      category: 'Short Verse',
      lines: ['Quick little fox, it', 'answers in seventeen beats.'],
      stats: [
        { label: 'Context', value: '200K tokens' },
        { label: 'Lab', value: 'Anthropic' },
      ],
    },
  },
  {
    id: 'hallucihound',
    name: 'HalluciHound',
    dexNo: 9,
    types: ['glitch'],
    baseStats: bs(44, 46, 36, 44, 32, 50),
    catchRate: 190,
    expYield: 54,
    growth: 'medium_fast',
    learnset: ls([1, 'glitch_bite'], [1, 'static_howl'], [5, 'confabulate'], [9, 'fake_citation'], [13, 'prompt_injection'], [18, 'token_flood']),
    dex: {
      category: 'Drift Hound',
      lines: ['Fetches facts that never existed and', 'wags proudly while it drops them.'],
      stats: [
        { label: 'Context', value: 'Unclear' },
        { label: 'Lab', value: 'Nobody admits it' },
      ],
    },
  },

  // ── later in the game ─────────────────────────────────────────────────
  {
    id: 'claude_opus',
    name: 'Claude Opus',
    dexNo: 10,
    types: ['myth', 'logic'],
    baseStats: bs(92, 68, 85, 112, 100, 55),
    catchRate: 25,
    expYield: 220,
    growth: 'slow',
    learnset: ls([1, 'warm_nudge'], [1, 'guardrail'], [1, 'tiny_myth'], [1, 'logic_spark'], [30, 'constitution'], [34, 'fable_flame'], [38, 'proof_step'], [44, 'summarize']),
    dex: {
      category: 'Grand Fable',
      lines: ['Writes the essay, the code and the', 'apology note. All of them long.'],
      stats: [
        { label: 'Context', value: '200K tokens' },
        { label: 'Lab', value: 'Anthropic' },
      ],
    },
  },
  {
    id: 'command_a',
    name: 'Command A',
    dexNo: 11,
    types: ['tool'],
    baseStats: bs(75, 78, 76, 70, 66, 58),
    catchRate: 90,
    expYield: 150,
    growth: 'medium_fast',
    learnset: ls([1, 'autocomplete'], [1, 'focus_token'], [1, 'tool_tap'], [20, 'web_search'], [26, 'jailbreak'], [31, 'function_call']),
    dex: {
      category: 'Retriever',
      lines: ['Digs up sources for the enterprise', 'and files them in perfect order.'],
      stats: [
        { label: 'Context', value: '256K tokens' },
        { label: 'Lab', value: 'Cohere' },
      ],
    },
  },
  {
    id: 'deepseek_flash',
    name: 'DeepSeek Flash',
    dexNo: 12,
    types: ['open', 'speed'],
    baseStats: bs(55, 56, 46, 64, 46, 84),
    catchRate: 120,
    expYield: 110,
    growth: 'medium_fast',
    learnset: ls([1, 'autocomplete'], [1, 'low_latency'], [1, 'fork_strike'], [16, 'overclock'], [20, 'burst_decode'], [26, 'weight_drop']),
    dex: {
      category: 'Deep Current',
      lines: ['Swims fast and cheap through the', 'deep end. Startles the big labs.'],
      stats: [
        { label: 'Context', value: '128K tokens' },
        { label: 'Lab', value: 'DeepSeek' },
      ],
    },
  },
  {
    id: 'deepseek_pro',
    name: 'DeepSeek Pro',
    dexNo: 13,
    types: ['open', 'logic'],
    baseStats: bs(86, 70, 80, 100, 82, 54),
    catchRate: 45,
    expYield: 200,
    growth: 'slow',
    learnset: ls([1, 'fork_strike'], [1, 'logic_spark'], [1, 'pattern_guard'], [28, 'chain_of_thought'], [33, 'proof_step'], [38, 'weight_drop'], [42, 'summarize']),
    dex: {
      category: 'Deep Reason',
      lines: ['Thinks out loud for pages, then', 'lands the answer. Shares its notes.'],
      stats: [
        { label: 'Context', value: '128K tokens' },
        { label: 'Lab', value: 'DeepSeek' },
      ],
    },
  },
  {
    id: 'glm_max',
    name: 'GLM Max',
    dexNo: 14,
    types: ['logic', 'open'],
    baseStats: bs(80, 70, 80, 102, 84, 70),
    catchRate: 45,
    expYield: 205,
    growth: 'medium_slow',
    learnset: ls([1, 'graph_paw'], [1, 'logic_spark'], [1, 'chain_of_thought'], [30, 'proof_step'], [35, 'fork_strike'], [40, 'summarize']),
    dex: {
      category: 'Graph Kirin',
      lines: ['Its constellation markings are a', 'full knowledge graph. It is proud.'],
      stats: [
        { label: 'Context', value: '200K tokens' },
        { label: 'Lab', value: 'Z.ai' },
      ],
    },
  },
  {
    id: 'gpt_5_5_xhigh',
    name: 'GPT 5.5 xhigh',
    dexNo: 15,
    types: ['tool', 'logic'],
    baseStats: bs(82, 108, 76, 108, 76, 45),
    catchRate: 25,
    expYield: 230,
    growth: 'slow',
    learnset: ls([1, 'tool_tap'], [1, 'logic_spark'], [1, 'focus_token'], [32, 'function_call'], [36, 'chain_of_thought'], [40, 'proof_step'], [45, 'web_search']),
    dex: {
      category: 'Deep Think',
      lines: ['Thinks so hard you can hear the fans.', 'Slow to start, scary once it does.'],
      stats: [
        { label: 'Context', value: '400K tokens' },
        { label: 'Lab', value: 'OpenAI' },
      ],
    },
  },
  {
    id: 'kimi',
    name: 'Kimi',
    dexNo: 16,
    types: ['open', 'tool'],
    baseStats: bs(76, 76, 70, 84, 70, 64),
    catchRate: 60,
    expYield: 170,
    growth: 'medium_slow',
    learnset: ls([1, 'fork_strike'], [1, 'tool_tap'], [1, 'small_talk'], [24, 'web_search'], [29, 'community_patch'], [34, 'function_call'], [39, 'weight_drop']),
    dex: {
      category: 'Moonshot',
      lines: ['Chains hundreds of tool calls without', 'losing the plot. Aims for the moon.'],
      stats: [
        { label: 'Context', value: '256K tokens' },
        { label: 'Lab', value: 'Moonshot AI' },
      ],
    },
  },
]

export const SPECIES: Record<string, SpeciesDef> = Object.fromEntries(SPECIES_LIST.map((s) => [s.id, s]))

/** Species ids in PromptDex order. */
export const SPECIES_IDS: string[] = SPECIES_LIST.map((s) => s.id)

export const STARTER_IDS = ['claude_fable', 'gpt_5_5', 'glm'] as const
