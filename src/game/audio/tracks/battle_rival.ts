import { bassLine, comp, riff } from '../compose.ts'
import type { SongDef } from '../song.ts'

// Rival battle: energetic and cocky. F with major/minor swagger (blue-note Ab->A,
// borrowed Eb, Db, Bbm), 156 bpm. 2-bar sting, then A (8) B (8) C (8) A' (8).

const I = 'F5 | Db Eb'
const A = 'F5 | F5 | Eb | Bb | F5 | F5 | Db | C'
const B = 'Dm | Bb | Gm | C | Dm | Bb | Db Eb | C7'
const C = 'Bb | Bbm | F | F7 | Bb | Bbm | Db | C'

const melA = `F5:8 -:16 F5:16 Ab5:16 A5:16 -:8 C6:8 A5:8 F5:8 C5:8 | Eb6:8 C6:8 A5:8 C6:8 Eb6:8 F6:8 Eb6:8 C6:8 |
  Bb5:4. G5:8 Eb5:8 F5:8 G5:8 Bb5:8 | D6:4. C6:8 Bb5:4 F5:4 |
  F5:8 -:16 F5:16 Ab5:16 A5:16 -:8 C6:8 A5:8 F5:8 C5:8 | Eb6:8 C6:8 A5:8 C6:8 F6:4 Eb6:4 |
  Db6:8 Ab5:8 F5:8 Ab5:8 Db6:8 Eb6:8 F6:8 Db6:8 | E6:4 C6:4 G5:4 E5:4`
const melB = `A5:4. F5:8 D5:4 A5:4 | Bb5:4. F5:8 D5:4 F5:4 | G5:8 A5:8 Bb5:8 D6:8 G6:4 F6:4 | E6:4. D6:8 C6:4 G5:4 |
  A5:8 D6:8 F6:8 D6:8 A5:8 F5:8 D5:8 F5:8 | Bb5:8 D6:8 F6:8 D6:8 Bb5:8 F5:8 D5:8 F5:8 | F5:4 Ab5:4 G5:4 Bb5:4 | C6:8 C6:8 -:8 C6:8 E6:8 G6:8 Bb6:8 G6:8`
const melC = `D6:8 -:8 D6:8 -:8 F6:8 D6:8 -:4 | Db6:8 -:8 Db6:8 -:8 F6:8 Db6:8 -:4 | C6:8 A5:8 F5:8 A5:8 C6:8 F6:8 -:4 | Eb6:8 D6:8 C6:8 A5:8 F5:4 -:4 |
  D6:8 -:8 D6:8 -:8 F6:8 D6:8 -:4 | Db6:8 -:8 Db6:8 -:8 F6:8 Db6:8 -:4 | Ab5:4 Db6:4 F6:4 Ab6:4 | G6:4 E6:4 C6:4 G5:4`

const beat = 'k:8 o:8 s:8 h:8 k:16 k:16 h:8 s:8 o:8'
const fill = 'k:8 o:8 s:8 k:8 s:16 s:16 th:16 t:16 tl:16 tl:16 s:16 s:16'
const dr8 = `(${beat})x7 ${fill}`
const drC = `(k:8 -:8 s:8 -:8 k:8 k:8 s:8 -:8)x7 ${fill}`

export const battle_rival: SongDef = {
  id: 'battle_rival',
  title: 'Rival!',
  mood: 'energetic, cocky, major-minor swagger',
  key: 'F mixolydian',
  bpm: 156,
  gain: 0.99,
  echo: { beats: 0.5, feedback: 0.22, wet: 0.2 },
  channels: { p1: { inst: 'lead12' }, p2: { inst: 'arpfast' }, w: { inst: 'bass' } },
  chords: { intro: I, loop: `${A} | ${B} | ${C} | ${A}` },
  intro: {
    p1: 'F5:8 -:16 F5:16 Ab5:8 A5:8 C6:4 -:4 | Db6:8 C6:8 Ab5:8 F5:8 Eb6:8 Db6:8 Bb5:8 G5:8',
    p2: comp(I, 'pulse8', { center: 'F4', v: 10 }),
    w: 'F2:8 F2:8 -:8 F2:8 F3:4 -:4 | Db3:8 Db3:8 Db3:8 Db3:8 Eb3:8 Eb3:8 Eb3:8 Eb3:8',
    n: 'c:8 -:8 s:8 -:8 k:4 -:4 | k:8 k:8 s:8 k:8 s:16 s:16 s:16 s:16 t:16 t:16 tl:16 tl:16',
  },
  loop: {
    p1: `${melA} | ${melB} | ${melC} | @lead ${melA}`,
    p2: `${comp(A, 'pulse8', { center: 'F4', v: 10 })} | ${comp(B, 'up16', { center: 'F4', v: 10, inst: 'broken' })} | ${comp(C, 'stab', { center: 'F4', v: 11 })} | ${comp(A, 'up16', { center: 'F4', v: 10, inst: 'broken' })}`,
    w: `${riff(A, 'R:8 R:8 O:8 R:8 F:8 R:8 O:8 F:8', { center: 'F2' })} | ${bassLine(B, 'oct8', { center: 'F2' })} | ${bassLine(C, 'drive16', { center: 'F2' })} | ${riff(A, 'R:8 R:8 O:8 R:8 F:8 R:8 O:8 F:8', { center: 'F2' })}`,
    n: `${dr8} | ${dr8} | ${drC} | ${dr8}`,
  },
}
