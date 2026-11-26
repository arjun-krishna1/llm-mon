import { bassLine, comp } from '../compose.ts'
import type { SongDef } from '../song.ts'

// Professor's lab: inquisitive and bouncy. D Dorian (B natural, with an A7 turnaround), 120 bpm.
// A (8) B (8) A (8) B' (8).

const A = 'Dm7 | G7 | Dm7 | G7 | Fmaj7 | Em7 | Dm7 Em7 | A7'
const B = 'C | G/B | Am7 | Dm7 | C | G | Em7 A7 | A7'

const melA = `D5:8 -:8 F5:8 A5:8 -:8 G5:8 F5:8 E5:8 | D5:8 -:8 B4:8 D5:8 -:8 F5:8 D5:8 B4:8 |
  D5:8 -:8 F5:8 A5:8 -:8 C6:8 B5:8 A5:8 | G5:8 F5:8 D5:8 B4:8 G4:4 -:4 |
  A5:8. G5:16 F5:8 E5:8 C5:4 -:8 E5:8 | G5:8. F5:16 E5:8 D5:8 B4:4 -:8 D5:8 |
  F5:8 E5:8 D5:8 F5:8 E5:8 D5:8 C5:8 E5:8 | C#5:4 E5:8 G5:8 A5:4 -:4`
const melB = `E5:4 G5:8 E5:8 C5:8 D5:8 E5:8 G5:8 | D5:4 G5:8 D5:8 B4:8 C5:8 D5:8 G5:8 |
  C5:4 E5:8 C5:8 A4:8 B4:8 C5:8 E5:8 | F5:4. E5:8 D5:4 A4:4 |
  G5:8 E5:8 G5:8 C6:8 G5:8 E5:8 C5:8 E5:8 | D6:8 B5:8 G5:8 B5:8 D6:8 B5:8 G5:8 D5:8 |
  E5:8 G5:8 B5:8 G5:8 A5:8 G5:8 E5:8 C#5:8`
const endB1 = 'E5:4 -:8 A4:8 C#5:8 E5:8 G5:4'
const endB2 = 'A5:8 G5:8 E5:8 C#5:8 A4:4 -:4'

const dr = 'k:8 h:8 sl:8 h:8 k:8 k:8 sl:8 h:8'
const drFill = 'k:8 h:8 sl:8 h:8 k:8 sl:16 sl:16 th:16 t:16 tl:8'

export const lab: SongDef = {
  id: 'lab',
  title: 'Research Lab',
  mood: 'inquisitive, bouncy',
  key: 'D dorian',
  bpm: 120,
  gain: 1.45,
  echo: { beats: 0.75, feedback: 0.28, wet: 0.25 },
  channels: { p1: { inst: 'stac' }, p2: { inst: 'arp' }, w: { inst: 'bassstac' } },
  chords: { loop: `${A} | ${B} | ${A} | ${B}` },
  loop: {
    p1: `${melA} | ${melB} | ${endB1} | @lead12 ${melA} | ${melB} | ${endB2}`,
    p2: `${comp(A, 'stab', { center: 'A4', v: 10 })} | ${comp(B, 'stab', { center: 'A4', v: 10 })} | ${comp(A, 'guide', { center: 'F4', v: 10, inst: 'harm' })} | ${comp(B, 'stab', { center: 'A4', v: 10, inst: 'arp' })}`,
    w: bassLine(`${A} | ${B} | ${A} | ${B}`, 'stride8', { center: 'D3' }),
    n: `(${dr})x7 ${drFill} (${dr})x7 ${drFill} (${dr})x7 ${drFill} (${dr})x7 ${drFill}`,
  },
}
