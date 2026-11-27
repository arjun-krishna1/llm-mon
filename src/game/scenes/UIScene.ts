// UI scene: runs above Title/Intro/Overworld for the whole session. Owns the
// dialog box, choice menus, area banner, start menu and menu screens.
// Get it anywhere with `getUI(game)` (or `uiOf(scene)`).

import Phaser from 'phaser'
import { COLORS, FONT, H, W } from '../config'
import { controls } from '../controls'
import { audio } from '../audio'
import { state } from '../state'
import { ms, params } from '../params'
import { itemInfo } from '../adapters/monInfo'
import { DialogBox, type SayOptions } from '../ui/DialogBox'
import { ListMenu, type ListOptions } from '../ui/ListMenu'
import { WidgetStack } from '../ui/WidgetStack'
import { Banner } from '../ui/Banner'
import { PxText, expand } from '../ui/text'
import { Window } from '../ui/Window'
import { PartyScreen, type PartyOptions } from '../ui/screens/PartyScreen'
import { BagScreen, type BagOptions } from '../ui/screens/BagScreen'
import { PlayerCard } from '../ui/screens/PlayerCard'
import { SummaryScreen } from '../ui/screens/SummaryScreen'

export class UIScene extends Phaser.Scene {
  stack = new WidgetStack()
  dialog!: DialogBox
  banner!: Banner
  private fader!: Phaser.GameObjects.Rectangle
  private startCursor = 0
  menuOpen = false

  constructor() {
    super({ key: 'UI', active: false })
  }

  create(): void {
    this.dialog = new DialogBox(this, this.stack)
    this.banner = new Banner(this)
    this.fader = this.add.rectangle(0, 0, W, H, 0x000000).setOrigin(0, 0).setDepth(9000).setAlpha(0).setScrollFactor(0)
  }

  update(): void {
    controls.each(() => {
      this.stack.update()
      this.banner.tick()
    })
  }

  /** True while any dialog/menu is up (the overworld should not move the player). */
  get busy(): boolean {
    return this.stack.size > 0 || this.dialog.isBusy
  }

  // ---------------------------------------------------------------- dialog
  say(text: string, opts?: SayOptions): Promise<void> {
    return this.dialog.say(text, opts)
  }

  /** Prompt + choice list. Resolves with the index (B → last option, or `cancelIndex`). */
  async ask(prompt: string, options: string[], o: ListOptions & SayOptions = {}): Promise<number> {
    await this.dialog.say(prompt, { ...o, keepOpen: true })
    const m = new ListMenu(this, this.stack, options.map((label) => ({ label })), {
      cancelIndex: options.length - 1, minW: 48, ...o,
    })
    const r = await m.result()
    this.dialog.release()
    return r
  }

  async yesNo(prompt: string, o: SayOptions = {}): Promise<boolean> {
    return (await this.ask(prompt, ['YES', 'NO'], o)) === 0
  }

  /** A bare list menu (no prompt). */
  choose(options: string[], o: ListOptions = {}): Promise<number> {
    const m = new ListMenu(this, this.stack, options.map((label) => ({ label })), { cancelIndex: options.length - 1, ...o })
    return m.result()
  }

  showBanner(name: string): void {
    this.banner.show(name)
  }

  // ---------------------------------------------------------------- fades
  /** Fade the whole screen (above all scenes below UI) to black (1) or clear (0). */
  fade(to: 0 | 1, duration = 200): Promise<void> {
    const d = ms(duration)
    return new Promise((res) => {
      if (d <= 0) {
        this.fader.setAlpha(to)
        res()
        return
      }
      this.tweens.add({ targets: this.fader, alpha: to, duration: d, onComplete: () => res() })
    })
  }

  /** Full-screen colour flash (in and out). */
  flash(color = 0xffffff, duration = 200): Promise<void> {
    const d = ms(duration)
    if (!d) return Promise.resolve()
    const r = this.add.rectangle(0, 0, W, H, color).setOrigin(0, 0).setDepth(8999).setAlpha(0).setScrollFactor(0)
    return new Promise((res) => this.tweens.add({
      targets: r, alpha: 0.9, duration: d / 2, yoyo: true, onComplete: () => {
        r.destroy()
        res()
      },
    }))
  }

