# Audio

All music and sound effects are synthesized at runtime with WebAudio (no audio
files). Code lives in `src/game/audio/` and has no Phaser dependency.

| File | What |
| --- | --- |
| `index.ts` | Public API (`audio` singleton), music manager, scheduler, jingles, loops |
| `song.ts` | `SongDef` type, compiler, `SongPlayer` (lookahead scheduling, intro + loop) |
| `pattern.ts` | Note pattern parser (the text format below) |
| `compose.ts` | Helpers: chord charts → bass lines / accompaniment / riffs |
| `instruments.ts` | Instrument (ADSR, vibrato, arpeggio…) and drum-kit presets |
| `synth.ts` | Voices: pulse 12.5/25/50 %, triangle, 4-bit wave, LFSR noise (long + short period) |
| `sfx.ts` | Every sound effect + the jingles |
| `cries.ts` | Creature cries: parametric recipes, roster presets, hash fallback |
| `tracks/*.ts` | One file per music track; `tracks/index.ts` registers them |
| `dev/` | Audition page, offline render harness, static analysis |

## API

```ts
import { audio } from './game/audio'

audio.unlock()                       // call on first user input (also auto-installed on pointerdown/keydown)
audio.playMusic('route_101')         // cross-fades (600 ms default); no-op if already playing
audio.playMusic('battle_wild', { fadeMs: 0 })        // hard cut, so the intro sting hits
audio.playMusic('title', { restart: true })          // restart even if playing
audio.stopMusic(800)
audio.sfx('select')
audio.setVolume(0.8, 0.9)            // music, sfx (0..1)
```

Additions beyond the §4.7 contract:

| Method | |
| --- | --- |
| `isUnlocked(): boolean` | AudioContext is running |
| `currentMusic(): string \| null` | Playing id (or the one queued to resume after a jingle / waiting for unlock) |
| `sfxLoop(id)` / `stopSfx(id)` | Looping sfx. Intended for `exp` (rising EXP-fill tone; stop when the bar is full) and `low_hp` (alarm beeps). Idempotent. |
| `sfxDurationMs(id): number` | Length of an sfx/jingle — e.g. wait this long before continuing after `item_get` |
| `setMasterVolume(v)` | Master gain |
| `cry(speciesId, { pitch?, faint? })` | Creature cry (0.15-0.5 s). `pitch` multiplies frequency; `faint: true` = lower, ~1.45x slower, falling. Never throws. |
| `cryDurationMs(speciesId, opts?)` | Length of that cry |
| `cryIds` | Species with hand-tuned cries |
| `musicIds`, `sfxIds` | Registered ids |

Behaviour:

- Unknown ids: no-op + one `console.warn` per id.
- No WebAudio (SSR, Vitest/node): every call is a silent no-op.
- `playMusic` before unlock is remembered and starts on unlock. SFX before unlock are dropped.
- **Jingles** (`heal`, `item_get`, `key_item_get`, `level_up`) pause the music (80 ms fade),
  play on the sfx bus, then resume the music *where it was* with a 450 ms fade-in.
  `playMusic` during a jingle changes what resumes afterwards.
- Music ids beyond §4.7: `battle_rival` (rival fight; use `{fadeMs: 0}`), `rival_encounter`
  (rival walks up), `ending` (end card; slow reprise of the title theme).
- SFX ids beyond §4.7: `buy`, `phone` (two rings, ~1 s), `truck` (~1.25 s rumble + drive-off),
  `pc_on`, `pc_off`, `dex_register`. No separate catch fanfare: use `orb_catch` then `victory`.
- `victory` is a music track: 4-bar fanfare intro, then a looping vamp.
- Re-triggers of the same sfx within 25 ms are dropped (`text` 40 ms, `bump` 120 ms,
  `grass` 50 ms), so calling `sfx('text')` per character is fine.
- Scheduling: `setInterval` every 25 ms schedules notes up to 200 ms ahead on the
  AudioContext clock (1.5 s while the tab is hidden, to survive timer throttling).

## Pattern format

Each channel of a section is one string of whitespace-separated tokens:

| Token | Meaning |
| --- | --- |
| `C4:8` | note C4, eighth note. Duration = 1/den of a whole note: `1 2 4 8 16 32`, triplets `3 6 12 24` |
| `F#5:4.` `Bb3:2+8` | dotted; summed durations |
| `E4` | duration omitted → previous duration |
| `-:4` | rest |
| `~:8` | tie: extend previous note |
| `C4>G4:4` | pitch slide over the note |
| `C4^47:2` | arpeggio C4 +0 +4 +7 (digits 0-9, `a`=10, `b`=11, `c`=12) — chiptune "chord" |
| `C4:8!` / `C4:8?` | accent (×1.25) / ghost (×0.55) |
| `k:8` | drum hit (noise channel): `k kk s sl h hs o c t tl th m` (see `DRUMS`) |
| `@lead` | switch instrument preset (see `INSTRUMENTS`) |
| `v12` | velocity 0-15 |
| `T+5` / `T0` | transpose following notes |
| `\|` | bar line — **checked**: a misplaced bar line throws with the tick offset |
| `( … )x4` | repeat group |

