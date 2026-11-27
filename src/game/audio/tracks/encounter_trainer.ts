import { bassLine } from '../compose.ts'
import type { SongDef } from '../song.ts'

// A trainer spots you: short, tense loop. A minor against a Phrygian Bb, 140 bpm.
// 1-bar sting, then an 8-bar loop.

const L = 'Am | Bb | Am | Bb | Am | Bb | Am | E7'

const mel = `A4:8 C5:8 E5:8 A4:8 C5:8 E5:8 A4:8 C5:8 | Bb4:8 D5:8 F5:8 Bb4:8 D5:8 F5:8 Bb4:8 D5:8 |
  A4:8 C5:8 E5:8 A4:8 C5:8 E5:8 A4:8 C5:8 | Bb4:8 D5:8 F5:8 Bb4:8 D5:8 F5:8 G5:8 F5:8 |
  E5:4. C5:8 A4:4 E5:4 | F5:4. D5:8 Bb4:4 F5:4 | E5:8 F5:8 E5:8 D5:8 C5:8 B4:8 C5:8 D5:8 | E5:4 G#5:4 B5:4 D6:4`
// tremolo pedal: common tones a fifth/third above the bass
const trem = `v9 (E4:16)x16 | (F4:16)x16 | (E4:16)x16 | (F4:16)x16 | (C4:16)x16 | (D4:16)x16 | (A3:16)x16 | (B3:16)x8 (D4:16)x8`

export const encounter_trainer: SongDef = {
  id: 'encounter_trainer',
  title: 'Eyes Meet!',
  mood: 'short, tense',
  key: 'A minor',
  bpm: 140,
  gain: 1.0,
  echo: { beats: 0.75, feedback: 0.25, wet: 0.2 },
  channels: { p1: { inst: 'lead' }, p2: { inst: 'pluck12' }, w: { inst: 'bass' } },
  chords: { intro: 'E7', loop: L },
  intro: {
    p1: 'E5:16 A5:16 E6:4. ~:8 -:4.',
    p2: 'v9 B4:16 E5:16 G#5:4. ~:8 -:4.',
    w: 'E2:8 E2:8 -:4 E2:8 E2:8 E2:8 E2:8',
    n: 'c:8 -:8 -:4 s:16 s:16 s:16 s:16 s:16 s:16 s:16 s:16',
  },
  loop: {
    p1: mel,
    p2: trem,
    w: bassLine(L, 'drive8', { center: 'A2' }),
    n: '(k:8 h:8 h:8 h:8 s:8 h:8 h:8 h:8)x7 k:8 h:8 s:8 h:8 s:16 s:16 s:16 s:16 t:16 t:16 tl:16 tl:16',
  },
}
