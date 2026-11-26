import { comp, riff } from '../compose.ts'
import type { SongDef } from '../song.ts'

// SoMa Node: the bigger town. Upbeat with techy 3-3-2 syncopation. A major, 128 bpm.
// A (8) B (8) Break (8).

const A = 'A | E/G# | F#m | D E | A | E/G# | F#m | Bm7 E'
const B = 'D | C#m | Bm | E | D | C#m F#m | Bm E | A'
const K = 'F#m | D | E | A | F#m | D | E | E7'

const melA = `E5:8 A5:8 -:16 E5:8. C#5:8 E5:16 A5:8. B5:8 | G#5:8. E5:16 -:8 B4:8 E5:8 F#5:8 G#5:8 B5:8 |
  A5:8. F#5:8. C#5:8 E5:8. C#5:8. A4:8 | F#5:8 F#5:16 F#5:16 A5:8 F#5:8 G#5:8 G#5:16 G#5:16 B5:8 G#5:8 |
  E5:8 A5:8 -:16 E5:8. C#5:8 E5:16 A5:8. B5:8 | G#5:8. E5:16 -:8 B4:8 E5:8 G#5:8 B5:8 E6:8 |
  C#6:8. A5:8. F#5:8 A5:8. F#5:8. C#5:8 | D5:8 F#5:8 A5:8 B5:8 G#5:4 -:8 E5:8`
const melB = `F#5:4. E5:16 D5:16 A4:4 D5:4 | E5:4. C#5:16 B4:16 G#4:4 C#5:4 | D5:4. C#5:16 B4:16 F#4:4 B4:4 | G#4:8 B4:8 E5:8 G#5:8 B5:4 -:4 |
  A5:8. F#5:16 -:8 D5:8 A5:8 B5:8 A5:8 F#5:8 | G#5:8. E5:16 -:8 C#5:8 A5:8. F#5:16 -:8 C#5:8 | B5:8 A5:8 F#5:8 D5:8 E5:8 G#5:8 B5:8 D6:8 | C#6:4 -:8 A5:16 A5:16 A5:4 -:4`
const blip = (a: string, b: string, c: string) => `${a}:16 -:16 ${b}:16 ${a}:16 -:16 ${c}:16 -:16 ${a}:16`
const melK = `@lead12 ${blip('F#5', 'C#5', 'A5')} G#5:8 A5:8 -:4 | ${blip('F#5', 'D5', 'A5')} E5:8 D5:8 -:4 | ${blip('G#5', 'E5', 'B5')} A5:8 B5:8 -:4 | C#6:8 B5:8 A5:8 E5:8 C#5:4 -:4 |
  ${blip('F#5', 'C#5', 'A5')} G#5:8 A5:8 -:4 | ${blip('F#5', 'D5', 'A5')} E5:8 D5:8 -:4 | ${blip('G#5', 'E5', 'B5')} B5:8 D6:8 -:4 | D6:8 B5:8 G#5:8 E5:8 D5:8 B4:8 G#4:8 B4:8 @lead`

const bassRiff = 'R:8. R:8. O:8 R:8. R:8. F:8'
const groove = 'k:8 h:16 h:16 s:8 h:16 k:16 -:16 k:16 h:8 s:8 h:16 h:16'
const grooveFill = 'k:8 h:16 h:16 s:8 h:16 k:16 -:16 k:16 s:16 s:16 t:16 t:16 tl:16 tl:16'
const drums = `(${groove})x7 ${grooveFill}`
const drumsK = `(k:8. k:16 -:8 k:8 s:8 h:16 h:16 m:8 h:8)x7 ${grooveFill}`

export const soma_node: SongDef = {
  id: 'soma_node',
  title: 'SoMa Node',
  mood: 'bigger town, upbeat, techy syncopation',
  key: 'A major',
  bpm: 128,
  gain: 1.32,
  echo: { beats: 0.75, feedback: 0.3, wet: 0.28 },
  channels: { p1: { inst: 'lead' }, p2: { inst: 'arp' }, w: { inst: 'bassstac' } },
  chords: { loop: `${A} | ${B} | ${K}` },
  loop: {
    p1: `${melA} | ${melB} | ${melK}`,
    p2: `${comp(A, 'stab', { center: 'A4', v: 10 })} | ${comp(B, 'up16', { center: 'A4', v: 9, inst: 'broken' })} | ${comp(K, 'up16', { center: 'E4', v: 10, inst: 'broken' })}`,
    w: `${riff(A, bassRiff, { center: 'A2' })} | ${riff(B, bassRiff, { center: 'A2' })} | ${riff(K, 'R:8 O:8 R:8 O:8', { center: 'A2' })}`,
    n: `${drums} | ${drums} | ${drumsK}`,
  },
}