Channels: `p1` (pulse lead), `p2` (pulse harmony), `w` (wave: bass), `n` (noise: drums).
All channels of a section must have equal length (checked).

## Adding a track

```ts
// src/game/audio/tracks/my_town.ts
import { bassLine, comp } from '../compose.ts'
import type { SongDef } from '../song.ts'

const A = 'C | Am | F | G'            // chord chart: one bar per |, chords split the bar (or 'F:2. G:4')

export const my_town: SongDef = {
  id: 'my_town',
  key: 'C major',                     // used by the analyzer
  bpm: 120,                           // quarter notes per minute; sig: [6, 8] / [3, 4] supported
  echo: { beats: 0.75, feedback: 0.3, wet: 0.25 },
  channels: { p1: { inst: 'lead' }, p2: { inst: 'broken' }, w: { inst: 'bass' } },
  chords: { loop: A },
  intro: { /* optional; played once */ },
  loop: {
    p1: 'E5:4 G5:8 E5:8 C5:2 | A4:4 C5:4 E5:2 | F5:4. E5:8 C5:4 A4:4 | B4:2 D5:2',
    p2: comp(A, 'alberti8', { center: 'E4', v: 10 }),
    w: bassLine(A, 'rf', { center: 'C3' }),
    n: '(k:8 h:8 s:8 h:8 k:8 k:8 s:8 h:8)x4',
  },
}
```

Then add it to `tracks/index.ts`. **Always pass `mel`** (the melody text of the same bars) to
`comp()`: every accompaniment note is then checked against the sounding melody. A note that
would sit above the melody, or form a semitone, tritone or held major 2nd with it, is
re-voiced (another chord tone, an octave lower, fewer arpeggio tones) or replaced by a rest.
Accompaniment only ever uses triads, plus the minor 7th of 7th chords (`harmonyIvs`). Then
run the audit (below) and fix what it reports. Generators (`compose.ts`): `bassLine` styles
`hold q rf rf2 r5 oct8 drive8 drive16 stride8 walk waltz lilt`; `comp` styles
`alberti8 up8 up16 chord pulse8 stab guide waltz roll68`; `riff(chart, 'R:8. R:8. O:8 …')`
with `R F O T S C -` placeholders. They output plain pattern text (print them to hand-edit).

Then run the checks below. Mixing: keep `gain` such that loop RMS ≈ −22 dBFS and peak < 0.98.

## Creature cries

A cry is a `CryRecipe` (`cries.ts`): a base frequency plus a few timed parts.
- `{k:'t', w, at, dur, n, to?, g, vib?, arp?, hold?}` is a tone. `n`/`to` are semitones above the base.
- `{k:'n', type, at, dur, rate, g, hp?/lp?/bp?, sweepTo?}` is a noise burst.
- `crush` bit-crushes the whole cry. `gain` trims its level.

Presets: `claude_fable` (warm two-note chirp), `gpt_5_5` (rising arpeggio blip), `glm` (bell
triad falling), `hallucihound` (crushed growl with glitches), `gemma_4` (woody thump then a
chirp), `gpt_5_4_mini` (double beep), `mistral_medium` (whoosh then a yip), `gemini_flash`
(upward zip), `claude_haiku` (three-note figure).

Any other id gets `hashCry(id)`: an FNV hash seeds 2-3 notes with a rising, falling or arched
contour, a wave choice, optional vibrato and a noise tail. It is the same every time for the
same id. To add a preset, add an entry to `CRIES`. Then trim its `gain` until the render
peaks at about 0.25-0.4 (check with `__audioTest.cryReport(id)`).

## Auditioning

`npm run dev`, then open `/src/game/audio/dev/index.html` (all tracks, sfx, loops,
volume sliders, a typewriter stress test). To expose it from the game with
`?audiotest=1`, the entry point can do:

```ts
if (new URLSearchParams(location.search).has('audiotest')) {
  import('./game/audio/dev/audiotest').then((m) => m.mountAudioTest(document.body))
}
```

## Verification

