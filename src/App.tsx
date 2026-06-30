import { useEffect, useMemo, useState } from 'react'
import './App.css'

type Screen = 'title' | 'story' | 'starter' | 'field' | 'battle' | 'dex' | 'bag' | 'badge'
type StarterId = 'claude' | 'gpt' | 'glm'
type BattleCommand = 'prompt' | 'bag' | 'swap'
type BagCategory = 'orbs' | 'medicine' | 'field' | 'gear'

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

interface StoryPanel {
  image: string
  eyebrow: string
  title: string
  detail: string
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

const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`

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

const storyPanels: StoryPanel[] = [
  {
    image: asset('assets/llmmon/mythos/generated/storyboard_1_arrival_and_setup.png'),
    eyebrow: 'Board A',
    title: 'Arrival in Hayes Valley',
    detail: 'Karpathy introduces the PromptDex, the moving van rolls in, and the player room frames the lab outside.',
  },
  {
    image: asset('assets/llmmon/mythos/generated/storyboard_2_professors_call_and_starter_choice.png'),
    eyebrow: 'Board B',
    title: 'Octavia 101 Rescue',
    detail: 'A HalluciHound corners the professor. Three Prompt Orbs glow inside the emergency satchel.',
  },
  {
    image: asset('assets/llmmon/mythos/generated/storyboard_3_first_quests_and_early_gameplay.png'),
    eyebrow: 'Board C',
    title: 'First Routes and PromptDex',
    detail: 'SoMa Node, Benchmark Pier, rival pressure, catching lessons, and the first locked Gym gate.',
  },
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

const chapterSteps = [
  'Moving van arrival',
  'Karpathy lab search',
  'Starter rescue',
  'PromptDex unlock',
  'Benchmark Pier rival',
  'Foundation Badge route',
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
  const [status, setStatus] = useState('booting RPGJS')

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
      <div id="rpg" />
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
      <img className="title-art" src={asset('assets/llmmon/mythos/generated/title_screen_claude_orange_final.png')} alt="" />
      <div className="scanlines" />
      <div className="title-hud">
        <p className="kicker">LLMMON Mythos</p>
        <h1>The Foundation Badge</h1>
        <p>Choose a starter, rescue Professor Karpathy, and take the first route toward Palo Alto.</p>
        <button className="primary-action" onClick={onStart}>Press Start</button>
      </div>
      <div className="title-strip">
        <span>Hayes Valley</span>
        <span>Octavia 101</span>
        <span>SoMa Node</span>
        <span>Benchmark Pier</span>
      </div>
    </section>
  )
}

function StoryScreen({ onNext }: { onNext: () => void }) {
  return (
    <section className="screen story-screen">
      <header className="screen-header">
        <p className="kicker">Storyboard lock</p>
        <h2>Opening Slice Direction</h2>
        <button className="icon-button" onClick={onNext} aria-label="Continue to starter selection">A</button>
      </header>
      <div className="story-grid">
        {storyPanels.map((panel) => (
          <article className="story-card" key={panel.title}>
            <img src={panel.image} alt="" />
            <div>
              <p className="kicker">{panel.eyebrow}</p>
              <h3>{panel.title}</h3>
              <p>{panel.detail}</p>
            </div>
          </article>
        ))}
      </div>
      <ol className="chapter-rail">
        {chapterSteps.map((step, index) => (
          <li className={index < 3 ? 'complete' : index === 3 ? 'current' : ''} key={step}>{step}</li>
        ))}
      </ol>
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
  return (
    <section className="screen starter-screen">
      <header className="screen-header">
        <p className="kicker">Karpathy's emergency satchel</p>
        <h2>Choose Your Prompt Orb</h2>
        <button className="icon-button" onClick={onConfirm} aria-label="Confirm starter">A</button>
      </header>
      <div className="starter-layout">
        <div className={`starter-hero ${selected.palette}`}>
          <img src={selected.image} alt="" />
          <div className="starter-readout">
            <p className="kicker">{selected.subtitle}</p>
            <h3>{selected.name}</h3>
            <dl>
              <div><dt>Type</dt><dd>{selected.types}</dd></div>
              <div><dt>Ability</dt><dd>{selected.ability}</dd></div>
            </dl>
            <p>{selected.detail}</p>
          </div>
        </div>
        <div className="starter-list" aria-label="Starter options">
          {starters.map((starter) => (
            <button className={starter.id === selected.id ? 'starter-option active' : 'starter-option'} key={starter.id} onClick={() => onSelect(starter)}>
              <img src={starter.image} alt="" />
              <span>{starter.name}</span>
              <small>{starter.types}</small>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

function FieldScreen({
  starter,
  onBattle,
  onDex,
  onBag,
  onBadge,
}: {
  starter: Starter
  onBattle: () => void
  onDex: () => void
  onBag: () => void
  onBadge: () => void
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
      {screen === 'title' && <TitleScreen onStart={() => setScreen('story')} />}
      {screen === 'story' && <StoryScreen onNext={() => setScreen('starter')} />}
      {screen === 'starter' && (
        <StarterScreen
          selected={selectedStarter}
          onSelect={setSelectedStarter}
          onConfirm={() => setScreen('field')}
        />
      )}
      {screen === 'field' && <FieldScreen starter={selectedStarter} onBattle={() => setScreen('battle')} onDex={() => setScreen('dex')} onBag={() => setScreen('bag')} onBadge={() => setScreen('badge')} />}
      {screen === 'battle' && <BattleScreen starter={selectedStarter} onField={() => setScreen('field')} />}
      {screen === 'dex' && <DexScreen starter={selectedStarter} onBack={() => setScreen('field')} />}
      {screen === 'bag' && <BagScreen onBack={() => setScreen('field')} />}
      {screen === 'badge' && <BadgeScreen onBack={() => setScreen('field')} />}
    </main>
  )
}
