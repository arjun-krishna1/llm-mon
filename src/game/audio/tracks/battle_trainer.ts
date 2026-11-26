import { bassLine, comp, riff } from '../compose.ts'
import type { SongDef } from '../song.ts'

// Trainer battle: heavier, more insistent. C minor (harmonic: G/G7, Neapolitan Db), 160 bpm.
// 4-bar intro, then A (8) B (8) C (8) A' (8).

const I = 'Cm | Cm | Ab | G'
const A = 'Cm | Ab | Bb | G | Cm | Ab | Fm | G7'
const B = 'Fm | Cm | Fm | G | Ab | Bb | Cm Ab | G7'
const C = 'Cm | Cm | Db | Db | Cm | Cm | Ab | G'

const melI = `C5:16 C5:16 C5:8 Eb5:16 Eb5:16 Eb5:8 F5:16 F5:16 F5:8 G5:4 | C6:16 C6:16 C6:8 Bb5:16 Bb5:16 Bb5:8 G5:16 G5:16 G5:8 Eb5:4 |
  Eb5:8 Ab5:8 C6:8 Eb6:8 C6:8 Ab5:8 Eb5:8 C5:8 | B4:8 D5:8 G5:8 B5:8 D6:4 -:4`
const melA = `G5:4. Eb5:8 C5:8 D5:8 Eb5:8 G5:8 | Ab5:4. F5:8 Eb5:8 C5:8 Eb5:8 Ab5:8 | Bb5:4. G5:8 F5:8 D5:8 F5:8 Bb5:8 | B5:4. G5:8 D5:4 B4:4 |
  C6:8 G5:8 Eb5:8 G5:8 C6:8 D6:8 Eb6:8 C6:8 | Ab5:8 Eb5:8 C5:8 Eb5:8 Ab5:8 Bb5:8 C6:8 Ab5:8 | F5:8 Ab5:8 C6:8 Ab5:8 F5:8 G5:8 Ab5:8 F5:8 |`
const endA1 = 'G5:8 B5:8 D6:8 F6:8 D6:4 B5:4'
const endA2 = 'G5:8 B5:8 D6:8 F6:8 D6:8 B5:8 G5:8 D5:8'
const melB = `C6:4. Bb5:8 Ab5:4 F5:4 | G5:4. F5:8 Eb5:4 C5:4 | Ab5:4. G5:8 F5:4 C5:4 | B4:4 D5:4 G5:4 B5:4 |
  C6:8 C6:8 -:8 C6:8 Eb6:8 -:8 C6:8 Ab5:8 | D6:8 D6:8 -:8 D6:8 F6:8 -:8 D6:8 Bb5:8 | Eb6:4 C6:4 C6:4 Ab5:4 | G5:8 G5:8 -:8 G5:8 B5:8 -:8 D6:8 F6:8`
const melC = `C5:8 -:8 C5:8 Eb5:8 -:8 C5:8 G5:4 | Bb5:8 -:8 G5:8 Eb5:8 -:8 C5:8 D5:4 | Db5:8 -:8 Db5:8 F5:8 -:8 Db5:8 Ab5:4 | Db6:8 -:8 Ab5:8 F5:8 -:8 Db5:8 Eb5:4 |
  C5:8 -:8 C5:8 Eb5:8 -:8 C5:8 G5:4 | Eb6:8 -:8 C6:8 G5:8 -:8 Eb5:8 C5:4 | Ab5:4 C6:4 Eb6:4 C6:4 | B5:4 D6:4 G5:4 B4:4`

// A': harmony a sixth/third below the tune, held per half bar
const harmA2 = `@harm v11 Eb5:2 G4:2 | C5:2 Ab4:2 | D5:2 Bb4:2 | D5:2 B4:2 | Eb5:2 G5:2 | C5:2 Eb5:2 | C5:2 Ab4:2 | B4:2 D5:2`

const beat = 'kk:8 h:8 s:8 h:8 kk:8 kk:8 s:8 h:8'
const fill = 'kk:8 h:8 s:8 kk:8 s:16 s:16 t:16 t:16 th:16 t:16 tl:16 tl:16'
const dr8 = `(${beat})x7 ${fill}`
const drC = `(kk:16 kk:16 -:8 s:8 kk:8 -:8 kk:8 s:8 m:8)x7 ${fill}`

export const battle_trainer: SongDef = {
  id: 'battle_trainer',
  title: 'Trainer Battle',
  mood: 'heavier, insistent',
  key: 'C minor',
  bpm: 160,
  gain: 0.88,
  echo: { beats: 0.5, feedback: 0.2, wet: 0.16 },
  channels: { p1: { inst: 'lead50' }, p2: { inst: 'arpfast' }, w: { inst: 'bass' } },
  chords: { intro: I, loop: `${A} | ${B} | ${C} | ${A}` },
  intro: {
    p1: melI,
    p2: `${riff('Cm | Cm', 'C:8 C:8 -:8 C:8', { center: 'G4', v: 9 })} | ${comp('Ab | G', 'pulse8', { center: 'G4', v: 9 })}`,
    w: bassLine(I, 'drive8', { center: 'C3' }),
    n: '(kk:8 kk:8 s:8 kk:8)x2 | (kk:8 kk:8 s:8 kk:8)x2 | (kk:8 h:8 s:8 h:8)x2 | s:16 s:16 s:16 s:16 t:16 t:16 tl:16 tl:16 c:4 s:8 s:8',
  },
  loop: {
    p1: `${melA} ${endA1} | ${melB} | ${melC} | ${melA} ${endA2}`,
    p2: `${comp(A, 'pulse8', { center: 'G4', v: 10 })} | ${comp(B, 'up16', { center: 'G4', v: 10, inst: 'broken' })} | ${comp(C, 'stab', { center: 'G4', v: 11, inst: 'arpfast' })} | ${harmA2}`,
    w: `${bassLine(A, 'drive16', { center: 'C3' })} | ${bassLine(B, 'oct8', { center: 'C3' })} | ${riff(C, 'R:16 R:16 O:16 R:16 R:16 R:16 F:16 R:16', { center: 'C3' })} | ${bassLine(A, 'drive16', { center: 'C3' })}`,
    n: `${dr8} | ${dr8} | ${drC} | ${dr8}`,
  },
}
