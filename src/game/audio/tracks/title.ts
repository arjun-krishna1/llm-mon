import { bassLine, comp } from '../compose.ts'
import type { SongDef } from '../song.ts'

// Title: grand and warm. D major, 112 bpm. 4-bar brass call, then A (8) B (8) A' (8).
// The opening motif (bars A1-A2) returns in route_101, transposed to G.

export const TITLE_MOTIF = 'D5:8. A4:16 D5:8 E5:8 F#5:4. E5:8 | D5:8 B4:8 G5:4 F#5:8 E5:8 D5:8 E5:8'

const introChords = 'D | G A | Bm G | A'
const A = 'D | G Bm | D | A | D | G Bm | G A | D'
const B = 'Bm | G A | G Em | A | G:2. D/F#:4 | Em A7 | Bm G | A'

const melA = `${TITLE_MOTIF} | F#5:4. A5:8 A5:8 G5:8 F#5:8 G5:8 | E5:2. -:8 A4:8 |
  D5:8. A4:16 D5:8 E5:8 F#5:4. E5:8 | D5:8 B4:8 B5:4 A5:8 G5:8 F#5:8 G5:8 | A5:4. F#5:8 E5:8 D5:8 E5:8 F#5:8 | D5:2. -:8 A4:8`
const melB = `B4:4 C#5:8 D5:8 F#5:4 E5:4 | D5:4. B4:8 C#5:2 | G4:4 A4:8 B4:8 D5:4 C#5:8 B4:8 | C#5:4 E5:4 A5:2 |
  B5:4. A5:8 G5:4 F#5:4 | E5:4. F#5:8 G5:4 A5:4 | F#5:4. E5:8 D5:4 B4:4 | A4:8 B4:8 C#5:8 D5:8 E5:4 -:8 A4:8`

// counter-melody for A'
const counter = `@harm50 v11 F#4:2 A4:2 | B4:2 D5:2 | A4:2 F#4:2 | E4:2 C#4:2 | F#4:2 A4:2 | G4:2 F#4:2 | B4:2 C#5:2 | A4:2. -:4`

const drA = '(k:8 h:8 s:8 h:8 k:8 k:8 s:8 h:8)x7 k:8 h:8 s:8 h:8 k:8 s:16 s:16 t:16 t:16 tl:16 tl:16'
const drB = '(k:4 h:8 h:8 s:4 h:8 h:8)x3 k:4 h:8 h:8 s:8 s:16 s:16 th:16 t:16 tl:8 | (k:4 h:8 h:8 s:4 h:8 h:8)x3 k:8 k:8 s:8 s:8 t:16 t:16 tl:16 tl:16 s:16 s:16 s:16 s:16'
const drA2 = 'c:8 h:8 s:8 h:8 k:8 k:8 s:8 h:8 (k:8 h:8 s:8 h:8 k:8 k:8 s:8 o:8)x6 k:8 h:8 s:8 h:8 k:8 s:16 s:16 t:16 t:16 tl:16 tl:16'

export const title: SongDef = {
  id: 'title',
  title: 'LLMMON Mythos',
  mood: 'grand, warm, the main theme',
  key: 'D major',
  bpm: 112,
  gain: 0.98,
  echo: { beats: 0.75, feedback: 0.3, wet: 0.32 },
  channels: { p1: { inst: 'brass' }, p2: { inst: 'broken' } },
  chords: { intro: introChords, loop: `${A} | ${B} | ${A}` },
  intro: {
    p1: 'A4:8. A4:16 D5:4 -:8 A4:16 D5:16 F#5:4 | G5:4. F#5:8 E5:4 C#5:8 E5:8 | F#5:4. D5:8 B4:4 G5:4 | A5:2. -:8 A4:8',
    p2: comp(introChords, 'chord', { center: 'A4', inst: 'arp', v: 10 }),
    w: bassLine(introChords, 'q', { center: 'D3' }),
    n: 'c:4 -:4 k:4 -:4 | k:4 -:4 k:4 s:4 | k:4 -:4 k:4 s:4 | t:16 t:16 t:16 t:16 th:16 th:16 th:16 th:16 tl:8 tl:8 s:16 s:16 s:16 s:16',
  },
  loop: {
    p1: `${melA} | ${melB} | ${melA}`,
    p2: `${comp(A, 'alberti8', { center: 'F#4', v: 10 })} | ${comp(B, 'up8', { center: 'F#4', v: 10 })} | ${counter}`,
    w: `${bassLine(A, 'rf', { center: 'D3' })} | ${bassLine(B, 'oct8', { center: 'C3' })} | ${bassLine(A, 'rf', { center: 'D3' })}`,
    n: `${drA} | ${drB} | ${drA2}`,
  },
}
