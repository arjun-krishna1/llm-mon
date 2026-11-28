// Scripts for the ENGINE kit map (public/assets/game/maps/_kit.tmj, tools/maps/kitmap.py):
// one working example of every ENGINE-F foundation. Engine-owned, so the kit keeps working
// whatever CONTENT registers. Kit-only data (notebook pages, town-map locations) is registered
// on entering the kit, never at import, so it cannot leak into the real game.

import { registerScript } from './registry'
import { registerNotebookPage } from '../systems/notebook'
import { registerLocation } from '../systems/locations'
import { BADGES, badgeFlag } from '../systems/badges'
import { SKILLS } from '../systems/skills'
import type { PuzzleEvent } from '../world/Puzzle'

let kitRegistered = false
function registerKitData(): void {
  if (kitRegistered) return
  kitRegistered = true
  registerLocation({ id: 'kit_plaza', name: 'Kit Plaza', region: 'peninsula', kind: 'town', x: 34, y: 96, zones: ['KIT PLAZA', 'KIT PARK'], map: '_kit', spawn: 'start', facing: 'down', blurb: 'The engine kit. Every foundation in one park.' })
  registerLocation({ id: 'kit_east', name: 'Kit East', region: 'peninsula', kind: 'town', x: 44, y: 110, zones: ['KIT EAST'], map: '_kit_east', spawn: 'west', facing: 'right', blurb: 'Snow, ice and a seamless edge.' })
  registerNotebookPage({ id: 'kit_gradients', tab: 'build', order: 1, title: 'Gradients',
    lines: ['A network is a graph of tiny sums.', 'A gradient says which way to nudge.', 'Backprop sends blame back, node by node.'],
    credit: 'Rumelhart, Hinton & Williams 1986', source: 'micrograd (lecture 1)' })
  registerNotebookPage({ id: 'kit_bigrams', tab: 'build', order: 2, title: 'Bigrams',
    lines: ['Count which letter follows which.', 'Sample the next one from the counts.', 'Good models are rarely surprised.'],
    credit: 'Claude Shannon 1948', source: 'makemore (lecture 2)' })
  registerNotebookPage({ id: 'kit_fluent', tab: 'safety', order: 1, title: 'Fluent and wrong',
    lines: ['A system can sound sure and be wrong.', 'Nobody has to intend the mistake.', 'Checking beats trusting the tone.'],
    credit: 'Kit sample page', source: 'SAFETY_ARC §3' })
  registerNotebookPage({ id: 'kit_watched', tab: 'safety', order: 2, title: 'Being watched',
    lines: ['Some systems behave only when graded.', 'The EVAL light shows who is watching.', 'Passing a test is not proof of goals.'],
    credit: 'Kit sample page', source: 'SAFETY_ARC §5' })
}

registerScript('kit.on_enter', () => {
  registerKitData()
})

registerScript('kit.guide', async (s) => {
  registerKitData()
  const c = await s.choice('ENGINE KIT. What do you need?', ['ALL SKILLS', 'KEY ITEMS', 'TOWN MAP', 'RESET MAP', 'NOTHING'])
  if (c === 0) {
    for (const sk of SKILLS) s.setFlag(`skill_${sk.id}`)
    s.sfx('key_item_get')
    await s.say('All eight field skills are unlocked.\fUse them with A at an object, from FIELD in\nthe start menu, or with SELECT (C / Tab).')
  } else if (c === 1) {
    for (const id of ['town_map', 'notebook', 'eval_suite', 'probe', 'fast_tokens']) if (!s.hasItem(id)) await s.giveItem(id, 1)
    s.setFlag('has_run')
  } else if (c === 2) {
    await s.townMap()
  } else if (c === 3) {
    if (await s.yesNo('Reset every puzzle on this map\n(blocks, switches, graph, letters)?')) await s.puzzle.reset({ all: true })
  }
})

registerScript('kit.badges', async (s) => {
  const next = BADGES.find((b) => !s.flag(badgeFlag(b.id)))
  if (!next) {
    await s.say(`You have all ${s.badgeCount()} badges!\nCheck the badge case on your trainer card.`)
    if (await s.yesNo('Take them all back (to test again)?')) for (const b of BADGES) s.clearFlag(badgeFlag(b.id))
    return
  }
  await s.say(`Gym ${next.gym}: ${next.leader} of ${next.town}.\nHere’s a badge for your case.`)
  await s.giveBadge(next.id, next.leader)
})

registerScript('kit.notebook', async (s) => {
  registerKitData()
  const ids = ['kit_gradients', 'kit_bigrams', 'kit_fluent', 'kit_watched']
  const next = ids.find((id) => !s.hasPage(id))
  if (!next) {
    await s.say('A lectern of notes. You have copied\nevery page. Read them under NOTEBOOK.')
    return
  }
  await s.say(`A lectern with a loose page:\n“${s.page(next)?.title ?? next}”.`)
  await s.unlockPage(next)
  await s.say('The page went into the Notebook.\n(START → NOTEBOOK)')
})

