// Promise wrapper around the StarterSelect scene for story scripts.
//
//   import { launchStarterSelect } from '../battle/ui/starterSelect'
//   const id = await launchStarterSelect(s.game.scene.getScene('Overworld'))   // 'claude_fable' | 'gpt_5_5' | 'glm'
//
// The scene draws over everything (it is registered after Battle), fades itself in
// and out, and only resolves once the player confirms with YES.

import type Phaser from 'phaser'

export type StarterId = 'claude_fable' | 'gpt_5_5' | 'glm'
export const STARTER_IDS: StarterId[] = ['claude_fable', 'gpt_5_5', 'glm']

/** `scene` is any running scene (or the Game). Resolves with the chosen species id. */
export function launchStarterSelect(scene: Phaser.Scene | Phaser.Game, starters: StarterId[] = STARTER_IDS): Promise<StarterId> {
  const sm = 'scene' in scene && 'sys' in scene ? (scene as Phaser.Scene).scene : (scene as Phaser.Game).scene
  return new Promise((resolve) => {
    const open = () => sm.run('StarterSelect', {
      starters,
      onDone: (id: string | null) => (id && (starters as string[]).includes(id) ? resolve(id as StarterId) : open()),
    })
    open()
  })
}
