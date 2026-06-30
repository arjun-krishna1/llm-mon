import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

type LlmType =
  | 'OpenAI'
  | 'Anthropic'
  | 'Deepseek'
  | 'Cohere'
  | 'Mistral'
  | 'Gemini'
  | 'Moonshot'
  | 'Zai'
  | 'Normal'

type Availability = 'closed API' | 'open weights' | 'open source'
type Rarity = 'starter' | 'common' | 'uncommon' | 'rare' | 'legendary'
type Screen = 'title' | 'intro' | 'starter' | 'map' | 'battle' | 'llmdex'
type BattleKind = 'wild' | 'trainer'
type BattleResult = 'won' | 'lost'
type BattleEffectPhase = 'exchange' | 'guard'
type TerrainCode = 'R' | '.' | 'G' | 'L' | 'S' | 'T' | 'W' | 'D' | 'C' | 'B' | 'M' | 'F' | 'I' | 'H'
type Facing = 'north' | 'south' | 'east' | 'west'
type MapId = 'route01' | 'gatehouse'
type RouteFlag = 'Starter chosen' | 'First benchmark logged' | 'Mira defeated' | 'Boardwalk reached' | 'Gym gate scouted' | 'Gatehouse entered' | 'Latency Patch found' | 'Tuner tip heard' | 'Gate attendant met' | 'Champion log read' | 'Lab lawn mapped' | 'Scout lane mapped' | 'Gate ridge mapped' | 'Terminal row mapped'
type FieldItemId = 'latencyPatch'
type MapNpcId = 'routeTuner' | 'gateAttendant' | 'miraPostBattle'
type OverworldEffectKind = 'grass' | 'bump' | 'pickup' | 'talk' | 'hop' | 'heal'
type DialogueAfter = 'miraBattle'
type InputCue = Facing | 'action' | 'menu'
type LandmarkTone = 'route' | 'lab' | 'danger' | 'gatehouse'
type BattleTerrain = 'grass' | 'boardwalk' | 'gatehouse' | 'trainer' | 'route'
type RouteDecoration = 'grass-tuft' | 'path-flower' | 'path-stone' | 'shore-reed' | 'lab-light' | 'terminal-cable'
type AmbientDetail = 'grass-rustle' | 'path-leaf' | 'water-glint' | 'shore-bubble' | 'canopy-drift' | 'terminal-beacon' | 'gate-spark' | 'floor-scan'
type ObjectiveTargetKind = 'grass' | 'trainer' | 'cache' | 'gate' | 'attendant' | 'terminal' | 'exit'

interface Citation {
  label: string
  url: string
  detail: string
}

interface ModelStats {
  intelligence: number
  blendedCost: number
  latency: number
  outputSpeed: number
  context: string
}

interface LlmMon {
  id: string
  name: string
  lab: string
  type: LlmType
  availability: Availability
  rarity: Rarity
  stats: ModelStats
  abilities: string[]
  lore: string
  sprite: string
  citations: Citation[]
}

interface Move {
  id: string
  name: string
  type: LlmType | 'Normal'
  power: number
  effect: string
}

interface Position {
  x: number
  y: number
}

interface BattleEffect {
  phase: BattleEffectPhase
  nonce: number
  playerDamage?: number
  enemyDamage?: number
}

interface EncounterIntro {
  kind: BattleKind
  opponentName: string
  trainerName?: string
  nonce: number
}

interface GrassEncounterCue {
  opponentName: string
  position: Position
  nonce: number
}

interface TrainerNotice {
  speaker: string
  title: string
  detail: string
  nonce: number
}

interface BattleState {
  opponent: LlmMon
  kind: BattleKind
  trainerName?: string
  terrain: BattleTerrain
  locationLabel: string
  playerHp: number
  enemyHp: number
  guard: number
  turn: number
  log: string[]
  result?: BattleResult
}

interface OverworldEffect {
  kind: OverworldEffectKind
  position: Position
  nonce: number
}

interface RouteFootstep {
  id: number
  mapId: MapId
  position: Position
  terrain: TerrainCode
  facing: Facing
}

interface RouteClearance {
  title: string
  detail: string
  nonce: number
}

interface LabRecovery {
  title: string
  detail: string
  hpBefore: number
  hpAfter: number
  nonce: number
}

interface MapTransition {
  title: string
  detail: string
  nonce: number
}

interface LandmarkToast {
  eyebrow: string
  title: string
  detail: string
  tone: LandmarkTone
  nonce: number
}

interface ChampionLog {
  title: string
  detail: string
  teamIds: string[]
  nonce: number
}

interface SaveCeremony {
  title: string
  detail: string
  tone: 'saved' | 'loaded' | 'starter' | 'error'
  nonce: number
}

interface BattleReturn {
  eyebrow: string
  title: string
  detail: string
  tone: 'victory' | 'clearance' | 'retreat' | 'lab'
  nonce: number
}

interface QuestStep {
  label: string
  complete: boolean
  current?: boolean
}

interface FieldCue {
  label: string
  detail: string
}

interface StoryBeat {
  chapter: string
  title: string
  detail: string
  tone: LandmarkTone
}

interface FrontTargetPrompt {
  label: string
  kind: 'talk' | 'read' | 'open' | 'enter' | 'inspect'
}

interface ObjectiveTarget {
  label: string
  detail: string
  mapId: MapId
  position: Position
  kind: ObjectiveTargetKind
}

interface StarterLabProfile {
  role: string
  routeRead: string
  firstPlan: string
  professorNote: string
}

interface FieldItem {
  id: FieldItemId
  name: string
  detail: string
  flag: RouteFlag
}

interface MapNpc {
  id: MapNpcId
  name: string
  mapId: MapId
  position: Position
  patrol?: Position[]
  facing: Facing
  sprite: 'trainer' | 'player'
  flag: RouteFlag
  lines: string[]
}

interface DialogueState {
  speaker: string
  lines: string[]
  index: number
  after?: DialogueAfter
}

interface WorldMap {
  id: MapId
  eyebrow: string
  title: string
  subtitle: string
  introLine: string
  tiles: TerrainCode[][]
  hasWildEncounters: boolean
}

interface LandmarkArea {
  id: string
  mapId: MapId
  bounds: { x1: number; y1: number; x2: number; y2: number }
  marker: Position
  flag?: RouteFlag
  eyebrow: string
  title: string
  detail: string
  tone: LandmarkTone
  routeMessage: string
}

interface BattleOrigin {
  mapId: MapId
  terrainCode: TerrainCode
  position: Position
}

interface SaveState {
  starterId: string
  currentMapId: MapId
  position: Position
  facing: Facing
  discoveredIds: string[]
  routeFlags: RouteFlag[]
  collectedItemIds: FieldItemId[]
  usedItemIds: FieldItemId[]
  partnerHp: number
  trainerDefeated: boolean
  routeMessage: string
  savedAt: string
}

function appendRouteFlag(flags: RouteFlag[], flag: RouteFlag): RouteFlag[] {
  return flags.includes(flag) ? flags : [...flags, flag]
}

function appendDiscovered(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids : [...ids, id]
}

const SAVE_KEY = 'llmmon-save-v1'
const LATENCY_PATCH_HEAL = 42
const ENCOUNTER_TRANSITION_MS = 820
const GRASS_ENCOUNTER_CUE_MS = 540
const TRAINER_NOTICE_MS = 1450
const PLAYER_STEP_ANIMATION_MS = 900
const PLAYER_BUMP_ANIMATION_MS = 180
const INPUT_CUE_MS = 700
const KEY_REPEAT_MOVE_MS = 190
const AMBIENT_TICK_MS = 1700
const MAP_TRANSITION_MS = 1050
const BATTLE_EFFECT_MS = 1200

const AA_LEADERBOARD: Citation = {
  label: 'Artificial Analysis LLM Leaderboard',
  url: 'https://artificialanalysis.ai/leaderboards/models',
  detail: 'Leaderboard fields: Intelligence Index, blended price, output speed, TTFT latency, context window.',
}

const AA_GLM_ARTICLE: Citation = {
  label: 'Artificial Analysis GLM-5.2 article',
  url: 'https://artificialanalysis.ai/articles/glm-5-2-is-the-new-leading-open-weights-model-on-the-artificial-analysis-intelligence-index',
  detail: 'GLM-5.2 leads open-weight models with Intelligence Index 51, MIT license, 744B total / 40B active parameters, and 1M context.',
}

const AA_GPT: Citation = {
  label: 'Artificial Analysis GPT-5.5 model page',
  url: 'https://artificialanalysis.ai/models/gpt-5-5',
  detail: 'GPT-5.5 (xhigh): Intelligence 55, 58.3 tokens/s, $5 input and $30 output per 1M tokens, 922k context.',
}

const AA_DEEPSEEK: Citation = {
  label: 'Artificial Analysis DeepSeek V4 Pro page',
  url: 'https://artificialanalysis.ai/models/deepseek-v4-pro',
  detail: 'DeepSeek V4 Pro (Max): Intelligence 44, 88.5 tokens/s, $0.435 input and $0.87 output per 1M tokens, 1M context.',
}

const AA_KIMI: Citation = {
  label: 'Artificial Analysis Kimi K2.6 page',
  url: 'https://artificialanalysis.ai/models/kimi-k2-6/',
  detail: 'Kimi K2.6: Intelligence 43, 43.7 tokens/s, $0.95 input and $4 output per 1M tokens, 256k context.',
}

const AA_MISTRAL: Citation = {
  label: 'Artificial Analysis Mistral Medium 3.5 provider page',
  url: 'https://artificialanalysis.ai/models/mistral-medium-3-5/providers',
  detail: 'Mistral Medium 3.5 provider stats: 151.5 tokens/s, 1.71s lowest TTFT, $2.10 blended price.',
}

const AA_COHERE: Citation = {
  label: 'Artificial Analysis Command A+ article',
  url: 'https://artificialanalysis.ai/articles/cohere-launches-open-weights-model-command-a-more-than-a-year-since-the-command-a-release',
  detail: 'Command A+ achieves Intelligence Index 37 in release coverage; provider page ranks it among lowest-latency models.',
}

const AA_GEMINI: Citation = {
  label: 'Artificial Analysis Gemini 3.5 Flash provider page',
  url: 'https://artificialanalysis.ai/models/gemini-3-5-flash-medium/providers',
  detail: 'Gemini 3.5 Flash (medium): 159.2 tokens/s, 17.39s TTFT, $1.31 blended price, 1M context.',
}

const MODELS: LlmMon[] = [
  {
    id: 'gpt-54-mini-medium',
    name: 'GPT-5.4 mini (medium)',
    lab: 'OpenAI',
    type: 'OpenAI',
    availability: 'closed API',
    rarity: 'starter',
    stats: { intelligence: 30, blendedCost: 0.65, latency: 5.88, outputSpeed: 184, context: '400k' },
    abilities: ['Speculative Beam', 'Tool Call Quickstep'],
    lore: 'A nimble starter that wins by speed and low-cost bursts rather than raw frontier power.',
    sprite: 'orb',
    citations: [AA_LEADERBOARD],
  },
  {
    id: 'claude-45-haiku',
    name: 'Claude 4.5 Haiku',
    lab: 'Anthropic',
    type: 'Anthropic',
    availability: 'closed API',
    rarity: 'starter',
    stats: { intelligence: 30, blendedCost: 0.77, latency: 17.4, outputSpeed: 92, context: '200k' },
    abilities: ['Constitution Guard', 'Careful Reason'],
    lore: 'A steady starter that mitigates incoming prompts and keeps long battles under control.',
    sprite: 'cat',
    citations: [AA_LEADERBOARD],
  },
  {
    id: 'glm-52-max',
    name: 'GLM-5.2 (max)',
    lab: 'Z AI',
    type: 'Zai',
    availability: 'open weights',
    rarity: 'starter',
    stats: { intelligence: 51, blendedCost: 0.9, latency: 1.41, outputSpeed: 83, context: '1M' },
    abilities: ['Million-Token Memory', 'Open-Weight Surge'],
    lore: 'The overachieving open-weight starter: powerful, broad-context, and priced like a serious expedition partner.',
    sprite: 'hydra',
    citations: [AA_LEADERBOARD, AA_GLM_ARTICLE],
  },
  {
    id: 'deepseek-v4-pro-max',
    name: 'DeepSeek V4 Pro (Max)',
    lab: 'DeepSeek',
    type: 'Deepseek',
    availability: 'open weights',
    rarity: 'uncommon',
    stats: { intelligence: 44, blendedCost: 0.18, latency: 1.67, outputSpeed: 99, context: '1M' },
    abilities: ['Reasoning Dive', 'Budget Strike'],
    lore: 'A route ace with excellent cost pressure and enough reasoning depth to punish careless trainers.',
    sprite: 'fish',
    citations: [AA_LEADERBOARD, AA_DEEPSEEK],
  },
  {
    id: 'deepseek-v4-flash-max',
    name: 'DeepSeek V4 Flash (Max)',
    lab: 'DeepSeek',
    type: 'Deepseek',
    availability: 'open weights',
    rarity: 'common',
    stats: { intelligence: 40, blendedCost: 0.06, latency: 1.5, outputSpeed: 110, context: '1M' },
    abilities: ['Cheap Sweep', 'Fast Decode'],
    lore: 'Common in tall grass because every trainer wants one on the bench for cost-efficient sweeps.',
    sprite: 'fish',
    citations: [AA_LEADERBOARD],
  },
  {
    id: 'kimi-k26',
    name: 'Kimi K2.6',
    lab: 'Moonshot AI',
    type: 'Moonshot',
    availability: 'open weights',
    rarity: 'uncommon',
    stats: { intelligence: 43, blendedCost: 0.7, latency: 2.67, outputSpeed: 72, context: '256k' },
    abilities: ['Longform Wings', 'Verbose Cocoon'],
    lore: 'A clever Moonshot-type that takes its time, then floods the field with careful multi-step answers.',
    sprite: 'moth',
    citations: [AA_LEADERBOARD, AA_KIMI],
  },
  {
    id: 'mistral-medium-35',
    name: 'Mistral Medium 3.5',
    lab: 'Mistral',
    type: 'Mistral',
    availability: 'closed API',
    rarity: 'common',
    stats: { intelligence: 30, blendedCost: 1.16, latency: 2.02, outputSpeed: 158, context: '256k' },
    abilities: ['Agentic Hop', 'JSON Kick'],
    lore: 'A swift route model with clean tool habits and surprisingly sharp route-trainer instincts.',
    sprite: 'hare',
    citations: [AA_LEADERBOARD, AA_MISTRAL],
  },
  {
    id: 'command-a-plus',
    name: 'Command A+',
    lab: 'Cohere',
    type: 'Cohere',
    availability: 'open weights',
    rarity: 'common',
    stats: { intelligence: 29, blendedCost: 0, latency: 0.4, outputSpeed: 199, context: '192k' },
    abilities: ['Native Citation', 'Retrieval Charge'],
    lore: 'A lightning-fast Cohere-type that tags every claim before sprinting away.',
    sprite: 'stag',
    citations: [AA_LEADERBOARD, AA_COHERE],
  },
  {
    id: 'gemini-35-flash',
    name: 'Gemini 3.5 Flash',
    lab: 'Google',
    type: 'Gemini',
    availability: 'closed API',
    rarity: 'rare',
    stats: { intelligence: 50, blendedCost: 1.31, latency: 21.18, outputSpeed: 158, context: '1M' },
    abilities: ['Multimodal Flare', 'Context Tide'],
    lore: 'Rare on this route: fast once it starts, but the first token likes a dramatic entrance.',
    sprite: 'ray',
    citations: [AA_LEADERBOARD, AA_GEMINI],
  },
  {
    id: 'gemma-4-31b',
    name: 'Gemma 4 31B',
    lab: 'Google',
    type: 'Normal',
    availability: 'open weights',
    rarity: 'common',
    stats: { intelligence: 29, blendedCost: 0, latency: 1.08, outputSpeed: 35, context: '256k' },
    abilities: ['Local Bloom', 'Tiny Cache'],
    lore: 'A friendly Normal-type found near labs and home clusters; not flashy, but easy to train.',
    sprite: 'sprout',
    citations: [AA_LEADERBOARD],
  },
  {
    id: 'gpt-55-xhigh',
    name: 'GPT-5.5 (xhigh)',
    lab: 'OpenAI',
    type: 'OpenAI',
    availability: 'closed API',
    rarity: 'legendary',
    stats: { intelligence: 55, blendedCost: 4.35, latency: 68.43, outputSpeed: 65, context: '922k' },
    abilities: ['Frontier Burst', 'Expensive Insight'],
    lore: 'A closed-source legendary: enormous strength, enormous bill, and a dramatic wait before it answers.',
    sprite: 'gryphon',
    citations: [AA_LEADERBOARD, AA_GPT],
  },
  {
    id: 'claude-opus-47-max',
    name: 'Claude Opus 4.7 (max)',
    lab: 'Anthropic',
    type: 'Anthropic',
    availability: 'closed API',
    rarity: 'legendary',
    stats: { intelligence: 54, blendedCost: 3.85, latency: 22.36, outputSpeed: 50, context: '1M' },
    abilities: ['Guardrail Shell', 'Deliberate Proof'],
    lore: 'A champion-tier Anthropic-type that wins by patience and principled defense.',
    sprite: 'tortoise',
    citations: [AA_LEADERBOARD],
  },
]

const STARTER_IDS = ['gpt-54-mini-medium', 'claude-45-haiku', 'glm-52-max']
const assetPath = (path: string) => `${import.meta.env.BASE_URL}${path}`

const TYPE_COLORS: Record<LlmType, string> = {
  OpenAI: '#2f9f7f',
  Anthropic: '#d27754',
  Deepseek: '#496ac8',
  Cohere: '#f3b23e',
  Mistral: '#f27f3d',
  Gemini: '#72a7ff',
  Moonshot: '#8664c6',
  Zai: '#41bfba',
  Normal: '#9ea78f',
}

const SPRITE_ASSETS: Record<string, string> = {
  'gpt-54-mini-medium': assetPath('assets/llmmon/sprites-ai/gpt-54-mini-medium.png'),
  'claude-45-haiku': assetPath('assets/llmmon/sprites-ai/claude-45-haiku.png'),
  'glm-52-max': assetPath('assets/llmmon/sprites-ai/glm-52-max.png'),
  'deepseek-v4-pro-max': assetPath('assets/llmmon/sprites-ai/deepseek-v4-pro-max.png'),
  'deepseek-v4-flash-max': assetPath('assets/llmmon/sprites-ai/deepseek-v4-flash-max.png'),
  'kimi-k26': assetPath('assets/llmmon/sprites-ai/kimi-k26.png'),
  'mistral-medium-35': assetPath('assets/llmmon/sprites-ai/mistral-medium-35.png'),
  'command-a-plus': assetPath('assets/llmmon/sprites-ai/command-a-plus.png'),
  'gemini-35-flash': assetPath('assets/llmmon/sprites-ai/gemini-35-flash.png'),
  'gemma-4-31b': assetPath('assets/llmmon/sprites-ai/gemma-4-31b.png'),
  'gpt-55-xhigh': assetPath('assets/llmmon/sprites-ai/gpt-55-xhigh.png'),
  'claude-opus-47-max': assetPath('assets/llmmon/sprites-ai/claude-opus-47-max.png'),
}

const MAP_ASSETS = {
  professor: assetPath('assets/llmmon/professor-karpathy.svg'),
  player: assetPath('assets/kenney/chars/robot_blue.png'),
  trainer: assetPath('assets/kenney/chars/trainer.png'),
  tile: (id: string) => assetPath(`assets/kenney/tiny-town/tiles/tile_${id}.png`),
}

type TitleNote = {
  frequency: number
  beat: number
  length: number
  volume?: number
  wave?: OscillatorType
}

type MusicMode = 'title' | 'route' | 'battle'
type SfxKind = 'select' | 'confirm' | 'step' | 'bump' | 'encounter' | 'hit'

const TITLE_AUDIO_BEAT = 0.18
const TITLE_AUDIO_LOOP_BEATS = 24
const TITLE_AUDIO_LOOP_MS = TITLE_AUDIO_BEAT * TITLE_AUDIO_LOOP_BEATS * 1000
const TITLE_MELODY: TitleNote[] = [
  { frequency: 392, beat: 0, length: 0.72, volume: 0.055 },
  { frequency: 523.25, beat: 2, length: 0.32, volume: 0.05 },
  { frequency: 587.33, beat: 3, length: 0.28, volume: 0.05 },
  { frequency: 659.25, beat: 4, length: 0.72, volume: 0.058 },
  { frequency: 587.33, beat: 6, length: 0.32, volume: 0.046 },
  { frequency: 523.25, beat: 7, length: 0.28, volume: 0.046 },
  { frequency: 440, beat: 8, length: 0.72, volume: 0.052 },
  { frequency: 523.25, beat: 10, length: 0.32, volume: 0.048 },
  { frequency: 659.25, beat: 11, length: 0.28, volume: 0.05 },
  { frequency: 783.99, beat: 12, length: 1.08, volume: 0.06 },
  { frequency: 659.25, beat: 16, length: 0.34, volume: 0.052 },
  { frequency: 698.46, beat: 17, length: 0.28, volume: 0.048 },
  { frequency: 783.99, beat: 18, length: 0.72, volume: 0.055 },
  { frequency: 1046.5, beat: 21, length: 0.54, volume: 0.046 },
]
const TITLE_BASS: TitleNote[] = [
  { frequency: 98, beat: 0, length: 1.08, volume: 0.04, wave: 'triangle' },
  { frequency: 130.81, beat: 6, length: 0.72, volume: 0.035, wave: 'triangle' },
  { frequency: 110, beat: 8, length: 1.08, volume: 0.04, wave: 'triangle' },
  { frequency: 146.83, beat: 14, length: 0.72, volume: 0.035, wave: 'triangle' },
  { frequency: 98, beat: 16, length: 1.2, volume: 0.038, wave: 'triangle' },
]
const ROUTE_MELODY: TitleNote[] = [
  { frequency: 329.63, beat: 0, length: 0.42, volume: 0.038, wave: 'triangle' },
  { frequency: 392, beat: 2, length: 0.34, volume: 0.036, wave: 'triangle' },
  { frequency: 440, beat: 4, length: 0.52, volume: 0.04, wave: 'triangle' },
  { frequency: 392, beat: 7, length: 0.3, volume: 0.034, wave: 'triangle' },
  { frequency: 493.88, beat: 8, length: 0.46, volume: 0.04, wave: 'triangle' },
  { frequency: 523.25, beat: 12, length: 0.62, volume: 0.042, wave: 'triangle' },
  { frequency: 440, beat: 16, length: 0.42, volume: 0.038, wave: 'triangle' },
  { frequency: 392, beat: 18, length: 0.36, volume: 0.036, wave: 'triangle' },
  { frequency: 329.63, beat: 20, length: 0.72, volume: 0.038, wave: 'triangle' },
]
const ROUTE_BASS: TitleNote[] = [
  { frequency: 82.41, beat: 0, length: 0.72, volume: 0.028, wave: 'sine' },
  { frequency: 98, beat: 4, length: 0.72, volume: 0.028, wave: 'sine' },
  { frequency: 110, beat: 8, length: 0.72, volume: 0.03, wave: 'sine' },
  { frequency: 98, beat: 12, length: 0.72, volume: 0.028, wave: 'sine' },
  { frequency: 82.41, beat: 16, length: 1.08, volume: 0.03, wave: 'sine' },
]
const BATTLE_MELODY: TitleNote[] = [
  { frequency: 261.63, beat: 0, length: 0.2, volume: 0.048 },
  { frequency: 392, beat: 1, length: 0.18, volume: 0.05 },
  { frequency: 523.25, beat: 2, length: 0.2, volume: 0.052 },
  { frequency: 587.33, beat: 3, length: 0.18, volume: 0.05 },
  { frequency: 659.25, beat: 4, length: 0.28, volume: 0.054 },
  { frequency: 523.25, beat: 6, length: 0.18, volume: 0.048 },
  { frequency: 783.99, beat: 8, length: 0.28, volume: 0.055 },
  { frequency: 698.46, beat: 10, length: 0.22, volume: 0.052 },
  { frequency: 587.33, beat: 12, length: 0.24, volume: 0.05 },
  { frequency: 783.99, beat: 15, length: 0.26, volume: 0.055 },
  { frequency: 880, beat: 18, length: 0.36, volume: 0.056 },
]
const BATTLE_BASS: TitleNote[] = [
  { frequency: 65.41, beat: 0, length: 0.3, volume: 0.04, wave: 'sawtooth' },
  { frequency: 65.41, beat: 2, length: 0.3, volume: 0.035, wave: 'sawtooth' },
  { frequency: 73.42, beat: 4, length: 0.32, volume: 0.04, wave: 'sawtooth' },
  { frequency: 82.41, beat: 8, length: 0.32, volume: 0.04, wave: 'sawtooth' },
  { frequency: 98, beat: 12, length: 0.3, volume: 0.036, wave: 'sawtooth' },
  { frequency: 73.42, beat: 16, length: 0.48, volume: 0.038, wave: 'sawtooth' },
]

