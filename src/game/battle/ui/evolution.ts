// Evolution outside battle (evolution items, scripted evolutions):
//
//   import { launchEvolution } from '../battle/ui/evolution'
//   const r = applyItemOutsideBattle('skip_link', mon)          // or evolutionTarget(mon, { item })
//   if (r.ok && r.evolved) …  // NOTE: applyItemOutsideBattle already evolves the mon; for the
//                             // scene, check first with evolutionTarget and let the scene evolve it:
//   const to = evolutionTarget(mon, { item: 'skip_link' })
//   if (to) { const ok = await launchEvolution(scene, { mon, toSpeciesId: to }); if (ok) bag.skip_link-- }
//
// The scene draws over everything, evolves `mon` in place with `evolveMon` when the player
// lets it finish (B cancels), registers the new species in the PromptDex and teaches the
// new form's moves (forget flow when the moveset is full). Resolves true when it evolved.

import type Phaser from 'phaser'
import type { MonInstance } from '../../types'
import type { EvolutionSceneData } from '../../scenes/EvolutionScene'

export interface LaunchEvolutionOptions {
  mon: MonInstance
  toSpeciesId: string
  /** Override the opening line ("What? X is evolving!"). */
  introText?: string
}

/** `scene` is any running scene (or the Game). */
export function launchEvolution(scene: Phaser.Scene | Phaser.Game, o: LaunchEvolutionOptions): Promise<boolean> {
  const sm = 'sys' in scene ? (scene as Phaser.Scene).scene : (scene as Phaser.Game).scene
  return new Promise((resolve) => {
    const data: EvolutionSceneData = { mon: o.mon, from: o.mon.speciesId, to: o.toSpeciesId, introText: o.introText, onDone: resolve }
    sm.run('Evolution', data)
  })
}
