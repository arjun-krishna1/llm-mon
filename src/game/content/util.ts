// Small helpers shared by the content scripts.

import type { ScriptApi } from '../script/api'
import { registerScript } from '../script/registry'
import type { Dir } from '../config'

export type S = ScriptApi

/** Register a script. Every id used by a map lives in one of the content modules. */
export function def(id: string, fn: (s: S) => Promise<void> | void): void {
  registerScript(id, fn)
}

/** A sign/NPC that just says some pages (`\f` = new box). */
export function text(id: string, ...pages: string[]): void {
  def(id, (s) => s.say(pages.join('\f')))
}

/** Say several boxes in a row. */
export function say(s: S, ...pages: string[]): Promise<void> {
  return s.say(pages.join('\f'))
}

/** Say with a name plate. */
export function line(s: S, speaker: string, ...pages: string[]): Promise<void> {
  return s.say(pages.join('\f'), { speaker })
}

/** Walk `actor` step by step to (x, y): horizontal first unless `vfirst`. */
export async function walkTo(s: S, actor: string, x: number, y: number, vfirst = false, speed?: 'walk' | 'run' | 'slow'): Promise<void> {
  const p = s.pos(actor)
  if (!p) return
  const dx = x - p.x
  const dy = y - p.y
  const h: Dir[] = Array(Math.abs(dx)).fill(dx > 0 ? 'right' : 'left')
  const v: Dir[] = Array(Math.abs(dy)).fill(dy > 0 ? 'down' : 'up')
  const path = vfirst ? [...v, ...h] : [...h, ...v]
  if (path.length) await s.move(actor, path, speed ? { speed } : undefined)
}

/** Story flags (see FLAGS.md). */
export const F = {
  arrived: 'arrived',
  visited2f: 'visited_2f',
  readNotebook: 'read_notebook',
  momLabCall: 'mom_lab_call',
  metAide: 'met_aide',
  hasSatchel: 'has_satchel',
  starter: 'starter',
  rescueDone: 'rescue_done',
  gotDex: 'got_dex',
  hasRun: 'has_run',
  healedAtCenter: 'healed_at_center',
  sawEnd: 'saw_end_sign',
} as const

/** Name of the chosen starter (or 'your LLMMON'). */
export function starterName(s: S): string {
  const id = s.getFlag(F.starter)
  return typeof id === 'string' ? s.speciesName(id) : 'your LLMMON'
}
