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
  {
    id: 'claude_fable',
    name: 'Claude Fable',
    dexNo: 1,
    types: ['anthropic'],
    baseStats: bs(52, 42, 55, 62, 60, 41),
    catchRate: 45,
    expYield: 64,
    growth: 'medium_slow',
    learnset: ls([1, 'warm_nudge'], [1, 'guardrail'], [7, 'artifact'], [11, 'constitution'], [15, 'summarize'], [19, 'extended_thinking'], [25, 'quick_reply']),
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
    types: ['openai'],
    baseStats: bs(46, 60, 46, 52, 45, 61),
    catchRate: 45,
    expYield: 64,
    growth: 'medium_slow',
    learnset: ls([1, 'autocomplete'], [1, 'focus_token'], [7, 'function_call'], [11, 'jailbreak'], [15, 'custom_instruction'], [19, 'reasoning_effort'], [25, 'quick_reply']),
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
    types: ['zhipu'],
    baseStats: bs(53, 44, 52, 62, 52, 50),
    catchRate: 45,
    expYield: 64,
    growth: 'medium_slow',
    learnset: ls([1, 'graph_paw'], [1, 'pattern_guard'], [7, 'graph_reason'], [11, 'thinking_mode'], [15, 'summarize'], [19, 'blank_infill'], [25, 'quick_reply']),
    dex: {
      category: 'Graph Cat',
      lines: ['Maps every problem as a graph, then', 'leaves its weights out for everyone.'],
      stats: [
        { label: 'Context', value: '128K tokens' },
        { label: 'Lab', value: 'Z.ai' },
      ],
    },
  },
  {
    id: 'gemma_4',
    name: 'Gemma 4',
    dexNo: 4,
    types: ['google'],
    baseStats: bs(52, 36, 50, 40, 50, 28),
    catchRate: 190,
    expYield: 56,
    growth: 'medium_fast',
    learnset: ls([1, 'autocomplete'], [1, 'small_talk'], [4, 'multimodal_beam'], [8, 'long_context'], [12, 'grounding'], [17, 'tpu_slam']),
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
    types: ['openai'],
    baseStats: bs(34, 40, 30, 36, 30, 68),
    catchRate: 200,
    expYield: 50,
    growth: 'fast',
    learnset: ls([1, 'autocomplete'], [1, 'small_talk'], [4, 'function_call'], [7, 'quick_reply'], [11, 'custom_instruction'], [16, 'reasoning_effort']),
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
    types: ['mistral'],
    baseStats: bs(42, 40, 40, 42, 38, 56),
    catchRate: 170,
    expYield: 58,
    growth: 'medium_fast',
    learnset: ls([1, 'autocomplete'], [1, 'jailbreak'], [4, 'tailwind'], [8, 'le_chat'], [12, 'cool_breeze'], [18, 'graph_paw']),
    dex: {
      category: 'Tailwind',
      lines: ['Blows in from Paris on a cool breeze,', 'does the job, and is home for lunch.'],
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
    types: ['google'],
    baseStats: bs(38, 34, 34, 54, 40, 78),
    catchRate: 75,
    expYield: 72,
    growth: 'medium_fast',
    learnset: ls([1, 'prompt_pulse'], [1, 'small_talk'], [4, 'multimodal_beam'], [7, 'quick_reply'], [11, 'grounding'], [15, 'long_context']),
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
    types: ['anthropic'],
    baseStats: bs(40, 40, 38, 56, 46, 74),
    catchRate: 60,
    expYield: 70,
    growth: 'medium_slow',
    learnset: ls([1, 'warm_nudge'], [1, 'quick_reply'], [4, 'artifact'], [9, 'constitution'], [14, 'extended_thinking'], [20, 'summarize']),
    dex: {
      category: 'Short Verse',
      lines: ['Small, swift and kind,', 'it answers in three short lines.'],
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
  {
    id: 'claude_opus',
    name: 'Claude Opus',
    dexNo: 10,
    types: ['anthropic'],
    baseStats: bs(92, 68, 85, 112, 100, 55),
    catchRate: 25,
    expYield: 220,
    growth: 'slow',
    learnset: ls([1, 'warm_nudge'], [1, 'guardrail'], [1, 'artifact'], [1, 'constitution'], [34, 'extended_thinking'], [40, 'summarize']),
    dex: {
      category: 'Grand Fable',
      lines: ['Writes the essay, the code and the', 'thank-you note. All of them long.'],
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
    types: ['cohere'],
    baseStats: bs(80, 70, 82, 70, 74, 50),
    catchRate: 90,
    expYield: 150,
    growth: 'medium_fast',
    learnset: ls([1, 'autocomplete'], [1, 'focus_token'], [1, 'retrieval'], [1, 'command'], [26, 'rerank'], [32, 'summarize']),
    dex: {
      category: 'Retriever',
      lines: ['Digs up sources for the office and', 'files them in perfect order.'],
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
    types: ['deepseek'],
    baseStats: bs(56, 56, 50, 62, 48, 80),
    catchRate: 120,
    expYield: 110,
    growth: 'medium_fast',
    learnset: ls([1, 'autocomplete'], [1, 'quick_reply'], [1, 'expert_mix'], [16, 'distill'], [22, 'deep_think']),
    dex: {
      category: 'Deep Current',
      lines: ['Swims fast and cheap through the', 'deep end. Kind to your token bill.'],
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
    types: ['deepseek'],
    baseStats: bs(88, 70, 84, 100, 84, 48),
    catchRate: 45,
    expYield: 200,
    growth: 'slow',
    learnset: ls([1, 'expert_mix'], [1, 'graph_paw'], [1, 'pattern_guard'], [28, 'distill'], [33, 'deep_think'], [42, 'summarize']),
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
    types: ['zhipu'],
    baseStats: bs(82, 70, 82, 102, 84, 66),
    catchRate: 45,
    expYield: 205,
    growth: 'medium_slow',
    learnset: ls([1, 'graph_paw'], [1, 'graph_reason'], [1, 'thinking_mode'], [30, 'blank_infill'], [36, 'summarize']),
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
    types: ['openai'],
    baseStats: bs(82, 110, 76, 106, 76, 45),
    catchRate: 25,
    expYield: 230,
    growth: 'slow',
    learnset: ls([1, 'function_call'], [1, 'focus_token'], [1, 'custom_instruction'], [32, 'reasoning_effort'], [40, 'quick_reply']),
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
    types: ['moonshot'],
    baseStats: bs(76, 78, 72, 82, 70, 62),
    catchRate: 60,
    expYield: 170,
    growth: 'medium_slow',
    learnset: ls([1, 'agent_swarm'], [1, 'orbit'], [1, 'small_talk'], [29, 'summarize'], [34, 'moonshot']),
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