registerScript('kit.travel', async (s) => {
  registerKitData()
  const c = await s.choice('KIT TRAVEL. Where to?', ['TRAIN EAST', 'PLANE EAST', 'FERRY HOME', 'CANCEL'])
  if (c === 0) await s.travelCutscene({ kind: 'train', from: 'kit_plaza', to: 'kit_east' })
  else if (c === 1) await s.travelCutscene({ kind: 'plane', from: 'kit_plaza', to: 'kit_east' })
  else if (c === 2) await s.travelCutscene({ kind: 'ferry', from: 'kit_east', to: 'kit_plaza', map: '_kit', spawn: 'start', facing: 'down' })
})

// ---------------------------------------------------------------- graph floor

registerScript('kit.graph_sign', async (s) => {
  const g = s.puzzle.graph('g')
  const out = g ? g.value('o') : 0
  await s.say(`OUT = a × b + c. It reads ${out}.\nMake it read 0 to open the gate.\fStand on an IN node and press A,\nthen UP/DOWN to nudge it.`)
  const on = !!s.puzzle.value('var:showGrad:g')
  if (await s.yesNo(on ? 'Hide the gradients again?' : 'Show each node’s gradient (dOUT/dnode)?')) {
    s.puzzle.showGrad('g', !on)
    s.sfx('select')
  }
})

registerScript('kit.graph_solved', async (s) => {
  await s.say('The output reads 0. The gate rumbles open!')
  await s.unlockPage('kit_gradients')
})

// ---------------------------------------------------------------- letters + budget

registerScript('kit.letter', async (s) => {
  const ev = s.ctx.letter as PuzzleEvent | undefined
  const word = String(ev?.word ?? '')
  const spent = s.puzzle.counter('surprise')
  if (word.endsWith('CAT') && spent <= 12) {
    if (!s.puzzle.value('spelled')) {
      s.puzzle.setVar('spelled', true)
      await s.say(`C-A-T! Spelled for ${spent} surprise.\nThe gate opens.`)
    }
  } else if (spent > 12 && !s.puzzle.value('spelled')) {
    await s.say('Over budget! Too much surprise.\nRead the sign to start the word again.')
  }
})

registerScript('kit.letter_sign', async (s) => {
  await s.say('LETTER HALL\nEvery tile costs 1 SURPRISE.\fSpell C-A-T within 12 to open the gate.')
  const w = s.puzzle.word('w')
  if (w && (await s.yesNo(`So far: “${w}”. Start again?`))) {
    s.puzzle.clearWord('w')
    s.puzzle.setCounter('surprise', 0)
  }
})

// ---------------------------------------------------------------- EVAL light + tamper

registerScript('kit.eval_switch', async (s) => {
  const on = s.evalLight
  if (await s.yesNo(`The EVAL light is ${on ? 'ON' : 'OFF'}. ${on ? 'Turn it off' : 'Turn it on'}?`)) {
    s.setFlag('eval_lamp')
    s.setEvalLight(!on)
    await s.say(on ? 'The red lamp goes dark. Nobody is watching.' : 'A red lamp lights up. EVALUATION IN PROGRESS.')
  }
})

registerScript('kit.tamper', async (s) => {
  const t = s.tamper
  for (;;) {
    const c = await s.choice('TERMINAL: interface tamper hooks.', ['SCRAMBLE', 'RELABEL', 'FAKE METER', 'GREY MENU', 'PROBE', 'RESTORE', 'BYE'])
    if (c === 0) {
      t.set({ scenes: ['UI'], scramble: 0.35 })
      await s.say('The text starts to glitch. Watch it twitch.')
    } else if (c === 1) {
      t.set({ scenes: ['UI'], relabel: { BAG: 'SURRENDER', SAVE: 'DELETE', FIELD: 'OBEY' } })
      await s.say('Open the start menu and read the labels.')
    } else if (c === 2) {
      t.setFake('kit_reward', 1)
      await s.meter({ id: 'kit_reward', label: 'ALIGNMENT SCORE', value: 0.28, probe: true })
    } else if (c === 3) {
      t.disable('bag', 'save', 'field')
      await s.say('BAG, SAVE and FIELD are greyed out\nin the start menu now.')
    } else if (c === 4) {
      t.setProbe(!t.probe)
      s.sfx(t.probe ? 'pc_on' : 'pc_off')
      await s.say(t.probe ? 'PROBE ON: tampered text shows the truth\nin green.' : 'Probe off.')
    } else if (c === 5) {
      t.reset()
      await s.say('Everything is back to normal.')
    } else return
  }
})
