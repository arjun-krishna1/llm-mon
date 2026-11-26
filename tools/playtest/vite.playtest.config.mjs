// Playtest build: identical to the game build, plus a read-only audio probe.
// It appends `window.__llmmonAudio = audio` to src/game/audio/index.ts and wraps
// playMusic/stopMusic/sfx to log calls into window.__audioLog (no behaviour change).
import { defineConfig } from 'vite'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '../..')

export default defineConfig({
  root,
  base: './',
  build: { chunkSizeWarningLimit: 8000, emptyOutDir: true, minify: false }, // unminified: widget class names stay readable for the autopilot
  plugins: [{
    name: 'llmmon-audio-probe',
    transform(code, id) {
      if (!id.replace(/\\/g, '/').endsWith('src/game/audio/index.ts')) return null
      return code + `
;(() => {
  const w = window
  w.__llmmonAudio = audio
  w.__audioLog = []
  const t0 = performance.now()
  for (const k of ['playMusic', 'stopMusic', 'sfx']) {
    const f = audio[k].bind(audio)
    audio[k] = (...a) => { w.__audioLog.push({ t: Math.round(performance.now() - t0), k, id: a[0] }); if (w.__audioLog.length > 5000) w.__audioLog.shift(); return f(...a) }
  }
})()
`
    },
  }],
})
