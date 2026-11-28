// Shared runtime contracts. See docs/VERTICAL_SLICE_PLAN.md §4.6.
// Workstreams may ADD fields/types here; do not rename or remove existing ones.

export type StatKey = 'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe'
export type Stats = Record<StatKey, number>
export type StatusId = 'none' | string

export interface MoveSlot {
  id: string
  pp: number
}

/** One owned or wild creature. Derived stats come from battle/core `calcStats`. */
export interface MonInstance {
  uid: string
  speciesId: string
  nickname?: string
  level: number
  /** Total experience points. */
  exp: number
  /** Current HP. Max HP is derived from species + level + ivs. */
  hp: number
  status: StatusId
  moves: MoveSlot[]
  /** 0-15 per stat, rolled at creation. */
  ivs: Stats
}

export interface TrainerInfo {
  id: string
  name: string
  /** Texture key of the 64x64 front sprite shown in battle. */
  sprite: string
  loseText: string
  prize: number
}

export interface BattleRequest {
  kind: 'wild' | 'trainer' | 'scripted'
  enemyParty: MonInstance[]
  trainer?: TrainerInfo
  canRun: boolean
  canCatch: boolean
  /** Battle background id, e.g. 'grass'. */
  background: string
  music?: string
  /** If true the player cannot black out: their mon survives at 1 HP. */
  safety?: boolean
  /** (BATTLE-CORE) Optional override for the opening line, e.g. "The wild HalluciHound is glitching out!". */
  introText?: string
  /**
   * (BATTLE-UI) The enemy runs off instead of fainting when defeated (tutorial hound).
   * The faint event carries `fled: true` and `defeatText` replaces "X fainted!".
   */
  fleeOnDefeat?: boolean
  defeatText?: string
  /** (CONTENT/BATTLE-CORE) Trainer AI: chance (0..1) to pick a random usable move instead of the best one. Default 0.1. */
  aiRandomness?: number
}

export interface BattleResult {
  outcome: 'win' | 'lose' | 'run' | 'caught'
  caught?: MonInstance
  /** (BATTLE-CORE) Prize tokens for a trainer win. The caller adds it to state.money. */
  prize?: number
}

export interface SaveData {
  version: number
  playerName: string
  map: string
  x: number
  y: number
  facing: 'down' | 'up' | 'left' | 'right'
  party: MonInstance[]
  bag: Record<string, number>
  money: number
  flags: Record<string, boolean | number | string>
  seen: string[]
  caught: string[]
  healPoint: { map: string; spawn: string }
  playTimeMs: number
  /** ENGINE: overflow storage when the party is full (no PC UI in the slice). */
  box?: MonInstance[]
  /** ENGINE: per-map puzzle-kit state (block positions, switch states, graph inputs, ...). Optional; absent = fresh. */
  mapState?: Record<string, Record<string, unknown>>
}
