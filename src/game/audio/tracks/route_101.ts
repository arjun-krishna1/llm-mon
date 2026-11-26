import { bassLine, comp } from '../compose.ts'
import { transpose } from '../pattern.ts'
import type { SongDef } from '../song.ts'
import { TITLE_MOTIF } from './title.ts'

// Route 101: adventurous march in G major, 128 bpm. A (8) B (8) A' (8) C (8).
// Opens with the title motif a fifth lower; B is the singable refrain.

const motif = transpose(TITLE_MOTIF, -7) // G4 D4 G4 A4 B4 ... in G major

const A = 'G | C Em | Am D | G D | G | C Em | Am D7 | G'
const B = 'C | D | Bm Em | Am D | C | D | B7 Em | Am D'
const C = 'Em | C | Am | D | Em | C | Am D | D7'
const introChords = 'G | D7'

const melA1 = `${motif} | C5:8. B4:16 A4:8 E4:8 D5:4 C5:8 B4:8 | B4:4 A4:8 G4:8 A4:2`
const melA2 = `G4:8. D4:16 G4:8 A4:8 B4:4. A4:8 | G4:8 E4:8 E5:4 D5:8 C5:8 B4:8 C5:8 | A4:8 C5:8 E5:8 C5:8 D5:8 C5:8 B4:8 A4:8 | G4:2. -:8 D4:8`
const melA = `${melA1} | ${melA2}`
const melB = `E5:4. D5:8 C5:4 G4:4 | F#5:4. E5:8 D5:4 A4:4 | B4:8 D5:8 F#5:8 D5:8 G5:4 E5:4 | C5:8 B4:8 A4:8 B4:8 A4:4 F#4:4 |
  E5:4. D5:8 C5:4 G4:4 | F#5:4. G5:8 A5:4 F#5:4 | D#5:4 F#5:4 G5:4 E5:4 | C5:4 A4:8 B4:8 A4:4 F#4:8 D4:8`
const melC = `B4:8. E4:16 B4:8 C5:8 D5:4. C5:8 | C5:8 G4:8 E5:4 D5:8 C5:8 G4:8 C5:8 | A4:8. E4:16 A4:8 B4:8 C5:4. B4:8 | A4:8 F#4:8 D5:4 C5:8 B4:8 A4:8 F#4:8 |
  G4:4 B4:4 E5:4 G5:4 | G5:4. E5:8 C5:4 E5:4 | A5:4. G5:8 F#5:4 E5:4 | D5:4 C5:4 A4:4 F#4:8 D4:8`

// A': the melody with a sustained counter-line on p2
const counterA = `@harm50 v10 B3:2 D4:2 | E4:2 G4:2 | E4:2 F#4:2 | G4:2 F#4:2 | B3:2 D4:2 | E4:2 G4:2 | A4:2 F#4:2 | G4:2. -:4`

const march = 'k:8 sl:16 sl:16 s:8 h:8 k:8 h:8 s:8 sl:16 sl:16'
const marchFill = 'k:8 sl:16 sl:16 s:8 h:8 s:16 s:16 t:16 t:16 tl:16 tl:16 s:16 s:16'
const drum8 = `(${march})x7 ${marchFill}`
const drumC = `(k:4 h:8 h:8 s:8 h:8 k:8 h:8)x3 k:8 k:8 s:8 h:8 s:16 s:16 s:16 s:16 t:16 t:16 tl:16 tl:16 | (k:4 h:8 h:8 s:8 h:8 k:8 h:8)x3 ${marchFill}`

export const route_101: SongDef = {
  id: 'route_101',
  title: 'Octavia 101',
  mood: 'adventurous march',
  key: 'G major',
  bpm: 128,
  gain: 1,
  echo: { beats: 0.5, feedback: 0.25, wet: 0.26 },
  channels: { p1: { inst: 'lead' }, p2: { inst: 'arp' } },
  chords: { intro: introChords, loop: `${A} | ${B} | ${A} | ${C}` },
  intro: {
    p1: 'D4:8 G4:8 B4:8 D5:8 G5:4 -:4 | F#5:8 E5:8 D5:8 C5:8 A4:4 -:8 D4:8',
    p2: comp(introChords, 'pulse8', { center: 'G4', v: 9 }),
    w: bassLine(introChords, 'rf', { center: 'G2' }),
    n: 's:16 s:16 s:16 s:16 s:8 s:8 k:4 s:4 | s:16 s:16 s:16 s:16 s:8 s:8 s:16 s:16 t:16 t:16 tl:16 tl:16 s:16 s:16',
  },
  loop: {
    p1: `${melA} | ${melB} | ${melA} | ${melC}`,
    p2: `${comp(A, 'stab', { center: 'G4', v: 11 })} | ${comp(B, 'alberti8', { center: 'G4', v: 9, inst: 'broken' })} | ${counterA} | ${comp(C, 'up8', { center: 'G4', v: 9, inst: 'broken' })}`,
    w: `${bassLine(A, 'rf', { center: 'G2' })} | ${bassLine(B, 'r5', { center: 'G2' })} | ${bassLine(A, 'rf', { center: 'G2' })} | ${bassLine(C, 'oct8', { center: 'G2' })}`,
    n: `${drum8} | ${drum8} | ${drum8} | ${drumC}`,
  },
}
