// Main story beats (plan §5): intro, arrival, home, lab, rescue, starter,
// PromptDex, Fast Tokens. Every beat is gated by flags (FLAGS.md) so it is
// re-entrant after save/load and never runs twice.

import type { Dir } from '../config'
import { F, def, line, say, starterName, walkTo, type S } from './util'

const PROF = 'Prof. Karpathy'
const MOM = 'Mom'

// ============================================================================ intro
def('intro.prof', async (s) => {
  const st = s.stage
  if (!st) return
  await s.wait(300)
  await st.spotlight(true)
  await st.showProf()
  await say(s,
    'Hello there! Welcome to the world of LLMMON!',
    'My name is Karpathy. People around here call me the LLMMON Professor.')
  await st.showMon('claude_fable')
  await say(s,
    'This world is home to creatures called LLMMON.\fLanguage models that wandered out of the lab and into the wild!',
    'Some people keep them as study buddies. Others battle with them.',
    'Me? I mostly ask them to explain my own papers back to me.')
  await st.hideMon()
  await s.say('But enough about me. Tell me about yourself. What was your name again?')
  await s.chooseName('Your name?', ['Arjun', 'Maya', 'Kai', 'Noor', 'Theo'])
  await say(s,
    '{player}! What a great name. Very low perplexity.',
    'You and your mom are moving to Hayes Valley today, right?\fMy lab is just up the street!')
  await st.hideProf()
  await st.showPlayer()
  await say(s,
    '{player}! Your very own LLMMON story is about to begin.',
    'A world of models awaits. Let’s go!')
  await st.hidePlayer()
  await st.spotlight(false)
})

// ============================================================================ arrival
// Fade in on the street: the mover loads the last box and drives the Mythos
// Movers truck away, Mom comes out to greet you and walks you inside.
const MOVER = 'Mover'
def('story.arrival', async (s) => {
  if (s.flag(F.arrived)) return
  s.face('player', 'left')
  await s.wait(300)
  await s.cameraPan(-4, -1, 900)
  await s.wait(300)
  s.face('hv_mover', 'right')
  await line(s, MOVER, 'That\u2019s the last box! Mythos Movers, signing off. Welcome to Hayes Valley!')
  await s.move('hv_mover', 'up, left')
  s.sfx('door')
  s.hide('hv_mover')
  await s.wait(400)
  s.sfx('run')
  await s.moveProp('truck', 'down 3, left 11', 2800, 'Sine.In')
  s.despawnProp('truck')
  await s.wait(300)
  // Mom comes out of the house
  s.spawn({ id: 'mom_out', sprite: 'mom', x: 13, y: 97, facing: 'down' })
  s.sfx('door')
  await s.move('mom_out', 'down 2, right 7')
  await s.move('mom_out', 'up')
  s.face('mom_out', 'right')
  await s.emote('mom_out', 'heart')
  await line(s, MOM,
    '{player}! The truck made it in one piece. And so did you!',
    'This is Hayes Valley.\fSmaller than the city, but everyone says it has a big context window.',
    'Come on, let me show you the house!')
  await Promise.all([
    s.cameraReset(900),
    s.move('mom_out', 'down, left 7, up 2').then(() => {
      s.sfx('door')
      s.despawn('mom_out')
    }),
    s.wait(550).then(() => s.move('player', 'left, down, left 7, up')),
  ])
  await s.move('player', 'up')
  await s.warp('home_1f', 'entrance', 'up', 'door')
  // inside
  await s.move('mom', 'right 2, down')
  s.face('mom', 'down')
  await line(s, MOM,
    'Ta-da! Home sweet home.\fThe movers did a great job, apart from the boxes labelled MISC.',
    'Your room is upstairs, if you want a look. They even set up your PC!')
  await s.move('mom', 'up, left 2')
  s.face('mom', 'left')
  s.setFlag(F.arrived)
})

// ============================================================================ home
def('home.mom_lab_call', async (s) => {
  if (s.flag(F.momLabCall)) return
  for (let i = 0; i < 2; i++) {
    s.sfx('select')
    await s.wait(140)
    s.sfx('select')
    await s.wait(500)
  }
  await s.emote('mom', 'note')
  s.face('mom', 'up')
  await s.say('Brrring! Brrring!')
  await s.wait(500)
  s.face('mom', 'player')
  await s.emote('mom', 'exclaim')
  await line(s, MOM,
    'Oh, {player}! That was Professor Karpathy\u2019s lab on the phone.',
    'He wants to welcome you to the neighbourhood.\fHis lab is up the street, the building with the big dish.',
    'Go say hello! And be polite.\fHe’s very smart, so he’ll probably explain things twice.')
  s.setFlag(F.momLabCall)
  s.face('mom', 'left')
})

