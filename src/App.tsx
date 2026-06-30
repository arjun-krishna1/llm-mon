import { useEffect, useMemo, useState } from 'react'
import './App.css'

type Screen = 'title' | 'story' | 'starter' | 'field' | 'battle' | 'dex'
type StarterId = 'claude' | 'gpt' | 'glm'
type BattleCommand = 'prompt' | 'bag' | 'swap'

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

function FieldScreen({ starter, onBattle, onDex }: { starter: Starter; onBattle: () => void; onDex: () => void }) {
  return (
    <section className="screen field-screen">
      <div className="field-topbar">
        <div>
          <p className="kicker">RPGJS map runtime</p>
          <h2>Hayes Valley: Octavia 101 Approach</h2>
        </div>
        <div className="field-actions">
          <button onClick={onDex}>PromptDex</button>
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
  return (
    <section className="screen dex-screen">
      <header className="screen-header">
        <p className="kicker">PromptDex</p>
        <h2>Model Card View</h2>
        <button className="icon-button" onClick={onBack} aria-label="Return to field">B</button>
      </header>
      <div className="dex-layout">
        <img src={starter.image} alt="" />
        <div className="dex-card">
          <p className="kicker">{starter.subtitle}</p>
          <h3>{starter.name}</h3>
          <p>{starter.detail}</p>
          <table>
            <tbody>
              <tr><th>Type</th><td>{starter.types}</td></tr>
              <tr><th>Ability</th><td>{starter.ability}</td></tr>
              <tr><th>Region</th><td>Hayes Valley lab route</td></tr>
              <tr><th>Status</th><td>Starter registered</td></tr>
            </tbody>
          </table>
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
      {screen === 'field' && <FieldScreen starter={selectedStarter} onBattle={() => setScreen('battle')} onDex={() => setScreen('dex')} />}
      {screen === 'battle' && <BattleScreen starter={selectedStarter} onField={() => setScreen('field')} />}
      {screen === 'dex' && <DexScreen starter={selectedStarter} onBack={() => setScreen('field')} />}
    </main>
  )
}
