// Field skills: data + unlock rules. The overworld implements what each one does
// (src/game/world/FieldSkills.ts). A skill is unlocked by its badge flag (`badge_<id>`),
// or by flag `skill_<id>` (debug / story overrides).

import { state } from '../state'
import { BADGES } from './badges'

export type SkillId = 'backprop' | 'sample' | 'embed' | 'normalize' | 'chain' | 'dilate' | 'attend' | 'merge'

export interface SkillDef {
  id: SkillId
  name: string
  /** One line for the FIELD menu. */
  desc: string
  /** How it is used: 'auto' (just walk: Backprop), 'target' (A at an object/tile), 'toggle' (on until you leave the map), 'menu' (opens a screen). */
  use: 'auto' | 'target' | 'toggle' | 'menu'
  /** Preferred sfx id (falls back to an existing one when AUDIO has not made it yet). */
  sfx: string
  fallbackSfx: string
}

export const SKILLS: SkillDef[] = [
  { id: 'backprop', name: 'BACKPROP', desc: 'Walk back up one-way ledges.', use: 'auto', sfx: 'skill_backprop', fallbackSfx: 'ledge' },
  { id: 'sample', name: 'SAMPLE', desc: 'Reroll the next wild encounter (once per patch).', use: 'toggle', sfx: 'skill_sample', fallbackSfx: 'orb_shake' },
  { id: 'embed', name: 'EMBED', desc: 'Push heavy blocks; A pulls one toward its kind.', use: 'target', sfx: 'skill_embed', fallbackSfx: 'stat_up' },
  { id: 'normalize', name: 'NORMALIZE', desc: 'Calm rough water and ride across it.', use: 'target', sfx: 'skill_normalize', fallbackSfx: 'heal' },
  { id: 'chain', name: 'CHAIN RULE', desc: 'Grapple across a gap from anchor to anchor.', use: 'target', sfx: 'skill_chain', fallbackSfx: 'orb_throw' },
  { id: 'dilate', name: 'DILATE', desc: 'Widen the light in the dark; spot hidden items.', use: 'toggle', sfx: 'skill_dilate', fallbackSfx: 'stat_up' },
  { id: 'attend', name: 'ATTEND', desc: 'Travel at once to any town you have visited.', use: 'menu', sfx: 'skill_attend', fallbackSfx: 'pc_on' },
  { id: 'merge', name: 'MERGE', desc: 'Fuse two matching boulders into something new.', use: 'target', sfx: 'skill_merge', fallbackSfx: 'orb_catch' },
]

export function skillDef(id: string): SkillDef | undefined {
  return SKILLS.find((s) => s.id === id)
}

export function skillBadge(id: string): string | undefined {
  return BADGES.find((b) => b.skill === id)?.id
}

export function skillUnlocked(id: string): boolean {
  if (state.flag(`skill_${id}`)) return true
  const b = skillBadge(id)
  return !!b && state.flag(`badge_${b}`)
}

export function unlockedSkills(): SkillDef[] {
  return SKILLS.filter((s) => skillUnlocked(s.id))
}