const MUSIC_PATTERNS: Record<MusicMode, { melody: TitleNote[]; bass: TitleNote[] }> = {
  title: { melody: TITLE_MELODY, bass: TITLE_BASS },
  route: { melody: ROUTE_MELODY, bass: ROUTE_BASS },
  battle: { melody: BATTLE_MELODY, bass: BATTLE_BASS },
}

function createAudioContext(): AudioContext | null {
  const audioContextConstructor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  return audioContextConstructor ? new audioContextConstructor() : null
}

function scheduleTone(context: AudioContext, destination: AudioNode, note: TitleNote, loopStart: number) {
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  const startAt = loopStart + note.beat * TITLE_AUDIO_BEAT
  const endAt = startAt + note.length
  oscillator.type = note.wave ?? 'square'
  oscillator.frequency.setValueAtTime(note.frequency, startAt)
  gain.gain.setValueAtTime(0.0001, startAt)
  gain.gain.exponentialRampToValueAtTime(note.volume ?? 0.045, startAt + 0.018)
  gain.gain.exponentialRampToValueAtTime(0.0001, endAt)
  oscillator.connect(gain)
  gain.connect(destination)
  oscillator.start(startAt)
  oscillator.stop(endAt + 0.04)
}

function musicModeForScreen(screen: Screen): MusicMode {
  if (screen === 'battle') {
    return 'battle'
  }
  if (screen === 'title') {
    return 'title'
  }
  return 'route'
}

function scheduleMusic(context: AudioContext, destination: AudioNode, mode: MusicMode) {
  const loopStart = context.currentTime + 0.04
  const pattern = MUSIC_PATTERNS[mode]
  pattern.bass.forEach((note) => scheduleTone(context, destination, note, loopStart))
  pattern.melody.forEach((note) => scheduleTone(context, destination, note, loopStart))
}

function tileImageFor(code: TerrainCode, x: number, y: number): string {
  if (code === 'G') {
    return MAP_ASSETS.tile((x + y) % 4 === 0 ? '0001' : (x + y) % 5 === 0 ? '0002' : '0000')
  }
  if (code === '.') {
    return MAP_ASSETS.tile((x + y) % 2 === 0 ? '0013' : '0014')
  }
  if (code === 'L') {
    return MAP_ASSETS.tile(y % 2 === 0 ? '0053' : '0074')
  }
  if (code === 'R') {
    return MAP_ASSETS.tile((x + y) % 2 === 0 ? '0048' : '0062')
  }
  if (code === 'S') {
    return MAP_ASSETS.tile('0095')
  }
  if (code === 'T') {
    return MAP_ASSETS.tile('0014')
  }
  if (code === 'D') {
    return MAP_ASSETS.tile('0097')
  }
  if (code === 'C') {
    return MAP_ASSETS.tile((x + y) % 3 === 0 ? '0005' : (x + y) % 3 === 1 ? '0006' : '0004')
  }
  if (code === 'B') {
    return MAP_ASSETS.tile((x + y) % 2 === 0 ? '0081' : '0073')
  }
  if (code === 'M') {
    return MAP_ASSETS.tile((x + y) % 2 === 0 ? '0103' : '0115')
  }
  if (code === 'F') {
    return MAP_ASSETS.tile((x + y) % 2 === 0 ? '0096' : '0097')
  }
  if (code === 'I') {
    return MAP_ASSETS.tile('0013')
  }
  if (code === 'H') {
    return MAP_ASSETS.tile((x + y) % 2 === 0 ? '0048' : '0062')
  }
  return MAP_ASSETS.tile('0013')
}

function tileDepthClasses(map: WorldMap, position: Position, code: TerrainCode): string {
  const below = tileAt(map, { x: position.x, y: position.y + 1 })
  const classes: string[] = []
  if (code === 'C' && below !== 'C' && below !== 'R') {
    classes.push('tile-canopy-front')
  }
  if (code === 'R' && below !== 'R') {
    classes.push('tile-ridge-lip')
  }
  if (code === 'D' || code === 'M' || code === 'S') {
    classes.push('tile-standing-prop')
  }
  return classes.join(' ')
}

function tileElevationClasses(mapId: MapId, position: Position, code: TerrainCode): string {
  const band = Math.min(3, Math.floor(position.y / 4))
  const classes = [`depth-band-${band}`]
  if (code === 'R' || code === 'H') {
    classes.push('depth-raised', 'depth-ridge')
  }
  if (code === 'C') {
    classes.push('depth-raised', 'depth-canopy')
  }
  if (code === 'L' || code === 'D' || code === 'M' || code === 'S' || code === 'I') {
    classes.push('depth-prop')
  }
  if (code === 'B') {
    classes.push('depth-raised', 'depth-boardwalk')
  }
  if (code === 'W') {
    classes.push('depth-sunken', 'depth-water')
  }
  if (mapId === 'gatehouse' && code === 'F') {
    classes.push('depth-floor')
  }
  return classes.join(' ')
}

function tileNeighborClasses(map: WorldMap, position: Position, code: TerrainCode): string {
  const north = tileAt(map, { x: position.x, y: position.y - 1 })
  const south = tileAt(map, { x: position.x, y: position.y + 1 })
  const west = tileAt(map, { x: position.x - 1, y: position.y })
  const east = tileAt(map, { x: position.x + 1, y: position.y })
  const classes: string[] = []
  const addEdges = (prefix: string, test: (neighbor: TerrainCode) => boolean) => {
    if (test(north)) classes.push(`${prefix}-north`)
    if (test(south)) classes.push(`${prefix}-south`)
    if (test(west)) classes.push(`${prefix}-west`)
    if (test(east)) classes.push(`${prefix}-east`)
  }

  if (code === 'G') {
    addEdges('grass-edge', (neighbor) => neighbor !== 'G' && neighbor !== 'C')
  }
  if (code === '.') {
    addEdges('path-edge', (neighbor) => neighbor === 'G' || neighbor === 'C' || neighbor === 'W')
  }
  if (code === 'W') {
    addEdges('shore-edge', (neighbor) => neighbor !== 'W')
  }
  if (code === 'B') {
    addEdges('boardwalk-edge', (neighbor) => neighbor !== 'B' && neighbor !== 'W')
  }
  if (code === 'L') {
    addEdges('lab-edge', (neighbor) => neighbor !== 'L')
  }
  if (code === 'F') {
    addEdges('floor-edge', (neighbor) => neighbor !== 'F' && neighbor !== 'S' && neighbor !== 'D')
  }

  return classes.join(' ')
}

function tileDepthBoost(map: WorldMap, position: Position, code: TerrainCode): number {
  const below = tileAt(map, { x: position.x, y: position.y + 1 })
  if (code === 'C' && below !== 'C' && below !== 'R') {
    return 5
  }
  if (code === 'D' || code === 'M') {
    return 3
  }
  return 0
}

function routeDecorationFor(mapId: MapId, code: TerrainCode, x: number, y: number): RouteDecoration | null {
  const seed = (x * 37 + y * 19 + (mapId === 'gatehouse' ? 11 : 0)) % 97
  if (mapId === 'route01') {
    if (code === 'G' && seed % 7 === 0) {
      return 'grass-tuft'
    }
    if (code === '.' && seed % 43 === 0) {
      return 'path-flower'
    }
    if (code === '.' && seed % 23 === 0) {
      return 'path-stone'
    }
    if (code === 'W' && seed % 3 === 0) {
      return 'shore-reed'
    }
    if (code === 'L' && (x + y) % 2 === 0) {
      return 'lab-light'
    }
  }
  if (mapId === 'gatehouse' && code === 'F' && seed % 7 === 0) {
    return 'terminal-cable'
  }
  return null
}

function ambientDetailFor(mapId: MapId, code: TerrainCode, x: number, y: number, tick: number): AmbientDetail | null {
  const seed = (x * 23 + y * 29 + tick) % 19
  if (mapId === 'route01') {
    if (code === 'G' && seed % 5 === 0) {
      return 'grass-rustle'
    }
    if (code === '.' && seed === 3 && y > 3) {
      return 'path-leaf'
    }
    if (code === 'W' && seed % 4 === 0) {
      return 'water-glint'
    }
    if (code === 'B' && seed % 6 === 0) {
      return 'shore-bubble'
    }
    if (code === 'C' && seed % 7 === 0) {
      return 'canopy-drift'
    }
    if (code === 'D' && seed % 3 === 0) {
      return 'gate-spark'
    }
  }
  if (mapId === 'gatehouse') {
    if (code === 'M' && seed % 4 === 0) {
      return 'terminal-beacon'
    }
    if (code === 'F' && seed % 5 === 0) {
      return 'floor-scan'
    }
    if (code === 'D' && seed % 3 === 0) {
      return 'gate-spark'
    }
  }
  return null
}



const STARTER_MOVES: Move[] = [
  { id: 'prompt-strike', name: 'Prompt Strike', type: 'Normal', power: 18, effect: 'Reliable baseline damage.' },
  { id: 'typed-burst', name: 'Lab Signature', type: 'OpenAI', power: 25, effect: 'Becomes your starter type in battle.' },
  { id: 'context-guard', name: 'Context Guard', type: 'Normal', power: 0, effect: 'Halve the next incoming hit.' },
  { id: 'benchmark-surge', name: 'Benchmark Surge', type: 'Normal', power: 31, effect: 'High power, softened by latency and cost.' },
]

const ROUTE01_MAP: TerrainCode[][] = [
  Array.from('RRRRRRRRRRRRRRRRRR') as TerrainCode[],
  Array.from('RLL..GGGG..CCCCDDR') as TerrainCode[],
  Array.from('RLL..GGGG...CCC..R') as TerrainCode[],
  Array.from('R....GGGT....C...R') as TerrainCode[],
  Array.from('R.S..GGGG..BBB...R') as TerrainCode[],
  Array.from('R....G..G..BWW...R') as TerrainCode[],
  Array.from('R....G..G..BWW...R') as TerrainCode[],
  Array.from('R..GGGGGG..BBB...R') as TerrainCode[],
  Array.from('R....C...IGGG....R') as TerrainCode[],
  Array.from('R..CCCCC...G..S..R') as TerrainCode[],
  Array.from('R..C...C....HHGG.R') as TerrainCode[],
  Array.from('R....WWW....GGGG.R') as TerrainCode[],
  Array.from('R.............D..R') as TerrainCode[],
  Array.from('RRRRRRRRRRRRRRRRRR') as TerrainCode[],
]

const GATEHOUSE_MAP: TerrainCode[][] = [
  Array.from('RRRRRRRRRR') as TerrainCode[],
  Array.from('RMMMMMMMMR') as TerrainCode[],
  Array.from('RFFFFFFFFR') as TerrainCode[],
  Array.from('RFFFSFFFFR') as TerrainCode[],
  Array.from('RFFFFFFFFR') as TerrainCode[],
  Array.from('RFFFSFFFFR') as TerrainCode[],
  Array.from('RFFFFDFFFR') as TerrainCode[],
  Array.from('RRRRRRRRRR') as TerrainCode[],
]

const WORLD_MAPS: Record<MapId, WorldMap> = {
  route01: {
    id: 'route01',
    eyebrow: 'Route 01',
    title: 'Eval Grass',
    subtitle: 'Hayes Valley south coast',
    introLine: 'Benchmark grass, cachewater planks, and Mira\'s first scout lane.',
    tiles: ROUTE01_MAP,
    hasWildEncounters: true,
  },
  gatehouse: {
    id: 'gatehouse',
    eyebrow: 'Data Gym',
    title: 'Gatehouse',
    subtitle: 'future badge checkpoint',
    introLine: 'A sealed league foyer where terminals remember the road ahead.',
    tiles: GATEHOUSE_MAP,
    hasWildEncounters: false,
  },
}

const FIELD_ITEMS: Record<MapId, Record<string, FieldItem>> = {
  route01: {
    '9,8': {
      id: 'latencyPatch',
      name: 'Latency Patch',
      detail: 'A clipped league note explains how low TTFT can swing close battles.',
      flag: 'Latency Patch found',
    },
  },
  gatehouse: {},
}

const LANDMARK_AREAS: LandmarkArea[] = [
  {
    id: 'lab-lawn',
    mapId: 'route01',
    bounds: { x1: 1, y1: 1, x2: 5, y2: 4 },
    marker: { x: 2, y: 1 },
    flag: 'Lab lawn mapped',
    eyebrow: 'Route 01',
    title: 'Model Lab Lawn',
    detail: 'Professor Karpathy calibrated your starter beside the first grass patch.',
    tone: 'lab',
    routeMessage: 'Model Lab Lawn: starter partners train here before the benchmark grass opens north.',
  },
  {
    id: 'scout-lane',
    mapId: 'route01',
    bounds: { x1: 6, y1: 3, x2: 10, y2: 7 },
    marker: { x: 6, y: 3 },
    flag: 'Scout lane mapped',
    eyebrow: 'Trainer Lane',
    title: 'Mira Sightline',
    detail: 'A straight route lane lets the scout spot fresh benchmark logs.',
    tone: 'danger',
    routeMessage: 'Mira Sightline: trainer eyes are on this lane. A fresh wild benchmark will draw a challenge.',
  },
  {
    id: 'boardwalk',
    mapId: 'route01',
    bounds: { x1: 10, y1: 4, x2: 13, y2: 8 },
    marker: { x: 12, y: 4 },
    flag: 'Boardwalk reached',
    eyebrow: 'Route 01',
    title: 'Cachewater Boardwalk',
    detail: 'A raised path crosses cached-water shallows toward the Data Gym ridge.',
    tone: 'route',
    routeMessage: 'Cachewater Boardwalk: the planks creak above cached-water shallows and a route cache glints nearby.',
  },
  {
    id: 'gate-ridge',
    mapId: 'route01',
    bounds: { x1: 13, y1: 1, x2: 16, y2: 3 },
    marker: { x: 15, y: 2 },
    flag: 'Gate ridge mapped',
    eyebrow: 'Data Gym',
    title: 'Gate Ridge',
    detail: 'The locked badge road waits beyond Mira\'s scout clearance.',
    tone: 'gatehouse',
    routeMessage: 'Gate Ridge: the Data Gym reader waits for Mira clearance before opening the gatehouse.',
  },
  {
    id: 'terminal-row',
    mapId: 'gatehouse',
    bounds: { x1: 1, y1: 1, x2: 8, y2: 3 },
    marker: { x: 7, y: 2 },
    flag: 'Terminal row mapped',
    eyebrow: 'Data Gym',
    title: 'Champion Terminal Row',
    detail: 'League machines archive future badge hooks and the champion teaser.',
    tone: 'gatehouse',
    routeMessage: 'Champion Terminal Row: speak to Sol, then read the authorized terminal west of the attendant.',
  },
]

const MAP_NPCS: MapNpc[] = [
  {
    id: 'routeTuner',
    name: 'Route Tuner Nia',
    mapId: 'route01',
    position: { x: 11, y: 5 },
    patrol: [
      { x: 11, y: 4 },
      { x: 11, y: 5 },
      { x: 11, y: 6 },
      { x: 11, y: 7 },
      { x: 11, y: 6 },
      { x: 11, y: 5 },
    ],
    facing: 'west',
    sprite: 'trainer',
    flag: 'Tuner tip heard',
    lines: [
      'The boardwalk is where I tune prompts before a scout battle.',
      'Fast models feel amazing, but a cheap steady partner can carry a whole route.',
    ],
  },
  {
    id: 'gateAttendant',
    name: 'Gate Attendant Sol',
    mapId: 'gatehouse',
    position: { x: 5, y: 3 },
    facing: 'south',
    sprite: 'trainer',
    flag: 'Gate attendant met',
    lines: [
      'The Data Gym is sealed while the league compiles the next benchmark badge.',
      'Mira cleared you for the gatehouse. I authorized the champion terminal to your west.',
      'Read Andrej\'s log there, then save your route record before you leave the slice.',
    ],
  },
]

function landmarkAt(mapId: MapId, position: Position): LandmarkArea | undefined {
  return LANDMARK_AREAS.find((area) => (
    area.mapId === mapId
    && position.x >= area.bounds.x1
    && position.x <= area.bounds.x2
    && position.y >= area.bounds.y1
    && position.y <= area.bounds.y2
  ))
}

function landmarkMarkerAt(mapId: MapId, position: Position): LandmarkArea | undefined {
  return LANDMARK_AREAS.find((area) => area.mapId === mapId && samePosition(area.marker, position))
}

const MIRA_POSITION: Position = { x: 8, y: 3 }
const MIRA_POST_BATTLE_POSITION: Position = { x: 9, y: 3 }
const MIRA_SIGHT_RANGE = 4

const MIRA_POST_BATTLE_NPC: MapNpc = {
  id: 'miraPostBattle',
  name: 'Benchmark Scout Mira',
  mapId: 'route01',
  position: MIRA_POST_BATTLE_POSITION,
  facing: 'south',
  sprite: 'trainer',
  flag: 'Mira defeated',
  lines: [
    'That was a clean route clear. Your partner kept tempo even under scout pressure.',
    'The gate reader accepted my clearance ping. Head north and read the Data Gym terminal before you leave the slice.',
  ],
}

const TILE_LABELS: Record<TerrainCode, string> = {
  R: 'Ridge',
  '.': 'Path',
  G: 'Tall benchmark grass',
  L: 'Model Lab',
  S: 'Sign',
  T: 'Benchmark Scout',
  W: 'Lake',
  D: 'Closed gym gate',
  C: 'Cypress canopy',
  B: 'Boardwalk',
  M: 'League terminal',
  F: 'Gym floor',
  I: 'Cache capsule',
  H: 'One-way route ledge',
}

const WILD_TABLE = [
  { id: 'deepseek-v4-flash-max', weight: 24 },
  { id: 'gemma-4-31b', weight: 22 },
  { id: 'command-a-plus', weight: 18 },
  { id: 'mistral-medium-35', weight: 16 },
  { id: 'kimi-k26', weight: 9 },
  { id: 'deepseek-v4-pro-max', weight: 7 },
  { id: 'gemini-35-flash', weight: 2 },
  { id: 'gpt-55-xhigh', weight: 1 },
  { id: 'claude-opus-47-max', weight: 1 },
]

const CHAMPION_TEAM = ['gpt-55-xhigh', 'claude-opus-47-max']

function getModel(id: string): LlmMon {
  const model = MODELS.find((candidate) => candidate.id === id)
  if (!model) {
    throw new Error(`Unknown LLM-mon: ${id}`)
  }
  return model
}

function maxHp(model: LlmMon): number {
  return 76 + Math.round(model.stats.intelligence * 1.18) + (model.availability !== 'closed API' ? 8 : 0)
}

function statPercent(value: number, max: number): number {
  return Math.max(8, Math.min(100, Math.round((value / max) * 100)))
}

function costLabel(cost: number): string {
  return cost === 0 ? 'free / local' : `$${cost.toFixed(2)} blended / 1M`
}

function weightedEncounter(): LlmMon {
  const total = WILD_TABLE.reduce((sum, entry) => sum + entry.weight, 0)
  let roll = Math.random() * total
  for (const entry of WILD_TABLE) {
    roll -= entry.weight
    if (roll <= 0) {
      return getModel(entry.id)
    }
  }
  return getModel(WILD_TABLE[0].id)
}

function habitatForecast(): { model: LlmMon; chance: number }[] {
  const total = WILD_TABLE.reduce((sum, entry) => sum + entry.weight, 0)
  return WILD_TABLE
    .map((entry) => ({ model: getModel(entry.id), chance: Math.round((entry.weight / total) * 100) }))
    .slice(0, 5)
}

