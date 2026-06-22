import { useCallback, useEffect, useMemo, useState } from 'react'
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
type Screen = 'title' | 'intro' | 'starter' | 'map' | 'battle' | 'codex'
type BattleKind = 'wild' | 'trainer'
type BattleResult = 'won' | 'lost'
type BattleEffectPhase = 'exchange' | 'guard'
type TerrainCode = 'R' | '.' | 'G' | 'L' | 'S' | 'T' | 'W' | 'D'

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

interface BattleState {
  opponent: LlmMon
  kind: BattleKind
  trainerName?: string
  playerHp: number
  enemyHp: number
  guard: number
  turn: number
  log: string[]
  result?: BattleResult
}

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
  player: assetPath('assets/kenney/chars/professor.png'),
  trainer: assetPath('assets/kenney/chars/trainer.png'),
  tile: (id: string) => assetPath(`assets/kenney/tiny-town/tiles/tile_${id}.png`),
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
  return MAP_ASSETS.tile('0013')
}


const STARTER_MOVES: Move[] = [
  { id: 'prompt-strike', name: 'Prompt Strike', type: 'Normal', power: 18, effect: 'Reliable baseline damage.' },
  { id: 'typed-burst', name: 'Lab Signature', type: 'OpenAI', power: 25, effect: 'Becomes your starter type in battle.' },
  { id: 'context-guard', name: 'Context Guard', type: 'Normal', power: 0, effect: 'Halve the next incoming hit.' },
  { id: 'benchmark-surge', name: 'Benchmark Surge', type: 'Normal', power: 31, effect: 'High power, softened by latency and cost.' },
]

const ROUTE_MAP: TerrainCode[][] = [
  Array.from('RRRRRRRRRRRR') as TerrainCode[],
  Array.from('RLL..GGGGGDR') as TerrainCode[],
  Array.from('RLL..GGGGG.R') as TerrainCode[],
  Array.from('R....GGGT..R') as TerrainCode[],
  Array.from('R.S..GGGG..R') as TerrainCode[],
  Array.from('R....G..G..R') as TerrainCode[],
  Array.from('R.WWW...G..R') as TerrainCode[],
  Array.from('R.......G..R') as TerrainCode[],
  Array.from('R..GGGGGG..R') as TerrainCode[],
  Array.from('RRRRRRRRRRRR') as TerrainCode[],
]

