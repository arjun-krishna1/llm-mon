// Rival: Dana, the neighbour kid. Meets you outside your house, grabs the
// starter that beats yours in the lab, ambushes you at the north end of Route
// 101 and later hangs out at the SoMa fountain. Every appearance is spawned by a
// script (flags in FLAGS.md), so each beat is re-entrant.

import type Phaser from 'phaser'
import { F, def, line, starterName, walkTo, type S } from './util'
import { TRAINERS } from '../data/trainers'
import { moveInfo, speciesTypes } from '../adapters/monInfo'

const DANA = 'Dana'
export const RIVAL_FLAGS = {
  met: 'met_rival',
  starter: 'rival_starter',
  lostOnce: 'rival_lost_once',
  beaten: 'rival_beaten',
} as const

/** The starter that beats yours (see the type chart in src/game/data). */
const COUNTER: Record<string, string> = { claude_fable: 'gpt_5_5', gpt_5_5: 'glm', glm: 'claude_fable' }

/** Load Dana's sheets if the engine manifest doesn't preload them yet. */
async function ensureRivalArt(s: S): Promise<void> {
  const tex = s.game.textures
  const ui = s.game.scene.getScene('UI') as Phaser.Scene
  const want: Array<[string, () => void]> = [
    ['chars/rival', () => ui.load.spritesheet('chars/rival', 'assets/game/sprites/chars/rival.png', { frameWidth: 16, frameHeight: 24 })],
    ['battle/rival_front', () => ui.load.image('battle/rival_front', 'assets/game/sprites/battle/rival_front.png')],
  ]
  const missing = want.filter(([k]) => !tex.exists(k))
  if (!missing.length) return
  await new Promise<void>((res) => {
    ui.load.once('complete', () => res())
    for (const [, add] of missing) add()
    ui.load.start()
  })
}

function rivalStarter(s: S): string {
  const id = s.getFlag(RIVAL_FLAGS.starter)
  return typeof id === 'string' ? id : COUNTER[String(s.getFlag(F.starter) ?? 'glm')] ?? 'claude_fable'
}

// ============================================================================ 1. outside your house
def('rival.intro', async (s) => {
  if (s.flag(RIVAL_FLAGS.met)) return
  await ensureRivalArt(s)
  const p = s.pos('player')
  if (!p) return
  const tx = p.y === 99 ? p.x + 1 : p.x
  s.spawn({ id: 'dana', sprite: 'rival', x: 22, y: 99, facing: 'left' })
  await s.emote('player', 'exclaim')
  await walkTo(s, 'dana', tx, 99, false, 'run')
  if (p.y !== 99) s.face('dana', 'up')
  s.face('player', 'dana')
  await line(s, DANA,
    'Hey! You’re the kid from the moving truck, right? I’m Dana. I live next door.',
    'Fair warning: I’ve read every LLMMON paper in Hayes Valley.\fBoth of them. Twice.',
    'Professor Karpathy’s handing out starters any day now.\fWhen he does, I’m picking the best one.',
    'See you around, neighbour. Try to keep up!')
  await s.emote('dana', 'note')
  await walkTo(s, 'dana', 22, 99, false, 'run')
  await s.move('dana', 'right 6, up 3', { speed: 'run' })
  s.despawn('dana')
  s.setFlag(RIVAL_FLAGS.met)
})

// ============================================================================ 2. the lab: she takes the counter
export async function rivalInLab(s: S): Promise<void> {
  if (s.getFlag(RIVAL_FLAGS.starter)) return
  await ensureRivalArt(s)
  const mine = String(s.getFlag(F.starter) ?? 'glm')
  const hers = COUNTER[mine] ?? 'claude_fable'
  s.spawn({ id: 'dana', sprite: 'rival', x: 6, y: 9, facing: 'up' })
  s.sfx('door')
  await line(s, DANA, 'Professor! PROFESSOR! Is it true you rescued a HalluciHound with a satchel?!')
  await s.move('dana', 'up, right 2, up 4, left', { speed: 'run' })
  s.face('dana', 'left')
  s.face('player', 'right')
  await s.emote('dana', 'question')
  await line(s, DANA,
    `Wait, {player} got a LLMMON already? Is that ${starterName(s)}?`)
  await line(s, 'Prof. Karpathy', 'Ah, Dana! As it happens, there are two left in the satchel. Would you like one?')
  await s.emote('dana', 'note')
  await line(s, DANA,
    `Then I’ll take ${s.speciesName(hers)}. It’s super effective against ${starterName(s)}.`,
    'That’s not trash talk, {player}. That’s the type chart.')
  s.sfx('key_item_get')
  await s.say(`Dana received ${s.speciesName(hers)}!`)
  s.setFlag(RIVAL_FLAGS.starter, hers)
  await line(s, DANA, 'Race you to SoMa Node! Loser has to read the terms of service out loud!')
  await s.move('dana', 'right, down 4, left 2, down', { speed: 'run' })
  s.sfx('door')
  s.despawn('dana')
  await line(s, 'Prof. Karpathy', 'Ha! That one has been waiting at my door every morning for a month.')
}

