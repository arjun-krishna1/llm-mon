// Script runner entry. Content: `import { registerScript } from '../script'`.

import Phaser from 'phaser'
import { ScriptApi, type IntroStage } from './api'
import { getScript, type ContentConfig } from './registry'

export { registerScript, registerScripts, getScript, hasScript, scriptIds } from './registry'
export type { ScriptFn, ContentConfig } from './registry'
export { ScriptApi, parsePath } from './api'
export type { NpcDef, EmoteKind, WorldApi, IntroStage, PropOpts } from './api'

import './testScripts'

// Load content (side-effect registrations) without a hard import, so the engine
// builds before/while the CONTENT workstream writes src/game/content/**.
const contentMods = import.meta.glob<{ content?: ContentConfig }>('../content/index.ts', { eager: true })
export const content: ContentConfig = Object.values(contentMods)[0]?.content ?? {}

let running = 0

/** Number of scripts currently running (the overworld locks the player while > 0). */
export function scriptsRunning(): number {
  return running
}

/**
 * Run a script by id (or a function). Errors are logged, never thrown, so a
 * broken script can't soft-lock the game.
 */
export async function runScript(
  game: Phaser.Game,
  idOrFn: string | ((s: ScriptApi) => Promise<void> | void),
  opts: { self?: string; ctx?: Record<string, unknown>; stage?: IntroStage } = {},
): Promise<boolean> {
  const fn = typeof idOrFn === 'string' ? getScript(idOrFn) : idOrFn
  if (!fn) {
    console.warn(`[script] unknown script '${String(idOrFn)}'`)
    return false
  }
  running++
  try {
    await fn(new ScriptApi(game, opts.self, opts.ctx, opts.stage))
    return true
  } catch (e) {
    console.error(`[script] '${typeof idOrFn === 'string' ? idOrFn : 'inline'}' failed:`, e)
    return false
  } finally {
    running--
  }
}
