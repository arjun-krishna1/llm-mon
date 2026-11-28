// Player options, stored in localStorage separately from the save file, applied at boot.

import { audio } from './audio'

export type TextSpeed = 'slow' | 'mid' | 'fast'

export interface Options {
  textSpeed: TextSpeed
  /** 0..10 */
  music: number
  /** 0..10 */
  sfx: number
  /** Running shoes: 'hold' = hold B to run (default), 'auto' = run by default, hold B to walk. Needs flag has_run. */
  run: 'hold' | 'auto'
  /** Auto-advance dialogue pages after a reading pause (prompts still wait). */
  autoText: boolean
}

const KEY = 'llmmon_mythos_options_v1'
const DEFAULTS: Options = { textSpeed: 'mid', music: 8, sfx: 8, run: 'hold', autoText: false }

export const options: Options = { ...DEFAULTS }

/** Frames per character while typing (hold A still speeds up). */
export function textFramesPerChar(): number {
  return options.textSpeed === 'slow' ? 4 : options.textSpeed === 'fast' ? 1 : 2
}

/** Auto-advance delay for a page of `chars` characters (ms). */
export function autoTextMs(chars: number): number {
  return 900 + chars * 28
}

export function applyOptions(): void {
  audio.setVolume(options.music / 10, options.sfx / 10)
}

export function loadOptions(): void {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const o = JSON.parse(raw) as Partial<Options>
      if (o.textSpeed === 'slow' || o.textSpeed === 'mid' || o.textSpeed === 'fast') options.textSpeed = o.textSpeed
      if (typeof o.music === 'number') options.music = Math.max(0, Math.min(10, Math.round(o.music)))
      if (typeof o.sfx === 'number') options.sfx = Math.max(0, Math.min(10, Math.round(o.sfx)))
      if (o.run === 'hold' || o.run === 'auto') options.run = o.run
      if (typeof o.autoText === 'boolean') options.autoText = o.autoText
    }
  } catch {
    /* defaults */
  }
  applyOptions()
}

export function saveOptions(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(options))
  } catch {
    /* ignore */
  }
}