def('home.mom', async (s) => {
  if (!s.flag(F.momLabCall)) {
    await s.run('home.mom_lab_call')
    return
  }
  if (!s.flag(F.rescueDone)) {
    if (s.flag(F.metAide)) {
      await line(s, MOM, 'The professor wandered off into the tall grass?\fOh dear. Be careful out there, {player}!')
    } else {
      await line(s, MOM, 'The professor’s lab is the building with the big satellite dish. You can’t miss it!')
    }
    return
  }
  if (!s.flag(F.hasRun)) {
    await giveFastTokens(s, false)
    return
  }
  await line(s, MOM, '{player}! You look tired. Take a little break.')
  await s.fadeOut(300)
  await s.healParty()
  await s.fadeIn(300)
  const lines = [
    'There! Your LLMMON look bright and freshly booted.\fDon’t forget to call me from SoMa Node!',
    'All better!\fRemember: eat your vegetables, and never trust a LLMMON that cites itself.',
    'Good as new! I’m so proud of you. And of {starter}. Mostly of you.',
  ]
  const i = Number(s.getFlag('mom_line') ?? 0)
  s.setFlag('mom_line', i + 1)
  await line(s, MOM, lines[i % lines.length].replace('{starter}', starterName(s)))
})

async function giveFastTokens(s: S, outside: boolean): Promise<void> {
  await line(s, MOM,
    outside
      ? '{player}! There you are! The whole street is talking about you and the professor!'
      : 'Oh, {player}! I heard all about it. You saved the professor!',
    `And you have your own LLMMON now!\f${starterName(s)}, is it? I’m not crying, it’s just pollen.`,
    'Here, before you go. I packed these for you.')
  await s.giveItem('fast_tokens', 1)
  s.setFlag(F.hasRun)
  await line(s, MOM,
    'Fast Tokens! Hold B outdoors and you’ll move at inference speed.',
    'SoMa Node is just up Route 101. Go see the world, sweetie. And call your mother!')
}

def('hayes.mom_fast_tokens', async (s) => {
  if (s.flag(F.hasRun) || !s.flag(F.gotDex)) return
  const p = s.pos('player')
  if (!p) return
  s.spawn({ id: 'mom_out', sprite: 'mom', x: p.x, y: 100, facing: 'up' })
  await s.emote('player', 'exclaim')
  await s.move('mom_out', Array(Math.max(0, 100 - p.y - 1)).fill('up') as Dir[])
  s.face('player', 'down')
  await giveFastTokens(s, true)
  await s.move('mom_out', Array(Math.max(0, 100 - p.y - 1)).fill('down') as Dir[])
  s.despawn('mom_out')
})

def('home.enter_2f', (s) => {
  s.setFlag(F.visited2f)
})

// ---- notebook tutorial (bedroom desk)
def('home.notebook', async (s) => {
  if (!s.flag(F.readNotebook)) {
    await s.say('It’s your trusty notebook!\fThe first page says: HOW TO BE A TRAINER, by {player}, age 10 and a half.')
  }
  const c = await s.choice('Read which page?', ['MOVING', 'TALKING', 'MENU', 'BATTLES', 'CLOSE'])
  if (c === 0) {
    await say(s,
      'MOVING: Use the arrow keys or WASD to walk. Tap a direction to turn on the spot.',
      'Ledges are one-way. Hop down to take a shortcut, but you can’t climb back up!')
  } else if (c === 1) {
    await say(s,
      'TALKING: Face someone and press Z, Space or Enter (the A button) to talk.',
      'The same button reads signs and picks up items. Hold it to make text go faster.')
  } else if (c === 2) {
    await say(s,
      'MENU: Press Enter or Esc (START) to open the menu.\fCheck your LLMMON, your bag, or save the game.',
      'X or Shift is the B button. It backs out of menus.')
  } else if (c === 3) {
    await say(s,
      'BATTLES: Wild LLMMON live in tall grass.\fWeaken one, then throw a Prompt Orb to catch it!',
      'Myth beats Logic, Logic beats Tool, and Tool beats Myth.\fA good story beats a proof!')
  }
  s.setFlag(F.readNotebook)
})

