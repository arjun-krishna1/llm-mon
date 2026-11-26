// Exposes offline render/analysis helpers on window for automated checks.
import { SFX } from '../sfx.ts'
import { SONGS } from '../tracks/index.ts'
import { analyzeSong, noteDump, renderSfx, renderSong, sfxReport, songReport } from './render.ts'

;(window as unknown as { __audioTest: unknown }).__audioTest = {
  songs: Object.keys(SONGS),
  sfx: Object.keys(SFX),
  songReport,
  sfxReport,
  analyzeSong: (id: string) => analyzeSong(SONGS[id]),
  noteDump: (id: string) => noteDump(SONGS[id]),
  /** Render to 16-bit mono PCM, base64 (for offline inspection). */
  async pcm(kind: 'song' | 'sfx', id: string, sampleRate = 22050): Promise<string> {
    const buf = kind === 'song' ? (await renderSong(id, 1, sampleRate)).buf : await renderSfx(id, sampleRate)
    const a = buf.getChannelData(0)
    const b = buf.getChannelData(1)
    const out = new Int16Array(a.length)
    for (let i = 0; i < a.length; i++) out[i] = Math.max(-32768, Math.min(32767, ((a[i] + b[i]) / 2) * 32767))
    let s = ''
    const bytes = new Uint8Array(out.buffer)
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
    return btoa(s)
  },
}
document.title = 'Audio harness ready'
