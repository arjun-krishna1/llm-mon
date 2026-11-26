// Area-name banner: slides down from the top-left, holds, slides back up.

import Phaser from 'phaser'
import { FONT } from '../config'
import { params } from '../params'
import { PxText, measure } from './text'
import { Window } from './Window'

export class Banner {
  private scene: Phaser.Scene
  private win?: Window
  private text?: PxText
  private t = 0
  private holdFrames = 150
  private slide = 10
  private h = 24

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  show(name: string): void {
    this.clear()
    const w = Math.max(72, measure(this.scene, FONT.dialog, name) + 24)
    this.win = new Window(this.scene, 3, -this.h, w, this.h, 'ui/frame_menu').setDepth(900)
    this.text = new PxText(this.scene, 3 + Math.floor((w - measure(this.scene, FONT.dialog, name)) / 2), 0, name)
      .setDepth(901).setScrollFactor(0)
    this.t = 0
    this.place()
  }

  get visible(): boolean {
    return !!this.win
  }

  private place(): void {
    if (!this.win || !this.text) return
    const s = params.fast ? 1 : this.slide
    let k: number
    if (this.t < s) k = this.t / s
    else if (this.t < s + this.holdFrames) k = 1
    else k = 1 - (this.t - s - this.holdFrames) / s
    k = Math.max(0, Math.min(1, k))
    const y = Math.round(-this.h + (this.h + 3) * k)
    this.win.setPosition(3, y)
    this.text.setPosition(this.text.x, y + 6)
  }

  tick(): void {
    if (!this.win) return
    this.t++
    this.place()
    if (this.t > (params.fast ? 2 : this.slide * 2) + this.holdFrames) this.clear()
  }

  clear(): void {
    this.win?.destroy()
    this.text?.destroy()
    this.win = undefined
    this.text = undefined
  }
}
