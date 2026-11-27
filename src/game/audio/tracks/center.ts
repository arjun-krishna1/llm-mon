import { bassLine, comp, riff } from '../compose.ts'
import type { SongDef } from '../song.ts'

// Model Center: calm and reassuring. Eb major, 88 bpm. A (8) B (8), repeated with sparse bell answers under the melody.

const A = 'Eb | Ab | Bb | Eb | Cm | Ab | F7 Bb | Bb'
const B = 'Ab | Bb | Gm | Cm | Ab | Bb | Ab Bb | Eb'

const melA = `G4:4 Bb4:4 Eb5:2 | C5:4. Bb4:8 Ab4:2 | D5:4 F5:4 Bb4:4 D5:4 | Eb5:2. -:4 |
  G5:4. F5:8 Eb5:4 C5:4 | Eb5:4. F5:8 C5:2 | A4:4 C5:4 D5:4 F5:4 | F5:2. -:4`
const melB = `Eb5:4 C5:4 Ab4:4 C5:4 | D5:4 Bb4:4 F4:4 Bb4:4 | G5:4. F5:8 D5:4 Bb4:4 | C5:4. D5:8 Eb5:4 G5:4 |
  Ab5:4. F5:8 Eb5:4 C5:4 | Bb4:4. C5:8 D5:4 F5:4 | Eb5:4 C5:4 D5:4 Bb4:4 | Eb5:2. -:4`


export const center: SongDef = {
  id: 'center',
  title: 'Model Center',
  mood: 'calm, reassuring',
  key: 'Eb major',
  bpm: 88,
  gain: 0.9,
  echo: { beats: 1, feedback: 0.3, wet: 0.28 },
  channels: { p1: { inst: 'leadsoft' }, p2: { inst: 'brokensoft' }, w: { inst: 'basssoft' }, n: { gain: 0.8 } },
  chords: { loop: `${A} | ${B} | ${A} | ${B}` },
  loop: {
    p1: `${melA} | ${melB} | @flute ${melA} | ${melB} @leadsoft`,
    p2: `${comp(A, 'alberti8', { center: 'Eb4', v: 9, mel: melA })} | ${comp(B, 'alberti8', { center: 'Eb4', v: 9, mel: melB })} | ${riff(A, '-:2 T:2', { center: 'C4', v: 8, inst: 'bell' })} | ${riff(B, '-:2 T:2', { center: 'C4', v: 8, inst: 'bell' })}`,
    w: bassLine(`${A} | ${B} | ${A} | ${B}`, 'rf2', { center: 'Bb2', v: 12 }),
    n: '(-:4 hs:4 -:4 hs:8 hs:8)x32',
  },
}
