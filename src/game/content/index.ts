// CONTENT entry point (loaded by the engine via import.meta.glob in src/game/script).
// Registers every story/NPC/sign script and exports the new-game configuration.
// Story flags are documented in FLAGS.md; map ids/spawns come from tools/maps/.

import type { ContentConfig } from '../script/registry'
import './story'
import './world'
import './interiors'
import './rival'
import './eggs'

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
  endCard: {
    title: 'LLMMON MYTHOS',
    subtitle: 'Vertical Slice',
    continued: 'To be continued\u2026',
    credits: [
      'STORY', 'Prof. Karpathy, who explained it twice', 'Mom, who packed a Patch', 'Dana, who read the type chart', '',
      'CREATURES', 'Claude Fable, GPT 5.5 and GLM', 'Gemma 4, GPT-5.4 mini, Mistral Medium', 'a very rare Gemini Flash', 'one very confident HalluciHound', '',
      'WORLD', 'Hayes Valley residents', 'the Route 101 tall grass (98% grass)', 'the SoMa Node fountain', 'Cafe Latency (closed for a fine-tune)', '',
      'MUSIC', 'Battle themes: 4 square waves', 'and a dream', 'Town themes: 1 hopeful triangle', 'Sound effects: noise, with opinions', '',
      'THANK YOU FOR PLAYING',
    ],

  },
}
