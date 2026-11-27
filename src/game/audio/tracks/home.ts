import { bassLine, comp } from '../compose.ts'
import type { SongDef } from '../song.ts'

// Home: soft and domestic. Bb major, 3/4 at 84 bpm, a small music-box waltz. A (8) B (8).

const BT = 144
const A = 'Bb | Eb | F | Bb | Gm | Eb | Cm7 | F'
const B = 'Eb | Bb/D | Cm | F | Eb | Dm | Cm7:2 F:4 | Bb'

const melA = `D5:4 C5:4 Bb4:4 | G4:2 Bb4:4 | A4:4 C5:4 F5:4 | D5:2. |
  Bb4:4 D5:4 G5:4 | Eb5:4 Bb4:4 G4:4 | Eb5:4 C5:4 Bb4:4 | C5:2 -:4`
const melB = `G5:2 F5:4 | F5:4 D5:4 Bb4:4 | Eb5:2 G5:4 | C5:2. |
  Bb4:4 Eb5:4 G5:4 | F5:4 D5:4 A4:4 | G4:4 Bb4:4 A4:4 | Bb4:2. `

// music-box answers under the held notes on the repeat of B
const bellB = '@bell v9 -:2. | -:2. | -:2. | -:4 F4:4 A4:4 | -:2. | -:2. | -:2. | -:4 F4:4 D4:4'

export const home: SongDef = {
  id: 'home',
  title: 'Home',
  mood: 'soft, domestic',
  key: 'Bb major',
  bpm: 84,
  sig: [3, 4],
  gain: 0.88,
  echo: { beats: 0.5, feedback: 0.2, wet: 0.2 },
  channels: { p1: { inst: 'flute' }, p2: { inst: 'harm50', pan: 0.25 }, w: { inst: 'basssoft' }, n: { gain: 0.8 } },
  chords: { loop: `${A} | ${B} | ${A} | ${B}` },
  loop: {
    p1: `${melA} | ${melB} | ${melA} | ${melB}`,
    p2: `${comp(A, 'waltz', { barTicks: BT, center: 'F4', v: 8, inst: 'harm50', mel: melA })} | ${comp(B, 'waltz', { barTicks: BT, center: 'F4', v: 8, inst: 'harm50', mel: melB })} | ${comp(A, 'waltz', { barTicks: BT, center: 'F4', v: 8, inst: 'harm50', mel: melA })} | ${bellB}`,
    w: `${bassLine(`${A} | ${B} | ${A} | ${B}`, 'waltz', { barTicks: BT, center: 'Bb2', v: 11 })}`,
    n: '(hs:4 hs:8 hs:8 hs:4)x31 hs:4 hs:4 sl:8 sl:8',
  },
}
