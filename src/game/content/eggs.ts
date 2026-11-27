// Bay Area / AI-scene easter eggs. Affectionate, 1-2 boxes each; many change on
// repeat reads (a per-egg counter flag `egg_<id>`) or after story flags.
// Real places/businesses are only name-dropped warmly; people are archetypes.

import { def, line, say, type S } from './util'

/** Show the next entry of `pages` on each interaction (sticks on the last one if `stick`). */
async function rotate(s: S, key: string, pages: string[][], stick = false): Promise<void> {
  const k = `egg_${key}`
  const i = Number(s.getFlag(k) ?? 0)
  s.setFlag(k, i + 1)
  const idx = stick ? Math.min(i, pages.length - 1) : i % pages.length
  await say(s, ...pages[idx])
}

// ============================================================================ Hayes Valley
def('egg.cerebral_valley', (s) => rotate(s, 'cv', [
  ['A hand-painted sign:\n“WELCOME TO CEREBRAL VALLEY”', 'Someone has added underneath, smaller: “(it’s Hayes Valley, but with more GPUs)”'],
  ['The paint is still a little wet. The GPUs are still a little warm.'],
]))

def('egg.coffee_sign', (s) => say(s,
  'BLUE BOTTLE COFFEE\nPop-up cart.\fPour-overs, made slowly, on purpose.',
  'A chalk note: “Good things take time. So does this line.”'))

def('egg.coffee_cart', (s) => say(s, 'A little coffee cart.\fA kettle, a scale, and a barista who is concentrating very hard.'))

def('egg.barista', async (s) => {
  const B = 'Barista'
  if (s.flag('bb_pourover')) {
    await line(s, B, 'One pour-over per customer per day. It’s not a rule, it’s a philosophy.')
    return
  }
  await line(s, B, 'Hi! You look like you just moved here. And like you need a coffee.')
  if (!s.state.party.length) {
    await line(s, B, 'Come back when you have a partner. I’ll make two cups.')
    return
  }
  await line(s, B, 'Here. On the house. It took four minutes and it was worth every second.')
  await s.healParty()
  s.setFlag('bb_pourover')
  await line(s, B, 'Your whole team looks wide awake now. That’s the bloom.')
})

def('egg.queue1', (s) => rotate(s, 'q1', [
  ['I’ve been in this line since the seed round.'],
  ['We’re at Series A now. The line, I mean. The line raised.'],
]))

def('egg.queue2', (s) => rotate(s, 'q2', [
  ['I don’t even drink coffee. I just come for the line. Best networking in the city.'],
  ['The person behind me is an angel investor.\fThe person behind HIM is also an angel investor.'],
]))

def('egg.not_hacker_house', (s) => rotate(s, 'hh', [
  ['A sign on the bike rack:\n“THIS IS NOT A HACKER HOUSE.\fPLEASE STOP KNOCKING.”', 'Six bikes. One sleeping bag. A whiteboard visible through the window.'],
  ['A smaller sign below:\n“Demo day is Sunday. Sleep is Monday.”'],
]))

def('egg.pocket_park', (s) => rotate(s, 'pp', [
  ['POCKET PARK\nThis month’s art installation: “Inference”.', 'It is a pond. It reflects on itself.'],
  ['Next month’s installation: “Training”.\nIt is the same pond, but for longer.'],
]))

def('egg.pigeon_pitch', async (s) => {
  if (!s.flag('egg_pigeon')) {
    s.setFlag('egg_pigeon')
    await say(s, '...and THAT is why pigeons are the most underserved market in the city.',
      'Oh! Sorry. I’m practising my pitch. The pigeon is a very tough audience.')
    return
  }
  await say(s, 'The pigeon passed.', 'It said it was too early. Then it ate my notes.')
})

// ============================================================================ Route 101
def('egg.route_billboard', (s) => rotate(s, 'rb', [
  ['A huge billboard:\n“YOUR AGENTS NEED AGENTS.”', 'Below it, in tiny print: “Ask your agent about our agent.”'],
  ['The billboard flips over:\n“WE’RE HIRING.”', 'Someone has sprayed underneath: “so is everyone”'],
]))

def('egg.scooter', (s) => rotate(s, 'sc', [
  ['Something is tangled in this bush: a rental e-scooter, battery at 3%.', 'A little screen blinks: “Please return me to a designated zone.”'],
  ['The scooter has given up. So has the bush.'],
]))

// ============================================================================ SoMa Node
def('egg.vc_vest', async (s) => {
  const V = 'VC in a fleece vest'
  if (s.flag('egg_vc_done')) {
    await line(s, V, 'Still thinking about your round?\fTake your time. Not too much time. Markets move.')
    return
  }
  await line(s, V, 'You. Kid with the LLMMON. Pre-seed, pre-product, pre-idea. I love it.')
  const yes = await s.yesNo('Want a term sheet?', { speaker: V })
  s.setFlag('egg_vc_done')
  if (yes) {
    await line(s, V, 'Bold. I like bold. What’s your valuation?\fDon’t answer that. I’ll circle back.')
  } else {
    await line(s, V, 'Bootstrapping? Respect.\fHere’s my card. It’s also a vest.')
  }
})

def('egg.vc_circle', (s) => rotate(s, 'vc2', [
  ['Love this. Love you. Let’s circle back.'],
  ['Circling back! Still love it. Let’s circle back on the circle back.'],
  ['We’ve circled back so many times we’re basically a roundabout now.'],
], true))

def('egg.stealth', async (s) => {
  if (!s.flag('rival_beaten')) {
    await say(s, 'I can’t tell you what I’m building. We’re in stealth.', 'It’s... disruptive. That’s all I can say.')
  } else {
    await say(s, 'Okay, fine. I saw your battle out there. You earned it.', 'It’s a to-do app. With agents. Please don’t tell anyone.')
  }
})

def('egg.busker', async (s) => {
  await s.emote('self', 'note')
  await rotate(s, 'bk', [
    ['♪ Attention... is all I need... ♪', 'Tips welcome. Tokens preferred.'],
    ['♪ Take me back to... the base model... ♪', 'That one’s a ballad. It gets a little overfit in the chorus.'],
  ])
})

def('egg.caltrain', (s) => rotate(s, 'ct', [
  ['CALTRAIN → 4th & King, a short walk south.', 'Next train: delayed.\nNext next train: also delayed.'],
  ['Someone has written on the timetable:\n“bring a book. bring two books.”'],
]))

def('egg.parking', (s) => say(s,
  '2 HR PARKING 8AM-6PM EXCEPT TUES.\fNO PARKING 2ND & 4TH THURS. TOW AWAY 4-7PM.',
  'PERMIT ONLY SUNDAYS. LOADING ZONE ON FULL MOONS.\fYou read it three times and decide to walk.'))

// ============================================================================ interiors
def('egg.tokens_monthly', (s) => rotate(s, 'tm', [
  ['A copy of Tokens Monthly on the bench:', '“10 PROMPTS THAT WILL CHANGE YOUR LIFE (NUMBER 7 IS JUST ‘PLEASE’)”'],
  ['This month’s cover: “IS YOUR CONTEXT WINDOW HALF FULL OR HALF EMPTY?”'],
]))

/** Story-aware rotating lines used by existing scripts (kept small and reusable). */
export async function eggLine(s: S, key: string, pages: string[][], stick = false): Promise<void> {
  await rotate(s, key, pages, stick)
}