// ============================================================================ 3. ambush at the north end of Route 101
def('rival.ambush', async (s) => {
  if (s.flag(RIVAL_FLAGS.beaten) || !s.getFlag(RIVAL_FLAGS.starter)) return
  await ensureRivalArt(s)
  const p = s.pos('player')
  if (!p) return
  const hers = rivalStarter(s)
  s.playMusic('rival_encounter')
  s.spawn({ id: 'dana', sprite: 'rival', x: p.x, y: 31, facing: 'down' })
  await s.emote('player', 'exclaim')
  await s.move('dana', Array(Math.max(0, p.y - 32)).fill('down') as Array<'down'>, { speed: 'run' })
  s.face('player', 'up')
  await s.emote('dana', 'exclaim')
  // her one-PP signature move, read from the trainer data so renames carry over
  // her starter's lab move, read from the trainer data so renames carry over
  const ace = TRAINERS[`rival_dana_${hers}`]?.party.find((p) => p.speciesId === hers)
  const labMove = (ace?.moves ?? []).find((id) => speciesTypes(hers).includes(moveInfo(id).type))
  const typeMove = labMove ? moveInfo(labMove).name : 'a brand-new move'
  if (s.flag(RIVAL_FLAGS.lostOnce)) {
    await line(s, DANA, 'Back for a rematch? Good.\fI was getting bored winning against the tall grass.')
  } else {
    const mins = Math.max(1, Math.floor(s.state.playTimeMs / 60000))
    await line(s, DANA,
      `{player}! Took you long enough.\f${mins} whole minutes since you moved in, and you\u2019re only just here?`,
      `I caught a partner on the route.\fAND ${s.speciesName(hers)} learned ${typeMove} this morning.`,
      'You know what that means against yours. I checked the chart!')
  }
  // fair fight: she patches your team up first
  await line(s, DANA, 'Hold on. I\u2019m not beating you while you\u2019re rate-limited. Stand still.')
  await s.healParty()
  await line(s, DANA, 'There. Full context window. No excuses!')
  const id = s.flag(RIVAL_FLAGS.lostOnce) ? `rival_dana_${hers}_rematch` : `rival_dana_${hers}`
  const r = await s.trainerBattle(id, { music: 'battle_rival' })
  if (r.outcome !== 'win') {
    // the engine has already whited out to the heal point; she waits for a (slightly easier) rematch
    s.setFlag(RIVAL_FLAGS.lostOnce)
    return
  }
  s.setFlag(RIVAL_FLAGS.beaten)
  s.resumeMapMusic()
  await line(s, DANA,
    'Okay. Okay! You won. Fair and square, even with the type chart on my side.',
    'Don’t let it go to your weights.\fI’ll beat you at the Alignment Gym. Probably. Definitely.',
    'Last one to the fountain is a deprecated model!')
  await s.emote('dana', 'note')
  await s.move('dana', 'up 4', { speed: 'run' })
  s.despawn('dana')
  spawnFountainDana(s)
})

// ============================================================================ 4. SoMa fountain afterwards
function spawnFountainDana(s: S): void {
  if (!s.world.hasActor('dana')) s.spawn({ id: 'dana', sprite: 'rival', x: 19, y: 26, facing: 'up', movement: 'look', script: 'soma.dana' })
}

def('overworld.enter', async (s) => {
  if (s.flag(RIVAL_FLAGS.beaten)) {
    await ensureRivalArt(s)
    spawnFountainDana(s)
  }
})

def('soma.dana', async (s) => {
  const lines = [
    'I’m making a wish. Rate-limit wishes are free, right?',
    'Model Center healed my team in one second flat.\fI timed it. With a stopwatch. Twice.',
    'The gym leader is at a safety conference.\fProbably learning how to lose to me.',
  ]
  const i = Number(s.getFlag('dana_line') ?? 0)
  s.setFlag('dana_line', i + 1)
  await s.emote('self', 'note')
  await line(s, DANA, lines[i % lines.length])
})
