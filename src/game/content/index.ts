// CONTENT entry point (owned by the CONTENT workstream from wave 2).
// ENGINE wrote this tiny sample only so the contract is concrete; replace freely.
//
// Contract (docs/ENGINE_API.md §Content):
//  - Register scripts with `registerScript(id, async (s) => { ... })` at import time.
//    Import from '../script/registry' (not '../script') to avoid an import cycle.
//  - Export `content: ContentConfig` (start map/spawn, intro script id, name presets…).
//  - This file is loaded by the engine via import.meta.glob, so it must exist and
//    should import every other content module.

import { registerScript, type ContentConfig } from '../script/registry'

export const content: ContentConfig = {
  startMap: '_test',
  startSpawn: 'start',
  startFacing: 'down',
  healPoint: { map: '_test', spawn: 'start' },
  namePresets: ['Arjun', 'Maya', 'Kai', 'Noor', 'Theo'],
}

// --- samples used by public/assets/game/maps/_test.tmj -------------------------

registerScript('test.sign_hello', async (s) => {
  await s.say('TEST MAP\nEvery engine feature lives here.')
})

registerScript('test.guide', async (s) => {
  if (!s.flag('test_met_guide')) {
    await s.say('Hi, {player}! I’m the test guide.\fHold B to run once you have\nthe Fast Tokens. Want them?')
    if (await s.yesNo('Take the Fast Tokens?')) {
      s.setFlag('has_run')
      s.sfx('key_item_get')
      await s.say('{player} got the Fast Tokens!\nHold B to run.')
    } else {
      await s.say('Suit yourself! Ask again any time.')
      return
    }
    s.setFlag('test_met_guide')
    return
  }
  const c = await s.choice('Want to see a trick?', ['WALK', 'EMOTE', 'HEAL', 'SHOP', 'NO'])
  if (c === 0) {
    await s.move('self', 'left, up, right, down')
    s.face('self', 'player')
  } else if (c === 1) {
    await s.emote('self', 'heart')
    await s.say('LLMMON are the best!')
  } else if (c === 2) {
    await s.say('Let me patch up your team.')
    await s.healParty()
    await s.say('All better!')
  } else if (c === 3) {
    await s.shop(['prompt_orb', 'patch'])
  }
})

registerScript('test.trigger_once', async (s) => {
  await s.emote('player', 'exclaim')
  await s.say('You stepped on a one-shot trigger.\nIt won’t fire again.')
})

registerScript('test.cutscene', async (s) => {
  await s.say('Watch the camera…')
  await s.cameraPan(0, -3, 500)
  await s.wait(300)
  await s.cameraReset(500)
  await s.fadeOut()
  await s.wait(200)
  await s.fadeIn()
  await s.say('Cutscene over!')
})

registerScript('test.clerk', async (s) => {
  await s.shop(['prompt_orb', 'great_orb', 'patch', 'big_patch', 'debugger'])
})
