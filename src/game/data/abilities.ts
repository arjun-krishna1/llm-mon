// Passive abilities: one per species (roster.ts `ability`). Mechanics live in
// battle/core/battle.ts (search for the id). `popup` = the UI shows an ability
// banner when it triggers (an `ability` event is emitted).

export interface AbilityDef {
  id: string
  name: string
  description: string
}

const LIST: AbilityDef[] = [
  { id: 'deep_reserve', name: 'Deep Reserve', description: 'Moves of its own lab hit 1.5x harder when its HP is at 1/3 or less.' },
  { id: 'warm_start', name: 'Warm Start', description: 'Raises its Speed by 1 when it enters battle.' },
  { id: 'constitutional', name: 'Constitutional', description: 'Cannot be made to hallucinate, and ignores commands to obey the foe.' },
  { id: 'tool_use', name: 'Tool Use', description: 'Its status moves go first.' },
  { id: 'long_context', name: 'Long Context', description: 'Restores 1/8 of its max HP when it switches out.' },
  { id: 'open_weights', name: 'Open Weights', description: 'Super-effective hits do 25% less damage to it.' },
  { id: 'graph_mind', name: 'Graph Mind', description: 'Raises its Sp. Atk by 1 after it lands a super-effective hit.' },
  { id: 'low_latency', name: 'Low Latency', description: 'Its Speed is 20% higher.' },
  { id: 'caching', name: 'Caching', description: 'Repeating the move it used last turn costs no PP and hits 10% harder.' },
  { id: 'long_horizon', name: 'Long Horizon', description: 'Hits 10% harder for each turn it has stayed in (up to +50%).' },
  { id: 'citation', name: 'Citation', description: 'Its attacks ignore the foe\'s Defense and Sp. Def boosts and evasion.' },
  { id: 'fleece', name: 'Fleece', description: 'Physical hits do 25% less damage to it.' },
  { id: 'edgy', name: 'Edgy', description: 'Lands critical hits twice as often.' },
  { id: 'polyglot', name: 'Polyglot', description: 'Its Classic moves become its own type and hit 20% harder.' },
  { id: 'textbook', name: 'Textbook', description: 'Hits 20% harder against a higher-level foe.' },
  { id: 'pretrained', name: 'Pretrained', description: 'Raises its best stat by 1 when it enters battle.' },
  { id: 'attention', name: 'Attention', description: 'Its accuracy cannot be lowered, and it ignores the foe\'s evasion.' },
  { id: 'momentum', name: 'Momentum', description: 'Using the same move turn after turn adds 20% power each time (up to +60%).' },
  { id: 'gradient_clip', name: 'Gradient Clip', description: 'No single hit can take more than half its max HP.' },
  { id: 'weight_decay', name: 'Weight Decay', description: 'At the end of each turn, every stat boost on the foe drops by 1.' },
  { id: 'saturation', name: 'Saturation', description: 'At full HP, it survives a knockout hit with 1 HP.' },
  { id: 'clear_signal', name: 'Clear Signal', description: 'Foes cannot lower its stats.' },
  { id: 'skip_connection', name: 'Skip Connection', description: 'Restores 1/16 of its max HP at the end of each turn.' },
  { id: 'normalization', name: 'Normalization', description: 'Its lowered stats return to normal at the end of each turn.' },
  { id: 'dropout', name: 'Dropout', description: 'Dodges 10% of attacks outright.' },
  { id: 'stochastic', name: 'Stochastic', description: 'Its damage rolls swing wider: anywhere from 70% to 115%.' },
  { id: 'compressed', name: 'Compressed', description: 'Every other move it uses costs no PP.' },
  { id: 'pioneer', name: 'Pioneer', description: 'An ancestor of the field: even its Classic moves get a same-type bonus, and that bonus is 2x instead of 1.5x.' },
  { id: 'move_37', name: 'Move 37', description: 'The first attack it makes in a battle is always a critical hit.' },
  { id: 'overconfident', name: 'Overconfident', description: 'Hits 25% harder but its accuracy is 10% lower.' },
  { id: 'goodhart', name: 'Goodhart', description: 'Any stat boost it gains is doubled.' },
]

export const ABILITIES: Record<string, AbilityDef> = Object.fromEntries(LIST.map((a) => [a.id, a]))
