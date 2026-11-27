import { bassLine, comp } from '../compose.ts'
import type { SongDef } from '../song.ts'

// The rival walks up: a short strutting blues loop in F, 116 bpm. 1 bar walk-in + 8-bar loop.

const L = 'F7 | Bb7 | F7 | F7 | Bb7 | Bb7 | F7 C7 | F7 C7'

const mel = `C5:8. Eb5:16 E5:8 F5:8 -:8 A5:8 C6:8 A5:8 | D6:8. C6:16 Bb5:8 Ab5:8 -:8 F5:8 D5:8 F5:8 |
  C5:8. Eb5:16 E5:8 F5:8 -:8 A5:8 C6:8 Eb6:8 | D6:8 C6:8 A5:8 F5:8 Eb5:4 -:4 |
  F5:8. Ab5:16 A5:8 Bb5:8 -:8 D6:8 F6:8 D6:8 | Ab5:8 F5:8 D5:8 Bb4:8 -:4 D5:8 F5:8 |
  A5:8 C6:8 -:8 A5:8 G5:8 Bb5:8 -:8 G5:8 | F5:4 -:8 C5:8 E5:4 G5:4`

export const rival_encounter: SongDef = {
  id: 'rival_encounter',
  title: 'Here Comes the Rival',
  mood: 'short, strutting',
  key: 'F mixolydian',
  bpm: 116,
  gain: 1,
  echo: { beats: 0.75, feedback: 0.25, wet: 0.22 },
  channels: { p1: { inst: 'stac' }, p2: { inst: 'arp' }, w: { inst: 'bassstac' } },
  chords: { intro: 'F7', loop: L },
  intro: {
    p1: '-:1',
    w: 'F2:4 A2:4 C3:4 Eb3:4',
    n: 'k:4 s:4 k:4 s:8 s:8',
  },
  loop: {
    p1: mel,
    p2: comp(L, 'stab', { center: 'F4', v: 10 }),
    w: bassLine(L, 'walk', { center: 'F2' }),
    n: '(k:8 h:16 h:16 s:8 h:8 k:8 k:8 s:8 h:8)x7 k:8 h:16 h:16 s:8 h:8 s:16 s:16 t:16 t:16 tl:16 tl:16 s:8',
  },
}