const TILE_LABELS: Record<TerrainCode, string> = {
  R: 'Ridge',
  '.': 'Path',
  G: 'Tall benchmark grass',
  L: 'Model Lab',
  S: 'Sign',
  T: 'Benchmark Scout',
  W: 'Lake',
  D: 'Closed gym gate',
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

function tileAt(position: Position): TerrainCode {
  return ROUTE_MAP[position.y]?.[position.x] ?? 'R'
}

function isBlocked(code: TerrainCode, trainerDefeated: boolean): boolean {
  if (code === 'T') {
    return trainerDefeated
  }
  return code === 'R' || code === 'W' || code === 'D'
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

function enemyMoveFor(model: LlmMon): Move {
  if (model.stats.latency < 2) {
    return { id: 'latency-jab', name: 'Latency Jab', type: model.type, power: 13, effect: 'Fast first-token hit.' }
  }
  if (model.stats.intelligence >= 50) {
    return { id: 'frontier-proof', name: 'Frontier Proof', type: model.type, power: 19, effect: 'Heavy benchmark damage.' }
  }
  return { id: 'decode-swipe', name: 'Decode Swipe', type: model.type, power: 14, effect: 'Standard route attack.' }
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

function ModelCard({ model, selectable, selected, onChoose }: { model: LlmMon; selectable?: boolean; selected?: boolean; onChoose?: () => void }) {
  return (
    <article className={`model-card ${selected ? 'selected' : ''} ${selectable ? 'starter-card' : ''}`}>
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

function App() {
  const [screen, setScreen] = useState<Screen>('title')
  const [starter, setStarter] = useState<LlmMon | null>(null)
  const [position, setPosition] = useState<Position>({ x: 3, y: 3 })
  const [stepsInGrass, setStepsInGrass] = useState(0)
  const [trainerDefeated, setTrainerDefeated] = useState(false)
  const [battle, setBattle] = useState<BattleState | null>(null)
  const [battleEffect, setBattleEffect] = useState<BattleEffect | null>(null)
  const [routeMessage, setRouteMessage] = useState('Professor Vector is waiting in the lab with three starter LLM-mon.')

  const starters = useMemo(() => STARTER_IDS.map(getModel), [])
  const activeMoves = useMemo(() => {
    if (!starter) {
      return STARTER_MOVES
    }
    return STARTER_MOVES.map((move) => (move.id === 'typed-burst' ? { ...move, type: starter.type, name: `${starter.type} Burst` } : move))
  }, [starter])

  const beginIntro = () => {
    setScreen('intro')
    setRouteMessage('The benchmark tide is rising. Pick a partner before entering Route 01: Eval Grass.')
  }

  const chooseStarter = (model: LlmMon) => {
    setStarter(model)
    setPosition({ x: 3, y: 3 })
    setRouteMessage(`${model.name} joined your party. Walk into the grass to benchmark your first wild LLM-mon.`)
    setScreen('map')
  }

  const startBattle = useCallback((opponent: LlmMon, kind: BattleKind, trainerName?: string) => {
    if (!starter) {
      return
    }
    setBattleEffect(null)
    setBattle({
      opponent,
      kind,
      trainerName,
      playerHp: maxHp(starter),
      enemyHp: maxHp(opponent),
      guard: 1,
      turn: 1,
      log: [kind === 'trainer' ? `${trainerName} challenged you with ${opponent.name}!` : `A wild ${opponent.name} appeared in the grass!`],
    })
    setScreen('battle')
  }, [starter])

  const movePlayer = useCallback((dx: number, dy: number) => {
    if (screen !== 'map' || !starter) {
      return
    }
    const next = { x: position.x + dx, y: position.y + dy }
    const code = tileAt(next)
    if (isBlocked(code, trainerDefeated)) {
      setRouteMessage(code === 'D' ? 'The first gym gate is locked for this vertical slice. Champion Andrej waits beyond future routes.' : `${TILE_LABELS[code]} blocks the path.`)
      return
    }
    setPosition(next)
    if (code === 'S') {
      setRouteMessage('Sign: Open-weight LLM-mon are common in grass. Closed-source legends are rare encounters.')
      return
    }
    if (code === 'T' && !trainerDefeated) {
      startBattle(getModel('deepseek-v4-pro-max'), 'trainer', 'Benchmark Scout Mira')
      return
    }
    if (code === 'G') {
      const grassSteps = stepsInGrass + 1
      setStepsInGrass(grassSteps)
      if (grassSteps >= 2 && Math.random() < 0.42) {
        setStepsInGrass(0)
        startBattle(weightedEncounter(), 'wild')
      } else {
        setRouteMessage('The benchmark grass rustles with open-weight models.')
      }
      return
    }
    setRouteMessage(code === 'L' ? 'Professor Vector: pick a starter and pursue the LLM-mon League.' : 'Route 01: Eval Grass stretches toward the locked Data Gym gate.')
  }, [position, screen, starter, startBattle, stepsInGrass, trainerDefeated])

  const inspectTile = useCallback(() => {
    const code = tileAt(position)
    if (code === 'L') {
      setRouteMessage('Model Lab memo: Strength = Artificial Analysis Intelligence Index; speed and TTFT shape battle tempo.')
      return
    }
    if (code === 'D') {
      setRouteMessage('A poster shows Champion Andrej with an OpenAI-type and an Anthropic-type. The League unlocks after this slice.')
      return
    }
    setRouteMessage(`${TILE_LABELS[code]}: ${code === 'G' ? 'wild encounters favor open-weight LLM-mon.' : 'nothing unusual here.'}`)
  }, [position])

  const handleMove = (move: Move) => {
    if (!battle || !starter || battle.result) {
      return
    }

    if (move.id === 'context-guard') {
      setBattleEffect({ phase: 'guard', nonce: battle.turn })
      setBattle({
        ...battle,
        guard: 0.52,
        turn: battle.turn + 1,
        log: [`${starter.name} raised Context Guard.`, ...battle.log].slice(0, 6),
      })
      return
    }

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
  }

  const finishBattle = () => {
    if (!battle) {
      return
    }
    if (battle.result === 'won') {
      setRouteMessage(battle.kind === 'trainer' ? 'Mira: Your benchmark discipline is real. The Data Gym gate still needs a future badge.' : `${battle.opponent.name} added a codex entry and vanished into the tall grass.`)
      setBattleEffect(null)
      setBattle(null)
      setScreen('map')
      return
    }
    setRouteMessage('Professor Vector healed your starter and reminded you: latency matters as much as strength.')
    setBattleEffect(null)
    setBattle(null)
    setPosition({ x: 3, y: 3 })
    setScreen('map')
  }

  useEffect(() => {
    if (!battleEffect) {
      return
    }
    const timeout = window.setTimeout(() => setBattleEffect(null), 760)
    return () => window.clearTimeout(timeout)
  }, [battleEffect])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (screen !== 'map') {
        return
      }
      if (event.key === 'ArrowUp' || event.key.toLowerCase() === 'w') {
        event.preventDefault()
        movePlayer(0, -1)
      }
      if (event.key === 'ArrowDown' || event.key.toLowerCase() === 's') {
        event.preventDefault()
        movePlayer(0, 1)
      }
      if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') {
        event.preventDefault()
        movePlayer(-1, 0)
      }
      if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') {
        event.preventDefault()
        movePlayer(1, 0)
      }
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        inspectTile()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [inspectTile, movePlayer, screen])

  const renderTitle = () => (
    <main className="screen title-screen">
      <div className="skyline" />
      <section className="title-card pixel-panel">
        <p className="eyebrow">A browser RPG vertical slice</p>
        <h1>LLM-mon</h1>
        <p className="subtitle">Benchmark monsters, starter labs, tall grass encounters, and one route trainer battle.</p>
        <div className="title-actions">
          <button className="pixel-button" onClick={beginIntro}>Start new journey</button>
          <button className="pixel-button secondary" onClick={() => setScreen('codex')}>Open codex</button>
        </div>
      </section>
    </main>
  )

  const renderIntro = () => (
    <main className="screen intro-screen">
      <section className="pixel-panel professor-lab-panel">
        <div className="professor-stage">
          <div className="professor-sprite-frame">
            <img src={MAP_ASSETS.player} alt="Professor Vector" />
          </div>
          <div className="lab-orb lab-orb-openai" />
          <div className="lab-orb lab-orb-anthropic" />
          <div className="lab-orb lab-orb-zai" />
        </div>
        <div className="dialogue-box">
          <p className="eyebrow">Professor Vector</p>
          <h2>Welcome to the Hoennet Region.</h2>
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
          <button className="pixel-button secondary" onClick={() => setScreen('codex')}>Stats codex</button>
        </div>
        <div className="starter-grid">
          {starters.map((model) => (
            <ModelCard key={model.id} model={model} selectable onChoose={() => chooseStarter(model)} />
          ))}
        </div>
      </section>
    </main>
  )

  const renderMap = () => (
    <main className="screen map-screen">
      <section className="game-layout">
        <div className="pixel-panel map-panel">
          <div className="map-header">
            <div>
              <p className="eyebrow">Route 01</p>
              <h2>Eval Grass</h2>
            </div>
            <button className="pixel-button secondary" onClick={() => setScreen('codex')}>Codex</button>
          </div>
          <div className="tile-map" role="application" aria-label="LLM-mon route map">
            {ROUTE_MAP.map((row, y) =>
              row.map((code, x) => {
                const playerHere = position.x === x && position.y === y
                const codeForRender = code === 'T' && trainerDefeated ? '.' : code
                return (
                  <div key={`${x}-${y}`} className={`tile tile-${codeForRender === '.' ? 'path' : codeForRender}`} title={TILE_LABELS[codeForRender]}>
                    <img className="tile-art" src={tileImageFor(codeForRender, x, y)} alt="" />
                    {codeForRender === 'G' ? <span className="grass-shimmer" /> : null}
                    {codeForRender === 'S' ? <span className="sign-marker">!</span> : null}
                    {codeForRender === 'T' ? (<> <span className="trainer-alert">!</span><img className="character-sprite npc" src={MAP_ASSETS.trainer} alt="Benchmark Scout Mira" /></>) : null}
                    {codeForRender === 'D' ? <span className="gate">GYM</span> : null}
                    {playerHere ? <img className="character-sprite player-sprite" src={MAP_ASSETS.player} alt="Player" /> : null}
                  </div>
                )
              }),
            )}
          </div>
        </div>
        <aside className="side-stack">
          <div className="pixel-panel party-panel">
            <p className="eyebrow">Partner</p>
            {starter ? <ModelCard model={starter} selected /> : null}
          </div>
          <div className="pixel-panel controls-panel">
            <p>{routeMessage}</p>
            <div className="dpad">
              <span />
              <button onClick={() => movePlayer(0, -1)}>▲</button>
              <span />
              <button onClick={() => movePlayer(-1, 0)}>◀</button>
              <button onClick={inspectTile}>A</button>
              <button onClick={() => movePlayer(1, 0)}>▶</button>
              <span />
              <button onClick={() => movePlayer(0, 1)}>▼</button>
              <span />
            </div>
            <p className="hint">Use the on-screen pad. Grass has weighted wild encounters; closed-source legends are intentionally rare.</p>
          </div>
        </aside>
      </section>
    </main>
  )

  const renderBattle = () => {
    if (!battle || !starter) {
      return null
    }
    const playerMax = maxHp(starter)
    const enemyMax = maxHp(battle.opponent)
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
          <div className="battle-stage">
            <div className={`enemy-platform ${battleEffect?.phase === 'exchange' ? 'is-hit' : ''}`}>
              <BattleHud label={battle.opponent.name} model={battle.opponent} hp={battle.enemyHp} max={enemyMax} />
              <Sprite model={battle.opponent} />
              {battleEffect?.playerDamage ? <span key={`enemy-${battleEffect.nonce}`} className="damage-pop enemy-damage">-{battleEffect.playerDamage}</span> : null}
            </div>
            <div className={`player-platform ${battleEffect?.phase === 'exchange' && battleEffect.enemyDamage ? 'is-hit' : ''} ${battleEffect?.phase === 'exchange' ? 'is-attacking' : ''} ${battleEffect?.phase === 'guard' ? 'is-guarding' : ''}`}>
              <Sprite model={starter} />
              <BattleHud label={starter.name} model={starter} hp={battle.playerHp} max={playerMax} />
              {battleEffect?.enemyDamage ? <span key={`player-${battleEffect.nonce}`} className="damage-pop player-damage">-{battleEffect.enemyDamage}</span> : null}
            </div>
          </div>
          <div className="battle-bottom">
            <div className="battle-log">
              <p className="eyebrow">{battle.kind === 'trainer' ? battle.trainerName : 'Wild encounter'}</p>
              {battle.log.map((entry, index) => <p key={`${entry}-${index}`}>{entry}</p>)}
            </div>
            <div className="move-grid">
              {battle.result ? (
                <button className="pixel-button full" onClick={finishBattle}>{battle.result === 'won' ? 'Continue route' : 'Return to lab'}</button>
              ) : (
                activeMoves.map((move) => (
                  <button key={move.id} className="move-button" onClick={() => handleMove(move)}>
                    <strong>{move.name}</strong>
                    <span>{move.effect}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </section>
      </main>
    )
  }

  const renderCodex = () => (
    <main className="screen codex-screen">
      <section className="pixel-panel codex-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Professor Vector's Codex</p>
            <h2>LLM-mon types, stats, and citations</h2>
          </div>
          <button className="pixel-button" onClick={() => setScreen(starter ? 'map' : 'title')}>Back</button>
        </div>
        <div className="type-grid">
          {Object.keys(TYPE_COLORS).map((type) => <TypeBadge key={type} type={type as LlmType} />)}
        </div>
        <div className="champion-card">
          <p className="eyebrow">League teaser</p>
          <h3>World Champion Andrej</h3>
          <p>
            The post-slice champion battle is designed around a dual frontier team: {CHAMPION_TEAM.map(getModel).map((model) => model.name).join(' + ')}.
            The game avoids unsourced employment claims and treats the champion as a legendary researcher archetype.
          </p>
        </div>
        <div className="codex-grid">
          {MODELS.map((model) => (
            <article key={model.id} className="codex-entry">
              <ModelCard model={model} />
              <div className="citation-box">
                <p className="eyebrow">Sources</p>
                {model.citations.map((citation) => (
                  <a key={`${model.id}-${citation.url}`} href={citation.url} target="_blank" rel="noreferrer">
                    {citation.label}<span>{citation.detail}</span>
                  </a>
                ))}
              </div>
            </article>
          ))}
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
      {screen === 'codex' ? renderCodex() : null}
    </div>
  )
}

function BattleHud({ label, model, hp, max }: { label: string; model: LlmMon; hp: number; max: number }) {
  return (
    <div className="battle-hud">
      <div className="hud-title">
        <strong>{label}</strong>
        <TypeBadge type={model.type} />
      </div>
      <div className="hp-track">
        <div className="hp-fill" style={{ width: `${Math.max(0, Math.round((hp / max) * 100))}%` }} />
      </div>
      <span>HP {hp}/{max}</span>
    </div>
  )
}

export default App
