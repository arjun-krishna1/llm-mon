// Interior furniture, townsfolk indoors, Model Center heal, Token Mart shop.

import { F, def, line, say, text } from './util'

// ============================================================================ home
text('home.tv', 'The weather report is on.', '“Sunny all week, with a ten percent chance of hallucinations.”')
text('home.console', 'Your old game console! The save file is from three houses ago.')
text('home.fridge', 'Nearly empty. A note from Mom on the door says: GROCERIES (after unpacking).')
text('home.kitchen', 'The kettle’s already on. Mom has her priorities straight.')
text('home.boxes', 'Moving boxes, labelled MISC, MISC 2 and DEFINITELY NOT MISC.')
text('home.table', 'A bowl of shiny apples. Welcome-home snacks!')
text('home.pc', 'Your trusty PC! It’s restoring 47 browser tabs from the old house...',
  '...This could take a while. Maybe later.')
text('home.bed', 'Your bed! It already feels like home.\n...Because it’s the same bed.')
text('home.bookshelf', 'Your comic collection. Issue #1:\n“The Adventures of Captain Backprop”.')
text('home.boxes_2f', 'Boxes full of your stuff. Unpacking is a problem for future {player}.')
text('home.bin', 'Empty. The movers were very thorough.')

// ============================================================================ neighbour
def('neighbor.dana', async (s) => {
  if (!s.flag('met_dana')) {
    await line(s, 'Dana',
      'Oh! You must be the new neighbours! I’m Dana. I label data from home.',
      'Today it’s “cat or croissant”. You’d be amazed how hard it gets after lunch.',
      'If you ever need anything, just knock!')
    s.setFlag('met_dana')
    return
  }
  if (s.flag(F.rescueDone)) {
    await line(s, 'Dana', 'Milo hasn’t stopped talking about your LLMMON. Thank you. I think.')
  } else {
    await line(s, 'Dana', 'Croissant. Croissant. Cat. ...No, croissant. Oh, hello again, {player}!')
  }
})

def('neighbor.milo', async (s) => {
  if (!s.flag(F.rescueDone)) {
    await line(s, 'Milo',
      'I’m gonna be the best LLMMON trainer ever!',
      'I’ve already named my whole future team. They’re all called Kevin.')
  } else {
    await line(s, 'Milo',
      'You got a LLMMON?! What’s its context window?\fDoes it know any jokes? Can it beat a Kevin?!')
  }
})
text('neighbor.bookshelf', 'Rows of labelled photos. Cat. Croissant. Cat. Cat? Croissant.')
text('neighbor.fridge', 'Full of croissants. Some of them might be cats. Better not check.')
text('neighbor.bed', 'A neatly made bed with a croissant-shaped pillow.')

// ============================================================================ lab props
text('lab.shelf', 'Rows of research papers. One is titled\n“LLMMON Are Few-Shot Learners”.')
text('lab.whiteboard', 'A diagram of a LLMMON’s brain.\fIt’s mostly arrows pointing at other arrows.')
text('lab.console', 'Graphs of LLMMON sightings on Route 101.\fMost of the dots are labelled “probably real”.')
text('lab.terminal', 'The professor’s terminal.\fA sticky note on the screen says:\n“Password: not my birthday”.')
text('lab.core', 'A glass tank humming with soft blue light.\fA label reads:\nTRAINING IN PROGRESS. DO NOT TAP.')
text('lab.table', 'Beakers, a soldering iron, three coffee cups and half a sandwich.')
text('lab.pedestal', 'An empty pedestal. The plaque reads:\n“FIELD KIT. PLEASE RETURN.”')
text('lab.rack', 'The server racks blink politely at you.')

// ============================================================================ Model Center
def('center.nurse', async (s) => {
  const N = 'Nurse'
  await line(s, N, 'Welcome to the Model Center! We restore tired LLMMON to a fresh context window.')
  if (!s.state.party.length) {
    await line(s, N, 'Oh, you don’t have any LLMMON yet! Come back when you do.')
    return
  }
  if (!(await s.yesNo('Shall we restore your LLMMON?', { speaker: N }))) {
    await line(s, N, 'We hope to see you again!')
    return
  }
  await line(s, N, 'Okay! I’ll take your LLMMON for a few seconds.')
  s.face('self', 'up')
  await s.healParty()
  s.face('self', 'down')
  s.setHealPoint('center', 'counter')
  const first = !s.flag(F.healedAtCenter)
  s.setFlag(F.healedAtCenter)
  await line(s, N, 'Thank you for waiting! Your LLMMON are fully restored.')
  if (first) await line(s, N, 'If your team ever faints, you’ll hurry back here to recover.\fWe hope to see you again!')
  else await line(s, N, 'We hope to see you again!')
})

def('center.techie', (s) => say(s,
  'The heal machine reboots your LLMMON with a fresh context.',
  'They forget the battle, but they never forget you.\fWeird, right? I asked them. They said “it’s in the weights”.'))
def('center.woman', (s) => say(s,
  'My LLMMON caught context rot on the route. It smelled like old log files!',
  'All better now. The nurse here is a miracle worker.'))
text('center.terminal', 'A storage terminal. The screen reads:\n“Model Storage System is syncing...”', 'A spinner goes round and round. Better come back later.')

// ============================================================================ Token Mart
def('mart.clerk', async (s) => {
  await s.shop(['prompt_orb', 'patch', 'debugger', 'firewall'], 'Welcome to the Token Mart! How may I help you?')
})
def('mart.customer', (s) => say(s,
  'Prompt Orbs work best when a wild LLMMON is already weak.',
  'Kind of like asking someone for a favour after a long day.'))
text('mart.shelf', 'Prompt Orbs, Patches and Debuggers.\fOne box says\n“Artisanal Hand-Typed Prompts”.')
text('mart.aisle', 'LLMMON snacks: bite-sized, byte-sized, and family size.')
text('mart.apples', 'A crate of apples. Not that kind of Apple.')

// ============================================================================ SoMa house
def('soma_house.grandpa', (s) => say(s,
  'My granddaughter says I talk to my LLMMON like it’s a person.',
  'Well, it talks back like one! Better manners than my brother, too.'))
def('soma_house.kid', (s) => say(s,
  'Shh! I’m watching a speedrun.',
  'A GPT-5.4 mini just cleared all of Route 101 in 0.3 seconds.\fThe commentators are crying.'))
text('soma_house.bookshelf', '“Attention Is All You Need”. Someone has written “and snacks” in the margin.')
text('soma_house.tv', 'A cooking show. The chef keeps telling the audience to “think step by step”.')
text('soma_house.table', 'A half-finished jigsaw puzzle of a GPU.\fIt’s very hard. All the pieces look the same.')
