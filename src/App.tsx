import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import './App.css'

type Screen = 'title' | 'intro' | 'story' | 'starter' | 'field' | 'battle' | 'dex' | 'bag' | 'quest' | 'model' | 'badge' | 'services' | 'pier' | 'mission' | 'menlo'
type StarterId = 'claude' | 'gpt' | 'glm'
type BattleCommand = 'prompt' | 'bag' | 'swap'
type BagCategory = 'orbs' | 'medicine' | 'field' | 'gear'
type PierPhase = 'challenge' | 'battle' | 'rewards'
type MissionMode = 'catch' | 'trainers' | 'items'
type MenloPhase = 'gate' | 'weaken' | 'orb' | 'caught'

interface Starter {
  id: StarterId
  name: string
  subtitle: string
  types: string
  ability: string
  detail: string
  image: string
  palette: string
}

interface DexEntry {
  id: string
  number: string
  name: string
  types: string
  ability: string
  route: string
  status: string
  role: string
  image: string
  palette: string
}

interface BagItem {
  id: string
  name: string
  category: BagCategory
  quantity: string
  effect: string
  detail: string
  route: string
  tone: string
}

interface QuestStep {
  id: string
  area: string
  title: string
  status: 'Complete' | 'Current' | 'Locked'
  objective: string
  reward: string
  dialogue: string
  palette: string
}

interface ModelMove {
  name: string
  type: string
  power: string
  accuracy: string
  effect: string
}

interface ModelStat {
  label: string
  value: number
  cap: number
}

interface ModelProfile {
  starterId: StarterId
  license: string
  level: number
  nature: string
  heldItem: string
  trainerNote: string
  abilityNote: string
  nextLesson: string
  xpProgress: number
  stats: ModelStat[]
  moves: ModelMove[]
}

interface ShopItem {
  id: string
  name: string
  price: string
  tag: string
  detail: string
  stock: string
}

interface ServiceStop {
  id: string
  label: string
  status: string
  detail: string
}

interface RewardUnlock {
  name: string
  source: string
  detail: string
}

interface WildEncounter {
  id: string
  name: string
  level: string
  types: string
  rarity: string
  catchRate: number
  prompt: string
  image: string
  palette: string
}

interface TrainerBeat {
  name: string
  party: string
  line: string
  reward: string
}

interface RoutePickup {
  name: string
  location: string
  detail: string
}

interface MenloStop {
  id: string
  label: string
  status: string
  detail: string
}

