// Start-menu driver: party → summary pages → bag (use a Patch) → trainer card → save.
'use strict'

async function waitTop(g, pred, timeout = 6000) {
  const t0 = Date.now()
  while (Date.now() - t0 < timeout) {
    const s = await g.snap()
    const top = s.ui && s.ui.top
    if (top && pred(top, s)) return s
    await new Promise((r) => setTimeout(r, 40))
  }
  const s = await g.snap()
  throw new Error('menu waitTop timeout; top=' + JSON.stringify(s.ui && s.ui.top))
}
const isStart = (t) => t.cls === 'ListMenu' && t.labels && t.labels.includes('SAVE') && t.labels.includes('EXIT')

async function openStart(g) {
  await g.waitIdle()
  await g.press('START')
  return waitTop(g, isStart)
}

async function fullMenu(g, { check, sleep, FAST }) {
  const slow = (ms) => sleep(FAST ? 60 : ms)
  let s = await openStart(g)
  await slow(500)
  await g.shot('menu_start', 'Start menu')
  // ---- party + summary
  await g.pick(s.ui.top.labels.indexOf('LLMMON'), 'UI')
  s = await waitTop(g, (t) => t.cls === 'PartyScreen')
  await slow(700)
  await g.shot('menu_party', 'Party screen')
  check(s.party.length >= 2, 'party has starter + catch', String(s.party.length))
  await g.press('A')
  s = await waitTop(g, (t) => t.cls === 'ListMenu' && t.labels.includes('SUMMARY'))
  await slow(400)
  await g.shot('menu_party_sub', 'Party submenu')
  await g.pick(0, 'UI')
  s = await waitTop(g, (t) => t.cls === 'SummaryScreen')
  await slow(900)
  await g.shot('menu_summary_1', 'Summary page 1')
  for (let p = 2; p <= 3; p++) {
    await g.press('right')
    await slow(700)
    await g.shot(`menu_summary_${p}`, `Summary page ${p}`)
  }
  await g.press('down') // next mon
  await slow(700)
  await g.shot('menu_summary_mon2', 'Summary of 2nd mon')
  await g.press('B')
  s = await waitTop(g, (t) => t.cls === 'PartyScreen')
  await slow(300)
  await g.press('B')
  s = await waitTop(g, isStart)
  // ---- bag + Patch
  await g.pick(s.ui.top.labels.indexOf('BAG'), 'UI')
  s = await waitTop(g, (t) => t.cls === 'ListMenu' && t.labels.includes('CLOSE BAG'))
  await slow(800)
  await g.shot('menu_bag', 'Bag')
  const bagLabels = s.ui.top.labels
  const pi = bagLabels.findIndex((l) => /^Patch/.test(l))
  check(pi >= 0, 'bag has a Patch', JSON.stringify(bagLabels))
  if (pi >= 0) {
    const hpBefore = s.party.map((m) => m.hp)
    await g.pick(pi, 'UI')
    s = await waitTop(g, (t) => t.cls === 'ListMenu' && t.labels.includes('USE'))
    await slow(500)
    await g.shot('menu_bag_use', 'Bag: USE / CANCEL')
    await g.pick(0, 'UI')
    s = await waitTop(g, (t) => t.cls === 'PartyScreen')
    // choose the most damaged mon (unknown max HP from state: pick by lowest hp/level ratio via the screen order)
    const target = 0
    await slow(600)
    await g.shot('menu_bag_target', 'Use Patch on which LLMMON?')
    await g.press('A')
    s = await waitTop(g, (t) => t.cls === 'Object')
    await slow(900)
    await g.shot('menu_bag_used', 'Patch used')
    const after = s.party.map((m) => m.hp)
    check(after[target] > hpBefore[target], 'Patch restored HP', `${hpBefore[target]} → ${after[target]}`)
    await g.press('A')
    s = await waitTop(g, (t) => t.cls === 'ListMenu' && t.labels.includes('CLOSE BAG'))
  }
  await g.pick(s.ui.top.labels.indexOf('CLOSE BAG'), 'UI')
  s = await waitTop(g, isStart)
  // ---- trainer card
  const ci = s.ui.top.labels.findIndex((l) => !['LLMMON', 'BAG', 'SAVE', 'EXIT'].includes(l))
  await g.pick(ci, 'UI')
  s = await waitTop(g, (t) => t.cls === 'PlayerCard')
  await slow(900)
  await g.shot('menu_card', 'Trainer card')
  await g.press('B')
  s = await waitTop(g, isStart)
  await g.pick(s.ui.top.labels.indexOf('EXIT'), 'UI')
  await g.waitIdle()
}

async function save(g, { check, sleep, FAST }) {
  const slow = (ms) => sleep(FAST ? 60 : ms)
  let s = await openStart(g)
  await g.pick(s.ui.top.labels.indexOf('SAVE'), 'UI')
  s = await waitTop(g, (t) => t.cls === 'ListMenu' && t.labels.includes('YES'))
  await slow(700)
  await g.shot('menu_save', 'Save prompt')
  await g.pick(0, 'UI')
  await g.drive((x) => x.ui.dlg === 'waiting' && /saved the game/.test(x.ui.text))
  await g.shot('menu_saved', 'Saved')
  await g.waitIdle()
  const has = await g.page.evaluate(() => !!localStorage.getItem('llmmon_mythos_save_v1'))
  check(has, 'save written to localStorage')
}

module.exports = { fullMenu, save, openStart, waitTop, isStart }