  /** Battle intro: two white flashes, then horizontal blinds close to black. Leaves the screen black. */
  async battleTransition(): Promise<void> {
    if (params.fast) {
      this.fader.setAlpha(1)
      return
    }
    await this.flash(0xffffff, 140)
    await this.flash(0xffffff, 140)
    const g = this.add.graphics().setDepth(8998).setScrollFactor(0)
    const bands = 10
    const bh = H / bands
    await new Promise<void>((res) => {
      const t = { k: 0 }
      this.tweens.add({
        targets: t, k: 1, duration: 520, ease: 'Sine.In',
        onUpdate: () => {
          g.clear()
          g.fillStyle(0x000000)
          for (let i = 0; i < bands; i++) {
            const w = Math.round(W * Math.min(1, t.k * 1.15 - (i % 2) * 0.08))
            if (w <= 0) continue
            if (i % 2 === 0) g.fillRect(0, i * bh, w, bh)
            else g.fillRect(W - w, i * bh, w, bh)
          }
        },
        onComplete: () => res(),
      })
    })
    this.fader.setAlpha(1)
    g.destroy()
  }

  // ---------------------------------------------------------------- start menu
  async openStartMenu(): Promise<void> {
    if (this.menuOpen) return
    this.menuOpen = true
    audio.sfx('menu_open')
    try {
      for (;;) {
        const opts: Array<{ label: string; id: string }> = []
        if (state.party.length) opts.push({ label: 'LLMMON', id: 'party' })
        opts.push({ label: 'BAG', id: 'bag' }, { label: state.playerName.toUpperCase(), id: 'card' },
          { label: 'SAVE', id: 'save' }, { label: 'EXIT', id: 'exit' })
        const m = new ListMenu(this, this.stack, opts, {
          x: W - 2, y: 2, anchor: 'tr', minW: 72, initial: Math.min(this.startCursor, opts.length - 1),
          cancelIndex: opts.length - 1, persist: true, startCancels: true,
        })
        const i = await m.result()
        // remember where the cursor was (B/START close keeps it; it never jumps to EXIT)
        this.startCursor = Math.max(0, m.selected)
        const id = opts[i]?.id ?? 'exit'
        if (id === 'exit') {
          m.destroy()
          return
        }
        if (id === 'save') {
          m.destroy()
          await this.saveFlow()
          return
        }
        await this.fade(1, 120)
        m.destroy()
        if (id === 'party') await this.withFade(new PartyScreen(this, this.stack, { mode: 'view' }).run())
        else if (id === 'bag') await this.withFade(new BagScreen(this, this.stack, { mode: 'view' }).run())
        else if (id === 'card') await this.withFade(new PlayerCard(this, this.stack).run())
      }
    } finally {
      this.menuOpen = false
      controls.consumeAll()
    }
  }

  /** Fade in on a just-opened screen, wait for it to close, fade back to the menu. */
  private async withFade<T>(p: Promise<T>): Promise<T> {
    await this.fade(0, 120)
    const r = await p
    await this.fade(1, 120)
    await this.fade(0, 120)
    return r
  }

  openParty(o: PartyOptions = { mode: 'view' }): Promise<number> {
    return new PartyScreen(this, this.stack, o).run()
  }
  openBag(o: BagOptions = { mode: 'view' }): Promise<string | null> {
    return new BagScreen(this, this.stack, o).run()
  }
  openSummary(index: number): Promise<number> {
    return new SummaryScreen(this, this.stack, index).run()
  }

  async saveFlow(): Promise<boolean> {
    const info = this.saveInfoWindow()
    const yes = await this.yesNo('Would you like to save the game?')
    if (!yes) {
      info.forEach((o) => o.destroy())
      return false
    }
    await this.say('Saving… Don’t turn off the power.', { keepOpen: true, silent: true })
    await new Promise((r) => this.time.delayedCall(params.fast ? 0 : 900, r))
    const ok = state.save()
    audio.sfx('save')
    info.forEach((o) => o.destroy())
    this.dialog.release()
    await this.say(ok ? '{player} saved the game!' : 'The save failed… (storage unavailable)')
    return ok
  }

