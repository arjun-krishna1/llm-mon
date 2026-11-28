// Hayes Valley, Route 101 and SoMa Node: townsfolk, signs, trainers.

import { F, def, line, say, starterName, text, type S } from './util'
import { eggLine } from './eggs'

/** Pick a line by story progress: before the starter / after it. */
function byProgress(s: S, before: string[], after: string[]): Promise<void> {
  return say(s, ...(s.flag(F.rescueDone) ? after : before))
}

// ============================================================================ Hayes Valley
text('hayes.town_sign', 'HAYES VALLEY\nWhere small towns train big dreams.')
def('hayes.mailbox', (s) =>
  say(s, '{player}’s new house. There’s already a flyer in the mailbox.',
    '“Is your LLMMON hallucinating? Ask your professor about Grounding!”'))
text('hayes.truck', 'MYTHOS MOVERS\nWe carry the weight. All of it.')

def('hayes.boy', (s) => byProgress(s,
  ['The tall grass on Route 101 is full of wild LLMMON!',
    'Mom says I can’t go in until I’m ten.\fOr until I’m “aligned”. I don’t know what that means.'],
  ['Whoa, you got a LLMMON?! Does it have a system prompt? Can it do my homework?',
    '...Don’t tell my mom I asked that.']))

def('hayes.mover', (s) => say(s,
  'Mythos Movers, at your service!\fLast week we moved a whole data centre. This week, your couch.',
  'Careful with that box marked FRAGILE: WEIGHTS. Took four of us to lift it.'))

def('hayes.woman', async (s) => {
  if (s.flag('egg_tensor')) {
    await say(s, 'Have you met Tensor? My dog. He\u2019s out back.', 'He has more dimensions than you\u2019d think. Mostly snack-related.')
    s.clearFlag('egg_tensor')
    return
  }
  s.setFlag('egg_tensor')
  await byProgress(s,
    ['Welcome to Hayes Valley!\fIt’s a small town, but everyone here remembers everything.',
      'Huge context window, this street. Gossip travels fast!'],
    ['I heard you saved the professor from a HalluciHound! See? Gossip travels fast.'])
})

def('hayes.elder', (s) => eggLine(s, 'elder', [
  ['In my day, LLMMON had a hundred million parameters and we were GRATEFUL.',
    'Now they come out of the grass able to write sonnets. Kids these days...'],
  ['Karl\u2019s rolling in this afternoon.', 'Karl the Fog, kid. Bring a hoodie. Everyone in this town owns eleven.'],
]))

def('hayes.girl', async (s) => {
  if (!s.flag(F.rescueDone)) {
    await s.say('Professor Karpathy explains everything from scratch.\fEven “hello”. ESPECIALLY “hello”.')
  } else {
    await s.say(`Is that ${starterName(s)}? It’s so cute! Does it bite? Does it... byte?`)
  }
})

def('hayes.techie', (s) => say(s,
  'See that dish on the lab roof?\fIt streams benchmark results from all over the region.',
  'Ninety percent of what it receives is spam.\fThe other ten percent is also spam, but with charts.'))

// ============================================================================ Route 101
text('route.sign_south', 'ROUTE 101\n▲ SoMa Node     ▼ Hayes Valley')
text('route.sign_north', 'ROUTE 101\n▼ Hayes Valley')

def('route.angler', (s) => eggLine(s, 'angler', [
  ['Shh! You’ll scare the fish.',
    '...There are no fish in this pond. I’m waiting for a LLMMON to hallucinate one.'],
  ['This morning a driverless car stopped right there to let a goose cross.',
    'It\u2019s still waiting. Very polite car. Very slow goose.'],
]))

def('route.grass_researcher', (s) => byProgress(s,
  ['I’m benchmarking this tall grass.\fSo far it scores 98% on Being Grass. State of the art!'],
  ['Wild LLMMON hide in tall grass. If your team needs a rest, walk around it!',
    'And if you hop down a ledge, it’s a one-way trip.\fGreat shortcut home, though.',
    'Field note: watch the Mistral Mediums in this grass.\fA Mistral breeze scatters GLM\u2019s careful graphs.']))

def('route.picnic_girl', (s) => eggLine(s, 'picnic', [
  ['I saw the whole thing from my picnic blanket!\fThat HalluciHound was SO sure it was a golden retriever.',
    'It also told me the sky is a software update. It was very convincing.'],
  ['Have you seen a burrito anywhere? I lost one on this route.', 'Mission style. Foil-wrapped. Still warm, probably. Burritos are resilient.'],
]))

def('route.field_notes', (s) => say(s,
  'Pages of field notes are scattered round an old stump.',
  '“Wild HalluciHound, day 3. Claims to be a golden retriever.”',
  '“Now claims to be a lawyer. Do NOT ask it for sources.”'))

def('route.hiker', async (s) => {
  const H = 'Hiker'
  if (s.flag('route_hiker_heal')) {
    await line(s, H, 'Cache still clear? Good.\fFor anything more, there\u2019s the Model Center in SoMa Node.')
    return
  }
  await line(s, H, 'I\u2019m touching grass. Doctor\u2019s orders. Twice a day, after meals.')
  await line(s, H, 'Long walk, huh? Your LLMMON look like they\u2019re carrying a full context window.')
  if (!s.state.party.length) return
  await line(s, H, 'Here, let me clear their cache. Old hiker\u2019s trick.')
  await s.fadeOut(300)
  await s.healParty()
  await s.fadeIn(300)
  s.setFlag('route_hiker_heal')
  await line(s, H, 'Good as new! Only works once, mind. My trick, not your LLMMON.')
})

