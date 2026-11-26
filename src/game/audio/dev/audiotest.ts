// Audition page: every music track and sfx with play buttons.
// Open /src/game/audio/dev/index.html in `npm run dev`, or call mountAudioTest()
// from the game entry when `?audiotest=1` is present (see docs/AUDIO.md).

import { audio } from '../index.ts'
import { SONGS } from '../tracks/index.ts'
import { SFX } from '../sfx.ts'
import { compileSong, songLengths } from '../song.ts'

export function mountAudioTest(root: HTMLElement = document.body): void {
  const style = document.createElement('style')
  style.textContent = `
    .at { font: 14px/1.4 system-ui, sans-serif; color: #e8e6f0; background: #14131c; padding: 16px; min-height: 100vh; box-sizing: border-box; }
    .at h1 { font-size: 18px; margin: 0 0 8px } .at h2 { font-size: 15px; margin: 18px 0 6px; color: #b9b4d6 }
    .at .grid { display: flex; flex-wrap: wrap; gap: 6px }
    .at button { background: #2a2840; color: #fff; border: 1px solid #4a4670; border-radius: 4px; padding: 6px 10px; cursor: pointer; font: inherit }
    .at button:hover { background: #3a3760 } .at button.on { background: #6a4fd8 }
    .at small { color: #9a96b5 } .at .row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin: 6px 0 }
    .at label { display: flex; gap: 6px; align-items: center }`
  document.head.appendChild(style)
  const el = document.createElement('div')
  el.className = 'at'
  root.appendChild(el)
  const status = document.createElement('div')
  el.innerHTML = '<h1>LLMMON audio test</h1><small>Click anywhere first to unlock audio. Tracks loop; jingles pause the music and resume it.</small>'
  el.appendChild(status)

  const controls = document.createElement('div')
  controls.className = 'row'
  const mv = slider('music', 0.8)
  const sv = slider('sfx', 0.9)
  const apply = () => audio.setVolume(+mv.input.value, +sv.input.value)
  mv.input.oninput = apply
  sv.input.oninput = apply
  const stop = button('Stop music', () => audio.stopMusic(400))
  const fade = document.createElement('label')
  const fadeIn = document.createElement('input')
  fadeIn.type = 'checkbox'
  fadeIn.checked = true
  fade.append(fadeIn, 'cross-fade')
  controls.append(mv.label, sv.label, stop, fade)
  el.appendChild(controls)

  const h2 = (t: string) => {
    const h = document.createElement('h2')
    h.textContent = t
    el.appendChild(h)
    const g = document.createElement('div')
    g.className = 'grid'
    el.appendChild(g)
    return g
  }
  const musicGrid = h2('Music')
  const musicButtons = new Map<string, HTMLButtonElement>()
  for (const [id, def] of Object.entries(SONGS)) {
    const c = compileSong(def)
    const l = songLengths(c)
    const b = button(`${id}`, () => {
      audio.unlock()
      audio.playMusic(id, { fadeMs: fadeIn.checked ? 600 : 0, restart: true })
    })
    b.title = `${def.title ?? id} — ${def.mood ?? ''}\n${def.key} ${def.bpm} bpm, intro ${c.introTicks / c.barTicks} bars + loop ${c.loopTicks / c.barTicks} bars (${l.loop.toFixed(1)} s)`
    musicGrid.appendChild(b)
    musicButtons.set(id, b)
  }
  const sfxGrid = h2('SFX (jingles marked ♪)')
  for (const [id, def] of Object.entries(SFX)) {
    sfxGrid.appendChild(
      button(def.jingle ? `♪ ${id}` : id, () => {
        audio.unlock()
        audio.sfx(id)
      }),
    )
  }
  const loopGrid = h2('Looping sfx')
  for (const id of ['exp', 'low_hp']) {
    let on = false
    const b = button(`${id} (loop)`, () => {
      audio.unlock()
      on = !on
      if (on) audio.sfxLoop(id)
      else audio.stopSfx(id)
      b.classList.toggle('on', on)
    })
    loopGrid.appendChild(b)
  }
  const stress = h2('Stress')
  stress.appendChild(
    button('text ×60 (typewriter)', () => {
      audio.unlock()
      let n = 0
      const t = setInterval(() => {
        audio.sfx('text')
        if (++n >= 60) clearInterval(t)
      }, 33)
    }),
  )

  setInterval(() => {
    status.textContent = `unlocked: ${audio.isUnlocked()} · now playing: ${audio.currentMusic() ?? '—'}`
    for (const [id, b] of musicButtons) b.classList.toggle('on', audio.currentMusic() === id)
  }, 200)
  window.addEventListener('pointerdown', () => audio.unlock(), { once: true })
}

function button(text: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button')
  b.textContent = text
  b.onclick = onClick
  return b
}

function slider(name: string, v: number) {
  const label = document.createElement('label')
  const input = document.createElement('input')
  input.type = 'range'
  input.min = '0'
  input.max = '1'
  input.step = '0.05'
  input.value = String(v)
  label.append(name, input)
  return { label, input }
}
