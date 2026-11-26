// Main-run segments after leaving home: Hayes Valley → rescue → lab → Route 101 →
// SoMa Node → start menu → save → reload → Continue.
'use strict'

module.exports = async function world(ctx) {
  const { g, seg, check, musicIs, shootOn, pickLabel, FAST, sleep } = ctx
  const SHOT_PHASES = ['command', 'moves', 'anim', 'damage', 'faint', 'exp', 'levelup', 'catch', 'learn-yesno', 'learn-pick']

  /** Battle handler that screenshots the first occurrence of each phase per battle. */
  function battleShooter(prefix) {
    let id = null
    let taken = new Set()
    return {
      battle: async (s) => {
        const b = s.battle
        const cur = g.curBattle && g.curBattle.t0
        if (cur !== id) { id = cur; taken = new Set() }
        const n = g.encounters.length
        if (!taken.has('intro') && b.phase === 'intro') {
          taken.add('intro')
          await sleep(FAST ? 0 : 900)
          await g.shot(`${prefix}${n}_intro`, `Battle ${n} intro`)
        }
        if (SHOT_PHASES.includes(b.phase) && !taken.has(b.phase)) {
          taken.add(b.phase)
          if (b.phase === 'damage' || b.phase === 'exp') await sleep(FAST ? 0 : 250)
          await g.shot(`${prefix}${n}_${b.phase}`, `Battle ${n} ${b.phase}${b.text ? ': ' + b.text.split('\n')[0].slice(0, 26) : ''}`)
        }
        if (/Gotcha|was caught/i.test(b.text || '') && !taken.has('gotcha')) { taken.add('gotcha'); await g.shot(`${prefix}${n}_gotcha`, 'Caught!') }
        if (/fled|got away/i.test(b.text || '') && !taken.has('run')) { taken.add('run'); await g.shot(`${prefix}${n}_run`, 'Got away') }
        return false
      },
    }
  }
  const wilds = () => g.encounters.filter((e) => e.kind === 'wild')

  // ======================================================== Hayes Valley
  await seg('hayes_valley', async () => {
    await musicIs('hayes_valley')
    g.handlers = {}
    await g.readAt(14, 98) // mailbox
    await g.shot('hayes_mailbox_read', 'Read the mailbox')
    await g.readAt(17, 97) // truck
    await g.talkTo('hv_mover')
    await g.readAt(18, 91) // town sign
    await g.shot('hayes_sign', 'Hayes Valley sign')
    await g.talkTo('hv_boy')
    await g.talkTo('hv_techie')
    await g.talkTo('hv_girl')
    await g.talkTo('hv_elder')
    await g.shot('hayes_park', 'The park')
    await g.talkTo('hv_woman')
    const s = await g.snap()
    check(s.info.zone === 'HAYES VALLEY', 'zone name in town', s.info.zone)
  })

  await seg('neighbor', async () => {
    await g.takeWarp('neighbor')
    await g.shot('neighbor', 'Neighbour house')
    await g.talkTo('nb_dana', { onText: shootOn(g, [[/I’m Dana/, 'neighbor_dana']]) })
    await g.talkTo('nb_milo')
    await g.readAt(4, 2)
    await g.readAt(9, 2)
    await g.readAt(1, 2)
    await g.takeWarp('overworld')
  })

  await seg('lab_aide', async () => {
    await g.takeWarp('lab')
    await g.shot('lab', 'Lab (professor away)')
    await musicIs('lab')
    await g.talkTo('lab_aide', { onText: shootOn(g, [[/forgot his satchel/, 'lab_aide']]), choice: async (p, labels) => { await g.shot('lab_aide_yesno', 'Aide asks: take the satchel?'); return 0 } })
    const s = await g.snap()
    check(!!s.flags.met_aide && !!s.flags.has_satchel, 'met aide + has satchel')
    for (const [x, y] of [[1, 2], [5, 1], [7, 2], [12, 2], [1, 6], [5, 5], [10, 5], [11, 2]]) await g.readAt(x, y)
    await g.takeWarp('overworld')
  })

  // ======================================================== rescue + starter + tutorial battle + lab
  await seg('rescue', async () => {
    const sh = battleShooter('tut')
    let starterShots = new Set()
    g.handlers = {
      ...sh,
      onText: shootOn(g, [[/H-help/, 'rescue_help'], [/NOT a chew toy/, 'rescue_hound'], [/Is that my satchel|grab a LLMMON/, 'rescue_satchel'], [/scampered back/, 'rescue_after'], [/Phew/, 'rescue_prof'], [/Welcome to my lab/, 'lab_thanks'], [/PromptDex! It records/, 'lab_dex'], [/received 5 Prompt Orbs|5 Prompt Orbs/, 'lab_orbs']]),
      onStarterBrowse: async (s) => { const k = 'ss_' + s.starter.index; if (!starterShots.has(k)) { starterShots.add(k); await sleep(FAST ? 0 : 500); await g.shot(`starter_${s.starter.id}`, `Starter select: ${s.starter.id}`) } },
      onStarterConfirm: async () => { await g.shot('starter_confirm', 'Starter confirm') },
    }
    // walk north toward Route 101 (the trigger spans the road)
    await g.walkTo({ x: 21, y: 84 })
    const s = await g.waitIdle()
    g.handlers = {}
    check(s.info.map === 'lab', 'rescue ends in the lab', s.info.map)
    check(!!s.flags.rescue_done && !!s.flags.got_dex, 'rescue_done + got_dex')
    check(s.flags.starter === ctx.g.o.starter, 'starter chosen', String(s.flags.starter))
    check((s.bag.prompt_orb || 0) >= 5, 'got 5 Prompt Orbs', String(s.bag.prompt_orb))
    check(s.party.length === 1 && s.party[0].lv >= 5, 'party has starter', JSON.stringify(s.party))
    const tut = g.encounters[g.encounters.length - 1]
    check(tut && tut.outcome === 'win', 'tutorial battle won', tut && tut.outcome)
    await g.shot('lab_after', 'Lab after the rescue')
  })

  await seg('lab_after', async () => {
    await g.talkTo('lab_prof')
    await g.talkTo('lab_aide')
    await g.takeWarp('overworld')
    // Mom's Fast Tokens scene triggers outside the lab door
    await g.waitIdle({ onText: shootOn(g, [[/packed these/, 'mom_tokens'], [/got the Fast Tokens/, 'fast_tokens']]) })
    let s = await g.snap()
    if (!s.flags.has_run) {
      await g.walkTo({ x: 27, y: 97 })
      await g.waitIdle({ onText: shootOn(g, [[/packed these/, 'mom_tokens'], [/got the Fast Tokens/, 'fast_tokens']]) })
      s = await g.snap()
    }
    check(!!s.flags.has_run, 'Fast Tokens received')
    // post-rescue lines
    await g.talkTo('hv_boy')
    await g.talkTo('hv_girl')
  })

  // ======================================================== Route 101
  await seg('route_101_south', async () => {
    await g.readAt(19, 84, { walk: { run: true } })
    await g.shot('route_sign', 'Route 101 sign')
    await musicIs('route_101')
    await g.talkTo('rt_girl', { walk: { run: true } })
    const s = await g.snap()
    check(s.info.zone === 'ROUTE 101', 'zone route', s.info.zone)
  })

  await seg('route_101_grass', async () => {
    const sh = battleShooter('wild')
    const plans = ['win', 'run', 'catch']
    g.handlers = {
      ...sh,
      planBattle: (s) => {
        if (s.battle.kind !== 'wild') return 'win'
        const w = wilds().length
        const caught = g.encounters.some((e) => e.kind === 'wild' && e.outcome === 'catch')
        if (w < 3) return plans[w]
        return caught ? 'run' : 'catch'
      },
    }
    // grass tiles in the band south of the route (rows 69-74)
    const m = g.map('overworld')
    const grass = []
    for (let y = 69; y <= 73; y++) for (let x = 15; x <= 28; x++) if (m.tileAt(x, y).grass && !m.isSolid(x, y)) grass.push({ x, y })
    let i = 0
    const t0 = Date.now()
    let steps = 0
    while ((wilds().length < 3 || !g.encounters.some((e) => e.kind === 'wild' && e.outcome === 'catch')) && wilds().length < 10) {
      const a = grass[(i * 7) % grass.length]
      i++
      const r = await g.walkTo(a, { grassCost: 0, run: false })
      steps++
      if (i === 2) await g.frames('grass_walk', 10, 50, async () => { await g.walkTo(grass[(i * 7 + 3) % grass.length], { grassCost: 0 }) })
      if (Date.now() - t0 > 20 * 60 * 1000) throw new Error('grass grind timeout')
    }
    g.handlers = {}
    const ws = wilds()
    check(ws.length >= 3, '>=3 wild battles', String(ws.length))
    check(ws.some((e) => e.outcome === 'win'), 'won a wild battle')
    check(ws.some((e) => e.outcome === 'run'), 'ran from a wild battle')
    check(ws.some((e) => e.outcome === 'catch'), 'caught a wild LLMMON')
    const s = await g.snap()
    console.log('   party now', JSON.stringify(s.party), 'bag', JSON.stringify(s.bag))
  })

  await seg('route_101_mid', async () => {
    g.handlers = { ...battleShooter('tr') }
    await g.talkTo('rt_techie', { walk: { run: true } })
    await g.readAt(10, 65, { walk: { run: true } }) // ground Patch
    let s = await g.snap()
    check(!!s.flags.item_route_patch, 'picked up ground Patch at 10,65')
    await g.shot('route_mid', 'Route 101 west meadow')
    // north along the east path: Calvin's sight line crosses it
    await g.talkTo('rt_elder', { walk: { run: true } })
    s = await g.snap()
    check(!!s.flags.trainer_route_101_a_defeated, 'Calvin (sight-line trainer) battled + beaten')
    if (!s.flags.trainer_route_101_a_defeated) await g.talkTo('rt_calvin')
    await g.talkTo('rt_calvin') // post-battle line
    await g.readAt(33, 43, { walk: { run: true } }) // Prompt Orb ball
    s = await g.snap()
    check(!!s.flags.item_route_prompt_orb, 'picked up Prompt Orb ball')
  })

  await seg('route_101_ledge', async () => {
    g.handlers = { ...battleShooter('tr') }
    // hop down the row-48 ledge into the walled-off meadow with the hidden Patch
    await g.walkTo({ x: 20, y: 47 }, { run: true })
    await g.face('down')
    await g.shot('ledge_before', 'Before the ledge hop')
    await g.frames('ledge_hop', 12, 50, () => g.holdUntil('down', { x: 20, y: 49 }))
    let s = await g.snap()
    check(s.info.y === 49, 'ledge hop landed 2 tiles down', `${s.info.x},${s.info.y}`)
    await g.readAt(21, 49) // hidden Patch: face the tile and press A
    s = await g.snap()
    check(!!s.flags.item_route_hidden_patch, 'found hidden Patch')
    // try to climb back up the ledge (must bump)
    await g.walkTo({ x: 15, y: 49 })
    await g.press('up', 400)
    s = await g.snap()
    check(s.info.y === 49, 'cannot climb a ledge from below', `${s.info.x},${s.info.y}`)
  })

  await seg('route_101_north', async () => {
    g.handlers = { ...battleShooter('tr') }
    await g.walkTo({ x: 22, y: 41 }, { run: true })
    let s = await g.snap()
    check(!!s.flags.trainer_route_101_b_defeated, 'Tiana (sight-line trainer) battled + beaten')
    if (!s.flags.trainer_route_101_b_defeated) await g.talkTo('rt_tiana')
    await g.talkTo('rt_tiana')
    await g.readAt(23, 38)
    await g.shot('route_north_sign', 'Route 101 north sign')
    await g.walkTo({ x: 21, y: 33 }, { run: true })
    await sleep(FAST ? 100 : 1200)
    await g.shot('soma_arrival', 'Arriving in SoMa Node')
    s = await g.snap()
    check(s.info.zone === 'SOMA NODE', 'zone SoMa', s.info.zone)
    await musicIs('soma_node')
    g.handlers = {}
    g.arrival = { party: s.party, money: s.money, bag: s.bag }
    console.log('   at SoMa: party', JSON.stringify(s.party), 'money', s.money, 'bag', JSON.stringify(s.bag))
  })

  // ======================================================== start menu (before healing, so a Patch has an effect)
  await seg('start_menu', async () => {
    await require('./menu.cjs').fullMenu(g, { check, sleep, FAST })
  })

  // ======================================================== SoMa Node
  await seg('soma_node', async () => {
    g.handlers = {}
    await g.readAt(18, 32)
    for (const id of ['sn_boy', 'sn_man', 'sn_elder', 'sn_woman']) await g.talkTo(id, { walk: { run: true } })
    await g.readAt(21, 23)
    await g.shot('soma_plaza', 'SoMa plaza')
  })

  await seg('model_center', async () => {
    await g.takeWarp('center', { run: true })
    await g.shot('center', 'Model Center')
    await musicIs('center')
    await g.talkTo('nurse', { onText: shootOn(g, [[/Thank you for waiting/, 'center_healed']]) })
    const s = await g.snap()
    check(!!s.flags.healed_at_center, 'healed at Model Center')
    await g.talkTo('ct_techie')
    await g.talkTo('ct_woman')
    await g.readAt(11, 7)
    await g.takeWarp('overworld')
  })

  await seg('token_mart', async () => {
    await g.takeWarp('mart', { run: true })
    await g.shot('mart', 'Token Mart')
    const before = await g.snap()
    let bought = false
    let qtyDone = false
    await g.talkTo('clerk', {
      choice: async (prompt, labels) => {
        if (labels.includes('BUY')) { if (!bought) await g.shot('mart_menu', 'Mart menu'); return bought ? pickLabel(labels, /SEE YA/) : 0 }
        if (labels.includes('CANCEL')) { if (!bought) await g.shot('mart_buylist', 'Buy list'); return bought ? labels.indexOf('CANCEL') : pickLabel(labels, /^Patch/) }
        if (labels.includes('YES')) { await g.shot('mart_confirm', 'Buy confirm'); bought = true; return 0 }
        return 0
      },
      widget: async () => {
        if (!qtyDone) { qtyDone = true; await sleep(FAST ? 50 : 500); await g.press('up'); await sleep(FAST ? 50 : 400); await g.shot('mart_qty', 'Quantity x2') }
        await g.press('A')
      },
    })
    const s = await g.snap()
    const cost = before.money - s.money
    check((s.bag.patch || 0) === (before.bag.patch || 0) + 2, 'bought 2 Patches', `${before.bag.patch || 0} → ${s.bag.patch}; paid $${cost}`)
    g.mart = { before: before.money, after: s.money, cost }
    await g.talkTo('mt_man')
    for (const [x, y] of [[5, 2], [6, 5], [10, 6]]) await g.readAt(x, y)
    await g.takeWarp('overworld')
  })

  await seg('soma_house', async () => {
    await g.takeWarp('soma_house', { run: true })
    await g.shot('soma_house', 'SoMa house')
    await g.talkTo('sh_grandpa')
    await g.talkTo('sh_kid')
    for (const [x, y] of [[1, 2], [6, 2], [2, 4]]) await g.readAt(x, y)
    await g.takeWarp('overworld')
  })

  await seg('soma_north', async () => {
    await g.readAt(12, 17, { walk: { run: true } }) // gym door
    await g.shot('gym', 'Alignment Gym (closed)')
    await g.readAt(33, 16, { walk: { run: true } })
    await g.talkTo('sn_techie', { walk: { run: true } })
    await g.talkTo('sn_girl', { walk: { run: true } })
    await g.talkTo('sn_guard', { walk: { run: true } })
    await g.readAt(21, 9)
    await g.readAt(23, 10, { onText: shootOn(g, [[/THANK YOU/, 'end_sign']]) })
    const s = await g.snap()
    check(!!s.flags.saw_end_sign, 'read the end sign')
  })

  // ======================================================== save → reload → continue
  await seg('save_reload', async () => {
    await require('./menu.cjs').save(g, { check, sleep, FAST })
    const before = await g.snap()
    await g.goto('') // same URL minus ?new=1 (a real reload of a fresh tab)
    await g.page.waitForFunction(() => window.__ptSnap && window.__ptSnap() && window.__ptSnap().title === 'press', null, { timeout: 20000 })
    await sleep(FAST ? 200 : 1500)
    await g.press('A')
    await g.page.waitForFunction(() => { const s = window.__ptSnap(); return s.ui.top && s.ui.top.cls === 'ListMenu' }, null, { timeout: 5000 })
    let s = await g.snap()
    await g.shot('title_continue', 'Title with CONTINUE')
    check(s.ui.top.labels[0] === 'CONTINUE', 'CONTINUE offered first', JSON.stringify(s.ui.top.labels))
    await g.pick(0, 'UI')
    await g.page.waitForFunction(() => { const s = window.__ptSnap(); return s.info.scenes.includes('Overworld') && !s.info.busy }, null, { timeout: 15000 })
    await sleep(FAST ? 200 : 1200)
    s = await g.snap()
    await g.shot('continued', 'After Continue')
    check(s.info.map === before.info.map && s.info.x === before.info.x && s.info.y === before.info.y, 'position persisted', `${before.info.map} ${before.info.x},${before.info.y} → ${s.info.map} ${s.info.x},${s.info.y}`)
    check(s.info.facing === before.info.facing, 'facing persisted', `${before.info.facing} → ${s.info.facing}`)
    check(JSON.stringify(s.party) === JSON.stringify(before.party), 'party persisted')
    check(JSON.stringify(s.bag) === JSON.stringify(before.bag), 'bag persisted', JSON.stringify(s.bag))
    check(s.money === before.money, 'money persisted', `${before.money} → ${s.money}`)
    const fb = JSON.stringify(Object.keys(before.flags).sort().map((k) => [k, before.flags[k]]))
    const fa = JSON.stringify(Object.keys(s.flags).sort().map((k) => [k, s.flags[k]]))
    check(fa === fb, 'flags persisted')
    await musicIs('soma_node', 'after continue')
  })
}
