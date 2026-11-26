// Script registry: maps reference scripts by id (npc `script`, sign `script`,
// trigger `script`). Content modules register at import time.

import type { ScriptApi } from './api'

export type ScriptFn = (s: ScriptApi) => Promise<void> | void

const registry = new Map<string, ScriptFn>()

export function registerScript(id: string, fn: ScriptFn): void {
  if (registry.has(id)) console.warn(`[script] '${id}' registered twice; last one wins`)
  registry.set(id, fn)
}

export function registerScripts(map: Record<string, ScriptFn>): void {
  for (const [id, fn] of Object.entries(map)) registerScript(id, fn)
}

export function getScript(id: string): ScriptFn | undefined {
  return registry.get(id)
}

export function hasScript(id: string): boolean {
  return registry.has(id)
}

export function scriptIds(): string[] {
  return [...registry.keys()]
}

/** What `src/game/content/index.ts` exports as `content` (all optional). */
export interface ContentConfig {
  /** Map + spawn for a new game after the intro. */
  startMap?: string
  startSpawn?: string
  startFacing?: 'down' | 'up' | 'left' | 'right'
  /** Heal point for a new game (white-out respawn). */
  healPoint?: { map: string; spawn: string }
  /** Script id run by the Intro scene (default: built-in). */
  introScript?: string
  /** Script id run once when a new game first enters the overworld. */
  newGameScript?: string
  /** Name presets offered in the intro. */
  namePresets?: string[]
  startMoney?: number
}
