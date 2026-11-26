import { bassLine, comp } from '../compose.ts'
import type { SongDef } from '../song.ts'

// Intro (professor monologue): gentle and curious. F major with Lydian colour
// (the G/F chord brings in B natural), 76 bpm. A (8) B (8).

const A = 'Fmaj7 | G/F | Fmaj7 | G/F | Dm7 | Bbmaj7 | Gm7 | C'
const B = 'Bbmaj7 | C/Bb | Am7 | Dm7 | Gm7 | C7 | Fmaj7 | G/F'

const melA = `C5:4. A4:8 E5:2 | D5:4. B4:8 G4:2 | A4:8 C5:8 E5:8 F5:8 G5:4 E5:4 | D5:2. -:4 |
  F5:4. E5:8 D5:4 A4:4 | D5:4. C5:8 Bb4:4 F4:4 | G4:8 A4:8 Bb4:8 D5:8 F5:4 E5:4 | E5:2. -:4`
const melB = `F5:4 D5:8 F5:8 A5:4 F5:4 | G5:4 E5:8 G5:8 C6:4 G5:4 | A5:4. G5:8 E5:4 C5:4 | D5:4. E5:8 F5:4 A5:4 |
  Bb5:4. A5:8 G5:4 D5:4 | E5:4. F5:8 G5:4 Bb4:4 | A4:4 C5:4 E5:4 G5:4 | B5:2. -:4`

// soft bell answers in the gaps of A
const bells = '@bell v7 -:2 E6:4 C6:4 | -:2 B5:4 D6:4 | -:1 | -:2 A5:4 B5:4 | -:1 | -:2 F5:4 D6:4 | -:1 | -:2 G5:4 C6:4'

export const intro: SongDef = {
  id: 'intro',
  title: 'A World of Models',
  mood: 'gentle, curious',
  key: 'F major',
  bpm: 76,
  gain: 1,
  echo: { beats: 0.75, feedback: 0.35, wet: 0.3 },
  channels: { p1: { inst: 'flute' }, p2: { inst: 'brokensoft' }, w: { inst: 'basssoft' }, n: { gain: 0.8 } },
  chords: { loop: `${A} | ${B} | ${A} | ${B}` },
  loop: {
    p1: `${melA} | ${melB} | -:1 | -:1 | ${melA.split('|').slice(2).join('|')} | ${melB}`,
    p2: `${comp(A, 'alberti8', { center: 'F4', v: 9 })} | ${comp(B, 'alberti8', { center: 'F4', v: 9 })} | ${bells} | ${comp(B, 'up8', { center: 'F4', v: 9 })}`,
    w: bassLine(`${A} | ${B} | ${A} | ${B}`, 'rf2', { center: 'F2', v: 11 }),
    n: '(-:8 hs:8 -:8 hs:8 -:8 hs:8 -:8 hs:16 hs:16)x32',
  },
}