  private saveInfoWindow(): Array<{ destroy(): void }> {
    const w = new Window(this, 2, 2, 120, 74, 'ui/frame_menu').setDepth(1050)
    const rows: Array<[string, string]> = [
      ['PLAYER', state.playerName],
      ['LLMMON', String(state.caught.length)],
      ['TIME', state.playTimeText()],
    ]
    const texts: PxText[] = [new PxText(this, 10, 7, mapTitle(), { color: COLORS.frame[1], shadowColor: COLORS.paper[0] }).setDepth(1051).setScrollFactor(0)]
    rows.forEach(([k, v], i) => {
      texts.push(new PxText(this, 10, 23 + i * 15, k, { font: FONT.mini, shadow: 'drop' }).setDepth(1051).setScrollFactor(0))
      const t = new PxText(this, 0, 20 + i * 15, v).setDepth(1051).setScrollFactor(0)
      t.setPosition(114 - t.width, 20 + i * 15)
      texts.push(t)
    })
    return [w, ...texts]
  }

  // ---------------------------------------------------------------- shop
  /** Token Mart flow: BUY / SELL / QUIT. */
  async shop(itemIds: string[], greeting = 'Welcome! How may I help you?'): Promise<void> {
    let first = true
    for (;;) {
      const c = await this.ask(first ? greeting : 'Is there anything else I can do for you?', ['BUY', 'SELL', 'SEE YA!'], { x: 2, y: H - 48, anchor: 'bl', minW: 72 })
      first = false
      if (c === 0) await this.buy(itemIds)
      else if (c === 1) await this.sell()
      else break
    }
    await this.say('Please come again!')
  }

  private moneyWindow(): Array<{ destroy(): void }> & { refresh?: () => void } {
    const w = new Window(this, 2, 2, 84, 34, 'ui/frame_menu').setDepth(1050)
    const t1 = new PxText(this, 10, 6, 'MONEY', { font: FONT.mini, shadow: 'drop' }).setDepth(1051).setScrollFactor(0)
    const t2 = new PxText(this, 10, 16, '').setDepth(1051).setScrollFactor(0)
    const refresh = () => {
      t2.setText(`$${state.money}`)
      t2.setPosition(78 - t2.width, 16)
    }
    refresh()
    const arr = [w, t1, t2] as Array<{ destroy(): void }> & { refresh?: () => void }
    arr.refresh = refresh
    return arr
  }

  private async buy(itemIds: string[]): Promise<void> {
    const money = this.moneyWindow()
    let idx = 0
    for (;;) {
      const items = itemIds.map((id) => ({ label: itemInfo(id).name, right: `$${itemInfo(id).price}` }))
      items.push({ label: 'CANCEL', right: '' })
      const list = new ListMenu(this, this.stack, items, { x: W - 2, y: 2, anchor: 'tr', w: 150, rows: 5, initial: idx, cancelIndex: items.length - 1, persist: true })
      const i = await list.result()
      idx = Math.max(0, i)
      if (i < 0 || i >= itemIds.length) {
        list.destroy()
        break
      }
      const info = itemInfo(itemIds[i])
      const max = Math.min(99, Math.floor(state.money / Math.max(1, info.price)))
      if (max < 1) {
        await this.say('You don’t have enough money.')
        list.destroy()
        continue
      }
      await this.say(`${info.name}? Certainly. How many would you like?`, { keepOpen: true })
      const n = await this.quantity(info.price, max)
      this.dialog.release()
      if (n > 0) {
        const ok = await this.yesNo(`${info.name}, and you want ${n}. That will be $${info.price * n}. OK?`)
        if (ok) {
          state.addMoney(-info.price * n)
          state.addItem(info.id, n)
          money.refresh?.()
          audio.sfx('stat_up') // short rising chime on a completed purchase / sale (select is swallowed by the YES press)
          await this.say('Here you are! Thank you!')
        }
      }
      list.destroy()
    }
    money.forEach((o) => o.destroy())
  }

