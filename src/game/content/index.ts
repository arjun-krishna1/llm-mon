// CONTENT entry point (loaded by the engine via import.meta.glob in src/game/script).
// Registers every story/NPC/sign script and exports the new-game configuration.
// Story flags are documented in FLAGS.md; map ids/spawns come from tools/maps/.

import type { ContentConfig } from '../script/registry'
import './story'
import './world'
import './interiors'

export { chooseStarter } from './story'

export const content: ContentConfig = {
  startMap: 'overworld',
  startSpawn: 'arrival',
  startFacing: 'left',
  healPoint: { map: 'home_1f', spawn: 'entrance' },
  introScript: 'intro.prof',
  newGameScript: 'story.arrival',
  namePresets: ['Arjun', 'Maya', 'Kai', 'Noor', 'Theo'],
  startMoney: 3000,
  whiteOutScript: 'story.after_whiteout',
}
