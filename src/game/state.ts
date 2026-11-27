// GameState singleton (ENGINE). Plain data + helpers; persisted as SaveData.

import type { MonInstance, SaveData } from './types'
import type { Dir } from './config'
import { DEFAULT_PLAYER_NAME, SAVE_KEY, SAVE_VERSION } from './config'
import { createMon, healMon } from './adapters/monInfo'
import { migrateSave } from './battle/core/migrate'

export type FlagValue = boolean | number | string

class GameState {
  playerName = DEFAULT_PLAYER_NAME
  map = ''
  x = 0
  y = 0
  facing: Dir = 'down'
  party: MonInstance[] = []
  /** Party members beyond 6 go here (no PC UI in the slice). */
  box: MonInstance[] = []
  bag: Record<string, number> = {}
  money = 3000
  flags: Record<string, FlagValue> = {}
  seen: string[] = []
  caught: string[] = []
  healPoint = { map: '', spawn: '' }
  playTimeMs = 0
  /** Spawn name to use when entering `map` (cleared once applied). */
  pendingSpawn: string | null = null

  reset(): void {
    this.playerName = DEFAULT_PLAYER_NAME
    this.map = ''
    this.x = 0
    this.y = 0
    this.facing = 'down'
    this.party = []
    this.box = []
    this.bag = {}
    this.money = 3000
    this.flags = {}
    this.seen = []
    this.caught = []
    this.healPoint = { map: '', spawn: '' }
    this.playTimeMs = 0
    this.pendingSpawn = null
  }

  // ------------------------------------------------------------ flags
  getFlag(k: string): FlagValue | undefined {
    return this.flags[k]
  }
  flag(k: string): boolean {
    return Boolean(this.flags[k])
  }
  setFlag(k: string, v: FlagValue = true): void {
    if (v === false) delete this.flags[k]
    else this.flags[k] = v
  }

  // ------------------------------------------------------------ bag / money
  itemCount(id: string): number {
    return this.bag[id] ?? 0
  }
  addItem(id: string, n = 1): void {
    this.bag[id] = (this.bag[id] ?? 0) + n
    if (this.bag[id] <= 0) delete this.bag[id]
  }
  removeItem(id: string, n = 1): boolean {
    if (this.itemCount(id) < n) return false
    this.addItem(id, -n)
    return true
  }
  addMoney(n: number): void {
    this.money = Math.max(0, Math.min(999999, this.money + n))
  }

  // ------------------------------------------------------------ party
  /** Add a mon to the party (or box when full). Marks seen/caught. */
  addMon(mon: MonInstance): 'party' | 'box' {
    this.markCaught(mon.speciesId)
    if (this.party.length < 6) {
      this.party.push(mon)
      return 'party'
    }
    this.box.push(mon)
    return 'box'
  }
  giveMon(speciesId: string, level: number): MonInstance {
    const m = createMon(speciesId, level)
    this.addMon(m)
    return m
  }
  markSeen(speciesId: string): void {
    if (!this.seen.includes(speciesId)) this.seen.push(speciesId)
  }
  markCaught(speciesId: string): void {
    this.markSeen(speciesId)
    if (!this.caught.includes(speciesId)) this.caught.push(speciesId)
  }
  healParty(): void {
    for (const m of this.party) healMon(m)
  }
  hasUsableMon(): boolean {
    return this.party.some((m) => m.hp > 0)
  }

  // ------------------------------------------------------------ save
  toSave(): SaveData {
    return {
      version: SAVE_VERSION,
      playerName: this.playerName,
      map: this.map,
      x: this.x,
      y: this.y,
      facing: this.facing,
      party: structuredClone(this.party),
      bag: { ...this.bag },
      money: this.money,
      flags: { ...this.flags },
      seen: [...this.seen],
      caught: [...this.caught],
      healPoint: { ...this.healPoint },
      playTimeMs: Math.floor(this.playTimeMs),
      box: structuredClone(this.box),
    }
  }

  fromSave(d: SaveData): void {
    this.reset()
    this.playerName = d.playerName || DEFAULT_PLAYER_NAME
    this.map = d.map
    this.x = d.x
    this.y = d.y
    this.facing = d.facing ?? 'down'
    this.party = d.party ?? []
    this.box = d.box ?? []
    this.bag = d.bag ?? {}
    this.money = d.money ?? 0
    this.flags = d.flags ?? {}
    this.seen = d.seen ?? []
    this.caught = d.caught ?? []
    this.healPoint = d.healPoint ?? { map: '', spawn: '' }
    this.playTimeMs = d.playTimeMs ?? 0
  }

  save(): boolean {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.toSave()))
      return true
    } catch (e) {
      console.error('[state] save failed', e)
      return false
    }
  }

  static readSave(): SaveData | null {
    try {
      const raw = localStorage.getItem(SAVE_KEY)
      if (!raw) return null
      const d = JSON.parse(raw) as SaveData
      if (!d || typeof d.version !== 'number' || !d.map) return null
      migrateSave(d) // BATTLE-CORE: renamed move ids etc. (v1 -> v2); never throws
      return d
    } catch {
      return null
    }
  }

  hasSave(): boolean {
    return GameState.readSave() !== null
  }

  load(): boolean {
    const d = GameState.readSave()
    if (!d) return false
    this.fromSave(d)
    return true
  }

  deleteSave(): void {
    try {
      localStorage.removeItem(SAVE_KEY)
    } catch {
      /* ignore */
    }
  }

  /** "H:MM" play time. */
  playTimeText(): string {
    const mins = Math.floor(this.playTimeMs / 60000)
    return `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, '0')}`
  }
}

export const state = new GameState()
