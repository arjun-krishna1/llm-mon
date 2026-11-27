// Scripts used only by the ENGINE test map (public/assets/game/maps/_test.tmj).
// Engine-owned so the test map keeps working whatever CONTENT registers.

import { registerScript } from './registry'

registerScript('test.sign_hello', async (s) => {
  await s.say('TEST MAP\nEvery engine feature lives here.')
})

registerScript('test.on_enter', (s) => {
  s.setFlag('test_enter_count', Number(s.getFlag('test_enter_count') ?? 0) + 1)
})

registerScript('test.guide', async (s) => {
  if (!s.flag('test_met_guide')) {
    await s.say('Hi, {player}! I’m the test guide.\fHold B to run once you have\nthe Fast Tokens. Want them?')
    if (!(await s.yesNo('Take the Fast Tokens?'))) {
      await s.say('Suit yourself! Ask again any time.')
      return
    }
    s.setFlag('has_run')
    await s.giveItem('fast_tokens', 1)
    await s.say('Hold B to run outdoors.')
    s.setFlag('test_met_guide')
    return
  }
  const c = await s.choice('Want to see a trick?', ['WALK', 'EMOTE', 'HEAL', 'SHOP', 'ITEMS', 'NO'])
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
  } else if (c === 4) {
    await s.giveItem('patch', 1)
    await s.giveItem('prompt_orb', 5)
    await s.giveItem('promptdex', 1)
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
  await s.shop(['prompt_orb', 'great_orb', 'patch', 'big_patch', 'debugger', 'firewall'])
})

registerScript('test.truck', async (s) => {
  if (!(await s.yesNo('MYTHOS MOVERS. Send the truck off?'))) return
  await s.say('Vroom!')
  await s.moveProp('truck', 'right 10', 1800, 'Sine.In')
  s.despawnProp('truck')
  s.setFlag('test_truck_gone')
})

registerScript('test.satchel', async (s) => {
  await s.say('A satchel prop. It’s solid, so you can’t walk over it.')
})

registerScript('test.endcard', async (s) => {
  await s.say('Roll the credits!')
  await s.endCard()
})