// ============================================================================ lab
def('lab.aide', async (s) => {
  const A = 'Aide'
  if (!s.flag(F.rescueDone)) {
    if (!s.flag(F.metAide)) {
      await line(s, A,
        'Oh, hi! You must be {player}, from the moving truck. The professor said you’d drop by.',
        'He’s not here, sorry.\fHe ran up Route 101 to check on reports of a glitchy wild LLMMON.',
        'And he forgot his satchel! It has his three field LLMMON in it.\fHe’ll have nothing to protect himself with!')
      await s.yesNo('Could you take it to him? Route 101 is just north of town.', { speaker: A })
      await s.say('{player} took the professor’s satchel!')
      s.sfx('key_item_get')
      await line(s, A, 'Thank you! Route 101 is north of town. Please hurry!')
      s.setFlag(F.metAide)
      s.setFlag(F.hasSatchel)
    } else {
      await line(s, A, 'The professor went north, up Route 101.\fPlease hurry, he’s hopeless without that satchel!')
    }
    return
  }
  const lines = [
    'The professor talks to LLMMON like colleagues.\fHonestly, they’re better at stand-ups than I am.',
    'Wild LLMMON on Route 101 are weak to type moves.\fYour starter learns one around level 7!',
    'If your LLMMON get hurt, your mom will patch them up.\fOr the Model Center in SoMa Node.',
  ]
  const i = Number(s.getFlag('aide_line') ?? 0)
  s.setFlag('aide_line', i + 1)
  await line(s, A, lines[i % lines.length])
})

/** Professor's thanks + PromptDex + Prompt Orbs (end of the rescue, or on talking to him). */
async function labDex(s: S): Promise<void> {
  if (s.flag(F.gotDex)) return
  await line(s, PROF,
    'Welcome to my lab! And thank you, again.\fI’d still be explaining backprop to that HalluciHound if you hadn’t shown up.',
    `${starterName(s)} seems to like you. Keep it!\fA LLMMON learns best from a trainer it trusts.`,
    'Oh, but it took a few hits back there. Let me defrag your partner.')
  await s.fadeOut(300)
  await s.healParty()
  await s.fadeIn(300)
  await line(s, PROF,
    `There! ${starterName(s)} is good as new. Fresh weights, clean context.`,
    'And please, take this. It’s my latest invention!')
  await s.giveItem('promptdex', 1)
  await line(s, PROF,
    'The PromptDex! It records every LLMMON you see and catch.\fThink of it as a dataset you build just by walking around.',
    'You’ll need these to fill it, too.')
  await s.giveItem('prompt_orb', 5)
  s.setFlag(F.gotDex)
  await line(s, PROF,
    'Weaken a wild LLMMON, then throw a Prompt Orb.\fA good prompt is short, specific and a little bit lucky.',
    'Route 101 leads north to SoMa Node.\fThere’s a Model Center to heal your team, and a Token Mart for supplies.',
    'But drop by and see your mom first. She’ll want to hear all about it!')
}

def('lab.prof', async (s) => {
  if (!s.flag(F.gotDex)) {
    await labDex(s)
    return
  }
  const seen = s.state.seen.length
  const caught = s.state.caught.length
  await line(s, PROF,
    `Let’s see your PromptDex...\f${seen} seen, ${caught} caught. Excellent data!`,
    seen < 5
      ? 'There are more LLMMON in the tall grass of Route 101. Go and meet them!'
      : 'Wonderful! You’re already beating my benchmark. Don’t tell my reviewers.')
})

// ============================================================================ rescue
const STARTERS = ['claude_fable', 'gpt_5_5', 'glm']
const STARTER_BLURB: Record<string, string> = {
  claude_fable: 'Claude Fable, the Myth-type storyteller.\fWarm, thoughtful, and very hard to argue with.',
  gpt_5_5: 'GPT 5.5, the Tool-type all-rounder.\fIf there’s an API for something, it’s already calling it.',
  glm: 'GLM, the Logic-type thinker.\fIt solves problems by drawing graphs nobody asked for.',
}

/**
 * Starter choice. Uses the BATTLE-UI 'StarterSelect' scene when it is registered
 * (launched with { starters, onDone(speciesId | null) }); otherwise a menu.
 */
export async function chooseStarter(s: S): Promise<string> {
  const sm = s.game.scene
  if (sm.getScene('StarterSelect')) {
    for (;;) {
      const id = await new Promise<string | null>((res) => {
        sm.run('StarterSelect', { starters: STARTERS, onDone: (r: string | null) => res(r) })
      })
      if (id && STARTERS.includes(id)) return id
    }
  }
  await s.say('{player} opened the satchel. Three Prompt Orbs sit inside, softly humming.')
  for (;;) {
    const c = await s.choice('Which LLMMON will you choose?', ['CLAUDE FABLE', 'GPT 5.5', 'GLM'], { cancelIndex: null })
    const id = STARTERS[Math.max(0, c)]
    await s.say(STARTER_BLURB[id])
    if (await s.yesNo(`Choose ${s.speciesName(id)}?`)) return id
  }
}

const SATCHEL = { x: 23, y: 81 }