- `dev/analyze.ts` — static checks per section: notes out of key (and whether they are
  chord tones), ranges, m2/M7 clashes between voices on strong beats (tritone vs. bass),
  bass vs. chord chart, melody non-chord tones at chord changes, repeated bars;
  `noteDump()` for piano rolls. Runs in Node: `node script.mjs` importing the `.ts` files.
- `dev/harness.html` + `dev/render.ts` — offline renders with `OfflineAudioContext` and
  reports peak, RMS, active length, loop-seam discontinuity (largest sample jump within
  ±5 ms of each seam vs. the 99.9th percentile jump of the whole render) and loop-pass
  envelope correlation. Drive with Playwright: `window.__audioTest.songReport(id)`,
  `.sfxReport(id)`, `.pcm(kind, id)`.

## Harmony rules

The owner listened and found some supporting voices grinding against the melody. Every
track now follows these rules, and `auditSong()` (`dev/analyze.ts`) checks them. It runs on
the fully expanded notes of p1 (melody), p2 (harmony) and w (bass): arpeggios expanded to
all their tones, notes that sustain across beats, the whole intro and loop, and the loop
seam. It checks every segment between note, beat and chord boundaries.

1. **No vertical grind between voices.** Semitones, major 7ths and minor 9ths (any octave)
   are errors. So is a tritone, unless it is the 3rd + 7th of a dominant 7th whose next
   chord is a 4th up. A major 2nd in the same octave may not be held longer than a 16th.
   The only exception is a melody passing or neighbour tone: weak position (not on a beat),
   shorter than an 8th, approached and left by step, and not attacked together with the
   voice it rubs against.
2. **Accompaniment and bass play chord tones on every beat.** A non-chord tone of an 8th
   or longer in the harmony is an error anywhere. The bass plays roots and 5ths on strong
   beats; approach notes only on the last 8th before a chord change. The melody's
   strong-beat notes are chord tones, or appoggiaturas/suspensions that resolve by step.
3. **The chart must match the melody.** If a bar's melody is mostly non-chord tones, fix
   the chart rather than bending the melody. Borrowed chords (bII, bVI, bVII, modal
   mixture) are fine only if every voice carries the alteration: no melody A over a chord
   containing Ab, no blue 3rd against a sounding major 3rd. A dominant 7th must resolve;
   otherwise write the triad. Phrases should end on a real cadence (V-I or IV-I) or a
   half cadence on V.
4. **Low register.** No 3rds or 6ths between two voices below C3. No 2nds or 7ths between
   the two lowest voices below C4.
5. **Spacing.** The harmony never goes above the melody while the melody sounds, and never
   below the bass. The generator never moves harmony below F3; keep bass centres around G2-Bb2. No sus
   chord left unresolved. No fixed-interval "melody minus a 3rd" harmony: harmony lines
   are written or fitted from chord tones.
6. **Timbre and engine.**
   - No vibrato on accompaniment instruments (`harm`, `tri`, the bass presets). Pulse
     detune stays at 5 cents or less, and never on bass.
   - Echo is fed by the melody only, with feedback ≤ 0.18 and wet ≤ 0.2 (`ECHO_MAX_*`).
     It is muted for one delay time at every chord change, so the previous chord never
     rings into the next.
   - Arpeggio "chords" only contain chord tones.
   - The brass scoop is ≤ 0.35 semitone.

### Running the audit

```sh
# symbolic audit of every track and jingle (Node strips the TS types itself)
node --input-type=module -e "
import { SONGS } from './src/game/audio/tracks/index.ts'
import { SFX } from './src/game/audio/sfx.ts'
import { auditSong } from './src/game/audio/dev/analyze.ts'
const all = { ...SONGS }
for (const [id, d] of Object.entries(SFX)) if (d.jingle) all['j_' + id] = d.jingle
for (const [id, def] of Object.entries(all)) {
  const r = auditSong(def)
  console.log(id, r.errors.length, 'errors', r.warnings.length, 'warnings')
  for (const e of r.errors) console.log('  ', e.at, e.rule, e.msg)
}"
```

Every track must report 0 errors. Warnings are reviewed by hand: borrowed chords that all
voices agree on, phrase-end cadences, and bars where the melody is half passing tones.

Roughness check: render pitched stems with
`__audioTest.pcm('song', id, 22050, mute)` (mute `['n']` for the mix,
`['p2','w','n']` for the melody alone, and so on). Then compute inter-voice roughness
per 100 ms with a Plomp-Levelt/Sethares model on the spectral peaks: R(mix) minus the sum
of R(each stem). This leaves out each pulse wave's own harmonic roughness and lists the
roughest moments by bar:beat with the sounding notes. The analysis scripts used for the
audit live outside the repo; the harness functions above are what they call.
