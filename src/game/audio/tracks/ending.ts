import { bassLine, comp } from '../compose.ts'
import type { SongDef } from '../song.ts'
import { TITLE_MOTIF } from './title.ts'

// Ending card: a warm, slower reprise of the title theme. D major, 80 bpm.
// A (title phrase, 8 bars) + a new closing phrase (8 bars); loops gently.

const A = 'D | G Bm | D | A | D | G Bm | G A | D'
const E = 'G | D/F# | Em | A | G | A | Bm G | A D'

const melA = `${TITLE_MOTIF} | F#5:4. A5:8 A5:8 G5:8 F#5:8 G5:8 | E5:2. -:8 A4:8 |
  D5:8. A4:16 D5:8 E5:8 F#5:4. E5:8 | D5:8 B4:8 B5:4 A5:8 G5:8 F#5:8 G5:8 | A5:4. F#5:8 E5:8 D5:8 E5:8 F#5:8 | D5:2. -:8 A4:8`
const melE = `D5:4. B4:8 G4:2 | A4:4. F#4:8 D5:2 | G4:4 B4:4 E5:4 G5:4 | E5:2. C#5:4 |
  D5:4 G5:4 B5:2 | A5:4. G5:8 E5:4 C#5:4 | D5:4 F#5:4 D5:4 B4:4 | C#5:4 E5:4 D5:4 -:8 A4:8`

export const ending: SongDef = {
  id: 'ending',
  title: 'To Be Continued',
  mood: 'warm reprise of the title theme',
  key: 'D major',
  bpm: 80,
  gain: 0.86,
  echo: { beats: 0.75, feedback: 0.35, wet: 0.32 },
  channels: { p1: { inst: 'flute' }, p2: { inst: 'brokensoft' }, w: { inst: 'basssoft' }, n: { gain: 0.8 } },
  chords: { loop: `${A} | ${E}` },
  loop: {
    p1: `${melA} | ${melE}`,
    p2: `${comp(A, 'alberti8', { center: 'F#4', v: 9 })} | ${comp(E, 'up8', { center: 'F#4', v: 9 })}`,
    w: bassLine(`${A} | ${E}`, 'rf2', { center: 'D3', v: 11 }),
    n: '(-:4 hs:4 -:4 hs:8 hs:8)x16',
  },
}