def('route.rescue', async (s) => {
  if (s.flag(F.rescueDone)) return
  const p = s.pos('player')
  if (!p) return
  const carrying = s.flag(F.hasSatchel)
  s.stopMusic(300)
  // stage: professor backed against the path, the hound prowling in front of him
  s.spawn({ id: 'prof', sprite: 'prof', x: 21, y: 78, facing: 'up' })
  s.spawn({ id: 'hound', sprite: 'hallucihound', x: 21, y: 76, facing: 'down' })
  if (!carrying) s.spawnProp('satchel', 'fx/satchel', SATCHEL.x, SATCHEL.y)
  await line(s, '???', 'H-help! Somebody, anybody!')
  await s.emote('player', 'exclaim')
  s.playMusic('encounter_trainer')
  await walkTo(s, 'player', 21, p.y)
  await s.move('player', Array(Math.max(0, p.y - 81)).fill('up') as Dir[], { speed: 'run' })
  await s.cameraPan(0, -2, 600)
  // the hound prowls, then lunges
  await s.move('hound', 'left', { speed: 'slow' })
  await s.move('hound', 'right 2', { speed: 'slow' })
  await s.move('hound', 'left', { speed: 'slow' })
  s.face('hound', 'down')
  await s.emote('hound', 'exclaim')
  await Promise.all([s.move('hound', 'down', { speed: 'run' }), s.wait(120).then(() => s.move('prof', 'down', { speed: 'run' }))])
  s.face('prof', 'up')
  await s.shake(300, 3)
  await line(s, PROF, 'Easy there! Good HalluciHound...\fI am NOT a chew toy, whatever your training data says!')
  await line(s, 'HalluciHound', 'Grrfzzt! I am a golden retriever! I have a PhD! Bzzt!')
  await s.move('hound', 'up', { speed: 'slow' })
  s.face('hound', 'down')
  s.face('prof', 'down')
  await s.emote('prof', 'exclaim')
  if (carrying) {
    await line(s, PROF, 'You there! Is that my satchel?! Brilliant!\fQuick, open it and grab a LLMMON!')
  } else {
    await line(s, PROF, 'You there! I dropped my satchel, it\u2019s right next to you!\fQuick, grab a LLMMON out of it!')
  }
  // walk over to the satchel and face it
  await s.move('player', 'right')
  s.face('player', 'right')
  if (carrying) {
    s.spawnProp('satchel', 'fx/satchel', SATCHEL.x, SATCHEL.y)
    s.sfx('select')
    await s.say('{player} set the satchel down and opened it.')
  }
  await s.wait(250)
  let id = s.getFlag(F.starter)
  if (typeof id !== 'string' || !s.state.party.length) {
    id = await chooseStarter(s)
    s.setFlag(F.starter, id)
    await s.giveMon(id, 5, { silent: true })
    s.sfx('orb_throw')
    await s.say(`{player} chose ${s.speciesName(id)}! Go, ${s.speciesName(id)}!`)
  }
  s.face('player', 'up')
  await s.tutorialBattle(2)
  s.setFlag(F.rescueDone)
  s.setFlag(F.hasSatchel, false)
  // the hound bolts back into the tall grass
  s.face('hound', 'up')
  await s.emote('hound', 'dots')
  s.resumeMapMusic()
  // follow it for a beat while the professor reacts
  const flee = s.move('hound', 'up 3')
  void s.cameraPan(0, -3, 700)
  await s.wait(250)
  s.face('prof', 'up')
  await line(s, PROF, 'Phew... Look at it run!')
  await flee
  await Promise.all([s.move('hound', 'up 3', { speed: 'run' }), s.cameraPan(0, -2, 600)])
  s.despawn('hound')
  await s.wait(200)
  // the professor collects his satchel
  await s.move('prof', 'down, right 2')
  s.face('prof', 'down')
  await s.wait(200)
  s.sfx('select')
  s.despawnProp('satchel')
  s.face('prof', 'left')
  s.face('player', 'right')
  await line(s, PROF,
    'Thank you! You must be the new kid from the moving truck.',
    '{player}, right? I\u2019m Professor Karpathy!',
    'That was a wild HalluciHound. They make things up with total confidence,\fand get VERY upset when you check their sources.',
    'Come back to my lab with me. I\u2019d like to thank you properly!')
  await s.fadeOut(400)
  s.despawn('prof')
  await s.cameraReset(0)
  await s.warp('lab', 'prof_talk', 'up')
  await labDex(s)
})

// ============================================================================ white-out
// Runs after the engine has healed the party and respawned the player (facing up).
def('story.after_whiteout', async (s) => {
  if (s.mapId === 'center') {
    await line(s, 'Nurse', 'Oh my, you look like you ran out of tokens!', 'We\u2019ve restored your LLMMON. Take it slow out there, okay?')
  } else {
    await line(s, MOM, 'Oh, {player}! You look like you\u2019ve been rate-limited.', 'Sit down, sweetie. I\u2019ve already patched everyone up.')
  }
})