  private async sell(): Promise<void> {
    const money = this.moneyWindow()
    for (;;) {
      const id = await this.openBag({ mode: 'choose' })
      if (!id) break
      const info = itemInfo(id)
      const price = Math.floor(info.price / 2)
      if (price <= 0 || info.isKey) {
        await this.say(`${info.name}? Oh, I can’t buy that.`)
        continue
      }
      await this.say(`${info.name}? How many would you like to sell?`, { keepOpen: true })
      const n = await this.quantity(price, state.itemCount(id))
      this.dialog.release()
      if (n > 0 && (await this.yesNo(`I can pay $${price * n}. Would that be OK?`))) {
        state.removeItem(id, n)
        state.addMoney(price * n)
        money.refresh?.()
        audio.sfx('stat_up') // short rising chime on a completed purchase / sale (select is swallowed by the YES press)
        await this.say(`Turned over the ${info.name} and received $${price * n}.`)
      }
    }
    money.forEach((o) => o.destroy())
  }

  /** Quantity picker (↑/↓ ±1, ←/→ ±10). Resolves 0 on cancel. */
  quantity(unitPrice: number, max: number): Promise<number> {
    return new Promise((res) => {
      const w = new Window(this, W - 2 - 96, H - 48 - 30, 96, 28, 'ui/frame_menu').setDepth(1150)
      const tn = new PxText(this, W - 92, H - 72).setDepth(1151).setScrollFactor(0)
      const tp = new PxText(this, 0, H - 72).setDepth(1151).setScrollFactor(0)
      let n = 1
      const render = () => {
        tn.setText(`×${String(n).padStart(2, '0')}`)
        tp.setText(`$${unitPrice * n}`)
        tp.setPosition(W - 12 - tp.width, H - 72)
      }
      render()
      const widget = {
        done: false,
        tick: () => {},
        input: () => {
          const prev = n
          if (controls.repeat('up')) n = n >= max ? 1 : n + 1
          else if (controls.repeat('down')) n = n <= 1 ? max : n - 1
          else if (controls.repeat('right')) n = Math.min(max, n + 10)
          else if (controls.repeat('left')) n = Math.max(1, n - 10)
          else if (controls.justPressed('A') || controls.justPressed('B')) {
            const ok = controls.justPressed('A')
            controls.consume('A', 'B')
            audio.sfx(ok ? 'select' : 'cancel')
            widget.done = true
            w.destroy()
            tn.destroy()
            tp.destroy()
            res(ok ? n : 0)
            return
          }
          if (n !== prev) {
            audio.sfx('select')
            render()
          }
        },
      }
      this.stack.push(widget)
    })
  }

  /** "{player} received X!" with jingle (key items: key_item_get). */
  async itemGet(itemId: string, count = 1, verb = 'received'): Promise<void> {
    const info = itemInfo(itemId)
    audio.sfx(info.isKey ? 'key_item_get' : 'item_get')
    await this.say(expand(`{player} ${verb} ${itemPhrase(info.name, count, info.isKey)}!`))
  }
}

/** "a Patch", "an Orb", "5 Prompt Orbs", "the Fast Tokens" (key items / plural-looking names take "the"). */
export function itemPhrase(name: string, count: number, isKey: boolean): string {
  if (count > 1) return `${count} ${pluralize(name)}`
  const pluralName = /[^s]s$/i.test(name)
  if (isKey || pluralName) return `the ${name}`
  return `${/^[aeiou]/i.test(name) ? 'an' : 'a'} ${name}`
}

export function pluralize(name: string): string {
  if (/[^s]s$/i.test(name)) return name
  if (/(s|x|z|ch|sh)$/i.test(name)) return `${name}es`
  if (/[^aeiou]y$/i.test(name)) return `${name.slice(0, -1)}ies`
  return `${name}s`
}

function mapTitle(): string {
  const ow = getOverworldName?.()
  return ow || 'LLMMON'
}

let getOverworldName: (() => string) | undefined
/** The overworld registers a callback so the save window can show the area name. */
export function setAreaNameProvider(fn: () => string): void {
  getOverworldName = fn
}

export function getUI(game: Phaser.Game): UIScene {
  return game.scene.getScene('UI') as UIScene
}