// ---- trainers (rt_calvin / rt_tiana): the engine's default trainer flow shows
// preBattle / postBattle from src/game/data/trainers.ts; no script needed.

// ============================================================================ SoMa Node
text('soma.town_sign', 'SOMA NODE\nThe city that never stops shipping.')
text('soma.road_closed', 'ROAD CLOSED\nSurvey team at work. Thanks for waiting!')
text('soma.gym_door',
  'ALIGNMENT GYM\nThe doors are boarded up.',
  'A note on the door:\n“Leader away at a safety conference.”', '“Please stay aligned until we reopen!”')
def('soma.apartment', (s) => eggLine(s, 'apt', [
  ['NODE HEIGHTS APARTMENTS\nResidents only. Badge in, please.',
    'A sticky note under the buzzer:\n\u201cAt a hackathon. Back in 48 hours. Or 72.\u201d'],
  ['A flyer on the door:\n\u201cROOFTOP COLD PLUNGE NOW OPEN\u201d', '\u201cResidents only. Screaming permitted 7-9 AM.\u201d'],
]))
def('soma.cafe', (s) => eggLine(s, 'cafe', [
  ['CAFE LATENCY\nClosed for a menu fine-tune.', 'A chalkboard: \u201cToday\u2019s special: cold brew, served in under 200 ms.\u201d'],
  ['The menu board: single-origin pour-over, low-latency drip, and toast.', 'The toast is eleven dollars. It is, apparently, very good toast.'],
  ['A sign in the window: \u201cNOW SERVING BOBA\u201d', '\u201cWe are a cafe. We contain multitudes.\u201d'],
]))
def('soma.kiosk', async (s) => {
  s.sfx('pc_on')
  await eggLine(s, 'kiosk', [
    ['NODE PLAZA API STATUS\nModel Center: OK. Token Mart: OK.', 'Alignment Gym: DEGRADED\n(leader away at a conference)', 'Coffee: PARTIAL OUTAGE.'],
    ['NODE PLAZA API STATUS\nFog: OPERATIONAL (as always).', 'Parking: 503 SERVICE UNAVAILABLE.\nCaltrain: RETRYING...'],
  ])
  s.sfx('pc_off')
})
def('soma.billboard', (s) => eggLine(s, 'sbb', [
  ['A billboard: \u201cIS YOUR LLMMON TOO VERBOSE?\u201d', '\u201cTry SUMMARIZE! Now 40% shorter. Results may vary.\u201d'],
  ['The billboard flips:\n\u201cBENCHMARK CORP IS HIRING\u201d', '\u201cTop scores only. Menlo Park. Ask us about our test sets.\u201d'],
]))
text('soma.fountain', 'The Node Plaza fountain. A plaque reads:\n“All requests flow through here.”')

def('soma.end_sign', async (s) => {
  s.setFlag('heard_road_closed')
  await say(s,
    'THANK YOU FOR PLAYING!',
    'You’ve reached the end of the LLMMON Mythos vertical slice.',
    `${starterName(s)} and your PromptDex will be waiting for you in the next build.\fSee you on the road!`)
  s.setFlag(F.sawEnd)
})

def('soma.guard', async (s) => {
  await say(s,
    'Sorry, kid. The road north is closed.\fThe Alignment Survey team is still checking what\u2019s up ahead.',
    'They keep saying \u201ctwo more weeks\u201d. They\u2019ve said that for three months.')
  s.setFlag('heard_road_closed')
})

// Stepping away from the closed road (after the guard or the end sign): the end card, once.
def('soma.end', async (s) => {
  if (s.flag('saw_end_card')) return
  s.setFlag('saw_end_card')
  await say(s, 'The road north will open one day.', `Until then, ${starterName(s)} looks ready for whatever comes next.`)
  if (await s.yesNo('Save your progress before the credits roll?')) {
    if (s.state.save()) {
      s.sfx('save')
      await s.say('{player} saved the game.')
    }
  }
  await s.endCard()
})

def('soma.girl', (s) => say(s,
  'They say the Alignment Gym leader can tell if a LLMMON is being sincere.',
  'Mine said it loved my drawing. I’m choosing not to check.'))

def('soma.techie', (s) => say(s,
  'I came to SoMa Node to found a startup.',
  'Then my LLMMON wrote the business plan, the code AND the pitch deck.\fNow I mostly hold the coffee.'))

def('soma.woman', (s) => say(s,
  'The Model Center heals your LLMMON for free,\fand the Token Mart sells Prompt Orbs.',
  'Between the two of them, you’ve got the whole stack!'))

def('soma.elder', (s) => eggLine(s, 'selder', [
  ['SoMa Node used to be warehouses as far as the eye could see.',
    'Now it’s warehouse-sized GPUs. Progress! It’s very warm in summer.'],
  ['See that tall tower over the rooftops?\fYou can see it from everywhere in the city.', 'It can see you too. Wave.'],
]))

def('soma.man', (s) => say(s,
  'Tokens are money around here. Spend them wisely.',
  'I once spent a thousand tokens asking my LLMMON to be more concise.\fIt wrote me an essay about brevity.'))

def('soma.boy', (s) => say(s,
  'I’ve caught three GPT-5.4 minis!',
  '...Or maybe one, three times. They all look the same.'))
