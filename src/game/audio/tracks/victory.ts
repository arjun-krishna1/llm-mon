import { bassLine, comp } from '../compose.ts'
import type { SongDef } from '../song.ts'

// Victory: 4-bar fanfare, then a happy 16-bar vamp. C major, 138 bpm.

const I = 'C | F G | C | G'
const V = 'C | Am | F | G | C | Am | F | G | F | G | Em | Am | Dm | G | F G | G'

const melI = 'C5:8 E5:8 G5:8 C6:8 -:8 G5:8 C6:4 | A5:8. G5:16 F5:8 A5:8 B5:8. A5:16 G5:8 B5:8 | C6:4. G5:8 E5:8 G5:8 C6:4 | D6:2 B5:4 -:4'
const melV = `E5:8 G5:8 -:8 E5:8 C5:8 E5:8 G5:4 | A5:8 G5:8 -:8 E5:8 C5:8 E5:8 A5:4 | F5:8 A5:8 -:8 F5:8 C5:8 F5:8 A5:4 | G5:8 B5:8 -:8 G5:8 D5:8 G5:8 B5:8 D6:8 |
  E6:4. D6:8 C6:8 G5:8 E5:4 | C6:4. B5:8 A5:8 E5:8 C5:4 | A5:4. G5:8 F5:8 C5:8 A4:4 | B4:8 D5:8 G5:8 B5:8 D6:4 -:4 |
  A5:4 C6:8 A5:8 F5:4 A5:4 | B5:4 D6:8 B5:8 G5:4 B5:4 | G5:4. E5:8 B4:4 E5:4 | A5:4. E5:8 C5:4 A4:4 |
  F5:4. E5:8 D5:4 A5:4 | G5:4. F5:8 D5:4 B4:4 | C5:8 F5:8 A5:8 C6:8 B5:8 G5:8 D5:8 B4:8 | G5:2 -:8 G4:8 A4:8 B4:8`

export const victory: SongDef = {
  id: 'victory',
  title: 'Victory!',
  mood: 'fanfare, then a happy vamp',
  key: 'C major',
  bpm: 138,
  gain: 1.0,
  echo: { beats: 0.5, feedback: 0.25, wet: 0.24 },
  channels: { p1: { inst: 'brass' }, p2: { inst: 'arp' }, w: { inst: 'bass' } },
  chords: { intro: I, loop: V },
  intro: {
    p1: melI,
    p2: comp(I, 'pulse8', { center: 'G4', v: 10 }),
    w: bassLine(I, 'drive8', { center: 'C3' }),
    n: 'c:8 k:8 s:8 k:8 k:8 s:8 k:4 | k:8 h:8 s:8 h:8 k:8 h:8 s:8 h:8 | c:8 k:8 s:8 k:8 k:8 s:8 k:4 | s:16 s:16 s:16 s:16 t:16 t:16 tl:16 tl:16 c:4 -:4',
  },
  loop: {
    p1: `@lead ${melV}`,
    p2: comp(V, 'stab', { center: 'G4', v: 10 }),
    w: bassLine(V, 'oct8', { center: 'C3' }),
    n: '(k:8 h:8 s:8 h:8 k:8 h:8 s:8 h:8)x15 k:8 h:8 s:8 h:8 s:16 s:16 t:16 t:16 tl:16 tl:16 s:8',
  },
}
