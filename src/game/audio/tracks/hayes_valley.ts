import { bassLine, comp } from '../compose.ts'
import type { SongDef } from '../song.ts'

// Hayes Valley: cosy, sunny hometown. C major, 6/8 lilt (dotted quarter = 70). A (8) A2 (8) B (8).

const BT = 144
const A1 = 'C | F | G | C | Am | F | D7 | G'
const A2 = 'C | F | G | C | Am | F | G7 | C'
const B = 'F | Em | Dm | G | F | Em Am | Dm G | C'

const head = 'E5:4 G5:8 C5:4 E5:8 | F5:4 A5:8 C5:4. | D5:8 E5:8 F5:8 G5:4 B4:8 | C5:4. -:4 G4:8'
const melA1 = `${head} | A4:4 C5:8 E5:4 A5:8 | A5:4 G5:8 F5:4 C5:8 | F#5:4 E5:8 D5:4 C5:8 | B4:4. -:4 G4:8`
const melA2 = `${head} | A4:4 C5:8 E5:4 A5:8 | A5:4 G5:8 F5:4 A4:8 | B4:8 D5:8 F5:8 E5:4 D5:8 | C5:4. -:4.`
const melB = `@flute C5:8 D5:8 C5:8 A4:4 F4:8 | B4:8 C5:8 B4:8 G4:4 E4:8 | A4:8 B4:8 A4:8 F4:4 D4:8 | G4:4. B4:4 D5:8 |
  F5:4 E5:8 F5:4 A5:8 | G5:4 E5:8 E5:4 C5:8 | D5:4 F5:8 B4:4 D5:8 | C5:4. -:4 @leadsoft G4:8`

const dr = 'k:8 hs:8 hs:8 sl:8 hs:8 hs:8'
const drFill = 'k:8 hs:8 hs:8 sl:8 sl:16 sl:16 t:16 tl:16'

export const hayes_valley: SongDef = {
  id: 'hayes_valley',
  title: 'Hayes Valley',
  mood: 'cosy sunny hometown, lilting',
  key: 'C major',
  bpm: 105,
  sig: [6, 8],
  gain: 0.88,
  echo: { beats: 0.5, feedback: 0.22, wet: 0.24 },
  channels: { p1: { inst: 'leadsoft' }, p2: { inst: 'brokensoft' }, w: { inst: 'basssoft' } },
  chords: { loop: `${A1} | ${A2} | ${B}` },
  loop: {
    p1: `${melA1} | ${melA2} | ${melB}`,
    p2: `${comp(A1, 'roll68', { barTicks: BT, center: 'D4', v: 10, mel: melA1 })} | ${comp(A2, 'roll68', { barTicks: BT, center: 'D4', v: 10, mel: melA2 })} | ${comp(B, 'roll68', { barTicks: BT, center: 'D4', v: 9, mel: melB })}`,
    w: `${bassLine(A1, 'lilt', { barTicks: BT, center: 'G2' })} | ${bassLine(A2, 'lilt', { barTicks: BT, center: 'G2' })} | ${bassLine(B, 'lilt', { barTicks: BT, center: 'G2' })}`,
    n: `(${dr})x7 ${drFill} (${dr})x7 ${drFill} (${dr})x7 ${drFill}`,
  },
}
