// Start menu entries (EXTENSION POINT). To add a screen to the start menu, add one object
// to START_MENU_ENTRIES (or call registerStartMenuEntry from a module that is imported).
// `screen` entries open full-screen with fades and return to the menu when they resolve;
// `action` entries run their own flow and close the menu.
//
// Example (PromptDex, first item like a GBA dex, shown once the dex is owned):
//   import { PromptDexScreen } from './screens/PromptDexScreen'
//   { id: 'dex', label: () => 'PROMPTDEX', order: 5, when: () => state.flag('got_dex'),
//     screen: (ui) => new PromptDexScreen(ui, ui.stack).run() },

import type { UIScene } from '../scenes/UIScene'
import { state } from '../state'
import { PartyScreen } from './screens/PartyScreen'
import { BagScreen } from './screens/BagScreen'
import { PlayerCard } from './screens/PlayerCard'
import { OptionsScreen } from './screens/OptionsScreen'

export interface StartMenuEntry {
  id: string
  label: () => string
  /** Sort key (lower = higher in the list). Built-ins: 10 party, 30 bag, 40 card, 50 save, 60 options, 99 exit. */
  order: number
  /** Only listed while this returns true. */
  when?: () => boolean
  /** Full-screen screen opened with fades; resolves when it closes. */
  screen?: (ui: UIScene) => Promise<unknown>
  /** Custom flow; the start menu closes afterwards. */
  action?: (ui: UIScene) => Promise<unknown>
}

export const START_MENU_ENTRIES: StartMenuEntry[] = [
  { id: 'party', label: () => 'LLMMON', order: 10, when: () => state.party.length > 0, screen: (ui) => new PartyScreen(ui, ui.stack, { mode: 'view' }).run() },
  { id: 'bag', label: () => 'BAG', order: 30, screen: (ui) => new BagScreen(ui, ui.stack, { mode: 'view' }).run() },
  { id: 'card', label: () => state.playerName.toUpperCase(), order: 40, screen: (ui) => new PlayerCard(ui, ui.stack).run() },
  { id: 'save', label: () => 'SAVE', order: 50, action: (ui) => ui.saveFlow() },
  { id: 'options', label: () => 'OPTIONS', order: 60, screen: (ui) => new OptionsScreen(ui, ui.stack).run() },
  { id: 'exit', label: () => 'EXIT', order: 99 },
]

export function registerStartMenuEntry(e: StartMenuEntry): void {
  const i = START_MENU_ENTRIES.findIndex((x) => x.id === e.id)
  if (i >= 0) START_MENU_ENTRIES[i] = e
  else START_MENU_ENTRIES.push(e)
}

export function visibleStartMenuEntries(): StartMenuEntry[] {
  return START_MENU_ENTRIES.filter((e) => !e.when || e.when()).sort((a, b) => a.order - b.order)
}
