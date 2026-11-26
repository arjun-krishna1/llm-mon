import { bassLine, comp } from '../compose.ts'
import type { SongDef } from '../song.ts'

// Wild battle: driving and tense. E minor (harmonic: B7, plus a Phrygian F), 152 bpm.
// 2-bar chromatic sting, then A (8) B (8) C (8) D (8).

const I = 'Em | B7'
const A = 'Em | Em | C | D | Em | Em | C | B7'
const B = 'Am | Em | Am | B7 | C | D | Em C | B7'
const C = 'Em | F | Em | F | Am | B7 | C | B7'
const D = 'Em | D | C | B7 | Em | D | C | B7'

const melA = `E5:4. B4:8 E5:8 F#5:8 G5:8 A5:8 | B5:4. A5:8 G5:8 F#5:8 G5:8 E5:8 | E5:4. C5:8 E5:8 G5:8 C6:8 B5:8 | A5:4. F#5:8 D5:4 A4:4 |
  E5:4. B4:8 E5:8 F#5:8 G5:8 A5:8 | B5:4. A5:8 G5:8 A5:8 B5:8 D6:8 | E6:4. D6:8 C6:8 B5:8 A5:8 G5:8 | F#5:4 D#5:4 B4:4 A4:4`
const melB = `C6:8 B5:8 A5:8 E5:8 C6:8 B5:8 A5:8 E5:8 | B5:8 A5:8 G5:8 E5:8 B5:8 A5:8 G5:8 E5:8 | A5:8 C6:8 E6:8 C6:8 A5:8 E5:8 C5:8 E5:8 | D#6:4. B5:8 A5:4 F#5:4 |
  G5:8 E5:8 C5:8 E5:8 G5:8 C6:8 E6:8 C6:8 | F#5:8 D5:8 A4:8 D5:8 F#5:8 A5:8 D6:8 A5:8 | G5:4 E5:4 E5:8 G5:8 C6:4 | B5:4. A5:16 G5:16 F#5:4 D#5:4`
const melC = `E5:8 E5:8 -:8 F5:8 E5:8 -:8 B4:8 -:8 | F5:8 F5:8 -:8 G5:8 F5:8 -:8 C5:8 -:8 | G5:8 G5:8 -:8 A5:8 G5:8 -:8 E5:8 -:8 | A5:8 A5:8 -:8 C6:8 A5:8 -:8 F5:8 -:8 |
  E5:4 A5:4 C6:4 E6:4 | D#6:4 B5:4 F#5:4 D#5:4 | E5:8 G5:8 C6:8 G5:8 E6:8 C6:8 G5:8 E5:8 | F#5:8 A5:8 B5:8 D#6:8 F#6:8 D#6:8 B5:8 A5:8`
const melD = `G5:4. F#5:8 E5:4 B4:4 | F#5:4. E5:8 D5:4 A4:4 | E5:4. D5:8 C5:4 G5:4 | F#5:2 D#5:2 |
  B5:4. A5:8 G5:4 E5:4 | A5:4. G5:8 F#5:4 D5:4 | G5:4. F#5:8 E5:4 C5:4 | B4:8 D#5:8 F#5:8 A5:8 B5:8 A5:8 F#5:8 D#5:8`

const beat = 'k:8 h:8 s:8 h:8 k:8 k:8 s:8 h:8'
const fill = 'k:8 h:8 s:8 k:8 s:16 s:16 s:16 s:16 t:16 t:16 tl:16 tl:16'
const dr8 = `(${beat})x7 ${fill}`
const drC = `(k:8 k:8 s:8 k:8 k:8 k:8 s:8 m:8)x7 ${fill}`

export const battle_wild: SongDef = {
  id: 'battle_wild',
  title: 'Wild Encounter',
  mood: 'driving, tense, fast arps',
  key: 'E minor',
  bpm: 152,
  gain: 1,
  echo: { beats: 0.5, feedback: 0.2, wet: 0.18 },
  channels: { p1: { inst: 'lead' }, p2: { inst: 'broken' }, w: { inst: 'bass' } },
  chords: { intro: I, loop: `${A} | ${B} | ${C} | ${D}` },
  intro: {
    p1: 'E6:16 D#6:16 D6:16 C#6:16 C6:16 B5:16 A#5:16 A5:16 G#5:16 G5:16 F#5:16 F5:16 E5:8 -:8 | B4:8 B4:8 -:8 B4:8 D#5:8 -:8 F#5:8 A5:8',
    p2: '@arpfast -:2. E4^037:8 -:8 | B3^47a:8 B3^47a:8 -:8 B3^47a:8 B3^47a:8 -:8 B3^47a:4',
    w: 'E3:2. E2:8 -:8 | B2:8 B2:8 -:8 B2:8 B2:8 -:8 B2:8 B2:8',
    n: 's:16 s:16 s:16 s:16 s:16 s:16 s:16 s:16 s:16 s:16 s:16 s:16 c:8 -:8 | k:8 k:8 -:8 k:8 k:8 -:8 s:16 s:16 s:16 s:16',
  },
  loop: {
    p1: `${melA} | ${melB} | ${melC} | ${melD}`,
    p2: `${comp(A, 'up16', { center: 'E4', v: 10 })} | ${comp(B, 'up16', { center: 'E4', v: 10 })} | ${comp(C, 'pulse8', { center: 'E4', v: 10, inst: 'arpfast' })} | ${comp(D, 'up16', { center: 'E4', v: 10, inst: 'broken' })}`,
    w: `${bassLine(A, 'oct8', { center: 'E2' })} | ${bassLine(B, 'oct8', { center: 'E2' })} | ${bassLine(C, 'drive16', { center: 'E2' })} | ${bassLine(D, 'oct8', { center: 'E2' })}`,
    n: `${dr8} | ${dr8} | ${drC} | ${dr8}`,
  },
}