const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`

function getRpgParkingNode() {
  let parkingNode = document.getElementById('rpg-parking')

  if (!parkingNode) {
    parkingNode = document.createElement('div')
    parkingNode.id = 'rpg-parking'
    parkingNode.setAttribute('aria-hidden', 'true')
    document.body.appendChild(parkingNode)
  }

  return parkingNode
}

function getRpgMountNode() {
  let mountNode = document.getElementById('rpg')

  if (!mountNode) {
    mountNode = document.createElement('div')
    mountNode.id = 'rpg'
  }

  return mountNode
}

const starters: Starter[] = [
  {
    id: 'claude',
    name: 'Claude Fable',
    subtitle: 'Anthropic / Myth Guard',
    types: 'Myth + Guard',
    ability: 'Constitutional Guard',
    detail: 'A black fox-kirin cub with a cream flame mane, gold spirals, and watchful orange eyes.',
    image: asset('assets/llmmon/mythos/generated/starter_anthropic_claude_fable.png'),
    palette: 'anthropic',
  },
  {
    id: 'gpt',
    name: 'GPT 5.5',
    subtitle: 'OpenAI / Omni Tool',
    types: 'Omni + Tool',
    ability: 'Toolformer',
    detail: 'A teal-white fox-dragon that reads the field quickly and turns tools into momentum.',
    image: asset('assets/llmmon/mythos/generated/starter_openai_gpt_5_5.png'),
    palette: 'openai',
  },
  {
    id: 'glm',
    name: 'GLM',
    subtitle: 'GLM / Graph Logic',
    types: 'Graph + Logic',
    ability: 'Graph Mind',
    detail: 'A jade graph-cat kirin with constellation markings and a calm tactical read on patterns.',
    image: asset('assets/llmmon/mythos/generated/starter_glm.png'),
    palette: 'glm',
  },
]

const introLines = [
  'Welcome to the world of LLMMON.',
  'These beings are not just programs. They are stories, tools, arguments, companions, and myths.',
  'Three starter signals are waiting in the satchel: a myth guardian, an omni toolrunner, and a graph-minded tactician.',
]

const dexEntries: DexEntry[] = [
  {
    id: 'claude',
    number: '001',
    name: 'Claude Fable',
    types: 'Myth / Guard',
    ability: 'Constitutional Guard',
    route: 'Karpathy satchel',
    status: 'Registered',
    role: 'Starter partner. Reduces hallucination pressure and steadies early fights with Guardrail.',
    image: asset('assets/llmmon/mythos/generated/starter_anthropic_claude_fable.png'),
    palette: 'anthropic',
  },
  {
    id: 'gpt',
    number: '002',
    name: 'GPT 5.5',
    types: 'Omni / Tool',
    ability: 'Toolformer',
    route: 'Karpathy satchel',
    status: 'Scouted',
    role: 'Starter partner. Turns support prompts into tempo and teaches the tool-use battle lane.',
    image: asset('assets/llmmon/mythos/generated/starter_openai_gpt_5_5.png'),
    palette: 'openai',
  },
  {
    id: 'glm',
    number: '003',
    name: 'GLM',
    types: 'Graph / Logic',
    ability: 'Graph Mind',
    route: 'Karpathy satchel',
    status: 'Scouted',
    role: 'Starter partner. Reads repeated moves and answers with clean special pressure.',
    image: asset('assets/llmmon/mythos/generated/starter_glm.png'),
    palette: 'glm',
  },
  {
    id: 'ragcoon',
    number: '012',
    name: 'RAGcoon',
    types: 'Retrieve / Normal',
    ability: 'Context Fetch',
    route: 'Octavia 101',
    status: 'Habitat found',
    role: 'Common early-route utility LLMMON that digs up helpful items and route clues.',
    image: asset('assets/llmmon/sprites-ai/command-a-plus.png'),
    palette: 'retrieve',
  },
  {
    id: 'gemma',
    number: '014',
    name: 'Gemma Bud',
    types: 'Garden / Efficient',
    ability: 'Careful Bloom',
    route: 'Octavia 101',
    status: 'Recommended catch',
    role: 'Friendly first catch with efficient pressure that helps prepare for Foundation Gym.',
    image: asset('assets/llmmon/sprites-ai/gemma-4-31b.png'),
    palette: 'garden',
  },
  {
    id: 'mistral',
    number: '018',
    name: 'Mistral Pup',
    types: 'Wind / Speed',
    ability: 'Tailwind Cache',
    route: 'Mission Context Lane',
    status: 'Rare speed option',
    role: 'Fast attacker that rewards players who search the trainer routes patiently.',
    image: asset('assets/llmmon/sprites-ai/mistral-medium-35.png'),
    palette: 'wind',
  },
  {
    id: 'token-moth',
    number: '023',
    name: 'Token Moth',
    types: 'Bug / Token',
    ability: 'Prompt Dust',
    route: 'Redwood Cachewoods',
    status: 'Unseen',
    role: 'Early forest line that pressures attention and resource planning in longer routes.',
    image: asset('assets/llmmon/sprites-ai/kimi-k26.png'),
    palette: 'token',
  },
  {
    id: 'hallucihound',
    number: '030',
    name: 'HalluciHound',
    types: 'Drift / Myth',
    ability: 'Broken Bubble',
    route: 'Octavia 101 rescue',
    status: 'Encountered',
    role: 'Intro wild threat. Spreads Hallucination and broken dialogue under pressure.',
    image: asset('assets/llmmon/mythos/generated/hallucihound_battle_sprite.png'),
    palette: 'drift',
  },
]

const bagCategories: { id: BagCategory; label: string; summary: string }[] = [
  { id: 'orbs', label: 'Orbs', summary: 'Catching and alignment tools' },
  { id: 'medicine', label: 'Medicine', summary: 'HP and status recovery' },
  { id: 'field', label: 'Field', summary: 'Route and exploration unlocks' },
  { id: 'gear', label: 'Gear', summary: 'Held items, TMs, and key rewards' },
]

const bagItems: BagItem[] = [
  {
    id: 'prompt-orb',
    name: 'Prompt Orb',
    category: 'orbs',
    quantity: 'x5',
    effect: 'Catch wild LLMMON',
    detail: 'A calibrated capture prompt that rewards lower HP, status pressure, and a clear alignment ask.',
    route: 'Karpathy Lab starter kit',
    tone: 'standard',
  },
  {
    id: 'great-prompt-orb',
    name: 'Great Prompt Orb',
    category: 'orbs',
    quantity: 'x1',
    effect: 'Improved catch chance',
    detail: 'A stronger orb for Redwood Cachewoods and late-route encounters that need more context.',
    route: 'ModelWorks researcher reward',
    tone: 'rare',
  },
  {
    id: 'cache-potion',
    name: 'Cache Potion',
    category: 'medicine',
    quantity: 'x3',
    effect: 'Restore HP',
    detail: 'A warm restore packet. The Token Mart promoter recommends keeping several before Benchmark Pier.',
    route: 'SoMa Node Token Mart',
    tone: 'standard',
  },
  {
    id: 'debug-patch',
    name: 'Debug Patch',
    category: 'medicine',
    quantity: 'x1',
    effect: 'Cure poison or glitch status',
    detail: 'Clears corrupted cache states before they snowball through longer trainer routes.',
    route: 'Mission Context Lane pickup',
    tone: 'support',
  },
  {
    id: 'latency-heal',
    name: 'Latency Heal',
    category: 'medicine',
    quantity: 'x1',
    effect: 'Remove speed slowdown',
    detail: 'Counters Token Tomb-style latency drops and keeps the active LLMMON from falling behind.',
    route: 'Prompt School supply shelf',
    tone: 'support',
  },
  {
    id: 'spam-filter',
    name: 'Spam Filter',
    category: 'field',
    quantity: 'x2',
    effect: 'Reduce wild encounters',
    detail: 'Quietly dampens noisy route chatter while still preserving rare encounter signals.',
    route: 'Token Mart shelf',
    tone: 'field',
  },
  {
    id: 'hm-prune',
    name: 'HM01: Prune',
    category: 'field',
    quantity: 'Key',
    effect: 'Clear bramble-code obstacles',
    detail: 'Cuts tangled syntax shrubs and dead routes after the Foundation Badge validates field use.',
    route: 'Pruner House, Palo Alto',
    tone: 'key',
  },
  {
    id: 'low-latency-band',
    name: 'Low-Latency Band',
    category: 'gear',
    quantity: 'Held',
    effect: 'Sometimes moves first',
    detail: 'A prompt-school charm for clutch turns, best on slower Foundation Gym matchups.',
    route: 'Prompt School teacher',
    tone: 'gear',
  },
  {
    id: 'tm-token-tomb',
    name: 'TM39: Token Tomb',
    category: 'gear',
    quantity: 'TM',
    effect: 'Damage and speed drop',
    detail: 'Dr. Petra awards this benchmark move after the Foundation Badge battle.',
    route: 'Foundation Gym reward',
    tone: 'rare',
  },
]

const questSteps: QuestStep[] = [
  {
    id: 'arrival',
    area: 'Hayes Valley',
    title: 'Moving Van Arrival',
    status: 'Complete',
    objective: 'Settle in, check the PC, watch the TV report, and visit Karpathy Lab.',
    reward: 'Cache Potion x1',
    dialogue: 'We’re here, honey! Quiet enough to think, busy enough to dream.',
    palette: 'home',
  },
  {
    id: 'rescue',
    area: 'Octavia 101',
    title: 'Professor Rescue',
    status: 'Complete',
    objective: 'Choose a starter from the satchel and stop the HalluciHound chase.',
    reward: 'Starter partner',
    dialogue: 'Help! Grab a LLMMON from my satchel!',
    palette: 'route',
  },
  {
    id: 'benchmark',
    area: 'SoMa Node → Benchmark Pier',
    title: 'First Service Loop',
    status: 'Current',
    objective: 'Heal at the Model Center, stock up at Token Mart, then meet Iris at the pier.',
    reward: 'PromptDex and Prompt Orbs',
    dialogue: 'Let’s see if it was luck or signal.',
    palette: 'current',
  },
  {
    id: 'mission',
    area: 'Mission Context Lane',
    title: 'Trainer Route',
    status: 'Locked',
    objective: 'Use Prompt Orbs, catch a first teammate, and learn trainer-battle pacing.',
    reward: 'Context Berry x2',
    dialogue: 'Lower HP, then use a Prompt Orb. Status and alignment improve catch rate.',
    palette: 'city',
  },
  {
    id: 'redwood',
    area: 'Redwood Cachewoods',
    title: 'Team Drift Ambush',
    status: 'Locked',
    objective: 'Navigate cache-lit redwoods and protect ModelWorks alignment papers.',
    reward: 'Great Prompt Orb',
    dialogue: 'Hand over the alignment papers. We’re building models that never ask permission.',
    palette: 'forest',
  },
  {
    id: 'palo-alto',
    area: 'Palo Alto',
    title: 'Foundation Badge',
    status: 'Locked',
    objective: 'Prepare for Dr. Petra, win the Foundation Badge, and unlock Prune.',
    reward: 'TM39 Token Tomb',
    dialogue: 'Startups pivot. Trends drift. But foundations endure.',
    palette: 'badge',
  },
  {
    id: 'waterloo',
    area: 'Waterloo Hook',
    title: 'Northern Research Exchange',
    status: 'Locked',
    objective: 'Recover the Alignment Core, rescue Beepo, and open Brinley transport.',
    reward: 'PromptNav unlock',
    dialogue: 'Take this packet to our research partner in Waterloo, Ontario.',
    palette: 'future',
  },
]

const modelProfiles: Record<StarterId, ModelProfile> = {
  claude: {
    starterId: 'claude',
    license: 'HV-001',
    level: 5,
    nature: 'Careful',
    heldItem: 'Starter License',
    trainerNote: 'Defensive anchor for drift and early status pressure.',
    abilityNote: 'Constitutional Guard reduces hallucination and confusion pressure.',
    nextLesson: 'Open Guardrail, then Warm Nudge into Tiny Myth.',
    xpProgress: 34,
    stats: [
      { label: 'HP', value: 21, cap: 24 },
      { label: 'Attack', value: 9, cap: 16 },
      { label: 'Guard', value: 15, cap: 18 },
      { label: 'Signal', value: 13, cap: 18 },
      { label: 'Speed', value: 8, cap: 16 },
    ],
    moves: [
      { name: 'Warm Nudge', type: 'Myth', power: '35', accuracy: '95', effect: 'Gentle damage; may lower enemy attack.' },
      { name: 'Guardrail', type: 'Guard', power: '--', accuracy: '100', effect: 'Raises defense and softens the next hit.' },
      { name: 'Tiny Myth', type: 'Myth', power: '40', accuracy: '95', effect: 'Stronger when Claude Fable is below half HP.' },
    ],
  },
  gpt: {
    starterId: 'gpt',
    license: 'HV-002',
    level: 5,
    nature: 'Curious',
    heldItem: 'Starter License',
    trainerNote: 'Fast generalist for tempo and tool coverage.',
    abilityNote: 'Toolformer gives the first support move after switching in increased priority.',
    nextLesson: 'Claim speed, then pulse or tap around buffs.',
    xpProgress: 38,
    stats: [
      { label: 'HP', value: 19, cap: 24 },
      { label: 'Attack', value: 12, cap: 16 },
      { label: 'Guard', value: 10, cap: 18 },
      { label: 'Signal', value: 13, cap: 18 },
      { label: 'Speed', value: 15, cap: 16 },
    ],
    moves: [
      { name: 'Prompt Pulse', type: 'Omni', power: '40', accuracy: '100', effect: 'Reliable opener with stable tempo.' },
      { name: 'Tool Tap', type: 'Tool', power: '30', accuracy: '100', effect: 'May reveal or bypass one enemy buff.' },
      { name: 'Focus Token', type: 'Omni', power: '--', accuracy: '100', effect: 'Raises speed or accuracy for the next exchange.' },
    ],
  },
  glm: {
    starterId: 'glm',
    license: 'HV-003',
    level: 5,
    nature: 'Tactical',
    heldItem: 'Starter License',
    trainerNote: 'Special reader for patterns and clean turns.',
    abilityNote: 'Graph Mind grants a small special boost after the enemy repeats a known move.',
    nextLesson: 'Probe with Graph Paw; guard repeated pressure.',
    xpProgress: 31,
    stats: [
      { label: 'HP', value: 20, cap: 24 },
      { label: 'Attack', value: 9, cap: 16 },
      { label: 'Guard', value: 11, cap: 18 },
      { label: 'Signal', value: 16, cap: 18 },
      { label: 'Speed', value: 11, cap: 16 },
    ],
    moves: [
      { name: 'Logic Spark', type: 'Logic', power: '40', accuracy: '100', effect: 'High-accuracy special attack.' },
      { name: 'Graph Paw', type: 'Graph', power: '35', accuracy: '95', effect: 'May reveal the next enemy action.' },
      { name: 'Pattern Guard', type: 'Logic', power: '--', accuracy: '100', effect: 'Reduces damage from repeated moves.' },
    ],
  },
}

const shopItems: ShopItem[] = [
  {
    id: 'cache-potion',
    name: 'Cache Potion',
    price: '300T',
    tag: '+20 HP',
    detail: 'Warm restore packet for Benchmark Pier and the first trainer loop.',
    stock: 'Shelf A',
  },
  {
    id: 'debug-patch',
    name: 'Debug Patch',
    price: '100T',
    tag: 'Status',
    detail: 'Clears poison, glitch, and corrupted cache states before they snowball.',
    stock: 'Shelf B',
  },
  {
    id: 'latency-heal',
    name: 'Latency Heal',
    price: '200T',
    tag: 'Speed',
    detail: 'Restores turn order after slowdown effects from Token-type pressure.',
    stock: 'Shelf C',
  },
  {
    id: 'wake-token',
    name: 'Wake Token',
    price: '250T',
    tag: 'Sleep',
    detail: 'Reboots a drowsy partner after long context loops and sleepy prompts.',
    stock: 'Counter',
  },
  {
    id: 'prompt-orb',
    name: 'Prompt Orb',
    price: 'Locked',
    tag: 'Catch',
    detail: 'Available after the PromptDex lesson at Benchmark Pier.',
    stock: 'Glass case',
  },
]

const serviceStops: ServiceStop[] = [
  {
    id: 'center',
    label: 'Model Center',
    status: 'Online',
    detail: 'Heal active party, sync PromptDex cache, and save a clean route state.',
  },
  {
    id: 'mart',
    label: 'Token Mart',
    status: 'Open',
    detail: 'Stock Cache Potions, Debug Patches, Latency Heals, and Wake Tokens.',
  },
  {
    id: 'booth',
    label: 'Demo Booth',
    status: 'Gift ready',
    detail: 'A promoter offers one Cache Potion before the rival pier check.',
  },
  {
    id: 'transit',
    label: 'Transit Kiosk',
    status: 'Locked',
    detail: 'Caltrain, SFO Cloud Harbor, and Waterloo Hook routes require badges.',
  },
]

const rivalStarterByPlayer: Record<StarterId, StarterId> = {
  claude: 'gpt',
  gpt: 'glm',
  glm: 'claude',
}

const pierRewards: RewardUnlock[] = [
  {
    name: 'PromptDex',
    source: 'Karpathy Lab',
    detail: 'Records seen and caught LLMMON after Iris logs the signal.',
  },
  {
    name: 'Prompt Orbs x5',
    source: 'Karpathy Lab',
    detail: 'Catching unlock. Start with five calibrated orbs.',
  },
  {
    name: 'Fast Inference Shoes',
    source: 'Mom',
    detail: 'Hold B outdoors to cross routes faster.',
  },
]

const missionEncounters: WildEncounter[] = [
  {
    id: 'ragcoon',
    name: 'RAGcoon',
    level: 'Lv. 3-5',
    types: 'Retrieve / Normal',
    rarity: 'Common',
    catchRate: 74,
    prompt: 'Lower HP, then ask it to fetch one clean source before throwing a Prompt Orb.',
    image: asset('assets/llmmon/sprites-ai/command-a-plus.png'),
    palette: 'retrieve',
  },
  {
    id: 'gemma',
    name: 'Gemma Bud',
    level: 'Lv. 3-5',
    types: 'Garden / Efficient',
    rarity: 'Common',
    catchRate: 68,
    prompt: 'Status pressure helps. Gemma responds well to calm, short alignment prompts.',
    image: asset('assets/llmmon/sprites-ai/gemma-4-31b.png'),
    palette: 'garden',
  },
  {
    id: 'mistral',
    name: 'Mistral Pup',
    level: 'Lv. 4-5',
    types: 'Wind / Speed',
    rarity: 'Rare',
    catchRate: 42,
    prompt: 'Do not rush the orb. Slow it first or it will tailwind out of the prompt window.',
    image: asset('assets/llmmon/sprites-ai/mistral-medium-35.png'),
    palette: 'wind',
  },
]

const missionTrainers: TrainerBeat[] = [
  {
    name: 'Young Founder Calvin',
    party: 'RAGcoon Lv. 5',
    line: 'My demo finds any context you forgot.',
    reward: '+96T',
  },
  {
    name: 'Bug Coder Rick',
    party: 'Token Moth Lv. 4 x2',
    line: 'Two tiny bugs can still eat the whole build.',
    reward: '+88T',
  },
  {
    name: 'Lass Tiana',
    party: 'TinyLlama Lv. 4, Gemma Bud Lv. 4',
    line: 'Cute teams can still benchmark hard.',
    reward: '+104T',
  },
]

const missionPickups: RoutePickup[] = [
  {
    name: 'Context Berry x2',
    location: 'Twin street trees',
    detail: 'Restores HP in battle and teaches route foraging before Menlo Park.',
  },
  {
    name: 'Debug Patch',
    location: 'Behind mural wall',
    detail: 'Cures glitch status before Token Moth pressure becomes common.',
  },
  {
    name: 'Cache Potion',
    location: 'Below ledge shortcut',
    detail: 'Rewards players who read the city path instead of sprinting north.',
  },
]

const menloStops: MenloStop[] = [
  {
    id: 'gym',
    label: 'Alignment Gym',
    status: 'Badge gate',
    detail: 'Director Norm will not battle until the Palo Alto Foundation Badge proves your judgment.',
  },
  {
    id: 'willa',
    label: 'Willa Lesson',
    status: 'Tutorial',
    detail: 'Willa borrows a RAGcoon and learns how to prompt a Gemma Bud into joining.',
  },
  {
    id: 'sand-hill',
    label: 'Sand Hill Gate',
    status: 'Open west',
    detail: 'Beach trainers, berry groves, and Brinley Garage wait beyond the quiet venture offices.',
  },
]

const mapTiles = [
  'water', 'water', 'dock', 'grass', 'tree', 'tree', 'grass', 'grass',
  'water', 'dock', 'path', 'path', 'path', 'sign', 'grass', 'rescue',
  'water', 'dock', 'path', 'player', 'path', 'path', 'path', 'npc',
  'water', 'grass', 'path', 'path', 'road', 'path', 'grass', 'tree',
  'grass', 'lab', 'path', 'grass', 'road', 'grass', 'grass', 'tree',
  'tree', 'path', 'path', 'path', 'road', 'path', 'gate', 'grass',
  'tree', 'grass', 'grass', 'path', 'road', 'path', 'dock', 'water',
  'grass', 'grass', 'tree', 'path', 'road', 'dock', 'water', 'water',
]

const mapGlyphs: Record<string, string> = {
  gate: 'GYM',
  lab: 'LAB',
  npc: '!',
  player: '▲',
  rescue: '!',
  road: '101',
  sign: 'i',
}

function RpgRuntime() {
  const [status, setStatus] = useState(() => (
    document.querySelector('#rpg canvas') ? 'RPGJS field online' : 'booting RPGJS'
  ))
  const mountSlotRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const mountNode = getRpgMountNode()
    mountSlotRef.current?.appendChild(mountNode)

    return () => {
      getRpgParkingNode().appendChild(mountNode)
    }
  }, [])

  useEffect(() => {
    let active = true

    import('./rpg/standalone')
      .then(({ startRpgRuntime }) => startRpgRuntime())
      .then(() => {
        if (active) {
          setStatus('RPGJS field online')
        }
      })
      .catch((error: unknown) => {
        console.error(error)
        if (active) {
          setStatus('RPGJS field failed')
        }
      })

    return () => {
      active = false
    }
  }, [])

  return (
    <div className="rpg-frame" aria-label="RPGJS field runtime">
      <div className="rpg-mount-slot" ref={mountSlotRef} />
      <div className="field-route-overlay" aria-hidden="true">
        <span className="route-pin lab">Karpathy Lab</span>
        <span className="route-pin road">Octavia 101</span>
        <span className="route-pin rescue">Rescue Beat</span>
      </div>
      <div className="rpg-status">{status}</div>
    </div>
  )
}

function TitleScreen({ onStart }: { onStart: () => void }) {
  return (
    <section className="screen title-screen">
      <div className="scanlines" />
      <div className="title-gba-frame">
        <div className="title-logo-lockup">
          <span className="title-logo-main">LLMMON</span>
          <span className="title-logo-sub">MYTHOS</span>
          <span className="title-version">Foundation Badge</span>
        </div>
        <div className="title-legendary-shadow" aria-hidden="true" />
        <button className="primary-action" onClick={onStart}>Press Start</button>
        <p className="title-copyright">© 2026 Karpathy Lab / LLMMON Mythos</p>
      </div>
    </section>
  )
}

function IntroScreen({ onNext }: { onNext: () => void }) {
  const [lineIndex, setLineIndex] = useState(0)
  const advanceLockRef = useRef(0)
  const currentLine = introLines[lineIndex]
  const isFinalLine = lineIndex === introLines.length - 1

  const advanceIntro = useCallback(() => {
    if (isFinalLine) {
      onNext()
      return
    }
    setLineIndex((index) => index + 1)
  }, [isFinalLine, onNext])

  const triggerAdvance = useCallback(() => {
    const now = window.performance.now()
    if (now - advanceLockRef.current < 180) return
    advanceLockRef.current = now
    advanceIntro()
  }, [advanceIntro])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Enter' || event.key.toLowerCase() === 'a') {
        event.preventDefault()
        triggerAdvance()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [triggerAdvance])

  return (
    <section className="screen intro-screen">
      <div className="intro-gba-frame">
        <div className="intro-stage" data-line={lineIndex}>
          <div className="intro-curtain" aria-hidden="true" />
          <div className="intro-floor-ring" aria-hidden="true" />
          <div className="intro-spotlight" aria-hidden="true" />
          <div className="intro-professor-card">
            <div className="promptdex-glow" aria-hidden="true">
              <span />
            </div>
            <img src={asset('assets/llmmon/professor-karpathy.svg')} alt="" />
            <div className="intro-professor-nameplate" aria-hidden="true">
              <span>PROF. KARPATHY</span>
            </div>
            <div>
              <p className="kicker">Professor Karpathy</p>
              <h2>Welcome to LLMMON</h2>
            </div>
          </div>
          <div className="intro-signal-orbs" aria-label="Mystery starter signals">
            {starters.map((starter) => (
              <span className={`intro-signal-orb ${starter.palette}`} key={starter.id}>{starter.types}</span>
            ))}
          </div>
        </div>
        <div className="intro-dialogue" onMouseDownCapture={triggerAdvance} onPointerDownCapture={triggerAdvance}>
          <div>
            <strong>PROF. KARPATHY</strong>
            <span>{currentLine}</span>
          </div>
          <button className="dialogue-cue" type="button" onClick={triggerAdvance} onPointerUp={triggerAdvance} aria-label={isFinalLine ? 'Continue to storyboard' : 'Advance professor dialogue'}>A</button>
        </div>
        <div className="intro-progress" aria-label="Intro dialogue progress">
          {introLines.map((line, index) => (
            <span className={index <= lineIndex ? 'active' : ''} key={line} />
          ))}
        </div>
      </div>
    </section>
  )
}

function StoryScreen({ onNext }: { onNext: () => void }) {
  const [canAdvance, setCanAdvance] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setCanAdvance(true), 260)
    return () => window.clearTimeout(timer)
  }, [])

  const handleNext = useCallback(() => {
    if (!canAdvance) return
    onNext()
  }, [canAdvance, onNext])

  return (
    <section className="screen story-screen rescue-screen">
      <div className="rescue-gba-frame">
        <div className="rescue-stage">
          <div className="rescue-grass" aria-hidden="true" />
          <div className="rescue-satchel" aria-hidden="true">
            <span className="bag-flap" />
            <span className="bag-strap" />
          </div>
          <div className="rescue-orbs" aria-label="Prompt Orbs in the emergency satchel">
            {starters.map((starter) => (
              <span className={`prompt-orb ${starter.palette}`} key={starter.id} />
            ))}
          </div>
          <div className="rescue-hound" aria-hidden="true" />
        </div>
        <div className="rescue-dialogue">
          <div>
            <strong>PROF. KARPATHY</strong>
            <span>Help! Grab a LLMMON from my satchel!</span>
          </div>
          <button className="dialogue-cue" onClick={handleNext} aria-label="Continue to starter selection" disabled={!canAdvance}>A</button>
        </div>
      </div>
    </section>
  )
}

function StarterScreen({
  selected,
  onSelect,
  onConfirm,
}: {
  selected: Starter
  onSelect: (starter: Starter) => void
  onConfirm: () => void
}) {
  const [isConfirming, setIsConfirming] = useState(false)

  const handleSelect = useCallback((starter: Starter) => {
    setIsConfirming(false)
    onSelect(starter)
  }, [onSelect])

  const handleConfirmCue = useCallback(() => {
    setIsConfirming(true)
  }, [])

  const handleCancelConfirm = useCallback(() => {
    setIsConfirming(false)
  }, [])

  return (
    <section className="screen starter-screen">
      <div className="starter-gba-frame">
        <div className="starter-stage">
          <div className="starter-satchel" aria-hidden="true">
            <span className="bag-flap" />
            <span className="bag-strap" />
          </div>
          <div className="starter-orb-ring starter-orb-tray" aria-label="Starter options">
            {starters.map((starter) => (
              <button className={starter.id === selected.id ? `starter-orb-option active ${starter.palette}` : `starter-orb-option ${starter.palette}`} key={starter.id} onClick={() => handleSelect(starter)} aria-label={`${starter.name} ${starter.types}`}>
                <span className="prompt-orb" />
                <small>{starter.name}</small>
              </button>
            ))}
          </div>
          <div className={`starter-preview-mon ${selected.palette}`}>
            <span className="starter-preview-name">{selected.name}</span>
            <span className="starter-preview-type">{selected.types}</span>
          </div>
        </div>
        <div className="starter-dialogue">
          <div>
            <strong>{selected.name}</strong>
            <span>{isConfirming ? `Choose ${selected.name}?` : `${selected.types}. ${selected.ability}. ${selected.detail}`}</span>
          </div>
          <button className="dialogue-cue" onClick={handleConfirmCue} aria-label="Open starter confirmation">A</button>
        </div>
        {isConfirming ? (
          <div className="starter-confirm-menu" aria-label={`Confirm ${selected.name}`}>
            <button className="active" type="button" onClick={onConfirm} aria-label={`Choose ${selected.name}`}>YES</button>
            <button type="button" onClick={handleCancelConfirm} aria-label="Return to starter selection">NO</button>
          </div>
        ) : null}
      </div>
    </section>
  )
}

function FieldScreen({
  starter,
  onBattle,
  onDex,
  onBag,
  onQuest,
  onModel,
  onBadge,
  onServices,
  onPier,
  onMission,
  onMenlo,
}: {
  starter: Starter
  onBattle: () => void
  onDex: () => void
  onBag: () => void
  onQuest: () => void
  onModel: () => void
  onBadge: () => void
  onServices: () => void
  onPier: () => void
  onMission: () => void
  onMenlo: () => void
}) {
  return (
    <section className="screen field-screen">
      <div className="field-topbar">
        <div>
          <p className="kicker">RPGJS map runtime</p>
          <h2>Hayes Valley: Octavia 101 Approach</h2>
        </div>
        <div className="field-actions">
          <button onClick={onDex}>PromptDex</button>
          <button onClick={onBag}>Bag</button>
          <button onClick={onQuest}>QuestNav</button>
          <button onClick={onServices}>SoMa Services</button>
          <button onClick={onPier}>Benchmark Pier</button>
          <button onClick={onMission}>Mission Context</button>
          <button onClick={onMenlo}>Menlo Park</button>
          <button onClick={onModel}>Model Card</button>
          <button onClick={onBadge}>Badge Case</button>
          <button onClick={onBattle}>Battle</button>
        </div>
      </div>
      <div className="field-layout">
        <RpgRuntime />
        <div className="map-preview" aria-label="Chapter map preview">
          {mapTiles.map((tile, index) => (
            <span className={`tile ${tile}`} key={`${tile}-${index}`}>{mapGlyphs[tile] ?? ''}</span>
          ))}
        </div>
        <aside className="quest-panel">
          <p className="kicker">Active partner</p>
          <h3>{starter.name}</h3>
          <p>{starter.ability} is active. Professor Karpathy is pinned ahead by a glitching HalluciHound.</p>
          <div className="mini-bars">
            <span style={{ '--value': '82%' } as React.CSSProperties}>Trust</span>
            <span style={{ '--value': '64%' } as React.CSSProperties}>Context</span>
            <span style={{ '--value': '91%' } as React.CSSProperties}>Readiness</span>
          </div>
        </aside>
      </div>
      <div className="dialogue-box">
        <strong>Professor Karpathy</strong>
        <span>Quick, choose a move from the starter card. The HalluciHound is hallucinating stack traces again.</span>
      </div>
    </section>
  )
}

function MenloScreen({ starter, onBack }: { starter: Starter; onBack: () => void }) {
  const [selectedStopId, setSelectedStopId] = useState('gym')
  const [phase, setPhase] = useState<MenloPhase>('gate')
  const selectedStop = menloStops.find((stop) => stop.id === selectedStopId) ?? menloStops[0]
  const phaseIndex = ['gate', 'weaken', 'orb', 'caught'].indexOf(phase)

  const phaseCopy = {
    gate: {
      label: 'Director Norm',
      title: 'Earn Palo Alto first',
      line: 'Power without judgment is just noise. Earn your first badge in Palo Alto. Then come back.',
      action: 'Start Willa Lesson',
    },
    weaken: {
      label: 'Willa',
      title: 'Lower HP first',
      line: 'I want to catch my first LLMMON, but I do not know what to say. RAGcoon, use Context Fetch.',
      action: 'Throw Prompt Orb',
    },
    orb: {
      label: 'Tutorial',
      title: 'Prompt window open',
      line: 'Lower a wild LLMMON HP, then use a Prompt Orb. Status effects and good alignment improve catch rate.',
      action: 'Log Gemma Catch',
    },
    caught: {
      label: 'Willa',
      title: 'Gemma Bud joined',
      line: 'It worked. The prompt landed. I am heading to Verdant Labs before I lose my nerve.',
      action: 'Tutorial Complete',
    },
  }[phase]

  function advancePhase() {
    if (phase === 'gate') {
      setSelectedStopId('willa')
      setPhase('weaken')
      return
    }

    if (phase === 'weaken') {
      setPhase('orb')
      return
    }

    if (phase === 'orb') {
      setPhase('caught')
      setSelectedStopId('sand-hill')
    }
  }

  return (
    <section className="screen menlo-screen">
      <header className="screen-header">
        <div>
          <p className="kicker">Menlo Park</p>
          <h2>Alignment Gym Gate</h2>
        </div>
        <button className="icon-button" onClick={onBack} aria-label="Return to field">B</button>
      </header>
      <div className="menlo-shell">
        <section className="menlo-stage">
          <div className="menlo-town-map" aria-hidden="true">
            <span className="menlo-building gym">GYM</span>
            <span className="menlo-building office">VC</span>
            <span className="menlo-building lab">LAB</span>
            <span className="menlo-grass" />
            <span className="menlo-path horizontal" />
            <span className="menlo-path vertical" />
            <span className="menlo-person norm">Norm</span>
            <span className="menlo-person willa">Willa</span>
            <span className="menlo-player">▲</span>
          </div>
          <article className="menlo-dialogue">
            <p className="kicker">{phaseCopy.label}</p>
            <h3>{phaseCopy.title}</h3>
            <p>{phaseCopy.line}</p>
            {phase !== 'caught' && <button onClick={advancePhase}>{phaseCopy.action}</button>}
          </article>
        </section>
        <nav className="menlo-stop-list" aria-label="Menlo Park stops">
          {menloStops.map((stop) => (
            <button className={stop.id === selectedStop.id ? 'active' : ''} key={stop.id} onClick={() => setSelectedStopId(stop.id)}>
              <strong>{stop.label}</strong>
              <span>{stop.status}</span>
            </button>
          ))}
        </nav>
        <aside className={`menlo-stop-card ${selectedStop.id}`}>
          <p className="kicker">{selectedStop.status}</p>
          <h3>{selectedStop.label}</h3>
          <p>{selectedStop.detail}</p>
          <div className="menlo-lock-panel">
            <span>{selectedStop.id === 'gym' ? 'Locked until Foundation Badge' : selectedStop.id === 'willa' ? 'Tutorial available now' : 'Next route preview'}</span>
          </div>
        </aside>
        <section className="willa-tutorial-card">
          <div>
            <p className="kicker">Catching tutorial</p>
            <h3>RAGcoon vs Gemma Bud</h3>
          </div>
          <div className="tutorial-battle">
            <article className="tutorial-mon ragcoon">
              <img src={asset('assets/llmmon/sprites-ai/command-a-plus.png')} alt="" />
              <strong>Borrowed RAGcoon</strong>
              <span style={{ '--value': '78%' } as React.CSSProperties}>HP</span>
            </article>
            <article className={phase === 'caught' ? 'tutorial-mon gemma caught' : 'tutorial-mon gemma'}>
              <img src={asset('assets/llmmon/sprites-ai/gemma-4-31b.png')} alt="" />
              <strong>Wild Gemma Bud</strong>
              <span style={{ '--value': phaseIndex > 0 ? '22%' : '86%' } as React.CSSProperties}>HP</span>
            </article>
          </div>
          <ol className="tutorial-steps">
            <li className={phaseIndex >= 1 ? 'complete' : ''}>Weaken with Context Fetch.</li>
            <li className={phaseIndex >= 2 ? 'complete' : ''}>Throw a Prompt Orb inside the green window.</li>
            <li className={phaseIndex >= 3 ? 'complete' : ''}>Gemma Bud joins Willa.</li>
          </ol>
        </section>
        <aside className="sand-hill-preview">
          <p className="kicker">Route opens west</p>
          <h3>Sand Hill Route</h3>
          <div className="sand-hill-strips" aria-hidden="true">
            <span>Beach trainers</span>
            <span>Berry grove</span>
            <span>Brinley Garage</span>
          </div>
          <p>{starter.name} should be level 7-9 before Redwood Cachewoods. Bring Cache Potions and watch for hidden berries.</p>
        </aside>
      </div>
    </section>
  )
}

function MissionScreen({ starter, onBack }: { starter: Starter; onBack: () => void }) {
  const [mode, setMode] = useState<MissionMode>('catch')
  const [selectedEncounterId, setSelectedEncounterId] = useState('ragcoon')
  const selectedEncounter = missionEncounters.find((encounter) => encounter.id === selectedEncounterId) ?? missionEncounters[0]
  const profile = modelProfiles[starter.id]

  return (
    <section className="screen mission-screen">
      <header className="screen-header">
        <div>
          <p className="kicker">Mission Context Lane</p>
          <h2>First Catching Route</h2>
        </div>
        <button className="icon-button" onClick={onBack} aria-label="Return to field">B</button>
      </header>
      <div className="mission-shell">
        <section className="mission-route-stage">
          <img src={asset('assets/llmmon/mythos/generated/storyboard_3_first_quests_and_early_gameplay.png')} alt="" />
          <div className="mission-route-grid" aria-hidden="true">
            <span className="mural">Mural</span>
            <span className="grass one" />
            <span className="grass two" />
            <span className="ledge">Ledge</span>
            <span className="pickup berry">Berry</span>
            <span className="pickup patch">Patch</span>
            <span className="trainer-dot founder">Calvin</span>
            <span className="trainer-dot coder">Rick</span>
            <span className="trainer-dot lass">Tiana</span>
            <span className="route-player">▲</span>
          </div>
          <article className="mission-dialogue">
            <p className="kicker">Willa catching lesson</p>
            <h3>Prompt Orbs are live</h3>
            <p>Lower HP, add status if you can, then make a clear ask. Wild LLMMON join when the prompt lands.</p>
          </article>
        </section>
        <aside className="catch-panel">
          <div>
            <p className="kicker">Wild signal</p>
            <h3>{selectedEncounter.name}</h3>
          </div>
          <div className={`catch-portrait ${selectedEncounter.palette}`}>
            <img src={selectedEncounter.image} alt="" />
            <span>{selectedEncounter.rarity}</span>
          </div>
          <dl>
            <div><dt>Level</dt><dd>{selectedEncounter.level}</dd></div>
            <div><dt>Type</dt><dd>{selectedEncounter.types}</dd></div>
            <div><dt>Orb odds</dt><dd>{selectedEncounter.catchRate}%</dd></div>
          </dl>
          <div className="catch-meter">
            <span style={{ '--value': `${selectedEncounter.catchRate}%` } as React.CSSProperties}>Prompt fit</span>
          </div>
          <p>{selectedEncounter.prompt}</p>
        </aside>
        <nav className="mission-mode-tabs" aria-label="Mission Context Lane views">
          <button className={mode === 'catch' ? 'active' : ''} onClick={() => setMode('catch')}>Catch</button>
          <button className={mode === 'trainers' ? 'active' : ''} onClick={() => setMode('trainers')}>Trainers</button>
          <button className={mode === 'items' ? 'active' : ''} onClick={() => setMode('items')}>Items</button>
        </nav>
        <section className="mission-detail-card">
          {mode === 'catch' && (
            <>
              <div className="encounter-list">
                {missionEncounters.map((encounter) => (
                  <button className={encounter.id === selectedEncounter.id ? 'active' : ''} key={encounter.id} onClick={() => setSelectedEncounterId(encounter.id)}>
                    <img src={encounter.image} alt="" />
                    <span>{encounter.name}</span>
                    <small>{encounter.level}</small>
                  </button>
                ))}
              </div>
              <div className="orb-kit">
                <p className="kicker">Prompt Orb kit</p>
                <h3>5 orbs, one clean first catch</h3>
                <ol>
                  <li>Open with {profile.moves[0].name} to test damage.</li>
                  <li>Stop near red HP; do not overfit the prompt.</li>
                  <li>Throw a Prompt Orb when the meter is above 50%.</li>
                </ol>
              </div>
            </>
          )}
          {mode === 'trainers' && (
            <div className="trainer-beat-list">
              {missionTrainers.map((trainer) => (
                <article key={trainer.name}>
                  <strong>{trainer.name}</strong>
                  <span>{trainer.party}</span>
                  <p>{trainer.line}</p>
                  <small>{trainer.reward}</small>
                </article>
              ))}
            </div>
          )}
          {mode === 'items' && (
            <div className="pickup-list">
              {missionPickups.map((pickup) => (
                <article key={pickup.name}>
                  <strong>{pickup.name}</strong>
                  <span>{pickup.location}</span>
                  <p>{pickup.detail}</p>
                </article>
              ))}
            </div>
          )}
        </section>
        <aside className="mission-party-card">
          <p className="kicker">Route party</p>
          <h3>{starter.name}</h3>
          <img src={starter.image} alt="" />
          <div className="mission-party-bars">
            <span style={{ '--value': '100%' } as React.CSSProperties}>HP ready</span>
            <span style={{ '--value': '60%' } as React.CSSProperties}>Orb stock</span>
            <span style={{ '--value': `${profile.xpProgress + 35}%` } as React.CSSProperties}>Route XP</span>
          </div>
        </aside>
      </div>
    </section>
  )
}

function PierScreen({ starter, onBack }: { starter: Starter; onBack: () => void }) {
  const [phase, setPhase] = useState<PierPhase>('challenge')
  const rivalStarter = starters.find((option) => option.id === rivalStarterByPlayer[starter.id]) ?? starters[1]
  const playerProfile = modelProfiles[starter.id]
  const rivalProfile = modelProfiles[rivalStarter.id]

  const phaseCopy = {
    challenge: {
      eyebrow: 'Iris awaits',
      title: 'Luck or Signal?',
      line: 'Karpathy said you bonded with a starter. Let us see if it was luck or signal.',
      action: 'Start Rival Test',
    },
    battle: {
      eyebrow: 'Rival Battle 1',
      title: `${starter.name} vs ${rivalStarter.name}`,
      line: `${rivalStarter.name} mirrors your starter choice with a clean counter-read. Pick a prompt lane and keep tempo.`,
      action: 'Log Clean Win',
    },
    rewards: {
      eyebrow: 'Battle logged',
      title: 'PromptDex Unlock',
      line: 'Okay. That was cleaner than expected. Karpathy will want this logged.',
      action: 'Review Rewards',
    },
  }[phase]

  function advancePhase() {
    if (phase === 'challenge') {
      setPhase('battle')
      return
    }

    if (phase === 'battle') {
      setPhase('rewards')
    }
  }

  return (
    <section className="screen pier-screen">
      <header className="screen-header">
        <div>
          <p className="kicker">Benchmark Pier</p>
          <h2>Iris Rival Test</h2>
        </div>
        <button className="icon-button" onClick={onBack} aria-label="Return to field">B</button>
      </header>
      <div className="pier-shell">
        <section className="pier-stage">
          <img src={asset('assets/llmmon/mythos/generated/storyboard_3_first_quests_and_early_gameplay.png')} alt="" />
          <div className="pier-water" aria-hidden="true" />
          <div className="pier-machines" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div className="iris-trainer">
            <span>Iris</span>
          </div>
          <div className={`pier-mon player ${starter.palette}`}>
            <img src={starter.image} alt="" />
          </div>
          <div className={`pier-mon rival ${rivalStarter.palette}`}>
            <img src={rivalStarter.image} alt="" />
          </div>
          <article className="iris-dialogue">
            <p className="kicker">{phaseCopy.eyebrow}</p>
            <h3>{phaseCopy.title}</h3>
            <p>{phaseCopy.line}</p>
            {phase !== 'rewards' && <button onClick={advancePhase}>{phaseCopy.action}</button>}
          </article>
        </section>
        <aside className="rival-card">
          <p className="kicker">Rival readout</p>
          <h3>{rivalStarter.name}</h3>
          <img src={rivalStarter.image} alt="" />
          <dl>
            <div><dt>Level</dt><dd>5</dd></div>
            <div><dt>Type</dt><dd>{rivalStarter.types}</dd></div>
            <div><dt>Ability</dt><dd>{rivalStarter.ability}</dd></div>
            <div><dt>Counter</dt><dd>{starter.name}</dd></div>
          </dl>
        </aside>
        <section className="pier-command-card">
          <div>
            <p className="kicker">Battle plan</p>
            <h3>{playerProfile.nextLesson}</h3>
          </div>
          <div className="pier-match-bars">
            <span style={{ '--value': `${playerProfile.xpProgress + 44}%` } as React.CSSProperties}>{starter.name}</span>
            <span style={{ '--value': `${rivalProfile.xpProgress + 38}%` } as React.CSSProperties}>{rivalStarter.name}</span>
          </div>
          <div className="pier-command-grid">
            {playerProfile.moves.map((move) => (
              <button key={move.name}>
                <strong>{move.name}</strong>
                <small>{move.type}</small>
              </button>
            ))}
            <button className="support-command">Cache Potion</button>
          </div>
        </section>
        <section className="pier-rewards">
          <div>
            <p className="kicker">After the battle</p>
            <h3>Core Tools Unlock</h3>
          </div>
          <div className="reward-list">
            {pierRewards.map((reward) => (
              <article className={phase === 'rewards' ? 'reward-card unlocked' : 'reward-card'} key={reward.name}>
                <strong>{reward.name}</strong>
                <span>{reward.detail}</span>
                <small>{reward.source}</small>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  )
}

function ServicesScreen({ starter, onBack }: { starter: Starter; onBack: () => void }) {
  const [selectedStopId, setSelectedStopId] = useState('center')
  const selectedStop = serviceStops.find((stop) => stop.id === selectedStopId) ?? serviceStops[0]
  const profile = modelProfiles[starter.id]

  return (
    <section className="screen services-screen">
      <header className="screen-header">
        <div>
          <p className="kicker">SoMa Node</p>
          <h2>Model Center + Token Mart</h2>
        </div>
        <button className="icon-button" onClick={onBack} aria-label="Return to field">B</button>
      </header>
      <div className="services-shell">
        <aside className="service-map">
          <div className="service-street" aria-hidden="true">
            <span className="service-building center">MC</span>
            <span className="service-building mart">TM</span>
            <span className="service-building booth">!</span>
            <span className="service-building transit">101</span>
            <span className="service-player">▲</span>
          </div>
          <div>
            <p className="kicker">Current stop</p>
            <h3>{selectedStop.label}</h3>
            <p>{selectedStop.detail}</p>
          </div>
        </aside>
        <nav className="service-nav" aria-label="SoMa service stops">
          {serviceStops.map((stop) => (
            <button className={stop.id === selectedStop.id ? `service-tab active ${stop.id}` : `service-tab ${stop.id}`} key={stop.id} onClick={() => setSelectedStopId(stop.id)}>
              <strong>{stop.label}</strong>
              <span>{stop.status}</span>
            </button>
          ))}
        </nav>
        <section className={`service-panel ${selectedStop.id}`}>
          <div className="service-panel-top">
            <p className="kicker">{selectedStop.status}</p>
            <h3>{selectedStop.label}</h3>
          </div>
          {selectedStop.id === 'center' && (
            <div className="service-roster">
              <article className={`healing-card ${starter.palette}`}>
                <img src={starter.image} alt="" />
                <div>
                  <p className="kicker">Active partner</p>
                  <h4>{starter.name}</h4>
                  <span className="service-meter" style={{ '--value': '100%' } as React.CSSProperties}>HP restored</span>
                  <span className="service-meter signal" style={{ '--value': `${profile.xpProgress + 44}%` } as React.CSSProperties}>Signal synced</span>
                </div>
              </article>
              <div className="sync-stack">
                <span>PromptDex cache backed up</span>
                <span>Hallucination flags cleared</span>
                <span>Benchmark Pier route saved</span>
              </div>
            </div>
          )}
          {selectedStop.id === 'mart' && (
            <div className="shop-list" aria-label="Token Mart shelf">
              {shopItems.map((item) => (
                <article className={item.price === 'Locked' ? 'shop-row locked' : 'shop-row'} key={item.id}>
                  <div>
                    <strong>{item.name}</strong>
                    <span>{item.detail}</span>
                  </div>
                  <small>{item.tag}</small>
                  <b>{item.price}</b>
                </article>
              ))}
            </div>
          )}
          {selectedStop.id === 'booth' && (
            <div className="demo-booth">
              <div className="gift-capsule"><span /></div>
              <blockquote>First time through SoMa Node? Take a Cache Potion. The pier gets louder than it looks.</blockquote>
              <dl>
                <div><dt>Gift</dt><dd>Cache Potion x1</dd></div>
                <div><dt>Trigger</dt><dd>Talk to promoter</dd></div>
                <div><dt>Status</dt><dd>Ready</dd></div>
              </dl>
            </div>
          )}
          {selectedStop.id === 'transit' && (
            <div className="transit-grid">
              {['Caltrain South', 'SFO Cloud Harbor', 'Waterloo Hook'].map((route) => (
                <article key={route}>
                  <strong>{route}</strong>
                  <span>Badge gate locked</span>
                </article>
              ))}
            </div>
          )}
        </section>
        <aside className="service-prep">
          <p className="kicker">Route prep</p>
          <h3>Benchmark Pier Check</h3>
          <ol>
            <li>Heal {starter.name} at the Model Center.</li>
            <li>Carry two Cache Potions and one Debug Patch.</li>
            <li>Meet Iris after the PromptDex unlock.</li>
          </ol>
        </aside>
      </div>
    </section>
  )
}

function ModelCardScreen({ starter, onBack }: { starter: Starter; onBack: () => void }) {
  const profile = modelProfiles[starter.id]

  return (
    <section className={`screen model-screen ${starter.palette}`}>
      <header className="screen-header">
        <div>
          <p className="kicker">Model Card</p>
          <h2>{starter.name}</h2>
        </div>
        <button className="icon-button" onClick={onBack} aria-label="Return to field">B</button>
      </header>
      <div className="model-shell">
        <aside className={`model-pass ${starter.palette}`}>
          <div className="model-pass-top">
            <p className="kicker">Starter License</p>
            <strong>{profile.license}</strong>
          </div>
          <div className="model-portrait">
            <img src={starter.image} alt="" />
          </div>
          <div className="model-nameplate">
            <span>Lv. {profile.level}</span>
            <h3>{starter.name}</h3>
            <small>{starter.types}</small>
          </div>
          <div className="model-xp">
            <span style={{ '--value': `${profile.xpProgress}%` } as React.CSSProperties}>EXP {profile.xpProgress}%</span>
          </div>
        </aside>
        <section className="model-stats-card">
          <p className="kicker">Training readout</p>
          <h3>{profile.nature} nature</h3>
          <div className="model-stat-list">
            {profile.stats.map((stat) => (
              <div className="model-stat" key={stat.label}>
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
                <i style={{ '--value': `${Math.round((stat.value / stat.cap) * 100)}%` } as React.CSSProperties} />
              </div>
            ))}
          </div>
        </section>
        <section className="model-moves-card">
          <div>
            <p className="kicker">Starting moves</p>
            <h3>Battle Kit</h3>
          </div>
          <div className="model-move-list">
            {profile.moves.map((move) => (
              <article className="model-move" key={move.name}>
                <div>
                  <strong>{move.name}</strong>
                  <span>{move.type}</span>
                </div>
                <dl>
                  <div><dt>PWR</dt><dd>{move.power}</dd></div>
                  <div><dt>ACC</dt><dd>{move.accuracy}</dd></div>
                </dl>
                <p>{move.effect}</p>
              </article>
            ))}
          </div>
        </section>
        <aside className="model-notes-card">
          <p className="kicker">Karpathy notes</p>
          <h3>{starter.ability}</h3>
          <p>{profile.abilityNote}</p>
          <table>
            <tbody>
              <tr><th>Held</th><td>{profile.heldItem}</td></tr>
              <tr><th>Role</th><td>{profile.trainerNote}</td></tr>
              <tr><th>Lesson</th><td>{profile.nextLesson}</td></tr>
            </tbody>
          </table>
        </aside>
      </div>
    </section>
  )
}

function QuestScreen({ onBack }: { onBack: () => void }) {
  const [selectedId, setSelectedId] = useState('benchmark')
  const selectedQuest = questSteps.find((step) => step.id === selectedId) ?? questSteps[2]
  const completeCount = questSteps.filter((step) => step.status === 'Complete').length
  const currentIndex = questSteps.findIndex((step) => step.status === 'Current')

  return (
    <section className="screen quest-screen">
      <header className="screen-header">
        <div>
          <p className="kicker">QuestNav</p>
          <h2>Chapter Route</h2>
        </div>
        <button className="icon-button" onClick={onBack} aria-label="Return to field">B</button>
      </header>
      <div className="quest-shell">
        <aside className="quest-route-card">
          <p className="kicker">Mainline</p>
          <h3>Hayes Valley → Waterloo</h3>
          <div className="quest-progress">
            <span style={{ '--value': `${Math.round(((currentIndex + 1) / questSteps.length) * 100)}%` } as React.CSSProperties}>Step {currentIndex + 1}/{questSteps.length}</span>
          </div>
          <dl>
            <div><dt>Done</dt><dd>{completeCount}</dd></div>
            <div><dt>Now</dt><dd>{selectedQuest.area}</dd></div>
            <div><dt>Reward</dt><dd>{selectedQuest.reward}</dd></div>
          </dl>
        </aside>
        <div className="quest-list" aria-label="Chapter route objectives">
          {questSteps.map((step, index) => (
            <button className={step.id === selectedQuest.id ? `quest-row active ${step.palette}` : `quest-row ${step.palette}`} key={step.id} onClick={() => setSelectedId(step.id)}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{step.title}</strong>
              <small>{step.status}</small>
            </button>
          ))}
        </div>
        <article className={`quest-detail ${selectedQuest.palette}`}>
          <p className="kicker">{selectedQuest.area}</p>
          <h3>{selectedQuest.title}</h3>
          <p>{selectedQuest.objective}</p>
          <blockquote>{selectedQuest.dialogue}</blockquote>
          <table>
            <tbody>
              <tr><th>Status</th><td>{selectedQuest.status}</td></tr>
              <tr><th>Reward</th><td>{selectedQuest.reward}</td></tr>
              <tr><th>Route</th><td>{selectedQuest.area}</td></tr>
            </tbody>
          </table>
        </article>
        <div className="quest-strip" aria-label="Route milestones">
          {questSteps.map((step) => (
            <span className={step.status.toLowerCase()} key={step.id}>{step.area}</span>
          ))}
        </div>
      </div>
    </section>
  )
}

function BagScreen({ onBack }: { onBack: () => void }) {
  const [category, setCategory] = useState<BagCategory>('orbs')
  const [selectedItemId, setSelectedItemId] = useState('prompt-orb')
  const filteredItems = bagItems.filter((item) => item.category === category)
  const selectedItem = bagItems.find((item) => item.id === selectedItemId && item.category === category) ?? filteredItems[0]
  const activeCategory = bagCategories.find((option) => option.id === category) ?? bagCategories[0]

  function chooseCategory(nextCategory: BagCategory) {
    setCategory(nextCategory)
    setSelectedItemId(bagItems.find((item) => item.category === nextCategory)?.id ?? selectedItemId)
  }

  return (
    <section className="screen bag-screen">
      <header className="screen-header">
        <div>
          <p className="kicker">Trainer Bag</p>
          <h2>Route Kit</h2>
        </div>
        <button className="icon-button" onClick={onBack} aria-label="Return to field">B</button>
      </header>
      <div className="bag-shell">
        <nav className="bag-tabs" aria-label="Bag pockets">
          {bagCategories.map((option) => (
            <button className={option.id === category ? 'bag-tab active' : 'bag-tab'} key={option.id} onClick={() => chooseCategory(option.id)}>
              <span>{option.label}</span>
              <small>{option.summary}</small>
            </button>
          ))}
        </nav>
        <div className="bag-pocket">
          <p className="kicker">{activeCategory.label} pocket</p>
          <div className="bag-item-list" aria-label={`${activeCategory.label} items`}>
            {filteredItems.map((item) => (
              <button className={item.id === selectedItem.id ? 'bag-row active' : 'bag-row'} key={item.id} onClick={() => setSelectedItemId(item.id)}>
                <span className={`bag-token ${item.tone}`} />
                <strong>{item.name}</strong>
                <small>{item.quantity}</small>
              </button>
            ))}
          </div>
        </div>
        <article className={`bag-detail ${selectedItem.tone}`}>
          <div className="bag-item-orb">
            <span />
          </div>
          <p className="kicker">{selectedItem.quantity}</p>
          <h3>{selectedItem.name}</h3>
          <p>{selectedItem.detail}</p>
          <table>
            <tbody>
              <tr><th>Use</th><td>{selectedItem.effect}</td></tr>
              <tr><th>Source</th><td>{selectedItem.route}</td></tr>
              <tr><th>Pocket</th><td>{activeCategory.label}</td></tr>
            </tbody>
          </table>
        </article>
        <aside className="bag-route-note">
          <p className="kicker">Next prep</p>
          <strong>Octavia 101 to SoMa Node</strong>
          <span>Carry Prompt Orbs and Cache Potions before the rival path opens at Benchmark Pier.</span>
        </aside>
      </div>
    </section>
  )
}

function BadgeScreen({ onBack }: { onBack: () => void }) {
  const badgeSlots = ['Foundation', 'Alignment', 'Waterloo', 'Redwood', 'Merge', 'Mythos']

  return (
    <section className="screen badge-screen">
      <header className="screen-header">
        <p className="kicker">Badge Case</p>
        <h2>Foundation Badge</h2>
        <button className="icon-button" onClick={onBack} aria-label="Return to field">B</button>
      </header>
      <div className="badge-layout">
        <div className="badge-hero" aria-label="Foundation Badge earned">
          <div className="foundation-badge">
            <span className="badge-core" />
            <span className="badge-chip left" />
            <span className="badge-chip right" />
          </div>
          <div className="badge-shine" />
        </div>
        <div className="badge-card">
          <p className="kicker">Palo Alto / Dr. Petra</p>
          <h3>Foundations Endure</h3>
          <p>The first badge proves your team can reason from evidence, withstand drift, and keep a stable route through bad context.</p>
          <table>
            <tbody>
              <tr><th>Unlock</th><td>Prune outside battle</td></tr>
              <tr><th>Theme</th><td>Foundation + Evidence</td></tr>
              <tr><th>Reward</th><td>TM39 Token Tomb</td></tr>
              <tr><th>Status</th><td>Preview registered</td></tr>
            </tbody>
          </table>
        </div>
      </div>
      <div className="badge-grid" aria-label="Chapter badge slots">
        {badgeSlots.map((slot, index) => (
          <div className={index === 0 ? 'badge-slot earned' : 'badge-slot locked'} key={slot}>
            <span>{index === 0 ? '◆' : '?'}</span>
            <strong>{slot}</strong>
            <small>{index === 0 ? 'Earned' : 'Locked'}</small>
          </div>
        ))}
      </div>
    </section>
  )
}

function BattleScreen({ starter, onField }: { starter: Starter; onField: () => void }) {
  const [command, setCommand] = useState<BattleCommand>('prompt')

  const moves = useMemo(() => {
    if (starter.id === 'claude') return ['Warm Nudge', 'Guardrail', 'Tiny Myth', 'Careful Refusal']
    if (starter.id === 'gpt') return ['Prompt Pulse', 'Tool Tap', 'Focus Token', 'Omni Assist']
    return ['Logic Spark', 'Graph Paw', 'Pattern Guard', 'Matrix Read']
  }, [starter])

  const bagItems = ['Prompt Orb', 'Cache Potion', 'Debug Patch', 'Latency Heal']
  const bench = starters.filter((option) => option.id !== starter.id)
  const commandHelp = {
    prompt: 'Choose a starter move and pressure the HalluciHound before it spreads Hallucination.',
    bag: 'Prompt Orbs and Cache Potions are ready for the first wild encounter loop.',
    swap: 'Your bench is still in the emergency satchel, but the interface already teaches party flow.',
  }[command]

  return (
    <section className="screen battle-screen">
      <div className="battle-stage">
        <div className="enemy-card">
          <div>
            <p className="kicker">Wild LLMMON</p>
            <h3>HalluciHound</h3>
          </div>
          <span className="hp-bar danger"><i /></span>
        </div>
        <img
          className="enemy-sprite halluci-hound"
          src={asset('assets/llmmon/mythos/generated/hallucihound_battle_sprite.png')}
          alt=""
          aria-label="HalluciHound battle sprite"
        />
        <img className="partner-sprite" src={starter.image} alt="" />
        <div className="partner-card">
          <div>
            <p className="kicker">Lv. 5 partner</p>
            <h3>{starter.name}</h3>
          </div>
          <span className="hp-bar"><i /></span>
        </div>
      </div>
      <div className="battle-menu">
        <div className="battle-dialogue">
          <strong>What should {starter.name} do?</strong>
          <span>{commandHelp}</span>
        </div>
        <div className="battle-panel">
          {command === 'prompt' && moves.map((move) => <button key={move}>{move}</button>)}
          {command === 'bag' && bagItems.map((item, index) => (
            <button className="bag-item" key={item}>
              <span>{item}</span>
              <small>{index === 0 ? 'x5' : index === 1 ? 'x2' : 'x1'}</small>
            </button>
          ))}
          {command === 'swap' && (
            <>
              <button className="party-slot active">
                <img src={starter.image} alt="" />
                <span>{starter.name}</span>
                <small>Active</small>
              </button>
              {bench.map((option) => (
                <button className="party-slot locked" key={option.id}>
                  <img src={option.image} alt="" />
                  <span>{option.name}</span>
                  <small>Satchel</small>
                </button>
              ))}
            </>
          )}
        </div>
        <div className="command-grid" aria-label="Battle commands">
          <button className={command === 'prompt' ? 'active' : ''} onClick={() => setCommand('prompt')}>Prompt</button>
          <button className={command === 'bag' ? 'active' : ''} onClick={() => setCommand('bag')}>Bag</button>
          <button className={command === 'swap' ? 'active' : ''} onClick={() => setCommand('swap')}>Swap</button>
          <button onClick={onField}>Run</button>
        </div>
      </div>
    </section>
  )
}

function DexScreen({ starter, onBack }: { starter: Starter; onBack: () => void }) {
  const [selectedId, setSelectedId] = useState(starter.id)
  const selectedEntry = dexEntries.find((entry) => entry.id === selectedId) ?? dexEntries[0]
  const starterSeen = dexEntries.filter((entry) => entry.status !== 'Unseen').length

  return (
    <section className="screen dex-screen">
      <header className="screen-header">
        <div>
          <p className="kicker">PromptDex</p>
          <h2>Chapter 1 Model Cards</h2>
        </div>
        <button className="icon-button" onClick={onBack} aria-label="Return to field">B</button>
      </header>
      <div className="dex-shell">
        <aside className="dex-index" aria-label="PromptDex entries">
          {dexEntries.map((entry) => (
            <button className={entry.id === selectedEntry.id ? 'dex-row active' : 'dex-row'} key={entry.id} onClick={() => setSelectedId(entry.id)}>
              <span>{entry.number}</span>
              <strong>{entry.name}</strong>
              <small>{entry.status}</small>
            </button>
          ))}
        </aside>
        <div className={`dex-portrait ${selectedEntry.palette}`}>
          <div className="dex-scan" />
          <img src={selectedEntry.image} alt="" />
          <div className="dex-capture-meter">
            <span style={{ '--value': `${Math.round((starterSeen / dexEntries.length) * 100)}%` } as React.CSSProperties}>Seen {starterSeen}/{dexEntries.length}</span>
          </div>
        </div>
        <article className="dex-card">
          <p className="kicker">No. {selectedEntry.number}</p>
          <h3>{selectedEntry.name}</h3>
          <p>{selectedEntry.role}</p>
          <table>
            <tbody>
              <tr><th>Type</th><td>{selectedEntry.types}</td></tr>
              <tr><th>Ability</th><td>{selectedEntry.ability}</td></tr>
              <tr><th>Habitat</th><td>{selectedEntry.route}</td></tr>
              <tr><th>Status</th><td>{selectedEntry.status}</td></tr>
            </tbody>
          </table>
        </article>
        <div className="dex-footer">
          <span>Karpathy Lab sync</span>
          <strong>{selectedEntry.name}</strong>
          <span>{selectedEntry.status}</span>
        </div>
      </div>
    </section>
  )
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('title')
  const [selectedStarter, setSelectedStarter] = useState<Starter>(starters[0])

  return (
    <main className="app-shell">
      {screen === 'title' && <TitleScreen onStart={() => setScreen('intro')} />}
      {screen === 'intro' && <IntroScreen onNext={() => setScreen('story')} />}
      {screen === 'story' && <StoryScreen onNext={() => setScreen('starter')} />}
      {screen === 'starter' && (
        <StarterScreen
          selected={selectedStarter}
          onSelect={setSelectedStarter}
          onConfirm={() => setScreen('field')}
        />
      )}
      {screen === 'field' && <FieldScreen starter={selectedStarter} onBattle={() => setScreen('battle')} onDex={() => setScreen('dex')} onBag={() => setScreen('bag')} onQuest={() => setScreen('quest')} onServices={() => setScreen('services')} onPier={() => setScreen('pier')} onMission={() => setScreen('mission')} onMenlo={() => setScreen('menlo')} onModel={() => setScreen('model')} onBadge={() => setScreen('badge')} />}
      {screen === 'battle' && <BattleScreen starter={selectedStarter} onField={() => setScreen('field')} />}
      {screen === 'dex' && <DexScreen starter={selectedStarter} onBack={() => setScreen('field')} />}
      {screen === 'bag' && <BagScreen onBack={() => setScreen('field')} />}
      {screen === 'quest' && <QuestScreen onBack={() => setScreen('field')} />}
      {screen === 'services' && <ServicesScreen starter={selectedStarter} onBack={() => setScreen('field')} />}
      {screen === 'pier' && <PierScreen starter={selectedStarter} onBack={() => setScreen('field')} />}
      {screen === 'mission' && <MissionScreen starter={selectedStarter} onBack={() => setScreen('field')} />}
      {screen === 'menlo' && <MenloScreen starter={selectedStarter} onBack={() => setScreen('field')} />}
      {screen === 'model' && <ModelCardScreen starter={selectedStarter} onBack={() => setScreen('field')} />}
      {screen === 'badge' && <BadgeScreen onBack={() => setScreen('field')} />}
    </main>
  )
}