function describeSave(saveState: SaveState): string {
  const map = WORLD_MAPS[saveState.currentMapId]
  const starterName = getModel(saveState.starterId).name
  const progress = saveState.routeFlags.includes('Champion log read')
    ? 'Slice complete'
    : saveState.routeFlags.includes('Gatehouse entered')
      ? 'Gatehouse checkpoint'
      : saveState.trainerDefeated
        ? 'Scout cleared'
        : saveState.discoveredIds.length > 1
          ? 'Mira ready'
          : 'Route started'
  const savedTime = new Date(saveState.savedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  return `${map.title} · ${progress} · ${starterName} · ${savedTime}`
}

function saveProgressPercent(saveState: SaveState): number {
  const checks = [
    saveState.routeFlags.includes('Starter chosen'),
    saveState.discoveredIds.length > 1 || saveState.routeFlags.includes('First benchmark logged'),
    saveState.trainerDefeated || saveState.routeFlags.includes('Mira defeated'),
    saveState.collectedItemIds.includes('latencyPatch'),
    saveState.routeFlags.includes('Gatehouse entered'),
    saveState.routeFlags.includes('Champion log read'),
  ]
  return Math.round((checks.filter(Boolean).length / checks.length) * 100)
}

function readInitialSaveMeta(): { hasSave: boolean; summary: string; progress: number } {
  const rawSave = window.localStorage.getItem(SAVE_KEY)
  if (!rawSave) {
    return { hasSave: false, summary: '', progress: 0 }
  }
  try {
    const parsed = JSON.parse(rawSave) as SaveState
    return { hasSave: true, summary: describeSave(parsed), progress: saveProgressPercent(parsed) }
  } catch {
    return { hasSave: true, summary: 'Save data ready', progress: 0 }
  }
}

function tileAt(map: WorldMap, position: Position): TerrainCode {
  return map.tiles[position.y]?.[position.x] ?? 'R'
}

function positionKey(position: Position): string {
  return `${position.x},${position.y}`
}

function fieldItemAt(mapId: MapId, position: Position): FieldItem | undefined {
  return FIELD_ITEMS[mapId][positionKey(position)]
}

function samePosition(a: Position, b: Position): boolean {
  return a.x === b.x && a.y === b.y
}

function facingFromDelta(from: Position, to: Position, fallback: Facing): Facing {
  if (to.x > from.x) {
    return 'east'
  }
  if (to.x < from.x) {
    return 'west'
  }
  if (to.y > from.y) {
    return 'south'
  }
  if (to.y < from.y) {
    return 'north'
  }
  return fallback
}

function npcPositionAt(npc: MapNpc, tick: number): Position {
  if (!npc.patrol?.length) {
    return npc.position
  }
  return npc.patrol[tick % npc.patrol.length]
}

function npcWalkDirection(npc: MapNpc, tick: number): Facing | null {
  if (!npc.patrol?.length) {
    return null
  }
  const current = npcPositionAt(npc, tick)
  const previous = npc.patrol[(tick - 1 + npc.patrol.length) % npc.patrol.length]
  return facingFromDelta(previous, current, npc.facing)
}

function mapNpcAt(mapId: MapId, position: Position, tick: number): MapNpc | undefined {
  const npc = MAP_NPCS.find((candidate) => candidate.mapId === mapId && samePosition(npcPositionAt(candidate, tick), position))
  return npc ? { ...npc, position: npcPositionAt(npc, tick) } : undefined
}

function routeNpcAt(mapId: MapId, position: Position, trainerDefeated: boolean, tick: number): MapNpc | undefined {
  const npc = mapNpcAt(mapId, position, tick)
  if (npc) {
    return npc
  }
  if (
    trainerDefeated
    && mapId === MIRA_POST_BATTLE_NPC.mapId
    && samePosition(position, MIRA_POST_BATTLE_NPC.position)
  ) {
    return MIRA_POST_BATTLE_NPC
  }
  return undefined
}

function dialogueLinesForNpc(
  npc: MapNpc,
  discoveredCount: number,
  trainerDefeated: boolean,
  collectedItemIds: FieldItemId[],
  routeFlags: RouteFlag[],
): string[] {
  if (npc.id === 'routeTuner') {
    if (routeFlags.includes('Champion log read')) {
      return [
        'You read the champion terminal? Nice. That means the route record is clean enough to save.',
        'Next badge slice will need more than raw intelligence. Keep tracking cost, latency, and tempo.',
      ]
    }
    if (trainerDefeated && collectedItemIds.includes('latencyPatch')) {
      return [
        'Mira cleared you and you found the Latency Patch. That is proper route prep.',
        'The Data Gym reader is north. Do not waste the heal unless your partner is actually hurt.',
      ]
    }
    if (trainerDefeated) {
      return [
        'That scout battle sounded sharp from the boardwalk.',
        'There is a red cache east of the trees. Route caches are the difference between brave and reckless.',
      ]
    }
    if (discoveredCount > 1) {
      return [
        'Fresh LLMdex entry, fresh pressure. Mira will notice when you cross her lane.',
        'If the battle gets tight, remember: a guard turn can beat a bigger benchmark number.',
      ]
    }
    return [
      'The boardwalk is where I tune prompts before a scout battle.',
      'Step into the grass first. A route with only a starter log is still just a lab walk.',
    ]
  }

  if (npc.id === 'gateAttendant') {
    if (routeFlags.includes('Champion log read')) {
      return [
        'Your record shows Andrej\'s note is filed. That closes the current badge lane.',
        'Return to Route 01 when you are ready, or save before the league compiles the next build.',
      ]
    }
    if (routeFlags.includes('Gate attendant met')) {
      return [
        'Terminal west of me is still authorized for your trainer card.',
        'Read the champion log. Andrej left the first real hint about the team waiting beyond this slice.',
      ]
    }
    return [
      'The Data Gym is sealed while the league compiles the next benchmark badge.',
      'Mira cleared you for the gatehouse. I authorized the champion terminal to your west.',
      'Read Andrej\'s log there, then save your route record before you leave the slice.',
    ]
  }

  if (npc.id === 'miraPostBattle') {
    if (routeFlags.includes('Champion log read')) {
      return [
        'You read Andrej\'s teaser? Good. That is the kind of breadcrumb champions leave on purpose.',
        'Your route record now has a starter, a wild benchmark, a scout clear, and the gatehouse hook.',
      ]
    }
    if (collectedItemIds.includes('latencyPatch')) {
      return [
        'You found the Latency Patch too. Nice routing.',
        'The gate reader accepted my clearance ping. Head north and make Sol open the archive path.',
      ]
    }
    return npc.lines
  }

  return npc.lines
}

function npcRolePlate(npc: MapNpc): { label: string; tone: 'route' | 'danger' | 'gatehouse' } {
  if (npc.id === 'routeTuner') {
    return { label: 'Tuner', tone: 'route' }
  }
  if (npc.id === 'gateAttendant') {
    return { label: 'Attendant', tone: 'gatehouse' }
  }
  return { label: 'Scout', tone: 'danger' }
}

function isMiraSightTile(mapId: MapId, position: Position, trainerDefeated: boolean): boolean {
  return mapId === 'route01'
    && !trainerDefeated
    && position.x === MIRA_POSITION.x
    && position.y > MIRA_POSITION.y
    && position.y <= MIRA_POSITION.y + MIRA_SIGHT_RANGE
}

function itemCollected(collectedItemIds: FieldItemId[], mapId: MapId, position: Position): boolean {
  const item = fieldItemAt(mapId, position)
  return item ? collectedItemIds.includes(item.id) : false
}

function effectiveTileAt(map: WorldMap, position: Position, collectedItemIds: FieldItemId[]): TerrainCode {
  const code = tileAt(map, position)
  if (code === 'I' && itemCollected(collectedItemIds, map.id, position)) {
    return '.'
  }
  return code
}

function facingDelta(facing: Facing): Position {
  if (facing === 'north') {
    return { x: 0, y: -1 }
  }
  if (facing === 'south') {
    return { x: 0, y: 1 }
  }
  if (facing === 'west') {
    return { x: -1, y: 0 }
  }
  return { x: 1, y: 0 }
}

function oppositeFacing(facing: Facing): Facing {
  if (facing === 'north') {
    return 'south'
  }
  if (facing === 'south') {
    return 'north'
  }
  if (facing === 'west') {
    return 'east'
  }
  return 'west'
}

function ambientNpcFacing(npc: MapNpc, tick: number): Facing {
  const walking = npcWalkDirection(npc, tick)
  if (walking) {
    return walking
  }
  const phase = tick % 4
  if (npc.id === 'routeTuner') {
    return phase === 1 ? 'south' : 'west'
  }
  if (npc.id === 'gateAttendant') {
    return phase === 1 ? 'west' : phase === 3 ? 'east' : 'south'
  }
  if (npc.id === 'miraPostBattle') {
    return phase === 2 ? 'east' : 'south'
  }
  return npc.facing
}

function dialoguePortraitFor(speaker: string): { src: string; alt: string; tone: 'professor' | 'trainer' | 'player' } {
  if (speaker.includes('Professor')) {
    return { src: MAP_ASSETS.professor, alt: speaker, tone: 'professor' }
  }
  if (speaker.includes('Gate Attendant') || speaker.includes('Route Tuner') || speaker.includes('Benchmark Scout') || speaker.includes('Mira')) {
    return { src: MAP_ASSETS.trainer, alt: speaker, tone: 'trainer' }
  }
  return { src: MAP_ASSETS.player, alt: speaker, tone: 'player' }
}

function dialogueRoleFor(speaker: string): string {
  if (speaker.includes('Professor') || speaker === 'Model Lab') {
    return 'Model Lab'
  }
  if (speaker.includes('Mira') || speaker.includes('Scout')) {
    return 'Scout'
  }
  if (speaker.includes('Attendant') || speaker.includes('Gatehouse')) {
    return 'Gatehouse'
  }
  if (speaker.includes('Terminal') || speaker.includes('Sign') || speaker.includes('Gate') || speaker.includes('Cache')) {
    return 'Route object'
  }
  if (speaker.includes('Tuner')) {
    return 'Route trainer'
  }
  return 'Trainer'
}

function starterLabProfile(model: LlmMon): StarterLabProfile {
  if (model.id === 'gpt-5-mini') {
    return {
      role: 'Fast opener',
      routeRead: 'Best for players who want to win early wild encounters through speed and low-cost pressure.',
      firstPlan: 'Use typed burst first, then guard if Mira starts trading heavy hits.',
      professorNote: 'Nimble partners teach tempo. They make Route 01 feel quick, but punish sloppy guard timing.',
    }
  }
  if (model.id === 'claude-sonnet-4-5') {
    return {
      role: 'Steady defender',
      routeRead: 'Best for players who want safer scout battles and fewer risky low-HP returns to the lab.',
      firstPlan: 'Open with guard against stronger models, then answer with Benchmark Surge.',
      professorNote: 'A calm partner can make a hard route look simple. Patience is a stat too.',
    }
  }
  return {
    role: 'Power route',
    routeRead: 'Best for players who want a heavier starter that can overpower wild benchmarks after setup.',
    firstPlan: 'Trade early damage, spend guard before Mira, and use the Latency Patch only when it matters.',
    professorNote: 'Raw strength is exciting, but Route 01 still asks whether you can manage tempo.',
  }
}

function frontPosition(position: Position, facing: Facing): Position {
  const delta = facingDelta(facing)
  return { x: position.x + delta.x, y: position.y + delta.y }
}

function routeObjective(map: WorldMap, trainerDefeated: boolean, discoveredCount: number, routeFlags: RouteFlag[]): FieldCue {
  if (map.id === 'gatehouse') {
    if (routeFlags.includes('Champion log read')) {
      return {
        label: 'Slice complete',
        detail: 'Champion Andrej logged the next badge hook. Return to Route 01 or save your journey.',
      }
    }
    return {
      label: 'Gatehouse objective',
      detail: 'Read the Champion notes, then return to Route 01 when ready.',
    }
  }
  if (!trainerDefeated) {
    return {
      label: 'Route objective',
      detail: discoveredCount > 1 ? 'Cross Eval Grass and challenge Benchmark Scout Mira.' : 'Log one wild benchmark, then find Benchmark Scout Mira.',
    }
  }
  return {
    label: 'Route objective',
    detail: 'Scout the locked Data Gym gate and note the Champion teaser.',
  }
}

function routeQuestSteps(
  map: WorldMap,
  discoveredCount: number,
  trainerDefeated: boolean,
  collectedItemIds: FieldItemId[],
  routeFlags: RouteFlag[],
): QuestStep[] {
  if (map.id === 'gatehouse') {
    return [
      { label: 'Enter the Data Gym gatehouse', complete: routeFlags.includes('Gatehouse entered'), current: !routeFlags.includes('Gatehouse entered') },
      { label: 'Speak with the gate attendant', complete: routeFlags.includes('Gate attendant met'), current: routeFlags.includes('Gatehouse entered') && !routeFlags.includes('Gate attendant met') },
      { label: 'Read the champion terminal', complete: routeFlags.includes('Champion log read'), current: routeFlags.includes('Gate attendant met') && !routeFlags.includes('Champion log read') },
    ]
  }

  const wildLogged = discoveredCount > 1 || routeFlags.includes('First benchmark logged')
  const cacheFound = collectedItemIds.includes('latencyPatch')
  const gateScouted = routeFlags.includes('Gym gate scouted') || routeFlags.includes('Gatehouse entered')
  return [
    { label: 'Choose a starter partner', complete: true },
    { label: 'Log one wild benchmark', complete: wildLogged, current: !wildLogged },
    { label: 'Challenge Benchmark Scout Mira', complete: trainerDefeated, current: wildLogged && !trainerDefeated },
    { label: 'Find the Latency Patch cache', complete: cacheFound, current: trainerDefeated && !cacheFound },
    { label: 'Scout the Data Gym gate', complete: gateScouted, current: trainerDefeated && !gateScouted },
  ]
}

function routeStoryBeat(
  map: WorldMap,
  discoveredCount: number,
  trainerDefeated: boolean,
  collectedItemIds: FieldItemId[],
  routeFlags: RouteFlag[],
): StoryBeat {
  if (map.id === 'gatehouse') {
    if (routeFlags.includes('Champion log read')) {
      return {
        chapter: 'Chapter 1 clear',
        title: 'Andrej left a badge hook',
        detail: 'The champion terminal names a future OpenAI ace and Anthropic wall. Your first route record is ready to save.',
        tone: 'gatehouse',
      }
    }
    if (routeFlags.includes('Gate attendant met')) {
      return {
        chapter: 'Gatehouse',
        title: 'Sol authorized the west terminal',
        detail: 'The sealed Data Gym is only a lobby for now, but its machines point toward the champion path.',
        tone: 'gatehouse',
      }
    }
    return {
      chapter: 'Gatehouse',
      title: 'The badge road is sealed',
      detail: 'Mira clearance opened the door. Find Gate Attendant Sol before reading the champion archive.',
      tone: 'gatehouse',
    }
  }

  const wildLogged = discoveredCount > 1 || routeFlags.includes('First benchmark logged')
  if (!wildLogged) {
    return {
      chapter: 'Route 01',
      title: 'First field benchmark',
      detail: 'Professor Karpathy sent you into Eval Grass to prove your starter can survive a real wild model.',
      tone: 'lab',
    }
  }
  if (!trainerDefeated) {
    return {
      chapter: 'Route 01',
      title: 'Mira is watching the lane',
      detail: 'A fresh LLMdex entry is enough to draw the scout battle. Cross her sightline when your partner is ready.',
      tone: 'danger',
    }
  }
  if (!collectedItemIds.includes('latencyPatch')) {
    return {
      chapter: 'Route 01',
      title: 'Scout clearance earned',
      detail: 'Mira pinged the gate reader. Search the boardwalk cache before stepping into the Data Gym lobby.',
      tone: 'route',
    }
  }
  return {
    chapter: 'Route 01',
    title: 'The ridge gate is waiting',
    detail: 'With a Latency Patch in your bag, the last thread of this slice leads north to Andrej\'s teaser.',
    tone: 'gatehouse',
  }
}

function routeObjectiveTarget(
  currentMapId: MapId,
  discoveredCount: number,
  trainerDefeated: boolean,
  collectedItemIds: FieldItemId[],
  routeFlags: RouteFlag[],
): ObjectiveTarget {
  if (currentMapId === 'gatehouse') {
    if (!routeFlags.includes('Gate attendant met')) {
      return {
        label: 'Gate Attendant Sol',
        detail: 'Speak with Sol to authorize the champion terminal.',
        mapId: 'gatehouse',
        position: { x: 5, y: 3 },
        kind: 'attendant',
      }
    }
    if (!routeFlags.includes('Champion log read')) {
      return {
        label: 'Champion terminal',
        detail: 'Read Andrej\'s route note beside the attendant.',
        mapId: 'gatehouse',
        position: { x: 4, y: 3 },
        kind: 'terminal',
      }
    }
    return {
      label: 'Route 01 exit',
      detail: 'Step back onto Eval Grass or save this route record.',
      mapId: 'gatehouse',
      position: { x: 5, y: 6 },
      kind: 'exit',
    }
  }

  const wildLogged = discoveredCount > 1 || routeFlags.includes('First benchmark logged')
  if (!wildLogged) {
    return {
      label: 'Benchmark grass',
      detail: 'Walk through grass until a wild model joins the LLMdex.',
      mapId: 'route01',
      position: { x: 6, y: 3 },
      kind: 'grass',
    }
  }
  if (!trainerDefeated) {
    return {
      label: 'Mira sightline',
      detail: 'Challenge Benchmark Scout Mira after logging a wild model.',
      mapId: 'route01',
      position: MIRA_POSITION,
      kind: 'trainer',
    }
  }
  if (!collectedItemIds.includes('latencyPatch')) {
    return {
      label: 'Latency Patch cache',
      detail: 'Open the red cache capsule near the boardwalk.',
      mapId: 'route01',
      position: { x: 9, y: 8 },
      kind: 'cache',
    }
  }
  return {
    label: 'Data Gym gate',
    detail: 'Scout the checkpoint reader and enter the gatehouse.',
    mapId: 'route01',
    position: { x: 14, y: 12 },
    kind: 'gate',
  }
}

function tileCue(code: TerrainCode, trainerDefeated: boolean): FieldCue {
  if (code === 'L') {
    return { label: 'Model Lab', detail: 'Professor Karpathy calibrated your starter here.' }
  }
  if (code === 'S') {
    return { label: 'Route sign', detail: 'A posted note explains local encounter ecology.' }
  }
  if (code === 'T') {
    return { label: 'Benchmark Scout', detail: trainerDefeated ? 'Mira is reviewing your battle log.' : 'Mira is watching the grass path.' }
  }
  if (code === 'D') {
    return { label: 'Data Gym gate', detail: trainerDefeated ? 'The checkpoint door is open for scouting.' : 'A future badge lock blocks the north league road.' }
  }
  if (code === 'B') {
    return { label: 'Boardwalk', detail: 'Cached-water shallows reflect the route lights.' }
  }
  if (code === 'M') {
    return { label: 'League terminal', detail: 'Sealed machines list future badge requirements.' }
  }
  if (code === 'F') {
    return { label: 'Gym floor', detail: 'Polished checkpoint tile hums underfoot.' }
  }
  if (code === 'I') {
    return { label: 'Cache capsule', detail: 'A route cache is tucked into the grass. Face it and press A.' }
  }
  if (code === 'G') {
    return { label: 'Tall benchmark grass', detail: 'Wild LLM-mon are close enough to benchmark.' }
  }
  if (code === 'C') {
    return { label: 'Cypress canopy', detail: 'Dense coastal trees make a natural route wall.' }
  }
  if (code === 'H') {
    return { label: 'Route ledge', detail: 'A short one-way drop. Walk down from above to hop it.' }
  }
  return { label: TILE_LABELS[code], detail: 'A quiet stretch of Route 01.' }
}

function battleOriginFor(map: WorldMap, position: Position, kind: BattleKind): { terrain: BattleTerrain; locationLabel: string } {
  const code = tileAt(map, position)
  if (kind === 'trainer') {
    return { terrain: 'trainer', locationLabel: map.id === 'gatehouse' ? 'Data Gym challenge floor' : 'Mira Sightline' }
  }
  if (map.id === 'gatehouse') {
    return { terrain: 'gatehouse', locationLabel: 'Data Gym Gatehouse' }
  }
  if (code === 'G') {
    return { terrain: 'grass', locationLabel: 'Tall benchmark grass' }
  }
  if (code === 'B') {
    return { terrain: 'boardwalk', locationLabel: 'Cachewater Boardwalk' }
  }
  return { terrain: 'route', locationLabel: WORLD_MAPS[map.id].title }
}

function isBlocked(code: TerrainCode, trainerDefeated: boolean): boolean {
  if (code === 'T') {
    return false
  }
  if (code === 'D') {
    return !trainerDefeated
  }
  return code === 'R' || code === 'W' || code === 'C' || code === 'M' || code === 'I' || code === 'H'
}

function battleScore(model: LlmMon): number {
  return model.stats.intelligence * 0.9 + model.stats.outputSpeed / 22 - model.stats.latency / 16 - model.stats.blendedCost * 1.5
}

function damageFor(attacker: LlmMon, defender: LlmMon, move: Move, guard: number): number {
  if (move.id === 'context-guard') {
    return 0
  }
  const signatureBonus = move.type === attacker.type ? 1.22 : 1
  const availabilityBonus = attacker.availability !== 'closed API' && defender.availability === 'closed API' ? 1.08 : 1
  const jitter = 0.88 + Math.random() * 0.24
  const base = move.power + battleScore(attacker) / 2.6 - defender.stats.intelligence / 12
  return Math.max(7, Math.round(base * signatureBonus * availabilityBonus * jitter * guard))
}

function damageRangeFor(attacker: LlmMon, defender: LlmMon, move: Move, guard: number): { min: number; max: number } {
  if (move.id === 'context-guard') {
    return { min: 0, max: 0 }
  }
  const signatureBonus = move.type === attacker.type ? 1.22 : 1
  const availabilityBonus = attacker.availability !== 'closed API' && defender.availability === 'closed API' ? 1.08 : 1
  const base = move.power + battleScore(attacker) / 2.6 - defender.stats.intelligence / 12
  return {
    min: Math.max(7, Math.round(base * signatureBonus * availabilityBonus * 0.88 * guard)),
    max: Math.max(7, Math.round(base * signatureBonus * availabilityBonus * 1.12 * guard)),
  }
}

function moveForecastFor(attacker: LlmMon, battle: BattleState, move: Move): { damage: string; outcome: string; tone: 'guard' | 'ko' | 'strong' | 'steady' } {
  if (move.id === 'context-guard') {
    return {
      damage: 'Incoming x0.52',
      outcome: battle.guard < 1 ? 'Guard already set' : 'Softens next hit',
      tone: 'guard',
    }
  }
  const range = damageRangeFor(attacker, battle.opponent, move, 1)
  const afterMin = Math.max(0, battle.enemyHp - range.min)
  const afterMax = Math.max(0, battle.enemyHp - range.max)
  const koLikely = afterMax === 0
  return {
    damage: `${range.min}-${range.max} DMG`,
    outcome: koLikely ? 'KO range' : `Foe HP ${afterMax}-${afterMin}`,
    tone: koLikely ? 'ko' : range.max >= Math.ceil(battle.enemyHp * 0.45) ? 'strong' : 'steady',
  }
}

function enemyMoveFor(model: LlmMon): Move {
  if (model.stats.latency < 2) {
    return { id: 'latency-jab', name: 'Latency Jab', type: model.type, power: 13, effect: 'Fast first-token hit.' }
  }
  if (model.stats.intelligence >= 50) {
    return { id: 'frontier-proof', name: 'Frontier Proof', type: model.type, power: 19, effect: 'Heavy benchmark damage.' }
  }
  return { id: 'decode-swipe', name: 'Decode Swipe', type: model.type, power: 14, effect: 'Standard route attack.' }
}

function battleMomentum(log: string[]): string[] {
  return log.slice(0, 2).map((entry) => entry.replace(/\.$/, ''))
}

function battleResultSummary(battle: BattleState, starter: LlmMon, discoveredIds: string[]): { eyebrow: string; title: string; lines: string[] } {
  if (battle.result === 'lost') {
    return {
      eyebrow: 'Recovery packet',
      title: `${starter.name} needs a lab reset`,
      lines: [
        'Professor Karpathy will restore your partner to full HP.',
        'You keep your route notes, but this benchmark was not logged.',
        'Return to the lab and rebalance speed, cost, and guard timing.',
      ],
    }
  }

  if (battle.kind === 'trainer') {
    return {
      eyebrow: 'Scout clearance',
      title: 'Mira synced your battle log',
      lines: [
        'Route flag ready: Mira defeated.',
        'Data Gym gate reader will open after you continue.',
        `${starter.name} carries forward ${Math.max(1, battle.playerHp)}/${maxHp(starter)} HP.`,
      ],
    }
  }

  const isNewEntry = !discoveredIds.includes(battle.opponent.id)
  return {
    eyebrow: 'Benchmark packet',
    title: isNewEntry ? 'New LLMdex entry ready' : 'LLMdex entry refreshed',
    lines: [
      `${battle.opponent.name} ${isNewEntry ? 'will be added to the LLMdex.' : 'data was benchmarked again.'}`,
      'Route flag ready: First benchmark logged.',
      `${starter.name} carries forward ${Math.max(1, battle.playerHp)}/${maxHp(starter)} HP.`,
    ],
  }
}

function battleDexRegistration(battle: BattleState, discoveredIds: string[]): { model: LlmMon; status: 'new' | 'seen'; index: number } | null {
  if (battle.result !== 'won' || battle.kind !== 'wild') {
    return null
  }
  return {
    model: battle.opponent,
    status: discoveredIds.includes(battle.opponent.id) ? 'seen' : 'new',
    index: MODELS.findIndex((model) => model.id === battle.opponent.id) + 1,
  }
}

function battlePerformanceSummary(battle: BattleState, starter: LlmMon): { grade: string; title: string; detail: string; tone: 'clear' | 'steady' | 'close' | 'reset' } {
  if (battle.result === 'lost') {
    return {
      grade: 'LAB',
      title: 'Recovery route',
      detail: 'Reset at the Model Lab and try a guard turn before the next heavy exchange.',
      tone: 'reset',
    }
  }

  const hpPercent = Math.round((Math.max(1, battle.playerHp) / maxHp(starter)) * 100)
  const usedGuard = battle.log.some((entry) => entry.includes('Context Guard'))
  if (battle.kind === 'trainer') {
    return {
      grade: hpPercent >= 65 ? 'A' : hpPercent >= 35 ? 'B' : 'C',
      title: hpPercent >= 65 ? 'Clean scout clear' : hpPercent >= 35 ? 'Steady scout clear' : 'Clutch scout clear',
      detail: usedGuard ? 'Mira saw guard timing in your route log.' : 'Mira cleared you, but a guard turn would make the route cleaner.',
      tone: hpPercent >= 65 ? 'clear' : hpPercent >= 35 ? 'steady' : 'close',
    }
  }

  if (battle.turn <= 2 && hpPercent >= 70) {
    return {
      grade: 'A',
      title: 'Fast field log',
      detail: 'A sharp wild benchmark with strong HP carryover.',
      tone: 'clear',
    }
  }
  if (hpPercent >= 40) {
    return {
      grade: 'B',
      title: 'Stable field log',
      detail: usedGuard ? 'Guard timing kept the route safe.' : 'The model was logged cleanly; guard can preserve more HP.',
      tone: 'steady',
    }
  }
  return {
    grade: 'C',
    title: 'Close field log',
    detail: 'The dex entry is yours, but the next stop should be the lab or a patch.',
    tone: 'close',
  }
}

function dexEntryRouteNote(model: LlmMon, starter: LlmMon | null, routeFlags: RouteFlag[]): { label: string; detail: string; tone: 'starter' | 'wild' | 'scout' } {
  if (starter?.id === model.id) {
    return {
      label: 'Starter registration',
      detail: 'Registered in Professor Karpathy\'s lab before Route 01 opened.',
      tone: 'starter',
    }
  }
  if (model.id === 'deepseek-v4-pro-max' || routeFlags.includes('Mira defeated')) {
    return {
      label: 'Scout benchmark',
      detail: 'Logged through Mira\'s scout pressure and route-clearance checks.',
      tone: 'scout',
    }
  }
  return {
    label: 'Wild benchmark',
    detail: 'Registered from Eval Grass field data after a live route encounter.',
    tone: 'wild',
  }
}

function dexDossierFor(model: LlmMon, entryIndex: number, starter: LlmMon | null, routeFlags: RouteFlag[]): { label: string; value: string; tone: 'lab' | 'wild' | 'scout' | 'locked' }[] {
  const registeredAsStarter = starter?.id === model.id
  const wildLogged = routeFlags.includes('First benchmark logged')
  const scoutCleared = routeFlags.includes('Mira defeated')
  const habitat = registeredAsStarter
    ? 'Model Lab capsule'
    : wildLogged
      ? model.rarity === 'legendary' ? 'Rare route signal' : 'Eval Grass'
      : 'Unknown route'
  const role = model.stats.latency < 2
    ? 'Tempo striker'
    : model.stats.intelligence >= 50
      ? 'Power ace'
      : model.stats.blendedCost < 1
        ? 'Budget carry'
        : 'Route flex'
  const status = registeredAsStarter
    ? 'Starter file'
    : scoutCleared
      ? 'Scout verified'
      : wildLogged
        ? 'Field logged'
        : 'Awaiting data'
  return [
    { label: 'No.', value: String(entryIndex).padStart(3, '0'), tone: registeredAsStarter ? 'lab' : 'wild' },
    { label: 'Habitat', value: habitat, tone: habitat === 'Unknown route' ? 'locked' : registeredAsStarter ? 'lab' : 'wild' },
    { label: 'Battle role', value: role, tone: model.stats.intelligence >= 50 ? 'scout' : 'wild' },
    { label: 'Route status', value: status, tone: status === 'Awaiting data' ? 'locked' : registeredAsStarter ? 'lab' : scoutCleared ? 'scout' : 'wild' },
  ]
}

function Sprite({ model, small = false }: { model: LlmMon; small?: boolean }) {
  return (
    <div className={`sprite ${small ? 'sprite-small' : ''}`} aria-label={`${model.name} sprite`}>
      <img src={SPRITE_ASSETS[model.id]} alt="" />
      <span className="sprite-glow" style={{ backgroundColor: TYPE_COLORS[model.type] }} />
    </div>
  )
}

function TypeBadge({ type }: { type: LlmType }) {
  return (
    <span className="type-badge" style={{ backgroundColor: TYPE_COLORS[type] }}>
      {type}
    </span>
  )
}

function StatBar({ label, value, max, suffix = '' }: { label: string; value: number; max: number; suffix?: string }) {
  return (
    <div className="stat-line">
      <span>{label}</span>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${statPercent(value, max)}%` }} />
      </div>
      <strong>
        {value}
        {suffix}
      </strong>
    </div>
  )
}

function ModelCard({
  model,
  selectable,
  selected,
  onChoose,
  onPreview,
}: {
  model: LlmMon
  selectable?: boolean
  selected?: boolean
  onChoose?: () => void
  onPreview?: () => void
}) {
  return (
    <article
      className={`model-card ${selected ? 'selected' : ''} ${selectable ? 'starter-card' : ''}`}
      onMouseEnter={onPreview}
      onFocus={onPreview}
    >
      <div className="model-card-top">
        <Sprite model={model} small />
        <div>
          <p className="eyebrow">{model.lab}</p>
          <h3>{model.name}</h3>
          <p className="model-subtitle">{model.lab} · {model.availability}</p>
        </div>
      </div>
      <div className="badge-row">
        <TypeBadge type={model.type} />
        <span className={`rarity rarity-${model.rarity}`}>{model.rarity}</span>
        <span>{model.availability}</span>
      </div>
      <p className="card-lore">{model.lore}</p>
      <div className="stats-grid">
        <StatBar label="Strength" value={model.stats.intelligence} max={60} />
        <StatBar label="Speed" value={model.stats.outputSpeed} max={220} suffix=" t/s" />
        <StatBar label="Low latency" value={Math.max(0, 70 - model.stats.latency)} max={70} suffix="" />
      </div>
      <dl className="metric-list">
        <div>
          <dt>Cost</dt>
          <dd>{costLabel(model.stats.blendedCost)}</dd>
        </div>
        <div>
          <dt>TTFT</dt>
          <dd>{model.stats.latency.toFixed(2)}s</dd>
        </div>
        <div>
          <dt>Context</dt>
          <dd>{model.stats.context}</dd>
        </div>
      </dl>
      <p className="abilities">Abilities: {model.abilities.join(' · ')}</p>
      {selectable ? (
        <button className="pixel-button full" onClick={onChoose}>
          Choose {model.name}
        </button>
      ) : null}
    </article>
  )
}

function OverworldCharacter({
  src,
  alt,
  kind,
  facing = 'south',
  stepNonce = 0,
  active = false,
  walking = null,
  bumped = null,
}: {
  src: string
  alt: string
  kind: 'player' | 'npc'
  facing?: Facing
  stepNonce?: number
  active?: boolean
  walking?: Facing | null
  bumped?: Facing | null
}) {
  const walkingClass = walking ? `is-walking walking-${walking}` : ''
  const bumpClass = bumped ? `is-bumping bumping-${bumped}` : ''
  return (
    <span key={`${kind}-${facing}-${stepNonce}-${walking ?? 'idle'}-${bumped ?? 'steady'}`} className={`character-sprite overworld-character ${kind}-sprite facing-${facing} ${walkingClass} ${bumpClass} ${active ? 'is-active' : ''}`}>
      <span className="character-shadow" aria-hidden="true" />
      <img src={src} alt={alt} />
      <span className="character-footstep character-footstep-left" aria-hidden="true" />
      <span className="character-footstep character-footstep-right" aria-hidden="true" />
      <span className="character-glint" aria-hidden="true" />
      {kind === 'player' ? <span className="facing-cue" aria-hidden="true" /> : null}
    </span>
  )
}

function App() {
  const [screen, setScreen] = useState<Screen>('title')
  const [starter, setStarter] = useState<LlmMon | null>(null)
  const [currentMapId, setCurrentMapId] = useState<MapId>('route01')
  const [position, setPosition] = useState<Position>({ x: 3, y: 3 })
  const [facing, setFacing] = useState<Facing>('south')
  const [stepNonce, setStepNonce] = useState(0)
  const [walkDirection, setWalkDirection] = useState<Facing | null>(null)
  const [bumpDirection, setBumpDirection] = useState<Facing | null>(null)
  const [stepsInGrass, setStepsInGrass] = useState(0)
  const [trainerDefeated, setTrainerDefeated] = useState(false)
  const [discoveredIds, setDiscoveredIds] = useState<string[]>([])
  const [routeFlags, setRouteFlags] = useState<RouteFlag[]>([])
  const [collectedItemIds, setCollectedItemIds] = useState<FieldItemId[]>([])
  const [usedItemIds, setUsedItemIds] = useState<FieldItemId[]>([])
  const [partnerHp, setPartnerHp] = useState(0)
  const [battle, setBattle] = useState<BattleState | null>(null)
  const [battleEffect, setBattleEffect] = useState<BattleEffect | null>(null)
  const [encounterIntro, setEncounterIntro] = useState<EncounterIntro | null>(null)
  const [grassEncounterCue, setGrassEncounterCue] = useState<GrassEncounterCue | null>(null)
  const [trainerNotice, setTrainerNotice] = useState<TrainerNotice | null>(null)
  const [overworldEffect, setOverworldEffect] = useState<OverworldEffect | null>(null)
  const [routeFootsteps, setRouteFootsteps] = useState<RouteFootstep[]>([])
  const [routeClearance, setRouteClearance] = useState<RouteClearance | null>(null)
  const [labRecovery, setLabRecovery] = useState<LabRecovery | null>(null)
  const [mapTransition, setMapTransition] = useState<MapTransition | null>(null)
  const [landmarkToast, setLandmarkToast] = useState<LandmarkToast | null>(null)
  const [championLog, setChampionLog] = useState<ChampionLog | null>(null)
  const [saveCeremony, setSaveCeremony] = useState<SaveCeremony | null>(null)
  const [battleReturn, setBattleReturn] = useState<BattleReturn | null>(null)
  const [ambientTick, setAmbientTick] = useState(0)
  const [dialogue, setDialogue] = useState<DialogueState | null>(null)
  const [fieldMenuOpen, setFieldMenuOpen] = useState(false)
  const [inputCue, setInputCue] = useState<InputCue | null>(null)
  const [dexFocusId, setDexFocusId] = useState<string | null>(null)
  const [starterPreviewId, setStarterPreviewId] = useState(STARTER_IDS[0])
  const [hasSave, setHasSave] = useState(() => readInitialSaveMeta().hasSave)
  const [saveSummary, setSaveSummary] = useState(() => readInitialSaveMeta().summary)
  const [saveProgress, setSaveProgress] = useState(() => readInitialSaveMeta().progress)
  const [saveNotice, setSaveNotice] = useState('No save loaded.')
  const [routeMessage, setRouteMessage] = useState('Professor Karpathy is waiting in the lab with three starter LLM-mon.')
  const [audioOn, setAudioOn] = useState(false)
  const audioContextRef = useRef<AudioContext | null>(null)
  const audioGainRef = useRef<GainNode | null>(null)
  const musicLoopRef = useRef<number | null>(null)
  const currentMusicModeRef = useRef<MusicMode | null>(null)
  const encounterTimeoutRef = useRef<number | null>(null)
  const grassEncounterTimeoutRef = useRef<number | null>(null)
  const trainerNoticeTimeoutRef = useRef<number | null>(null)
  const walkTimeoutRef = useRef<number | null>(null)
  const bumpTimeoutRef = useRef<number | null>(null)
  const inputCueTimeoutRef = useRef<number | null>(null)
  const saveCeremonyTimeoutRef = useRef<number | null>(null)
  const lastKeyboardMoveRef = useRef(0)

  const starters = useMemo(() => STARTER_IDS.map(getModel), [])
  const previewStarter = useMemo(() => starters.find((model) => model.id === starterPreviewId) ?? starters[0], [starterPreviewId, starters])
  const previewStarterProfile = useMemo(() => starterLabProfile(previewStarter), [previewStarter])
  const activeMoves = useMemo(() => {
    if (!starter) {
      return STARTER_MOVES
    }
    return STARTER_MOVES.map((move) => (move.id === 'typed-burst' ? { ...move, type: starter.type, name: `${starter.type} Burst` } : move))
  }, [starter])
  const currentMap = WORLD_MAPS[currentMapId]
  const objective = useMemo(() => routeObjective(currentMap, trainerDefeated, discoveredIds.length, routeFlags), [currentMap, discoveredIds.length, routeFlags, trainerDefeated])
  const questSteps = useMemo(() => routeQuestSteps(currentMap, discoveredIds.length, trainerDefeated, collectedItemIds, routeFlags), [collectedItemIds, currentMap, discoveredIds.length, routeFlags, trainerDefeated])
  const storyBeat = useMemo(() => routeStoryBeat(currentMap, discoveredIds.length, trainerDefeated, collectedItemIds, routeFlags), [collectedItemIds, currentMap, discoveredIds.length, routeFlags, trainerDefeated])
  const completedQuestSteps = questSteps.filter((step) => step.complete).length
  const currentQuestStep = questSteps.find((step) => step.current) ?? questSteps.find((step) => !step.complete) ?? questSteps[questSteps.length - 1]
  const questProgressPercent = questSteps.length ? Math.round((completedQuestSteps / questSteps.length) * 100) : 0
  const objectiveTarget = useMemo(() => routeObjectiveTarget(currentMapId, discoveredIds.length, trainerDefeated, collectedItemIds, routeFlags), [collectedItemIds, currentMapId, discoveredIds.length, routeFlags, trainerDefeated])
  const objectiveDistance = objectiveTarget.mapId === currentMapId
    ? Math.abs(position.x - objectiveTarget.position.x) + Math.abs(position.y - objectiveTarget.position.y)
    : null
  const currentLandmark = useMemo(() => landmarkAt(currentMapId, position), [currentMapId, position])
  const frontTile = useMemo(() => frontPosition(position, facing), [facing, position])
  const frontTargetPrompt = useMemo<FrontTargetPrompt | null>(() => {
    const npc = routeNpcAt(currentMapId, frontTile, trainerDefeated, ambientTick)
    if (npc) {
      return { label: npc.name.replace(/^Benchmark Scout /, ''), kind: 'talk' }
    }
    const item = fieldItemAt(currentMapId, frontTile)
    if (item && !collectedItemIds.includes(item.id)) {
      return { label: item.name, kind: 'open' }
    }
    const code = effectiveTileAt(currentMap, frontTile, collectedItemIds)
    if (code === 'S') {
      return { label: currentMapId === 'gatehouse' ? 'Terminal' : 'Sign', kind: 'read' }
    }
    if (code === 'D') {
      return { label: trainerDefeated ? 'Gatehouse' : 'Gym gate', kind: trainerDefeated ? 'enter' : 'inspect' }
    }
    if (code === 'L') {
      return { label: 'Model Lab', kind: 'inspect' }
    }
    return null
  }, [ambientTick, collectedItemIds, currentMap, currentMapId, frontTile, trainerDefeated])
  const frontCommand = useMemo(() => {
    if (!frontTargetPrompt) {
      return null
    }
    if (frontTargetPrompt.kind === 'talk') {
      return { verb: 'Talk', detail: `Press A to speak with ${frontTargetPrompt.label}.` }
    }
    if (frontTargetPrompt.kind === 'read') {
      return { verb: 'Read', detail: `Press A to read the ${frontTargetPrompt.label.toLowerCase()}.` }
    }
    if (frontTargetPrompt.kind === 'open') {
      return { verb: 'Open', detail: `Press A to open ${frontTargetPrompt.label}.` }
    }
    if (frontTargetPrompt.kind === 'enter') {
      return { verb: 'Enter', detail: `Press A or step forward to enter ${frontTargetPrompt.label}.` }
    }
    return { verb: 'Inspect', detail: `Press A to inspect ${frontTargetPrompt.label}.` }
  }, [frontTargetPrompt])
  const fieldCue = useMemo(() => {
    const npc = routeNpcAt(currentMapId, frontTile, trainerDefeated, ambientTick)
    if (npc) {
      return { label: npc.name, detail: 'Press A to talk. Trainers turn toward you when conversation starts.' }
    }
    const item = fieldItemAt(currentMapId, frontTile)
    if (item && !collectedItemIds.includes(item.id)) {
      return { label: item.name, detail: `${item.detail} Press A to open the cache.` }
    }
    return tileCue(effectiveTileAt(currentMap, frontTile, collectedItemIds), trainerDefeated)
  }, [ambientTick, collectedItemIds, currentMap, currentMapId, frontTile, trainerDefeated])
  const discoveredModels = useMemo(() => discoveredIds.map(getModel), [discoveredIds])
  const focusedDexModel = useMemo(() => {
    const fallbackId = discoveredIds[discoveredIds.length - 1] ?? starter?.id ?? null
    const focusId = dexFocusId && discoveredIds.includes(dexFocusId) ? dexFocusId : fallbackId
    return focusId ? getModel(focusId) : null
  }, [dexFocusId, discoveredIds, starter])
  const partnerMaxHp = starter ? maxHp(starter) : 0
  const displayedPartnerHp = starter ? Math.max(0, Math.min(partnerHp || partnerMaxHp, partnerMaxHp)) : 0
  const hasLatencyPatch = collectedItemIds.includes('latencyPatch')
  const latencyPatchUsed = usedItemIds.includes('latencyPatch')
  const canUseLatencyPatch = Boolean(starter && hasLatencyPatch && !latencyPatchUsed && displayedPartnerHp < partnerMaxHp)
  const routeCacheTotal = Object.values(FIELD_ITEMS).flatMap((items) => Object.values(items)).length
  const routeCacheFound = collectedItemIds.length
  const dexCompletion = Math.round((discoveredIds.length / MODELS.length) * 100)
  const partnerHpPercent = partnerMaxHp ? Math.round((displayedPartnerHp / partnerMaxHp) * 100) : 0
  const wildBenchmarkLogged = discoveredIds.length > 1 || routeFlags.includes('First benchmark logged')
  const routeHabitatForecast = useMemo(() => habitatForecast(), [])
  const partnerCondition = partnerHpPercent <= 25
    ? {
        label: 'Critical',
        detail: hasLatencyPatch && !latencyPatchUsed ? 'Use the Latency Patch or return to the Model Lab.' : 'Return to the Model Lab before another benchmark.',
        tone: 'critical',
      }
    : partnerHpPercent <= 55
      ? {
          label: 'Tired',
          detail: hasLatencyPatch && !latencyPatchUsed ? 'A patch is ready if the next battle gets rough.' : 'Guard timing matters until you can heal.',
          tone: 'tired',
        }
      : {
          label: 'Ready',
          detail: trainerDefeated ? 'Scout clearance synced. The route can push toward the gatehouse.' : 'Healthy enough for grass, scouting, and route errands.',
          tone: 'ready',
        }
  const partnerRouteRole = routeFlags.includes('Champion log read')
    ? 'Champion hook filed'
    : trainerDefeated
      ? 'Scout-cleared partner'
      : wildBenchmarkLogged
        ? 'Battle-ready partner'
        : 'Fresh lab partner'
  const trainerCardStamps = [
    {
      label: 'Starter',
      detail: starter ? starter.name : 'Choose a partner',
      complete: Boolean(starter),
      tone: 'starter',
    },
    {
      label: 'Wild Log',
      detail: wildBenchmarkLogged ? 'First benchmark filed' : 'Find Eval Grass',
      complete: wildBenchmarkLogged,
      tone: 'dex',
    },
    {
      label: 'Scout',
      detail: trainerDefeated ? 'Mira cleared' : 'Mira awaits',
      complete: trainerDefeated,
      tone: 'battle',
    },
    {
      label: 'Cache',
      detail: hasLatencyPatch ? 'Patch recovered' : 'Boardwalk cache',
      complete: hasLatencyPatch,
      tone: 'cache',
    },
    {
      label: 'Gate',
      detail: routeFlags.includes('Gatehouse entered') ? 'Lobby reached' : 'Ridge gate sealed',
      complete: routeFlags.includes('Gatehouse entered'),
      tone: 'gate',
    },
    {
      label: 'Champion',
      detail: routeFlags.includes('Champion log read') ? 'Log archived' : 'Terminal unread',
      complete: routeFlags.includes('Champion log read'),
      tone: 'champion',
    },
  ]
  const trainerCardRank = routeFlags.includes('Champion log read')
    ? 'Archive Scout'
    : trainerDefeated
      ? 'Gate Scout'
      : wildBenchmarkLogged
        ? 'Route Rookie'
        : 'Lab Rookie'
  const trainerCardProgress = Math.round((trainerCardStamps.filter((stamp) => stamp.complete).length / trainerCardStamps.length) * 100)

  const addRouteFlag = useCallback((flag: RouteFlag) => {
    setRouteFlags((flags) => appendRouteFlag(flags, flag))
  }, [])

  const flashOverworldEffect = useCallback((kind: OverworldEffectKind, effectPosition: Position) => {
    setOverworldEffect({ kind, position: effectPosition, nonce: Date.now() })
  }, [])

  const recordRouteFootstep = useCallback((mapId: MapId, stepPosition: Position, terrain: TerrainCode, stepFacing: Facing) => {
    const id = Date.now()
    setRouteFootsteps((footsteps) => [
      { id, mapId, position: stepPosition, terrain, facing: stepFacing },
      ...footsteps.filter((footstep) => footstep.mapId !== mapId || positionKey(footstep.position) !== positionKey(stepPosition)),
    ].slice(0, 10))
  }, [])

  const flashInputCue = useCallback((cue: InputCue) => {
    if (inputCueTimeoutRef.current !== null) {
      window.clearTimeout(inputCueTimeoutRef.current)
    }
    setInputCue(cue)
    inputCueTimeoutRef.current = window.setTimeout(() => {
      inputCueTimeoutRef.current = null
      setInputCue(null)
    }, INPUT_CUE_MS)
  }, [])

  const flashPlayerBump = useCallback((direction: Facing) => {
    if (bumpTimeoutRef.current !== null) {
      window.clearTimeout(bumpTimeoutRef.current)
    }
    setWalkDirection(null)
    setBumpDirection(direction)
    bumpTimeoutRef.current = window.setTimeout(() => {
      bumpTimeoutRef.current = null
      setBumpDirection(null)
    }, PLAYER_BUMP_ANIMATION_MS)
  }, [])

  const showSaveCeremony = useCallback((title: string, detail: string, tone: SaveCeremony['tone']) => {
    if (saveCeremonyTimeoutRef.current !== null) {
      window.clearTimeout(saveCeremonyTimeoutRef.current)
    }
    setSaveCeremony({ title, detail, tone, nonce: Date.now() })
    saveCeremonyTimeoutRef.current = window.setTimeout(() => {
      saveCeremonyTimeoutRef.current = null
      setSaveCeremony(null)
    }, 3600)
  }, [])

  const showRouteClearance = useCallback((title: string, detail: string) => {
    setRouteClearance({ title, detail, nonce: Date.now() })
  }, [])

  const showLabRecovery = useCallback((title: string, detail: string, hpBefore: number, hpAfter: number) => {
    setLabRecovery({ title, detail, hpBefore, hpAfter, nonce: Date.now() })
  }, [])

  const showMapTransition = useCallback((title: string, detail: string) => {
    setMapTransition({ title, detail, nonce: Date.now() })
  }, [])

  const showLandmarkToast = useCallback((landmark: LandmarkArea) => {
    setLandmarkToast({
      eyebrow: landmark.eyebrow,
      title: landmark.title,
      detail: landmark.detail,
      tone: landmark.tone,
      nonce: Date.now(),
    })
  }, [])

  const showChampionLog = useCallback((title: string, detail: string) => {
    setChampionLog({
      title,
      detail,
      teamIds: CHAMPION_TEAM,
      nonce: Date.now(),
    })
  }, [])

  const showBattleReturn = useCallback((eyebrow: string, title: string, detail: string, tone: BattleReturn['tone']) => {
    setBattleReturn({ eyebrow, title, detail, tone, nonce: Date.now() })
  }, [])

  const cancelEncounterIntro = useCallback(() => {
    if (encounterTimeoutRef.current !== null) {
      window.clearTimeout(encounterTimeoutRef.current)
      encounterTimeoutRef.current = null
    }
    if (grassEncounterTimeoutRef.current !== null) {
      window.clearTimeout(grassEncounterTimeoutRef.current)
      grassEncounterTimeoutRef.current = null
    }
    setEncounterIntro(null)
    setGrassEncounterCue(null)
  }, [])

  const cancelTrainerNotice = useCallback(() => {
    if (trainerNoticeTimeoutRef.current !== null) {
      window.clearTimeout(trainerNoticeTimeoutRef.current)
      trainerNoticeTimeoutRef.current = null
    }
    setTrainerNotice(null)
  }, [])

  useEffect(() => () => {
    if (walkTimeoutRef.current !== null) {
      window.clearTimeout(walkTimeoutRef.current)
    }
    if (bumpTimeoutRef.current !== null) {
      window.clearTimeout(bumpTimeoutRef.current)
    }
    if (inputCueTimeoutRef.current !== null) {
      window.clearTimeout(inputCueTimeoutRef.current)
    }
    if (saveCeremonyTimeoutRef.current !== null) {
      window.clearTimeout(saveCeremonyTimeoutRef.current)
    }
    if (trainerNoticeTimeoutRef.current !== null) {
      window.clearTimeout(trainerNoticeTimeoutRef.current)
    }
    if (grassEncounterTimeoutRef.current !== null) {
      window.clearTimeout(grassEncounterTimeoutRef.current)
    }
  }, [])

  const stopMusicNodes = useCallback(() => {
    if (musicLoopRef.current !== null) {
      window.clearInterval(musicLoopRef.current)
      musicLoopRef.current = null
    }
    currentMusicModeRef.current = null
    const context = audioContextRef.current
    const master = audioGainRef.current
    if (context && master) {
      const now = context.currentTime
      master.gain.cancelScheduledValues(now)
      master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), now)
      master.gain.exponentialRampToValueAtTime(0.0001, now + 0.12)
    }
  }, [])

  const startMusic = useCallback((mode: MusicMode) => {
    const context = audioContextRef.current
    const master = audioGainRef.current
    if (!context || !master || context.state === 'closed') {
      return
    }
    if (currentMusicModeRef.current === mode && musicLoopRef.current !== null) {
      return
    }
    if (musicLoopRef.current !== null) {
      window.clearInterval(musicLoopRef.current)
      musicLoopRef.current = null
    }
    currentMusicModeRef.current = mode
    const now = context.currentTime
    master.gain.cancelScheduledValues(now)
    master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), now)
    master.gain.exponentialRampToValueAtTime(mode === 'battle' ? 0.18 : 0.15, now + 0.18)
    scheduleMusic(context, master, mode)
    musicLoopRef.current = window.setInterval(() => scheduleMusic(context, master, mode), TITLE_AUDIO_LOOP_MS)
  }, [])

  const enableAudio = useCallback(() => {
    const context = audioContextRef.current ?? createAudioContext()
    if (!context) {
      return
    }
    audioContextRef.current = context
    if (!audioGainRef.current) {
      const master = context.createGain()
      master.gain.value = 0.0001
      master.connect(context.destination)
      audioGainRef.current = master
    }
    void context.resume().then(() => startMusic(musicModeForScreen(screen)))
  }, [screen, startMusic])

  const stopAudio = useCallback(() => {
    stopMusicNodes()
    setAudioOn(false)
  }, [stopMusicNodes])

  const toggleAudio = () => {
    if (audioOn) {
      stopAudio()
    } else {
      enableAudio()
      setAudioOn(true)
    }
  }

  const playSfx = useCallback((kind: SfxKind) => {
    if (!audioOn) {
      return
    }
    const context = audioContextRef.current
    const master = audioGainRef.current
    if (!context || !master || context.state === 'closed') {
      return
    }
    const now = context.currentTime
    const notes: Record<SfxKind, TitleNote[]> = {
      select: [{ frequency: 587.33, beat: 0, length: 0.08, volume: 0.035 }],
      confirm: [{ frequency: 523.25, beat: 0, length: 0.08, volume: 0.038 }, { frequency: 783.99, beat: 0.35, length: 0.1, volume: 0.034 }],
      step: [{ frequency: 164.81, beat: 0, length: 0.055, volume: 0.018, wave: 'triangle' }],
      bump: [{ frequency: 98, beat: 0, length: 0.12, volume: 0.032, wave: 'sawtooth' }],
      encounter: [{ frequency: 196, beat: 0, length: 0.12, volume: 0.052 }, { frequency: 392, beat: 0.5, length: 0.16, volume: 0.048 }],
      hit: [{ frequency: 146.83, beat: 0, length: 0.1, volume: 0.045, wave: 'sawtooth' }, { frequency: 98, beat: 0.4, length: 0.12, volume: 0.038, wave: 'sawtooth' }],
    }
    notes[kind].forEach((note) => scheduleTone(context, master, note, now))
  }, [audioOn])

  const persistSave = useCallback((saveState: SaveState, notice: string, withSfx = false) => {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(saveState))
    setHasSave(true)
    setSaveSummary(describeSave(saveState))
    setSaveProgress(saveProgressPercent(saveState))
    setSaveNotice(notice)
    showSaveCeremony('Journey saved', `${notice} ${describeSave(saveState)}`, 'saved')
    if (withSfx) {
      playSfx('confirm')
    }
  }, [playSfx, showSaveCeremony])

  const buildSaveState = useCallback((overrides: Partial<SaveState> = {}): SaveState | null => {
    if (!starter) {
      return null
    }
    return {
      starterId: starter.id,
      currentMapId,
      position,
      facing,
      discoveredIds,
      routeFlags,
      collectedItemIds,
      usedItemIds,
      partnerHp: displayedPartnerHp,
      trainerDefeated,
      routeMessage,
      savedAt: new Date().toISOString(),
      ...overrides,
    }
  }, [collectedItemIds, currentMapId, discoveredIds, displayedPartnerHp, facing, position, routeFlags, routeMessage, starter, trainerDefeated, usedItemIds])

  const saveGame = useCallback(() => {
    const saveState = buildSaveState()
    if (!saveState) {
      return
    }
    persistSave(saveState, `Saved ${new Date(saveState.savedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.`, true)
  }, [buildSaveState, persistSave])

  const loadGame = useCallback(() => {
    const rawSave = window.localStorage.getItem(SAVE_KEY)
    if (!rawSave) {
      setSaveNotice('No save data found.')
      showSaveCeremony('No save data', 'No trainer record was found on this device.', 'error')
      return
    }
    try {
      const parsed = JSON.parse(rawSave) as Partial<SaveState>
      if (!parsed.starterId || !parsed.currentMapId || !parsed.position || !parsed.facing || !(parsed.currentMapId in WORLD_MAPS)) {
        throw new Error('Invalid save')
      }
      const savedMapId = parsed.currentMapId as MapId
      const savedStarter = getModel(parsed.starterId)
      const savedDiscovered = parsed.discoveredIds?.filter((id) => MODELS.some((model) => model.id === id)) ?? [savedStarter.id]
      const savedMaxHp = maxHp(savedStarter)
      const savedPartnerHp = typeof parsed.partnerHp === 'number' ? Math.max(1, Math.min(parsed.partnerHp, savedMaxHp)) : savedMaxHp

      setStarter(savedStarter)
      setDexFocusId((focusId) => focusId && savedDiscovered.includes(focusId) ? focusId : savedDiscovered[savedDiscovered.length - 1] ?? savedStarter.id)
      setCurrentMapId(savedMapId)
      setPosition(parsed.position)
      setFacing(parsed.facing)
      setDiscoveredIds(savedDiscovered.length ? savedDiscovered : [savedStarter.id])
      setRouteFlags(parsed.routeFlags ?? ['Starter chosen'])
      setCollectedItemIds(parsed.collectedItemIds?.filter((id) => id === 'latencyPatch') ?? [])
      setUsedItemIds(parsed.usedItemIds?.filter((id) => id === 'latencyPatch') ?? [])
      setPartnerHp(savedPartnerHp)
      setTrainerDefeated(Boolean(parsed.trainerDefeated))
      setRouteMessage(parsed.routeMessage ?? `${savedStarter.name} rejoined your party.`)
      setBattle(null)
      setBattleEffect(null)
      setRouteClearance(null)
      setLabRecovery(null)
      setMapTransition(null)
      setLandmarkToast(null)
      setChampionLog(null)
      setBattleReturn(null)
      cancelTrainerNotice()
      setWalkDirection(null)
      cancelEncounterIntro()
      setDialogue(null)
      setScreen('map')
      setFieldMenuOpen(false)
      setHasSave(true)
      const loadedSaveState: SaveState = {
        starterId: savedStarter.id,
        currentMapId: savedMapId,
        position: parsed.position as Position,
        facing: parsed.facing as Facing,
        discoveredIds: savedDiscovered.length ? savedDiscovered : [savedStarter.id],
        routeFlags: parsed.routeFlags ?? ['Starter chosen'],
        collectedItemIds: parsed.collectedItemIds?.filter((id) => id === 'latencyPatch') ?? [],
        usedItemIds: parsed.usedItemIds?.filter((id) => id === 'latencyPatch') ?? [],
        partnerHp: savedPartnerHp,
        trainerDefeated: Boolean(parsed.trainerDefeated),
        routeMessage: parsed.routeMessage ?? `${savedStarter.name} rejoined your party.`,
        savedAt: parsed.savedAt ?? new Date().toISOString(),
      }
      setSaveSummary(describeSave(loadedSaveState))
      setSaveProgress(saveProgressPercent(loadedSaveState))
      const loadedNotice = parsed.savedAt ? `Loaded ${new Date(parsed.savedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.` : 'Loaded save.'
      setSaveNotice(loadedNotice)
      showSaveCeremony('Journey loaded', `${loadedNotice} ${savedStarter.name} is ready on ${WORLD_MAPS[savedMapId].title}.`, 'loaded')
      playSfx('confirm')
    } catch {
      setSaveNotice('Save data could not be loaded.')
      showSaveCeremony('Load failed', 'The trainer record could not be read.', 'error')
    }
  }, [cancelEncounterIntro, cancelTrainerNotice, playSfx, showSaveCeremony])

  const beginIntro = () => {
    playSfx('confirm')
    setScreen('intro')
    setRouteMessage('The benchmark tide is rising. Pick a partner before entering Route 01: Eval Grass.')
  }

  const chooseStarter = (model: LlmMon) => {
    playSfx('confirm')
    cancelEncounterIntro()
    cancelTrainerNotice()
    setStarter(model)
    setDexFocusId(model.id)
    setDiscoveredIds([model.id])
    setRouteFlags(['Starter chosen'])
    setCollectedItemIds([])
    setUsedItemIds([])
    setPartnerHp(maxHp(model))
    setRouteClearance(null)
    setLabRecovery(null)
    setMapTransition(null)
    setLandmarkToast(null)
    setChampionLog(null)
    setSaveCeremony(null)
    setBattleReturn(null)
    setWalkDirection(null)
    setBumpDirection(null)
    setCurrentMapId('route01')
    setPosition({ x: 3, y: 3 })
    setFacing('south')
    setRouteMessage(`${model.name} joined your party. Walk into the grass to benchmark your first wild LLM-mon.`)
    showSaveCeremony('Starter registered', `${model.name} joined your party. Your new journey begins on Route 01.`, 'starter')
    setScreen('map')
  }

  const toggleFieldMenu = useCallback(() => {
    if (screen !== 'map' || dialogue || encounterIntro || trainerNotice) {
      return
    }
    playSfx('select')
    setFieldMenuOpen((open) => !open)
  }, [dialogue, encounterIntro, playSfx, screen, trainerNotice])

  const useLatencyPatch = useCallback(() => {
    if (!starter) {
      return
    }
    if (!hasLatencyPatch) {
      setSaveNotice('No Latency Patch found.')
      return
    }
    if (latencyPatchUsed) {
      setSaveNotice('Latency Patch already used.')
      return
    }
    if (displayedPartnerHp >= partnerMaxHp) {
      setSaveNotice('Partner HP is already full.')
      return
    }
    const healedHp = Math.min(partnerMaxHp, displayedPartnerHp + LATENCY_PATCH_HEAL)
    setPartnerHp(healedHp)
    setUsedItemIds((ids) => ids.includes('latencyPatch') ? ids : [...ids, 'latencyPatch'])
    setRouteMessage(`Latency Patch applied. ${starter.name} recovered to ${healedHp}/${partnerMaxHp} HP.`)
    setSaveNotice('Latency Patch used.')
    playSfx('confirm')
  }, [displayedPartnerHp, hasLatencyPatch, latencyPatchUsed, partnerMaxHp, playSfx, starter])

  const startBattle = useCallback((opponent: LlmMon, kind: BattleKind, trainerName?: string, origin?: BattleOrigin) => {
    if (!starter) {
      return
    }
    const battleMap = origin ? WORLD_MAPS[origin.mapId] : currentMap
    const battlePosition = origin?.position ?? position
    const battleOrigin = battleOriginFor(battleMap, battlePosition, kind)
    cancelEncounterIntro()
    cancelTrainerNotice()
    setGrassEncounterCue(null)
    playSfx('encounter')
    setBattleEffect(null)
    setFieldMenuOpen(false)
    setEncounterIntro({ kind, opponentName: opponent.name, trainerName, nonce: Date.now() })
    setRouteMessage(kind === 'trainer' ? `${trainerName} locks eyes with you!` : `The grass thrashes. A wild ${opponent.name} is closing in!`)

    const playerHp = Math.max(1, Math.min(partnerHp || maxHp(starter), maxHp(starter)))
    encounterTimeoutRef.current = window.setTimeout(() => {
      encounterTimeoutRef.current = null
      setBattle({
        opponent,
        kind,
        trainerName,
        terrain: battleOrigin.terrain,
        locationLabel: battleOrigin.locationLabel,
        playerHp,
        enemyHp: maxHp(opponent),
        guard: 1,
        turn: 1,
        log: [kind === 'trainer' ? `${trainerName} challenged you with ${opponent.name}!` : `A wild ${opponent.name} appeared in the grass!`],
      })
      setEncounterIntro(null)
      setScreen('battle')
    }, ENCOUNTER_TRANSITION_MS)
  }, [cancelEncounterIntro, cancelTrainerNotice, currentMap, partnerHp, playSfx, position, starter])

  const startWildGrassEncounter = useCallback((opponent: LlmMon, encounterPosition: Position, terrainCode: TerrainCode) => {
    if (grassEncounterTimeoutRef.current !== null) {
      window.clearTimeout(grassEncounterTimeoutRef.current)
    }
    const origin = { mapId: currentMapId, terrainCode, position: encounterPosition }
    setGrassEncounterCue({ opponentName: opponent.name, position: encounterPosition, nonce: Date.now() })
    setRouteMessage(`Something is moving in the grass... ${opponent.name} is close!`)
    playSfx('select')
    grassEncounterTimeoutRef.current = window.setTimeout(() => {
      grassEncounterTimeoutRef.current = null
      setGrassEncounterCue(null)
      startBattle(opponent, 'wild', undefined, origin)
    }, GRASS_ENCOUNTER_CUE_MS)
  }, [currentMapId, playSfx, startBattle])

  const startDialogue = useCallback((speaker: string, lines: string[], after?: DialogueAfter) => {
    playSfx('select')
    setDialogue({ speaker, lines, index: 0, after })
  }, [playSfx])

  const showMiraNotice = useCallback((detail: string, lines: string[], after?: DialogueAfter) => {
    cancelTrainerNotice()
    playSfx('encounter')
    setTrainerNotice({
      speaker: 'Benchmark Scout Mira',
      title: 'Scout lock-on',
      detail,
      nonce: Date.now(),
    })
    setRouteMessage(`Benchmark Scout Mira spotted you: ${detail}`)
    trainerNoticeTimeoutRef.current = window.setTimeout(() => {
      trainerNoticeTimeoutRef.current = null
      setTrainerNotice(null)
      startDialogue('Benchmark Scout Mira', lines, after)
    }, TRAINER_NOTICE_MS)
  }, [cancelTrainerNotice, playSfx, startDialogue])

  const advanceDialogue = useCallback(() => {
    if (!dialogue) {
      return
    }
    playSfx('select')
    if (dialogue.index < dialogue.lines.length - 1) {
      setDialogue({ ...dialogue, index: dialogue.index + 1 })
      return
    }
    const after = dialogue.after
    setDialogue(null)
    if (after === 'miraBattle') {
      startBattle(getModel('deepseek-v4-pro-max'), 'trainer', 'Benchmark Scout Mira', { mapId: 'route01', terrainCode: 'T', position: MIRA_POSITION })
    }
  }, [dialogue, playSfx, startBattle])

  const movePlayer = useCallback((dx: number, dy: number) => {
    const nextFacing = dx > 0 ? 'east' : dx < 0 ? 'west' : dy < 0 ? 'north' : 'south'
    if (trainerNotice) {
      return
    }
    setFacing(nextFacing)
    if (screen !== 'map' || !starter || dialogue || fieldMenuOpen || encounterIntro || grassEncounterCue || trainerNotice) {
      return
    }
    const next = { x: position.x + dx, y: position.y + dy }
    const currentTerrain = effectiveTileAt(currentMap, position, collectedItemIds)
    const code = effectiveTileAt(currentMap, next, collectedItemIds)
    const npc = routeNpcAt(currentMapId, next, trainerDefeated, ambientTick)
    if (code === 'H') {
      const hopTarget = { x: next.x, y: next.y + 1 }
      const hopCode = effectiveTileAt(currentMap, hopTarget, collectedItemIds)
      const hopNpc = routeNpcAt(currentMapId, hopTarget, trainerDefeated, ambientTick)
      if (dx === 0 && dy > 0 && !hopNpc && !isBlocked(hopCode, trainerDefeated)) {
        playSfx('step')
        if (walkTimeoutRef.current !== null) {
          window.clearTimeout(walkTimeoutRef.current)
        }
        setWalkDirection('south')
        walkTimeoutRef.current = window.setTimeout(() => {
          walkTimeoutRef.current = null
          setWalkDirection(null)
        }, PLAYER_STEP_ANIMATION_MS)
        recordRouteFootstep(currentMapId, position, currentTerrain, nextFacing)
        setPosition(hopTarget)
        setStepNonce((nonce) => nonce + 1)
        flashOverworldEffect('hop', next)
        setRouteMessage(hopCode === 'G' ? 'You hopped the route ledge into rustling benchmark grass.' : 'You hopped down the one-way route ledge.')
        if (hopCode === 'G' && currentMap.hasWildEncounters) {
          setStepsInGrass((steps) => steps + 1)
          flashOverworldEffect('grass', hopTarget)
        }
        return
      }
      playSfx('bump')
      flashPlayerBump(nextFacing)
      flashOverworldEffect('bump', next)
      setRouteMessage('The ledge is one-way. Approach it from above and walk down to hop.')
      return
    }
    if (npc) {
      playSfx('bump')
      flashPlayerBump(nextFacing)
      flashOverworldEffect('talk', next)
      setRouteMessage(`${npc.name}: press A to talk.`)
      return
    }
    if (isBlocked(code, trainerDefeated)) {
      playSfx('bump')
      flashPlayerBump(nextFacing)
      flashOverworldEffect('bump', next)
      setRouteMessage(code === 'D' ? 'The first gym gate is locked for this vertical slice. Champion Andrej waits beyond future routes.' : code === 'I' ? 'A cache capsule is on the ground. Face it and press A to open it.' : `${TILE_LABELS[code]} blocks the path.`)
      return
    }
    playSfx('step')
    if (code === 'T' && !trainerDefeated) {
      if (discoveredIds.length <= 1) {
        flashOverworldEffect('talk', next)
        showMiraNotice('she checks your LLMdex before allowing a scout battle.', [
          'Hold it, trainer. Your LLMdex still only shows your starter partner.',
          'Step into the benchmark grass and log one wild model first. Then I can judge your route discipline.',
        ])
        return
      }
      showMiraNotice('your fresh wild benchmark log caught her attention.', [
        'Hold it! Your route log says you benchmarked in the grass.',
        'Good. Now show me whether your partner can balance speed, cost, and reasoning under pressure.',
      ], 'miraBattle')
      return
    }
    if (code === 'D' && trainerDefeated) {
      if (currentMapId === 'route01') {
        showMapTransition('Data Gym Gatehouse', 'Mira clearance accepted')
        setRouteFootsteps([])
        setCurrentMapId('gatehouse')
        setPosition({ x: 5, y: 5 })
        setFacing('north')
        setWalkDirection(null)
        setStepNonce((nonce) => nonce + 1)
        addRouteFlag('Gatehouse entered')
        setRouteMessage('The Data Gym gatehouse hums with sealed league terminals. This is the edge of the vertical slice.')
        return
      }
      showMapTransition('Route 01', 'Eval Grass south exit')
      setRouteFootsteps([])
      setCurrentMapId('route01')
      setPosition({ x: 13, y: 12 })
      setFacing('east')
      setWalkDirection(null)
      setStepNonce((nonce) => nonce + 1)
      setRouteMessage('You step back onto Route 01. The gatehouse lights flicker behind you.')
      return
    }
    if (walkTimeoutRef.current !== null) {
      window.clearTimeout(walkTimeoutRef.current)
    }
    if (bumpTimeoutRef.current !== null) {
      window.clearTimeout(bumpTimeoutRef.current)
      bumpTimeoutRef.current = null
    }
    setBumpDirection(null)
    setWalkDirection(nextFacing)
    walkTimeoutRef.current = window.setTimeout(() => {
      walkTimeoutRef.current = null
      setWalkDirection(null)
    }, PLAYER_STEP_ANIMATION_MS)
    recordRouteFootstep(currentMapId, position, currentTerrain, nextFacing)
    setPosition(next)
    setStepNonce((nonce) => nonce + 1)
    const landmark = landmarkAt(currentMapId, next)
    const newLandmark = landmark && (!landmark.flag || !routeFlags.includes(landmark.flag))
    if (landmark && newLandmark) {
      showLandmarkToast(landmark)
      if (landmark.flag) {
        addRouteFlag(landmark.flag)
      }
      setRouteMessage(landmark.routeMessage)
    }
    if (isMiraSightTile(currentMapId, next, trainerDefeated)) {
      setStepsInGrass(0)
      flashOverworldEffect('talk', MIRA_POSITION)
      if (discoveredIds.length <= 1) {
        showMiraNotice('she can see your route log from across the trainer lane.', [
          'Hey! I can see your route log from here.',
          'You still need one wild benchmark before I can scout your battle tempo.',
          'Use the grass around me, log a model, then cross my sight line again.',
        ])
        return
      }
      showMiraNotice('she locks onto your route and steps into battle tempo.', [
        'Trainer spotted! Your LLMdex has a fresh wild benchmark entry.',
        'Good routing. Now prove your partner can keep tempo when a scout is watching.',
      ], 'miraBattle')
      return
    }
    if (code === 'S') {
      setRouteMessage(currentMapId === 'gatehouse' ? 'Terminal placard: Badge requirements are locked until the next league slice.' : 'Sign: Open-weight LLM-mon are common in grass. Closed-source legends are rare encounters.')
      return
    }
    if (code === 'G' && currentMap.hasWildEncounters) {
      const grassSteps = stepsInGrass + 1
      setStepsInGrass(grassSteps)
      flashOverworldEffect('grass', next)
      setWalkDirection(nextFacing)
      if (grassSteps >= 2 && Math.random() < 0.42) {
        setStepsInGrass(0)
        startWildGrassEncounter(weightedEncounter(), next, code)
      } else {
        setRouteMessage(newLandmark && landmark ? landmark.routeMessage : 'The benchmark grass rustles with open-weight models.')
      }
      return
    }
    if (code === 'B') {
      addRouteFlag('Boardwalk reached')
    }
    if (!newLandmark) {
      setRouteMessage(code === 'L' ? 'Professor Karpathy: pick a starter and pursue the LLM-mon League.' : currentMapId === 'gatehouse' ? 'The gatehouse floor vibrates with future league machinery.' : code === 'B' ? 'The boardwalk crosses cached-water shallows toward the Data Gym ridge.' : 'Route 01: Eval Grass stretches toward the locked Data Gym gate.')
    }
  }, [addRouteFlag, ambientTick, collectedItemIds, currentMap, currentMapId, dialogue, discoveredIds.length, encounterIntro, fieldMenuOpen, flashOverworldEffect, flashPlayerBump, grassEncounterCue, playSfx, position, recordRouteFootstep, routeFlags, screen, showLandmarkToast, showMapTransition, showMiraNotice, starter, startWildGrassEncounter, stepsInGrass, trainerDefeated, trainerNotice])

  const inspectTile = useCallback(() => {
    if (encounterIntro || grassEncounterCue || trainerNotice) {
      return
    }
    if (fieldMenuOpen) {
      setFieldMenuOpen(false)
      return
    }
    if (dialogue) {
      advanceDialogue()
      return
    }
    playSfx('select')
    const target = frontPosition(position, facing)
    const code = effectiveTileAt(currentMap, target, collectedItemIds)
    const currentCode = effectiveTileAt(currentMap, position, collectedItemIds)
    const npc = routeNpcAt(currentMapId, target, trainerDefeated, ambientTick)
    if (npc) {
      addRouteFlag(npc.flag)
      flashOverworldEffect('talk', target)
      startDialogue(npc.name, dialogueLinesForNpc(npc, discoveredIds.length, trainerDefeated, collectedItemIds, routeFlags))
      return
    }
    const item = fieldItemAt(currentMapId, target)
    if (item && !collectedItemIds.includes(item.id)) {
      setCollectedItemIds((ids) => ids.includes(item.id) ? ids : [...ids, item.id])
      addRouteFlag(item.flag)
      flashOverworldEffect('pickup', target)
      setRouteMessage(`Found ${item.name}! ${item.detail}`)
      startDialogue('Route Cache', [
        `Found ${item.name}!`,
        item.detail,
        'The patch is now in your trainer kit. Use it from the field menu or during battle when HP gets low.',
      ])
      return
    }
    if (code === 'L' || currentCode === 'L') {
      const labTarget = code === 'L' ? target : position
      if (starter) {
        const healedHp = maxHp(starter)
        const hpBefore = displayedPartnerHp
        setPartnerHp(healedHp)
        showLabRecovery(
          'Model Lab recovery complete',
          hpBefore >= healedHp ? `${starter.name} was already fully calibrated.` : `${starter.name} recovered ${healedHp - hpBefore} HP and synced battle notes.`,
          hpBefore,
          healedHp,
        )
      }
      flashOverworldEffect('heal', labTarget)
      setRouteMessage(starter ? `Model Lab healed ${starter.name}. Strength = Intelligence Index; speed and TTFT shape battle tempo.` : 'Model Lab memo: Strength = Artificial Analysis Intelligence Index; speed and TTFT shape battle tempo.')
      startDialogue('Model Lab', starter ? [
        `${starter.name} synced with the lab terminal.`,
        'Professor Karpathy\'s note: Intelligence is strength, but route tempo is won with speed, cost, and guard timing.',
      ] : [
        'Professor Karpathy left three starter capsules ready.',
        'Choose a partner before stepping into Eval Grass.',
      ])
      return
    }
    if (code === 'S' || currentCode === 'S') {
      const signTarget = code === 'S' ? target : position
      if (currentMapId === 'gatehouse') {
        if (positionKey(signTarget) !== '4,3') {
          setRouteMessage('Terminal note: Gym badge simulations are compiling. Sol is guarding the champion log deeper inside.')
          startDialogue('Gatehouse Terminal', [
            'Badge simulations are compiling.',
            'Champion archive access is restricted to the west terminal after attendant clearance.',
          ])
          return
        }
        if (!routeFlags.includes('Gate attendant met')) {
          flashOverworldEffect('talk', { x: 5, y: 3 })
          setRouteMessage('The champion terminal asks for attendant clearance. Speak with Gate Attendant Sol first.')
          startDialogue('Champion Terminal', [
            'ACCESS HELD.',
            'A league attendant must authorize this trainer card before Champion Andrej\'s note can be read.',
          ])
          return
        }
        const nextRouteFlags = appendRouteFlag(routeFlags, 'Champion log read')
        const nextRouteMessage = positionKey(signTarget) === '4,3' ? 'Champion log: Andrej paired an OpenAI ace with an Anthropic wall, then sealed the Gym ladder for the next badge build.' : 'Terminal note: Gym badge simulations are compiling. Return to Route 01 after reading the champion log.'
        setRouteFlags(nextRouteFlags)
        flashOverworldEffect('pickup', signTarget)
        showRouteClearance('Vertical slice cleared', 'Champion Andrej logged the next badge hook. Save your journey or return to Route 01.')
        if (positionKey(signTarget) === '4,3') {
          showChampionLog(
            'Champion Andrej route note',
            'The next badge build teases a dual frontier team: an OpenAI ace for burst pressure and an Anthropic wall for long-form defense.',
          )
        }
        setRouteMessage(nextRouteMessage)
        startDialogue('Champion Terminal', [
          'CHAMPION ANDREJ // ROUTE NOTE',
          'A future badge build will test burst pressure against long-form defense.',
          'OpenAI ace. Anthropic wall. Bring a partner that can keep tempo through both.',
        ])
        const saveState = buildSaveState({
          routeFlags: nextRouteFlags,
          routeMessage: nextRouteMessage,
        })
        if (saveState) {
          persistSave(saveState, 'Checkpoint autosaved: champion log read.')
        }
        return
      }
      if (positionKey(signTarget) === '2,4') {
        setRouteMessage('Sign: Benchmarks are not badges. A steady model can beat a stronger one with better tempo.')
        startDialogue('Route Sign', [
          'Benchmarks are not badges.',
          'A steady model can beat a stronger one with better tempo.',
          'Trainer tip: Context Guard can turn a bad exchange into a route clear.',
        ])
      } else {
        setRouteMessage('Sign: The Data Gym opens in a future build. Champion Andrej was last seen beyond the ridge.')
        startDialogue('Route Sign', [
          'DATA GYM RIDGE',
          'The Gym opens in a future badge build.',
          'Champion Andrej was last seen beyond the north reader.',
        ])
      }
      return
    }
    if (code === 'T') {
      setRouteMessage(trainerDefeated ? 'Mira: Good routing. Next time, try winning with Context Guard before Benchmark Surge.' : discoveredIds.length <= 1 ? 'Mira: Log one wild LLM-mon before challenging me.' : 'Mira: Eyes up, trainer. Step into my lane when your benchmark log is ready.')
      startDialogue('Benchmark Scout Mira', trainerDefeated ? [
        'Good routing.',
        'Next time, try winning with Context Guard before Benchmark Surge. Scouts notice clean tempo.',
      ] : discoveredIds.length <= 1 ? [
        'Log one wild LLM-mon before challenging me.',
        'A starter-only route log does not tell me how you handle live benchmark pressure.',
      ] : [
        'Eyes up, trainer.',
        'Step into my lane when your benchmark log is ready.',
      ])
      return
    }
    if (code === 'D') {
      addRouteFlag('Gym gate scouted')
      setRouteMessage(trainerDefeated ? 'The gate reader accepts Mira\'s scout clearance. Step forward to enter the Data Gym gatehouse.' : 'A poster shows Champion Andrej with an OpenAI-type and an Anthropic-type. The League unlocks after this slice.')
      startDialogue('Data Gym Gate', trainerDefeated ? [
        'MIRA CLEARANCE ACCEPTED.',
        'Step forward to enter the Data Gym gatehouse.',
      ] : [
        'A poster shows Champion Andrej with an OpenAI-type and an Anthropic-type.',
        'The League unlocks after this vertical slice.',
      ])
      return
    }
    setRouteMessage(`${TILE_LABELS[code]} ahead: ${code === 'G' ? 'wild encounters favor open-weight LLM-mon.' : tileCue(code, trainerDefeated).detail}`)
  }, [addRouteFlag, advanceDialogue, ambientTick, buildSaveState, collectedItemIds, currentMap, currentMapId, dialogue, discoveredIds.length, displayedPartnerHp, encounterIntro, facing, fieldMenuOpen, flashOverworldEffect, grassEncounterCue, persistSave, playSfx, position, routeFlags, showChampionLog, showLabRecovery, showRouteClearance, startDialogue, starter, trainerDefeated, trainerNotice])

  const handleMove = useCallback((move: Move) => {
    if (!battle || !starter || battle.result) {
      return
    }

    if (move.id === 'context-guard') {
      playSfx('confirm')
      setBattleEffect({ phase: 'guard', nonce: battle.turn })
      setBattle({
        ...battle,
        guard: 0.52,
        turn: battle.turn + 1,
        log: [`${starter.name} raised Context Guard.`, ...battle.log].slice(0, 6),
      })
      return
    }

    playSfx('hit')
    const playerDamage = damageFor(starter, battle.opponent, move, 1)
    const nextEnemyHp = Math.max(0, battle.enemyHp - playerDamage)
    if (nextEnemyHp === 0) {
      setBattleEffect({ phase: 'exchange', nonce: battle.turn, playerDamage })
      setBattle({
        ...battle,
        enemyHp: 0,
        result: 'won',
        log: [`${starter.name} used ${move.name} for ${playerDamage}. ${battle.opponent.name} was benchmarked!`, ...battle.log].slice(0, 6),
      })
      if (battle.kind === 'trainer') {
        setTrainerDefeated(true)
      }
      return
    }

    const enemyMove = enemyMoveFor(battle.opponent)
    const enemyDamage = damageFor(battle.opponent, starter, enemyMove, battle.guard)
    setBattleEffect({ phase: 'exchange', nonce: battle.turn, playerDamage, enemyDamage })
    const nextPlayerHp = Math.max(0, battle.playerHp - enemyDamage)
    const guardText = battle.guard < 1 ? ' Context Guard softened the hit.' : ''
    setBattle({
      ...battle,
      playerHp: nextPlayerHp,
      enemyHp: nextEnemyHp,
      guard: 1,
      turn: battle.turn + 1,
      result: nextPlayerHp === 0 ? 'lost' : undefined,
      log: [
        `${starter.name} used ${move.name} for ${playerDamage}.`,
        `${battle.opponent.name} used ${enemyMove.name} for ${enemyDamage}.${guardText}`,
        ...battle.log,
      ].slice(0, 6),
    })
  }, [battle, playSfx, starter])

  const applyLatencyPatchInBattle = useCallback(() => {
    if (!battle || !starter || battle.result || !hasLatencyPatch || latencyPatchUsed) {
      return
    }
    const playerMax = maxHp(starter)
    if (battle.playerHp >= playerMax) {
      return
    }

    playSfx('confirm')
    const healedHp = Math.min(playerMax, battle.playerHp + LATENCY_PATCH_HEAL)
    setUsedItemIds((ids) => ids.includes('latencyPatch') ? ids : [...ids, 'latencyPatch'])

    const enemyMove = enemyMoveFor(battle.opponent)
    const enemyDamage = damageFor(battle.opponent, starter, enemyMove, battle.guard)
    const nextPlayerHp = Math.max(0, healedHp - enemyDamage)
    const guardText = battle.guard < 1 ? ' Context Guard softened the hit.' : ''
    setBattleEffect({ phase: 'exchange', nonce: battle.turn, enemyDamage })
    setBattle({
      ...battle,
      playerHp: nextPlayerHp,
      guard: 1,
      turn: battle.turn + 1,
      result: nextPlayerHp === 0 ? 'lost' : undefined,
      log: [
        `${starter.name} used Latency Patch and recovered to ${healedHp}/${playerMax}.`,
        `${battle.opponent.name} used ${enemyMove.name} for ${enemyDamage}.${guardText}`,
        ...battle.log,
      ].slice(0, 6),
    })
  }, [battle, hasLatencyPatch, latencyPatchUsed, playSfx, starter])

  const finishBattle = useCallback(() => {
    if (!battle) {
      return
    }
    playSfx('confirm')
    if (battle.result === 'won') {
      const nextDiscovered = appendDiscovered(discoveredIds, battle.opponent.id)
      const nextRouteFlags = battle.kind === 'wild'
        ? appendRouteFlag(routeFlags, 'First benchmark logged')
        : battle.kind === 'trainer'
          ? appendRouteFlag(routeFlags, 'Mira defeated')
          : routeFlags
      const nextPartnerHp = Math.max(1, battle.playerHp)
      const nextRouteMessage = battle.kind === 'trainer'
        ? 'Mira: Your benchmark discipline is real. The gate reader is open now. Scout the Data Gym gatehouse north of the route.'
        : `${battle.opponent.name} added an LLMdex entry and vanished into the tall grass.`
      setPartnerHp(nextPartnerHp)
      setDiscoveredIds(nextDiscovered)
      if (battle.kind === 'wild') {
        setRouteFlags(nextRouteFlags)
        showBattleReturn(
          'Field report',
          `${battle.opponent.name} registered`,
          routeFlags.includes('First benchmark logged')
            ? `${starter?.name ?? 'Your partner'} returned to the route with ${nextPartnerHp} HP.`
            : 'First wild benchmark logged. Mira will now accept your scout challenge.',
          'victory',
        )
        if (!routeFlags.includes('First benchmark logged')) {
          const saveState = buildSaveState({
            discoveredIds: nextDiscovered,
            routeFlags: nextRouteFlags,
            partnerHp: nextPartnerHp,
            routeMessage: nextRouteMessage,
          })
          if (saveState) {
            persistSave(saveState, 'Checkpoint autosaved: first wild benchmark logged.')
          }
        }
      }
      if (battle.kind === 'trainer') {
        setRouteFlags(nextRouteFlags)
        showBattleReturn(
          'Scout report',
          'Mira clearance synced',
          'The north gate reader is open. Search the boardwalk cache or step into the Data Gym lobby.',
          'clearance',
        )
        showRouteClearance('Scout Clearance earned', 'Mira synced your route log. The Data Gym gate reader is now open for scouting.')
        const saveState = buildSaveState({
          discoveredIds: nextDiscovered,
          routeFlags: nextRouteFlags,
          partnerHp: nextPartnerHp,
          trainerDefeated: true,
          routeMessage: nextRouteMessage,
        })
        if (saveState) {
          persistSave(saveState, 'Checkpoint autosaved: scout clearance earned.')
        }
      }
      setRouteMessage(nextRouteMessage)
      setBattleEffect(null)
      setBattle(null)
      setScreen('map')
      return
    }
    setRouteMessage('Professor Karpathy healed your starter and reminded you: latency matters as much as strength.')
    setPartnerHp(starter ? maxHp(starter) : 0)
    showBattleReturn(
      'Lab report',
      'Partner recalibrated',
      'Professor Karpathy returned you to the Model Lab with full HP. Try guarding before the next exchange.',
      'lab',
    )
    setBattleEffect(null)
    setBattle(null)
    setPosition({ x: 3, y: 3 })
    setCurrentMapId('route01')
    setScreen('map')
  }, [battle, buildSaveState, discoveredIds, persistSave, playSfx, routeFlags, showBattleReturn, showRouteClearance, starter])

  const runFromBattle = useCallback(() => {
    if (!battle || !starter || battle.result || battle.kind !== 'wild') {
      return
    }
    playSfx('select')
    setPartnerHp(Math.max(1, battle.playerHp))
    setRouteMessage(`${starter.name} slipped away from ${battle.opponent.name}. The benchmark grass settles behind you.`)
    showBattleReturn(
      'Route report',
      'Clean retreat',
      `${starter.name} kept ${Math.max(1, battle.playerHp)} HP and returned to the same patch of grass.`,
      'retreat',
    )
    setBattleEffect(null)
    setBattle(null)
    setScreen('map')
  }, [battle, playSfx, showBattleReturn, starter])

  useEffect(() => {
    if (!battleEffect) {
      return
    }
    const timeout = window.setTimeout(() => setBattleEffect(null), BATTLE_EFFECT_MS)
    return () => window.clearTimeout(timeout)
  }, [battleEffect])

  useEffect(() => {
    if (!overworldEffect) {
      return
    }
    const timeout = window.setTimeout(() => setOverworldEffect(null), 1250)
    return () => window.clearTimeout(timeout)
  }, [overworldEffect])

  useEffect(() => {
    if (!routeClearance) {
      return
    }
    const timeout = window.setTimeout(() => setRouteClearance(null), 4200)
    return () => window.clearTimeout(timeout)
  }, [routeClearance])

  useEffect(() => {
    if (!labRecovery) {
      return
    }
    const timeout = window.setTimeout(() => setLabRecovery(null), 3600)
    return () => window.clearTimeout(timeout)
  }, [labRecovery])

  useEffect(() => {
    if (!mapTransition) {
      return
    }
    const timeout = window.setTimeout(() => setMapTransition(null), MAP_TRANSITION_MS)
    return () => window.clearTimeout(timeout)
  }, [mapTransition])

  useEffect(() => {
    if (!landmarkToast) {
      return
    }
    const timeout = window.setTimeout(() => setLandmarkToast(null), 3600)
    return () => window.clearTimeout(timeout)
  }, [landmarkToast])

  useEffect(() => {
    if (!championLog) {
      return
    }
    const timeout = window.setTimeout(() => setChampionLog(null), 6800)
    return () => window.clearTimeout(timeout)
  }, [championLog])

  useEffect(() => {
    if (!battleReturn) {
      return
    }
    const timeout = window.setTimeout(() => setBattleReturn(null), 4200)
    return () => window.clearTimeout(timeout)
  }, [battleReturn])

  useEffect(() => {
    if (screen !== 'map' || dialogue || fieldMenuOpen || encounterIntro || grassEncounterCue || trainerNotice) {
      return
    }
    const interval = window.setInterval(() => {
      setAmbientTick((tick) => tick + 1)
    }, AMBIENT_TICK_MS)
    return () => window.clearInterval(interval)
  }, [dialogue, encounterIntro, fieldMenuOpen, grassEncounterCue, screen, trainerNotice])

  useEffect(() => {
    if (audioOn) {
      startMusic(musicModeForScreen(screen))
    } else {
      stopMusicNodes()
    }
  }, [audioOn, screen, startMusic, stopMusicNodes])

  useEffect(() => stopMusicNodes, [stopMusicNodes])

  useEffect(() => cancelEncounterIntro, [cancelEncounterIntro])

  useEffect(() => cancelTrainerNotice, [cancelTrainerNotice])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (screen === 'battle') {
        if (!battle || !starter) {
          return
        }
        const key = event.key.toLowerCase()
        if (battle.result) {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            finishBattle()
          }
          return
        }
        const moveIndex = Number(event.key) - 1
        if (moveIndex >= 0 && moveIndex < activeMoves.length) {
          event.preventDefault()
          handleMove(activeMoves[moveIndex])
          return
        }
        if (event.key === '5') {
          event.preventDefault()
          applyLatencyPatchInBattle()
          return
        }
        if (key === 'r' && battle.kind === 'wild') {
          event.preventDefault()
          runFromBattle()
        }
        return
      }
      if (screen !== 'map') {
        return
      }
      if (trainerNotice || grassEncounterCue) {
        event.preventDefault()
        return
      }
      const now = Date.now()
      const canMoveFromKeyboard = () => {
        if (!event.repeat) {
          lastKeyboardMoveRef.current = now
          return true
        }
        if (now - lastKeyboardMoveRef.current < KEY_REPEAT_MOVE_MS) {
          return false
        }
        lastKeyboardMoveRef.current = now
        return true
      }
      if (fieldMenuOpen) {
        if (event.key.toLowerCase() === 's') {
          event.preventDefault()
          flashInputCue('action')
          saveGame()
          return
        }
        if (event.key.toLowerCase() === 'l') {
          event.preventDefault()
          flashInputCue('action')
          loadGame()
          return
        }
        if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ' || event.key.toLowerCase() === 'm') {
          event.preventDefault()
          flashInputCue('menu')
          setFieldMenuOpen(false)
        }
        return
      }
      if (dialogue) {
        if (event.key === 'Enter' || event.key === ' ' || event.key.toLowerCase() === 'a') {
          event.preventDefault()
          flashInputCue('action')
          advanceDialogue()
        }
        return
      }
      if (event.key === 'ArrowUp' || event.key.toLowerCase() === 'w') {
        event.preventDefault()
        if (!canMoveFromKeyboard()) {
          return
        }
        flashInputCue('north')
        movePlayer(0, -1)
      }
      if (event.key === 'ArrowDown' || event.key.toLowerCase() === 's') {
        event.preventDefault()
        if (!canMoveFromKeyboard()) {
          return
        }
        flashInputCue('south')
        movePlayer(0, 1)
      }
      if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') {
        event.preventDefault()
        if (!canMoveFromKeyboard()) {
          return
        }
        flashInputCue('west')
        movePlayer(-1, 0)
      }
      if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') {
        event.preventDefault()
        if (!canMoveFromKeyboard()) {
          return
        }
        flashInputCue('east')
        movePlayer(1, 0)
      }
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        flashInputCue('action')
        inspectTile()
      }
      if (event.key.toLowerCase() === 'm') {
        event.preventDefault()
        flashInputCue('menu')
        toggleFieldMenu()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeMoves, advanceDialogue, applyLatencyPatchInBattle, battle, dialogue, fieldMenuOpen, finishBattle, flashInputCue, grassEncounterCue, handleMove, inspectTile, loadGame, movePlayer, runFromBattle, saveGame, screen, starter, toggleFieldMenu, trainerNotice])

  const renderTitle = () => (
    <main className="screen title-screen">
      <div className="skyline" />
      <div className="title-bubbles" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="title-legends" aria-hidden="true">
        <span className="legend-shape legend-left" />
        <span className="legend-shape legend-right" />
      </div>
      <section className="title-card pixel-panel">
        <p className="eyebrow">Hayes Valley benchmark version</p>
        <h1 className="title-logo" aria-label="LLMmon"><span>LLM</span><span>mon</span></h1>
        <p className="title-copyright">@2026 arjun krishna</p>
        <div className="title-status-strip" aria-label="Cartridge record">
          <span><em>Region</em> Hayes Valley</span>
          <span><em>Route</em> Route 01</span>
          <span><em>Record</em> {hasSave ? `${saveProgress}%` : 'New'}</span>
          <i aria-hidden="true" />
        </div>
        <p className="press-start">Press Start / Click Start New Journey</p>
        {hasSave ? (
          <div className="continue-summary" aria-label="Saved journey">
            <span>Saved journey</span>
            <strong>{saveSummary || 'Save data ready'}</strong>
            <i className="continue-progress" style={{ '--continue-progress': `${saveProgress}%` } as CSSProperties} aria-hidden="true" />
            <em>{saveProgress}% route record</em>
          </div>
        ) : null}
        {hasSave ? <p className="new-journey-note">Starting fresh keeps this save until you save the new route.</p> : null}
        <div className="title-actions">
          {hasSave ? <button className="pixel-button secondary" onClick={loadGame}>Continue journey</button> : null}
          <button className="pixel-button" onClick={beginIntro}>Start new journey</button>
          <button className="pixel-button secondary" onClick={() => {
            playSfx('select')
            setScreen('llmdex')
          }}>Open LLMdex</button>
          <button className={`pixel-button sound-toggle ${audioOn ? 'is-on' : ''}`} onClick={toggleAudio}>{audioOn ? 'Mute audio' : 'Play audio'}</button>
        </div>
      </section>
    </main>
  )

  const renderIntro = () => (
    <main className="screen intro-screen">
      <section className="pixel-panel professor-lab-panel">
        <div className="professor-stage">
          <div className="professor-sprite-frame">
            <img src={MAP_ASSETS.professor} alt="Professor Karpathy" />
          </div>
          <div className="lab-orb lab-orb-openai" />
          <div className="lab-orb lab-orb-anthropic" />
          <div className="lab-orb lab-orb-zai" />
        </div>
        <div className="dialogue-box">
          <p className="eyebrow">Professor Karpathy</p>
          <h2>Welcome to the Hayes Valley Region.</h2>
          <p>
            LLM-mon live inside benchmark grass, provider clouds, and long-context caves. Trainers battle by balancing latency,
            cost, speed, and intelligence instead of elemental firepower.
          </p>
          <p>
            Choose a starter LLM-mon, cross Route 01, survive one wild encounter, and challenge Benchmark Scout Mira before the locked Data Gym gate.
          </p>
          <button className="pixel-button dialogue-advance" onClick={() => setScreen('starter')}>Choose starter ▾</button>
        </div>
      </section>
    </main>
  )

  const renderStarter = () => (
    <main className="screen starter-screen">
      <section className="pixel-panel wide-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Model Lab</p>
            <h2>Choose your starter LLM-mon</h2>
          </div>
          <button className="pixel-button secondary" onClick={() => setScreen('llmdex')}>Open LLMdex</button>
        </div>
        <section className="starter-analyzer" aria-label="Professor starter analyzer">
          <div className="starter-preview-stage">
            <Sprite model={previewStarter} />
            <span className="starter-preview-ring" style={{ '--starter-type-color': TYPE_COLORS[previewStarter.type] } as CSSProperties} aria-hidden="true" />
          </div>
          <div className="starter-preview-copy">
            <p className="eyebrow">Professor's analyzer</p>
            <h3>{previewStarter.name}</h3>
            <div className="starter-preview-badges">
              <TypeBadge type={previewStarter.type} />
              <span>{previewStarterProfile.role}</span>
              <span>{costLabel(previewStarter.stats.blendedCost)}</span>
            </div>
            <p>{previewStarterProfile.routeRead}</p>
            <div className="starter-plan-strip">
              <span>
                <b>First plan</b>
                <strong>{previewStarterProfile.firstPlan}</strong>
              </span>
              <span>
                <b>Lab note</b>
                <strong>{previewStarterProfile.professorNote}</strong>
              </span>
            </div>
          </div>
        </section>
        <div className="starter-grid">
          {starters.map((model) => (
            <ModelCard
              key={model.id}
              model={model}
              selectable
              selected={model.id === previewStarter.id}
              onPreview={() => setStarterPreviewId(model.id)}
              onChoose={() => chooseStarter(model)}
            />
          ))}
        </div>
      </section>
    </main>
  )

  const renderMap = () => {
    const minimapLandmarks = LANDMARK_AREAS
      .filter((area) => area.mapId === currentMapId)
      .map((area) => ({
        ...area,
        center: {
          x: (area.bounds.x1 + area.bounds.x2 + 1) / 2,
          y: (area.bounds.y1 + area.bounds.y2 + 1) / 2,
        },
        mapped: !area.flag || routeFlags.includes(area.flag),
      }))
    const cameraX = Math.min(Math.max(position.x - 5, 0), Math.max(0, currentMap.tiles[0].length - 10))
    const cameraY = Math.min(Math.max(position.y - 4, 0), Math.max(0, currentMap.tiles.length - 8))
    const objectiveOnCurrentMap = objectiveTarget.mapId === currentMapId
    const objectiveDelta = objectiveOnCurrentMap
      ? { x: objectiveTarget.position.x - position.x, y: objectiveTarget.position.y - position.y }
      : null
    const objectiveBearing = objectiveDelta
      ? objectiveDelta.x === 0 && objectiveDelta.y === 0
        ? 'Here'
        : `${objectiveDelta.y < 0 ? 'N' : objectiveDelta.y > 0 ? 'S' : ''}${objectiveDelta.x < 0 ? 'W' : objectiveDelta.x > 0 ? 'E' : ''}`
      : WORLD_MAPS[objectiveTarget.mapId].title
    const minimapRouteGuide = objectiveOnCurrentMap
      ? (() => {
          const width = currentMap.tiles[0].length
          const height = currentMap.tiles.length
          const fromX = ((position.x + 0.5) / width) * 100
          const fromY = ((position.y + 0.5) / height) * 100
          const toX = ((objectiveTarget.position.x + 0.5) / width) * 100
          const toY = ((objectiveTarget.position.y + 0.5) / height) * 100
          const deltaX = toX - fromX
          const deltaY = toY - fromY
          return {
            left: `${fromX}%`,
            top: `${fromY}%`,
            width: `${Math.hypot(deltaX, deltaY)}%`,
            transform: `rotate(${Math.atan2(deltaY, deltaX)}rad)`,
          }
        })()
      : null
    const routeIntroChips = currentMapId === 'route01'
      ? [
          currentMap.hasWildEncounters ? 'Wild benchmarks' : 'No encounters',
          trainerDefeated ? 'Mira cleared' : wildBenchmarkLogged ? 'Scout ready' : 'Log one wild model',
          collectedItemIds.includes('latencyPatch') ? 'Cache found' : 'Cache hidden',
        ]
      : [
          'No wild encounters',
          routeFlags.includes('Gate attendant met') ? 'Sol authorized' : 'Find Sol',
          routeFlags.includes('Champion log read') ? 'Champion log read' : 'Terminal locked',
        ]

    return (
    <main className="screen map-screen">
      <section className="game-layout">
        <div className="pixel-panel map-panel">
          <div className="map-header">
            <div>
              <p className="eyebrow">{currentMap.eyebrow}</p>
              <h2>{currentMap.title}</h2>
              <span className="location-pill">{currentMap.subtitle}</span>
            </div>
            <button className="pixel-button secondary" onClick={() => setScreen('llmdex')}>LLMdex</button>
          </div>
          <div className={`route-compass compass-${storyBeat.tone}`} aria-label="Route compass">
            <div>
              <span>Area</span>
              <strong>{currentLandmark?.title ?? currentMap.title}</strong>
            </div>
            <div>
              <span>Thread</span>
              <strong>{storyBeat.title}</strong>
            </div>
            <div>
              <span>Next</span>
              <strong>{objectiveTarget.label}</strong>
            </div>
            <em>{objectiveDistance === null ? WORLD_MAPS[objectiveTarget.mapId].title : objectiveDistance === 0 ? 'Here' : `${objectiveDistance} tiles`}</em>
          </div>
          {frontCommand ? (
            <div className={`field-command-plaque command-${frontTargetPrompt?.kind ?? 'inspect'}`} role="status" aria-live="polite">
              <span>A</span>
              <strong>{frontCommand.verb}: {frontTargetPrompt?.label}</strong>
              <p>{frontCommand.detail}</p>
            </div>
          ) : null}
          <div
            className={`map-viewport map-${currentMapId} ${grassEncounterCue ? 'is-grass-locking' : ''} ${encounterIntro ? 'is-encountering' : ''}`}
            style={{
              '--camera-x': cameraX,
              '--camera-y': cameraY,
            } as CSSProperties}
          >
            <div className="map-parallax-depth" aria-hidden="true">
              <span className="parallax-band parallax-skyline" />
              <span className="parallax-band parallax-midground" />
              <span className="parallax-band parallax-shadow" />
            </div>
            <div className={`route-atmosphere atmosphere-${currentMapId}`} aria-hidden="true">
              <span className="atmosphere-layer atmosphere-drift" />
              <span className="atmosphere-layer atmosphere-sparkle" />
              <span className="atmosphere-layer atmosphere-scanline" />
            </div>
            <div
              className="tile-map"
              role="application"
              aria-label="LLM-mon route map"
              style={{
                gridTemplateColumns: `repeat(${currentMap.tiles[0].length}, var(--route-tile-size))`,
                width: `calc(${currentMap.tiles[0].length} * var(--route-tile-size))`,
                height: `calc(${currentMap.tiles.length} * var(--route-tile-size))`,
                transform: `translate3d(calc(${cameraX} * var(--route-tile-size) * -1), calc(${cameraY} * var(--route-tile-size) * -1), 0)`,
              }}
            >
              {currentMap.tiles.map((row, y) =>
                row.map((code, x) => {
                  const playerHere = position.x === x && position.y === y
                  const tilePosition = { x, y }
                  const codeForRender = code === 'T' && trainerDefeated ? '.' : effectiveTileAt(currentMap, tilePosition, collectedItemIds)
                  const miraScene = codeForRender === 'T' && dialogue?.speaker === 'Benchmark Scout Mira'
                  const visibleNpc = routeNpcAt(currentMapId, tilePosition, trainerDefeated, ambientTick)
                  const npcActive = Boolean(visibleNpc && dialogue?.speaker === visibleNpc.name)
                  const npcFacing = visibleNpc ? npcActive ? oppositeFacing(facing) : ambientNpcFacing(visibleNpc, ambientTick) : undefined
                  const npcWalking = visibleNpc && !npcActive ? npcWalkDirection(visibleNpc, ambientTick) : null
                  const npcPlate = visibleNpc ? npcRolePlate(visibleNpc) : null
                  const playerInGrass = playerHere && codeForRender === 'G'
                  const tileEffect = overworldEffect?.position.x === x && overworldEffect.position.y === y ? overworldEffect : null
                  const routeFootstep = routeFootsteps.find((footstep) => footstep.mapId === currentMapId && footstep.position.x === x && footstep.position.y === y)
                  const grassCueHere = grassEncounterCue?.position.x === x && grassEncounterCue.position.y === y ? grassEncounterCue : null
                  const miraSightLine = isMiraSightTile(currentMapId, tilePosition, trainerDefeated) && discoveredIds.length > 1
                  const championTerminalRead = currentMapId === 'gatehouse' && codeForRender === 'S' && positionKey(tilePosition) === '4,3' && routeFlags.includes('Champion log read')
                  const championTerminal = currentMapId === 'gatehouse' && codeForRender === 'S' && positionKey(tilePosition) === '4,3'
                  const championTerminalAuthorized = championTerminal && routeFlags.includes('Gate attendant met') && !routeFlags.includes('Champion log read')
                  const championTerminalLocked = championTerminal && !routeFlags.includes('Gate attendant met')
                  const gatehouseGuideFloor = currentMapId === 'gatehouse' && codeForRender === 'F' && ((x === 5 && y >= 3 && y <= 5) || (y === 3 && x >= 4 && x <= 5))
                  const depthClasses = tileDepthClasses(currentMap, tilePosition, codeForRender)
                  const elevationClasses = tileElevationClasses(currentMapId, tilePosition, codeForRender)
                  const neighborClasses = tileNeighborClasses(currentMap, tilePosition, codeForRender)
                  const routeDecoration = routeDecorationFor(currentMapId, codeForRender, x, y)
                  const ambientDetail = ambientDetailFor(currentMapId, codeForRender, x, y, ambientTick)
                  const landmarkMarker = landmarkMarkerAt(currentMapId, tilePosition)
                  const landmarkMapped = landmarkMarker && (!landmarkMarker.flag || routeFlags.includes(landmarkMarker.flag))
                  const objectAffordance = codeForRender === 'S'
                    ? currentMapId === 'gatehouse'
                      ? championTerminalRead
                        ? 'terminal-read'
                        : championTerminalAuthorized
                          ? 'terminal-ready'
                          : 'terminal-locked'
                      : 'sign'
                    : codeForRender === 'I'
                      ? 'cache'
                      : codeForRender === 'D'
                        ? trainerDefeated ? 'gate-open' : 'gate-locked'
                        : codeForRender === 'L'
                          ? 'lab'
                          : null
                  const objectiveHere = objectiveTarget.mapId === currentMapId && objectiveTarget.position.x === x && objectiveTarget.position.y === y
                  return (
                    <div
                      key={`${x}-${y}`}
                      className={`tile tile-${codeForRender === '.' ? 'path' : codeForRender} ${depthClasses} ${elevationClasses} ${neighborClasses} ${playerInGrass ? 'tile-player-in-grass' : ''} ${codeForRender === 'D' && trainerDefeated ? 'tile-gate-open' : ''} ${championTerminalRead ? 'tile-terminal-read' : ''} ${championTerminalAuthorized ? 'tile-terminal-authorized' : ''} ${championTerminalLocked ? 'tile-terminal-locked' : ''} ${gatehouseGuideFloor ? 'tile-guide-floor' : ''}`}
                      title={TILE_LABELS[codeForRender]}
                      style={{ zIndex: y * 2 + tileDepthBoost(currentMap, tilePosition, codeForRender) + (codeForRender === 'C' || playerHere || codeForRender === 'T' || visibleNpc ? 2 : 0) }}
                    >
                      <span className="tile-contact-shadow" aria-hidden="true" />
                      <span className="tile-height-face" aria-hidden="true" />
                      <img className="tile-art" src={tileImageFor(codeForRender, x, y)} alt="" />
                      {neighborClasses ? <span className="terrain-seams" aria-hidden="true" /> : null}
                      {routeFootstep ? <span key={routeFootstep.id} className={`route-footstep footstep-${routeFootstep.terrain === '.' ? 'path' : routeFootstep.terrain} footstep-facing-${routeFootstep.facing}`} aria-hidden="true" /> : null}
                      {routeDecoration ? <span className={`route-decor decor-${routeDecoration}`} aria-hidden="true" /> : null}
                      {ambientDetail ? <span className={`ambient-detail ambient-${ambientDetail} ambient-phase-${(x + y + ambientTick) % 4}`} aria-hidden="true" /> : null}
                      {landmarkMarker ? (
                        <span className={`landmark-plaque plaque-${landmarkMarker.tone} ${landmarkMapped ? 'is-mapped' : 'is-unmapped'}`} aria-label={`${landmarkMapped ? landmarkMarker.title : 'Unmapped landmark'} marker`}>
                          <b>{landmarkMapped ? landmarkMarker.eyebrow : 'Survey'}</b>
                          <em>{landmarkMapped ? landmarkMarker.title : '?'}</em>
                        </span>
                      ) : null}
                      {objectiveHere ? (
                        <span className={`objective-marker objective-${objectiveTarget.kind}`} aria-label={`Next objective: ${objectiveTarget.label}`}>
                          <i aria-hidden="true" />
                          <em>{objectiveTarget.label}</em>
                        </span>
                      ) : null}
                      {codeForRender === 'G' ? <span className="grass-shimmer" /> : null}
                      {playerInGrass ? <span className="grass-foreground" aria-hidden="true" /> : null}
                      {codeForRender === '.' && (x + y) % 4 === 0 ? <span className="route-pebble" /> : null}
                      {codeForRender === 'R' ? <span className="ridge-highlight" /> : null}
                      {codeForRender === 'H' ? <span className="ledge-lip" aria-hidden="true" /> : null}
                      {codeForRender === 'C' ? <span className="tree-canopy" /> : null}
                      {codeForRender === 'B' ? (
                        <>
                          <span className="boardwalk-rail" />
                          <span className="boardwalk-shine" aria-hidden="true" />
                        </>
                      ) : null}
                      {codeForRender === 'W' ? (
                        <>
                          <span className="water-current" aria-hidden="true" />
                          <span className="water-sparkle" />
                        </>
                      ) : null}
                      {codeForRender === 'M' ? <span className="terminal-scan" aria-hidden="true" /> : null}
                      {gatehouseGuideFloor ? <span className="floor-guide-arrow" aria-hidden="true" /> : null}
                      {championTerminalAuthorized ? <span className="terminal-authorized-glow" aria-hidden="true" /> : null}
                      {championTerminalLocked ? <span className="terminal-lock-light" aria-hidden="true" /> : null}
                      {miraSightLine ? <span className="trainer-sight-line" aria-hidden="true" /> : null}
                      {frontTile.x === x && frontTile.y === y && !playerHere ? (
                        <>
                          <span className="interaction-cursor" />
                          {frontTargetPrompt ? (
                            <span className={`front-target-prompt prompt-${frontTargetPrompt.kind}`}>
                              <b>A</b>
                              <em>{frontTargetPrompt.label}</em>
                            </span>
                          ) : null}
                        </>
                      ) : null}
                      {tileEffect ? <span key={`${tileEffect.kind}-${tileEffect.nonce}`} className={`overworld-effect effect-${tileEffect.kind}`} /> : null}
                      {grassCueHere ? (
                        <span key={grassCueHere.nonce} className="grass-encounter-cue" aria-label={`Wild ${grassCueHere.opponentName} is moving in the grass`}>
                          <i aria-hidden="true" />
                          <em>{grassCueHere.opponentName}</em>
                        </span>
                      ) : null}
                      {codeForRender === 'S' ? <span className="sign-marker">!</span> : null}
                      {codeForRender === 'I' ? <span className="field-capsule" aria-label={fieldItemAt(currentMapId, tilePosition)?.name ?? 'Cache capsule'} /> : null}
                      {objectAffordance ? <span className={`object-affordance affordance-${objectAffordance}`} aria-hidden="true" /> : null}
                      {codeForRender === 'T' ? (
                        <>
                          <span className={`trainer-alert ${miraScene ? 'trainer-alert-scene' : ''}`}>!</span>
                          <OverworldCharacter src={MAP_ASSETS.trainer} alt="Benchmark Scout Mira" kind="npc" active={miraScene} />
                        </>
                      ) : null}
                      {visibleNpc && !playerHere ? (
                        <>
                          {npcPlate && !npcActive ? <span className={`npc-role-plate npc-role-${npcPlate.tone}`} aria-hidden="true">{npcPlate.label}</span> : null}
                          {!npcActive ? <span className="npc-idle-cue" aria-hidden="true">...</span> : null}
                          <OverworldCharacter
                            src={MAP_ASSETS[visibleNpc.sprite]}
                            alt={visibleNpc.name}
                            kind="npc"
                            facing={npcFacing}
                            stepNonce={ambientTick}
                            walking={npcWalking}
                            active={npcActive}
                          />
                        </>
                      ) : null}
                      {codeForRender === 'D' ? <span className="gate">GYM</span> : null}
                      {playerHere ? <OverworldCharacter src={MAP_ASSETS.player} alt="Player" kind="player" facing={facing} stepNonce={stepNonce} walking={walkDirection} bumped={bumpDirection} active={Boolean(dialogue)} /> : null}
                    </div>
                  )
                }),
              )}
            </div>
            <div className="route-foreground-depth" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <div key={currentMapId} className={`route-name-banner route-banner-${currentMapId}`} role="status" aria-live="polite">
              <span>{currentMap.eyebrow}</span>
              <strong>{currentMap.title}</strong>
              <em>{currentMap.subtitle}</em>
              <p>{currentMap.introLine}</p>
              <div className="route-banner-stamps" aria-hidden="true">
                {routeIntroChips.map((chip) => <i key={chip}>{chip}</i>)}
              </div>
            </div>
            {encounterIntro ? (
              <div key={encounterIntro.nonce} className={`encounter-intro encounter-${encounterIntro.kind}`} aria-live="assertive">
                <span>{encounterIntro.kind === 'trainer' ? 'Trainer sighted' : 'Wild benchmark'}</span>
                <strong>{encounterIntro.kind === 'trainer' ? encounterIntro.trainerName : encounterIntro.opponentName}</strong>
              </div>
            ) : null}
            {trainerNotice ? (
              <div key={trainerNotice.nonce} className="trainer-notice-scene" role="status" aria-live="assertive">
                <div className="trainer-notice-line" aria-hidden="true" />
                <div className="trainer-notice-card">
                  <span>!</span>
                  <div>
                    <strong>{trainerNotice.title}</strong>
                    <p>{trainerNotice.speaker}</p>
                    <em>{trainerNotice.detail}</em>
                  </div>
                </div>
              </div>
            ) : null}
            {landmarkToast ? (
              <div key={landmarkToast.nonce} className={`landmark-toast landmark-${landmarkToast.tone}`} role="status" aria-live="polite">
                <span>{landmarkToast.eyebrow}</span>
                <strong>{landmarkToast.title}</strong>
                <p>{landmarkToast.detail}</p>
              </div>
            ) : null}
          </div>
          <div className="map-status-row">
            <span>Tile {position.x + 1}, {position.y + 1}</span>
            <span>{TILE_LABELS[effectiveTileAt(currentMap, position, collectedItemIds)]}</span>
            <span>{currentMapId === 'gatehouse' ? 'Gatehouse scouted' : trainerDefeated ? 'Scout cleared' : 'Scout ahead'}</span>
            <span>Facing {facing}</span>
          </div>
          {routeClearance ? (
            <div key={routeClearance.nonce} className="route-clearance-card" role="status" aria-live="polite">
              <span>Route checkpoint</span>
              <strong>{routeClearance.title}</strong>
              <p>{routeClearance.detail}</p>
            </div>
          ) : null}
          {labRecovery ? (
            <div key={labRecovery.nonce} className="lab-recovery-card" role="status" aria-live="polite">
              <span>Model Lab</span>
              <strong>{labRecovery.title}</strong>
              <p>{labRecovery.detail}</p>
              <em>HP {labRecovery.hpBefore} → {labRecovery.hpAfter}</em>
            </div>
          ) : null}
          {battleReturn ? (
            <div key={battleReturn.nonce} className={`battle-return-card return-${battleReturn.tone}`} role="status" aria-live="polite">
              <span>{battleReturn.eyebrow}</span>
              <strong>{battleReturn.title}</strong>
              <p>{battleReturn.detail}</p>
            </div>
          ) : null}
          {championLog ? (
            <div key={championLog.nonce} className="champion-log-card" role="status" aria-live="polite">
              <span>Champion terminal</span>
              <strong>{championLog.title}</strong>
              <p>{championLog.detail}</p>
              <div className="champion-log-team" aria-label="Champion teaser team">
                {championLog.teamIds.map((id) => {
                  const model = getModel(id)
                  return (
                    <div key={id} className="champion-log-member">
                      <Sprite model={model} small />
                      <div>
                        <strong>{model.name}</strong>
                        <TypeBadge type={model.type} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : null}
          {saveCeremony ? (
            <div key={saveCeremony.nonce} className={`save-ceremony-card save-${saveCeremony.tone}`} role="status" aria-live="polite">
              <span>Trainer record</span>
              <strong>{saveCeremony.title}</strong>
              <p>{saveCeremony.detail}</p>
            </div>
          ) : null}
          {mapTransition ? (
            <div key={mapTransition.nonce} className="map-transition-card" role="status" aria-live="polite">
              <span>Area transition</span>
              <strong>{mapTransition.title}</strong>
              <p>{mapTransition.detail}</p>
            </div>
          ) : null}
        </div>
        <aside className="side-stack">
          <div className="pixel-panel party-panel">
            <p className="eyebrow">Partner</p>
            {starter ? <ModelCard model={starter} selected /> : null}
            {starter ? (
              <div className="partner-health">
                <div>
                  <span>HP</span>
                  <strong>{displayedPartnerHp}/{partnerMaxHp}</strong>
                </div>
                <meter value={displayedPartnerHp} max={partnerMaxHp} />
                <div className={`partner-condition condition-${partnerCondition.tone}`}>
                  <span>{partnerCondition.label}</span>
                  <strong>{partnerRouteRole}</strong>
                  <p>{partnerCondition.detail}</p>
                </div>
              </div>
            ) : null}
          </div>
          <div className="pixel-panel field-panel">
            <p className="eyebrow">Field log</p>
            <div className="field-cue">
              <strong>{objective.label}</strong>
              <span>{objective.detail}</span>
            </div>
            <div className={`story-beat story-${storyBeat.tone}`} aria-label="Trainer journal">
              <span>{storyBeat.chapter}</span>
              <strong>{storyBeat.title}</strong>
              <p>{storyBeat.detail}</p>
            </div>
            <div className={`chapter-progress chapter-${storyBeat.tone}`} aria-label="Chapter progress">
              <div>
                <span>Chapter progress</span>
                <strong>{completedQuestSteps}/{questSteps.length}</strong>
              </div>
              <i style={{ '--chapter-progress': `${questProgressPercent}%` } as CSSProperties} aria-hidden="true" />
              <p>{currentQuestStep?.complete ? 'Chapter route is clean.' : `Current: ${currentQuestStep?.label ?? objectiveTarget.label}`}</p>
            </div>
            <div className={`objective-radar radar-${objectiveTarget.kind}`} aria-label="Next objective marker">
              <span>Next marker</span>
              <strong>{objectiveTarget.label}</strong>
              <em>{objectiveDistance === null ? objectiveBearing : objectiveDistance === 0 ? 'You are here' : `${objectiveBearing} · ${objectiveDistance} tiles`}</em>
              <p>{objectiveTarget.detail}</p>
            </div>
            <div className={`habitat-forecast ${currentMap.hasWildEncounters ? 'has-encounters' : 'no-encounters'}`} aria-label="Route habitat forecast">
              <div>
                <span>Habitat scan</span>
                <strong>{currentMap.hasWildEncounters ? 'Eval Grass table' : 'No wild signal'}</strong>
              </div>
              {currentMap.hasWildEncounters ? (
                <div className="habitat-list">
                  {routeHabitatForecast.map(({ model, chance }) => {
                    const registered = discoveredIds.includes(model.id)
                    return (
                      <span key={model.id} className={`${registered ? 'is-registered' : 'is-unseen'} rarity-${model.rarity}`}>
                        <i>{chance}%</i>
                        <b>{model.name}</b>
                        <em>{registered ? 'Registered' : model.rarity}</em>
                      </span>
                    )
                  })}
                </div>
              ) : (
                <p>Gatehouse terminals are sealed. Return to Route 01 for wild benchmark data.</p>
              )}
            </div>
            <div className="quest-checklist" aria-label="Quest checklist">
              {questSteps.map((step) => (
                <span key={step.label} className={`${step.complete ? 'is-complete' : ''} ${step.current ? 'is-current' : ''}`}>
                  <i aria-hidden="true" />
                  {step.label}
                </span>
              ))}
            </div>
            <div className="field-cue">
              <strong>{fieldCue.label}</strong>
              <span>{fieldCue.detail}</span>
            </div>
            <div className="field-tags" aria-label="Route progress">
              <span>{discoveredIds.length} LLMdex</span>
              {(routeFlags.length ? routeFlags : ['Route started']).map((flag) => <span key={flag}>{flag}</span>)}
            </div>
          </div>
          <div className="pixel-panel minimap-panel">
            <div className="minimap-heading">
              <p className="eyebrow">Area map</p>
              <span>{currentMap.title}</span>
            </div>
            <div
              className="minimap-grid"
              aria-label={`${currentMap.title} minimap`}
              style={{ gridTemplateColumns: `repeat(${currentMap.tiles[0].length}, 1fr)` }}
            >
              {minimapRouteGuide ? (
                <span
                  className={`minimap-route-guide guide-${objectiveTarget.kind}`}
                  style={minimapRouteGuide as CSSProperties}
                  aria-hidden="true"
                />
              ) : null}
              {currentMap.tiles.map((row, y) =>
                row.map((code, x) => {
                  const tilePosition = { x, y }
                  const renderedCode = code === 'T' && trainerDefeated ? '.' : effectiveTileAt(currentMap, tilePosition, collectedItemIds)
                  const npcHere = routeNpcAt(currentMapId, tilePosition, trainerDefeated, ambientTick)
                  const playerHere = position.x === x && position.y === y
                  return (
                    <span
                      key={`mini-${x}-${y}`}
                      className={`minimap-cell mini-${renderedCode === '.' ? 'path' : renderedCode} ${playerHere ? 'mini-player' : ''} ${npcHere || renderedCode === 'T' ? 'mini-npc' : ''}`}
                      title={playerHere ? 'You are here' : npcHere?.name ?? TILE_LABELS[renderedCode]}
                    />
                  )
                }),
              )}
              {minimapLandmarks.map((area) => (
                <span
                  key={`mini-landmark-${area.id}`}
                  className={`minimap-landmark landmark-${area.tone} ${area.mapped ? 'is-mapped' : 'is-unmapped'}`}
                  style={{
                    left: `${(area.center.x / currentMap.tiles[0].length) * 100}%`,
                    top: `${(area.center.y / currentMap.tiles.length) * 100}%`,
                  }}
                  title={`${area.title}${area.mapped ? '' : ' (unmapped)'}`}
                >
                  {area.mapped ? area.title.replace(/^Cachewater /, '').replace(/^Champion /, '').replace(/^Model /, '') : '?'}
                </span>
              ))}
              {objectiveTarget.mapId === currentMapId ? (
                <span
                  className={`minimap-objective objective-${objectiveTarget.kind}`}
                  style={{
                    left: `${((objectiveTarget.position.x + 0.5) / currentMap.tiles[0].length) * 100}%`,
                    top: `${((objectiveTarget.position.y + 0.5) / currentMap.tiles.length) * 100}%`,
                  }}
                  title={`Next objective: ${objectiveTarget.label}`}
                >
                  !
                </span>
              ) : null}
            </div>
            <div className="minimap-legend" aria-hidden="true">
              <span><i className="mini-dot mini-player-dot" /> You</span>
              <span><i className="mini-dot mini-objective-dot" /> Goal</span>
              <span><i className="mini-dot mini-npc-dot" /> NPC</span>
              <span><i className="mini-dot mini-cache-dot" /> Cache</span>
              <span><i className="mini-dot mini-ledge-dot" /> Ledge</span>
              <span><i className="mini-dot mini-landmark-dot" /> Place</span>
            </div>
          </div>
          <div className="pixel-panel controls-panel">
            <p>{routeMessage}</p>
            <div className="quick-actions">
              <button className="pixel-button secondary" onClick={toggleFieldMenu}>{fieldMenuOpen ? 'Close menu' : 'Field menu'}</button>
              <button className={`pixel-button secondary sound-toggle ${audioOn ? 'is-on' : ''}`} onClick={toggleAudio}>{audioOn ? 'Audio on' : 'Audio off'}</button>
            </div>
            <div className="dpad">
              <span />
              <button className={inputCue === 'north' ? 'is-pressed' : ''} onClick={() => { flashInputCue('north'); movePlayer(0, -1) }}>▲</button>
              <span />
              <button className={inputCue === 'west' ? 'is-pressed' : ''} onClick={() => { flashInputCue('west'); movePlayer(-1, 0) }}>◀</button>
              <button className={inputCue === 'action' ? 'is-pressed' : ''} onClick={() => { flashInputCue('action'); if (dialogue) { advanceDialogue() } else { inspectTile() } }}>A</button>
              <button className={inputCue === 'east' ? 'is-pressed' : ''} onClick={() => { flashInputCue('east'); movePlayer(1, 0) }}>▶</button>
              <span />
              <button className={inputCue === 'south' ? 'is-pressed' : ''} onClick={() => { flashInputCue('south'); movePlayer(0, 1) }}>▼</button>
              <span />
            </div>
            <p className="hint">Use the on-screen pad. Grass has weighted wild encounters; closed-source legends are intentionally rare.</p>
          </div>
        </aside>
      </section>
      {dialogue ? (
        <div className={`event-dialogue dialogue-${dialoguePortraitFor(dialogue.speaker).tone}`} role="dialog" aria-live="polite">
          <div className="dialogue-portrait-wrap">
            <div className="dialogue-portrait" aria-hidden="true">
              <img src={dialoguePortraitFor(dialogue.speaker).src} alt="" />
            </div>
            <span>{dialogueRoleFor(dialogue.speaker)}</span>
          </div>
          <div className="dialogue-copy">
            <div className="dialogue-speaker-line">
              <p className="eyebrow">{dialogue.speaker}</p>
              <span>{dialogue.index + 1}/{dialogue.lines.length}</span>
            </div>
            <p>{dialogue.lines[dialogue.index]}</p>
            <div className="dialogue-page-pips" aria-hidden="true">
              {dialogue.lines.map((line, index) => <i key={`${line}-${index}`} className={index <= dialogue.index ? 'is-read' : ''} />)}
            </div>
          </div>
          <button className="dialogue-next" onClick={advanceDialogue} aria-label={dialogue.index < dialogue.lines.length - 1 ? 'Advance dialogue' : 'Close dialogue'}>{dialogue.index < dialogue.lines.length - 1 ? 'A' : '✓'}</button>
        </div>
      ) : null}
      {fieldMenuOpen ? (
        <div className="field-menu-overlay" role="dialog" aria-label="Field menu">
          <section className="field-menu pixel-panel">
            <div className="field-menu-title">
              <div>
                <p className="eyebrow">Trainer menu</p>
                <h3>Arjun</h3>
              </div>
              <button className="pixel-button secondary" onClick={() => setFieldMenuOpen(false)}>Close</button>
            </div>
            <div className="trainer-summary-strip" aria-label="Trainer summary">
              <div>
                <span>Location</span>
                <strong>{currentMap.eyebrow} · {currentMap.title}</strong>
              </div>
              <div>
                <span>Partner HP</span>
                <strong>{displayedPartnerHp}/{partnerMaxHp || 0}</strong>
                <i className="trainer-summary-meter" style={{ '--summary-meter': `${partnerHpPercent}%` } as CSSProperties} aria-hidden="true" />
              </div>
              <div>
                <span>LLMdex</span>
                <strong>{discoveredIds.length}/{MODELS.length} · {dexCompletion}%</strong>
              </div>
              <div>
                <span>Route caches</span>
                <strong>{routeCacheFound}/{routeCacheTotal}</strong>
              </div>
              <div className="trainer-summary-objective">
                <span>Objective</span>
                <strong>{objective.label}</strong>
              </div>
            </div>
            <section className="trainer-card-board" aria-label="Trainer card route stamps">
              <div className="trainer-card-main">
                <span>Trainer Card</span>
                <strong>{trainerCardRank}</strong>
                <p>{trainerCardProgress}% route record · {storyBeat.title}</p>
                <i className="trainer-card-progress" style={{ '--trainer-card-progress': `${trainerCardProgress}%` } as CSSProperties} aria-hidden="true" />
              </div>
              <div className="trainer-stamp-grid">
                {trainerCardStamps.map((stamp) => (
                  <div key={stamp.label} className={`trainer-stamp stamp-${stamp.tone} ${stamp.complete ? 'is-earned' : 'is-pending'}`}>
                    <i aria-hidden="true">{stamp.complete ? '✓' : '·'}</i>
                    <strong>{stamp.label}</strong>
                    <span>{stamp.detail}</span>
                  </div>
                ))}
              </div>
            </section>
            <div className="field-menu-grid">
              <article className="field-menu-card">
                <p className="eyebrow">Party</p>
                {starter ? (
                  <div className="party-summary">
                    <Sprite model={starter} small />
                    <div>
                      <strong>{starter.name}</strong>
                      <span>{starter.type} · HP {displayedPartnerHp}/{partnerMaxHp}</span>
                      <span>{starter.abilities.join(' / ')}</span>
                      <em className={`party-condition condition-${partnerCondition.tone}`}>{partnerCondition.label} · {partnerRouteRole}</em>
                    </div>
                  </div>
                ) : null}
                <div className="field-item-use">
                  <strong>Latency Patch</strong>
                  <span>{hasLatencyPatch ? latencyPatchUsed ? 'Used' : 'Ready: restores 42 HP once.' : 'Not found on this route.'}</span>
                  <button className="pixel-button secondary" onClick={useLatencyPatch} disabled={!canUseLatencyPatch}>Use patch</button>
                </div>
              </article>
              <article className="field-menu-card">
                <p className="eyebrow">LLMdex</p>
                <strong>{discoveredIds.length}/{MODELS.length} logged</strong>
                <div className="mini-dex-list">
                  {discoveredModels.slice(-4).map((model) => (
                    <span key={model.id}>{model.name}</span>
                  ))}
                </div>
              </article>
              <article className="field-menu-card route-journal-card">
                <p className="eyebrow">Route journal</p>
                <div className="route-journal-head">
                  <div>
                    <span>Area file</span>
                    <strong>{currentMap.eyebrow} · {currentMap.title}</strong>
                  </div>
                  <em>{objectiveDistance === null ? WORLD_MAPS[objectiveTarget.mapId].title : objectiveDistance === 0 ? 'At marker' : `${objectiveBearing} · ${objectiveDistance} tiles`}</em>
                </div>
                <p>{currentMap.introLine}</p>
                <div className="route-journal-grid">
                  <span>
                    <b>Next</b>
                    <strong>{objectiveTarget.label}</strong>
                  </span>
                  <span>
                    <b>Terrain</b>
                    <strong>{TILE_LABELS[effectiveTileAt(currentMap, position, collectedItemIds)]}</strong>
                  </span>
                  <span>
                    <b>Signal</b>
                    <strong>{currentMap.hasWildEncounters ? `${routeHabitatForecast[0]?.model.name ?? 'Unknown'} ${routeHabitatForecast[0]?.chance ?? 0}%` : 'Sealed'}</strong>
                  </span>
                </div>
                {currentMap.hasWildEncounters ? (
                  <div className="route-journal-encounters" aria-label="Pause menu encounter forecast">
                    {routeHabitatForecast.slice(0, 3).map(({ model, chance }) => (
                      <span key={model.id} className={discoveredIds.includes(model.id) ? 'is-registered' : ''}>
                        <i>{chance}%</i>
                        <b>{model.name}</b>
                      </span>
                    ))}
                  </div>
                ) : null}
              </article>
              <article className="field-menu-card">
                <p className="eyebrow">Quest</p>
                <strong>{objective.label}</strong>
                <span>{objective.detail}</span>
                <div className={`menu-story-beat story-${storyBeat.tone}`}>
                  <span>{storyBeat.chapter}</span>
                  <strong>{storyBeat.title}</strong>
                  <p>{storyBeat.detail}</p>
                </div>
                <div className={`chapter-progress menu-chapter-progress chapter-${storyBeat.tone}`}>
                  <div>
                    <span>Progress</span>
                    <strong>{questProgressPercent}%</strong>
                  </div>
                  <i style={{ '--chapter-progress': `${questProgressPercent}%` } as CSSProperties} aria-hidden="true" />
                  <p>{currentQuestStep?.complete ? 'Chapter route is clean.' : currentQuestStep?.label}</p>
                </div>
                <span>{routeCacheFound}/{routeCacheTotal} route caches found</span>
                <div className="quest-checklist menu-quest-list" aria-label="Menu quest checklist">
                  {questSteps.map((step) => (
                    <span key={step.label} className={`${step.complete ? 'is-complete' : ''} ${step.current ? 'is-current' : ''}`}>
                      <i aria-hidden="true" />
                      {step.label}
                    </span>
                  ))}
                </div>
                <div className="field-tags menu-tags">
                  {(routeFlags.length ? routeFlags : ['Route started']).map((flag) => <span key={flag}>{flag}</span>)}
                </div>
              </article>
              <article className="field-menu-card">
                <p className="eyebrow">Controls</p>
                <span>D-pad / WASD: walk</span>
                <span>A / Space / Enter: inspect or advance</span>
                <span>M: open menu</span>
              </article>
              <article className="field-menu-card save-card">
                <p className="eyebrow">Save</p>
                <strong>{hasSave ? 'Save data ready' : 'No save yet'}</strong>
                <span>{saveNotice}</span>
                {hasSave ? (
                  <div className="save-progress-strip">
                    <i style={{ '--save-progress': `${saveProgress}%` } as CSSProperties} aria-hidden="true" />
                    <span>{saveProgress}% route record</span>
                  </div>
                ) : null}
                <div className="save-actions">
                  <button className="pixel-button" onClick={saveGame}>Save</button>
                  <button className="pixel-button secondary" onClick={loadGame} disabled={!hasSave}>Load</button>
                </div>
              </article>
            </div>
          </section>
        </div>
      ) : null}
    </main>
    )
  }

  const renderBattle = () => {
    if (!battle || !starter) {
      return null
    }
    const playerMax = maxHp(starter)
    const enemyMax = maxHp(battle.opponent)
    const momentumLines = battle.turn > 1 || battle.result ? battleMomentum(battle.log) : []
    const resultSummary = battle.result ? battleResultSummary(battle, starter, discoveredIds) : null
    const dexRegistration = battle.result ? battleDexRegistration(battle, discoveredIds) : null
    const performanceSummary = battle.result ? battlePerformanceSummary(battle, starter) : null
    const guardActive = battle.guard < 1 && !battle.result
    const battlePatchLabel = hasLatencyPatch ? latencyPatchUsed ? 'Patch used' : 'Patch ready' : 'No patch'
    const commandTarget = battle.kind === 'trainer' ? battle.trainerName ?? battle.opponent.name : `Wild ${battle.opponent.name}`
    return (
      <main className="screen battle-screen">
        <section className={`battle-arena pixel-panel ${battle.turn === 1 ? 'battle-entering' : ''}`}>
          {battle.turn === 1 ? (
            <div className="battle-entry-banner">
              {battle.kind === 'trainer' ? `${battle.trainerName} wants to battle!` : `Wild ${battle.opponent.name} appeared!`}
            </div>
          ) : null}
          {battle.result ? (
            <div className={`battle-result-banner result-${battle.result}`}>
              {battle.result === 'won' ? `${battle.opponent.name} benchmarked!` : `${starter.name} needs a heal!`}
            </div>
          ) : null}
          <div
            className={`battle-stage battle-terrain-${battle.terrain} ${battleEffect?.phase === 'exchange' ? 'battle-stage-impact' : ''}`}
            style={{
              '--enemy-type-color': TYPE_COLORS[battle.opponent.type],
              '--player-type-color': TYPE_COLORS[starter.type],
              '--impact-color': battleEffect?.enemyDamage ? TYPE_COLORS[battle.opponent.type] : TYPE_COLORS[starter.type],
            } as CSSProperties}
          >
            <div className="battle-location-plaque" aria-label={`Battle location: ${battle.locationLabel}`}>
              <span>{battle.kind === 'trainer' ? 'Trainer battle' : 'Wild encounter'}</span>
              <strong>{battle.locationLabel}</strong>
            </div>
            <div className={`battle-terrain-set terrain-set-${battle.terrain}`} aria-hidden="true">
              <span className="battle-horizon-line" />
              <span className="battle-terrain-prop prop-a" />
              <span className="battle-terrain-prop prop-b" />
              <span className="battle-terrain-prop prop-c" />
              <span className="battle-foreground-sweep" />
            </div>
            <div className="battle-tactics-strip" aria-label="Battle tactical state">
              <span>
                <b>Turn</b>
                <strong>{battle.turn}</strong>
              </span>
              <span>
                <b>Terrain</b>
                <strong>{battle.terrain}</strong>
              </span>
              <span className={guardActive ? 'is-ready' : ''}>
                <b>Guard</b>
                <strong>{guardActive ? 'Set' : 'Open'}</strong>
              </span>
              <span className={hasLatencyPatch && !latencyPatchUsed ? 'is-ready' : latencyPatchUsed ? 'is-spent' : ''}>
                <b>Kit</b>
                <strong>{battlePatchLabel}</strong>
              </span>
            </div>
            <div className={`enemy-platform ${battleEffect?.phase === 'exchange' ? 'is-hit' : ''}`}>
              <div className="battle-side-label enemy-side-label">
                <span>{battle.kind === 'trainer' ? battle.trainerName : 'Wild'}</span>
                <strong>{battle.opponent.name}</strong>
              </div>
              <BattleHud label={battle.opponent.name} model={battle.opponent} hp={battle.enemyHp} max={enemyMax} />
              <Sprite model={battle.opponent} />
              {battleEffect?.playerDamage ? <span key={`enemy-${battleEffect.nonce}`} className="damage-pop enemy-damage">-{battleEffect.playerDamage}</span> : null}
            </div>
            <div className={`player-platform ${battleEffect?.phase === 'exchange' && battleEffect.enemyDamage ? 'is-hit' : ''} ${battleEffect?.phase === 'exchange' ? 'is-attacking' : ''} ${battleEffect?.phase === 'guard' ? 'is-guarding' : ''}`}>
              <div className="battle-side-label player-side-label">
                <span>Partner</span>
                <strong>{starter.name}</strong>
              </div>
              <Sprite model={starter} />
              <BattleHud label={starter.name} model={starter} hp={battle.playerHp} max={playerMax} />
              {battleEffect?.enemyDamage ? <span key={`player-${battleEffect.nonce}`} className="damage-pop player-damage">-{battleEffect.enemyDamage}</span> : null}
            </div>
            {momentumLines.length ? (
              <div className="battle-stage-exchange" aria-label="Latest battle exchange summary">
                <span>Latest exchange</span>
                {momentumLines.map((entry, index) => <strong key={`stage-${entry}-${index}`}>{entry}</strong>)}
              </div>
            ) : null}
          </div>
          <div className="battle-bottom">
            <div className="battle-log">
              <p className="eyebrow">{battle.kind === 'trainer' ? battle.trainerName : 'Wild encounter'}</p>
              {momentumLines.length ? (
                <div className="battle-turn-card" aria-label="Latest battle exchange">
                  <span>Turn {Math.max(1, battle.turn - 1)}</span>
                  {momentumLines.map((entry, index) => <strong key={`${entry}-${index}`}>{entry}</strong>)}
                </div>
              ) : null}
              {battle.log.map((entry, index) => <p key={`${entry}-${index}`}>{entry}</p>)}
            </div>
            <div className="move-grid">
              {resultSummary ? (
                <div className={`battle-result-card result-card-${battle.result}`}>
                  <p className="eyebrow">{resultSummary.eyebrow}</p>
                  <strong>{resultSummary.title}</strong>
                  {performanceSummary ? (
                    <div className={`battle-performance-ribbon performance-${performanceSummary.tone}`}>
                      <span>{performanceSummary.grade}</span>
                      <div>
                        <strong>{performanceSummary.title}</strong>
                        <p>{performanceSummary.detail}</p>
                      </div>
                    </div>
                  ) : null}
                  {dexRegistration ? (
                    <div className={`battle-dex-registration dex-${dexRegistration.status}`}>
                      <div className="battle-dex-sprite">
                        <Sprite model={dexRegistration.model} small />
                      </div>
                      <div>
                        <span>{dexRegistration.status === 'new' ? 'LLMdex registered' : 'LLMdex refreshed'}</span>
                        <strong>No. {String(dexRegistration.index).padStart(3, '0')} · {dexRegistration.model.name}</strong>
                        <p>{dexRegistration.model.type} · {dexRegistration.model.availability} · {dexRegistration.model.rarity}</p>
                      </div>
                    </div>
                  ) : null}
                  <div className="battle-reward-list">
                    {resultSummary.lines.map((line) => <span key={line}>{line}</span>)}
                  </div>
                  <button className="pixel-button full" onClick={finishBattle}>{battle.result === 'won' ? 'Continue route' : 'Return to lab'}</button>
                </div>
              ) : (
                <>
                  <div className="battle-command-header">
                    <span>Choose command</span>
                    <strong>{starter.name} vs {commandTarget}</strong>
                    <p>{guardActive ? 'Context Guard will soften the next incoming move.' : 'Pick a move, use your kit, or run from wild benchmarks.'}</p>
                  </div>
                  {activeMoves.map((move, index) => {
                    const forecast = moveForecastFor(starter, battle, move)
                    return (
                    <button key={move.id} className={`move-button forecast-${forecast.tone}`} onClick={() => handleMove(move)}>
                      <span className="move-meta">
                        <span className="battle-shortcut">{index + 1}</span>
                        <TypeBadge type={move.type} />
                        <em>{move.power ? `PWR ${move.power}` : 'STATUS'}</em>
                      </span>
                      <strong>{move.name}</strong>
                      <span className="move-command-line">
                        <b>{move.power ? 'Damage' : 'Guard'}</b>
                        <i>{move.type}</i>
                      </span>
                      <span className="move-forecast">
                        <b>{forecast.damage}</b>
                        <i>{forecast.outcome}</i>
                      </span>
                      <span>{move.effect}</span>
                    </button>
                    )
                  })}
                  <button className="move-button battle-item-button" onClick={applyLatencyPatchInBattle} disabled={!hasLatencyPatch || latencyPatchUsed || battle.playerHp >= playerMax}>
                    <span className="move-meta">
                      <span className="battle-shortcut">5</span>
                      <em>ITEM</em>
                    </span>
                    <strong>Latency Patch</strong>
                    <span className="move-command-line">
                      <b>{hasLatencyPatch && !latencyPatchUsed ? 'Kit ready' : 'Kit locked'}</b>
                      <i>Heal</i>
                    </span>
                    <span>{hasLatencyPatch ? latencyPatchUsed ? 'Already used.' : battle.playerHp >= playerMax ? 'HP is already full.' : `Restore ${LATENCY_PATCH_HEAL} HP; opponent still moves.` : 'Find the route cache first.'}</span>
                  </button>
                  {battle.kind === 'wild' ? (
                    <button className="move-button run-button" onClick={runFromBattle}>
                      <span className="move-meta">
                        <span className="battle-shortcut">R</span>
                        <em>ESCAPE</em>
                      </span>
                      <strong>Run</strong>
                      <span className="move-command-line">
                        <b>Escape</b>
                        <i>Wild only</i>
                      </span>
                      <span>Leave the wild benchmark and keep current HP.</span>
                    </button>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </section>
      </main>
    )
  }

  const renderLLMdex = () => (
    <main className="screen llmdex-screen">
      <section className="pixel-panel llmdex-panel">
        <div className="section-heading dex-heading">
          <div>
            <p className="eyebrow">Professor Karpathy's LLMdex</p>
            <h2>Registered LLM-mon</h2>
          </div>
          <button className="pixel-button" onClick={() => setScreen(starter ? 'map' : 'title')}>Back</button>
        </div>
        <div className="dex-progress-panel">
          <div>
            <span>LLMdex progress</span>
            <strong>{discoveredIds.length}/{MODELS.length}</strong>
          </div>
          <i style={{ '--dex-progress': `${dexCompletion}%` } as CSSProperties} aria-hidden="true" />
          <p>{dexCompletion}% synced · New wild benchmarks unlock full stat files and citations.</p>
        </div>
        <div className="llmdex-layout">
          <aside className="dex-focus-panel">
            {focusedDexModel ? (
              (() => {
                const entryIndex = MODELS.findIndex((model) => model.id === focusedDexModel.id) + 1
                const routeNote = dexEntryRouteNote(focusedDexModel, starter, routeFlags)
                const dossier = dexDossierFor(focusedDexModel, entryIndex, starter, routeFlags)
                return (
              <>
                <div className="dex-focus-portrait">
                  <Sprite model={focusedDexModel} />
                </div>
                <p className="eyebrow">Focused entry</p>
                <h3>No. {String(entryIndex).padStart(3, '0')} · {focusedDexModel.name}</h3>
                <div className="badge-row">
                  <TypeBadge type={focusedDexModel.type} />
                  <span className={`rarity rarity-${focusedDexModel.rarity}`}>{focusedDexModel.rarity}</span>
                  <span>{focusedDexModel.availability}</span>
                </div>
                <div className="dex-dossier-grid" aria-label={`${focusedDexModel.name} dossier`}>
                  {dossier.map((item) => (
                    <span key={item.label} className={`dossier-${item.tone}`}>
                      <b>{item.label}</b>
                      <strong>{item.value}</strong>
                    </span>
                  ))}
                </div>
                <div className={`dex-route-note dex-note-${routeNote.tone}`}>
                  <span>Route file</span>
                  <strong>{routeNote.label}</strong>
                  <p>{routeNote.detail}</p>
                </div>
                <p>{focusedDexModel.lore}</p>
                <div className="dex-focus-stats">
                  <StatBar label="Strength" value={focusedDexModel.stats.intelligence} max={60} />
                  <StatBar label="Speed" value={focusedDexModel.stats.outputSpeed} max={220} suffix=" t/s" />
                  <StatBar label="Low latency" value={Math.max(0, 70 - focusedDexModel.stats.latency)} max={70} />
                </div>
                <div className="citation-box dex-citations">
                  <p className="eyebrow">Sources</p>
                  {focusedDexModel.citations.map((citation) => (
                    <a key={`${focusedDexModel.id}-${citation.url}`} href={citation.url} target="_blank" rel="noreferrer">
                      {citation.label}<span>{citation.detail}</span>
                    </a>
                  ))}
                </div>
              </>
                )
              })()
            ) : (
              <p>No entries registered yet.</p>
            )}
          </aside>
          <div className="llmdex-grid" aria-label="LLMdex entries">
            {MODELS.map((model, index) => {
              const discovered = discoveredIds.includes(model.id)
              return (
                <button
                  key={model.id}
                  className={`llmdex-entry ${discovered ? 'is-discovered' : 'is-locked'} ${focusedDexModel?.id === model.id ? 'is-focused' : ''}`}
                  onClick={() => discovered ? setDexFocusId(model.id) : setRouteMessage(`LLMdex slot ${String(index + 1).padStart(3, '0')} is still unknown. Log more wild benchmarks.`)}
                  type="button"
                >
                  <span className="dex-entry-number">No. {String(index + 1).padStart(3, '0')}</span>
                  <span className="dex-entry-sprite">
                    {discovered ? <Sprite model={model} small /> : <span className="dex-silhouette">?</span>}
                  </span>
                  <span className="dex-entry-copy">
                    <strong>{discovered ? model.name : 'Unknown LLM-mon'}</strong>
                    <em>{discovered ? `${model.type} · ${model.rarity}` : 'Data not registered'}</em>
                    <small>{discovered ? 'Registered' : 'Locked'}</small>
                  </span>
                </button>
              )
            })}
          </div>
        </div>
        <div className="champion-card">
          <p className="eyebrow">League teaser</p>
          <h3>World Champion Andrej</h3>
          <p>
            The post-slice champion battle is designed around a dual frontier team: {CHAMPION_TEAM.map(getModel).map((model) => model.name).join(' + ')}.
            The game avoids unsourced employment claims and treats the champion as a legendary researcher archetype.
          </p>
        </div>
      </section>
    </main>
  )

  return (
    <div className="app-shell">
      {screen === 'title' ? renderTitle() : null}
      {screen === 'intro' ? renderIntro() : null}
      {screen === 'starter' ? renderStarter() : null}
      {screen === 'map' ? renderMap() : null}
      {screen === 'battle' ? renderBattle() : null}
      {screen === 'llmdex' ? renderLLMdex() : null}
      <span key={screen} className={`screen-transition screen-transition-${screen}`} />
    </div>
  )
}

function BattleHud({ label, model, hp, max }: { label: string; model: LlmMon; hp: number; max: number }) {
  const hpPercent = Math.max(0, Math.round((hp / max) * 100))
  const hpState = hp === 0 ? 'fainted' : hpPercent <= 25 ? 'danger' : hpPercent <= 50 ? 'warn' : 'healthy'
  return (
    <div className={`battle-hud hp-${hpState}`}>
      <div className="hud-title">
        <strong>{label}</strong>
        <TypeBadge type={model.type} />
      </div>
      <div className="hp-track">
        <div className="hp-fill" style={{ width: `${hpPercent}%` }} />
      </div>
      <div className="hp-readout">
        <span>HP {hp}/{max}</span>
        {hpState === 'danger' ? <em>Critical HP</em> : null}
        {hpState === 'fainted' ? <em>Benchmarked</em> : null}
      </div>
    </div>
  )
}

export default App
