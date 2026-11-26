// Base for full-screen menus (party, summary, bag, card). Objects live in one
// container so destroy() is trivial. Subclasses implement input()/tick().

import Phaser from 'phaser'
import { PxText, type TextStyle } from '../text'
import type { Widget, WidgetStack } from '../WidgetStack'

export abstract class Screen<R = void> implements Widget {
  done = false
  readonly scene: Phaser.Scene
  readonly stack: WidgetStack
  readonly root: Phaser.GameObjects.Container
  private texts: PxText[] = []
  protected resolve?: (r: R) => void
  protected frame = 0

  constructor(scene: Phaser.Scene, stack: WidgetStack, depth = 2000) {
    this.scene = scene
    this.stack = stack
    this.root = scene.add.container(0, 0).setDepth(depth).setScrollFactor(0)
  }

  /** Push onto the stack and resolve when the screen closes. */
  run(): Promise<R> {
    this.stack.push(this)
    return new Promise((r) => (this.resolve = r))
  }

  protected text(x: number, y: number, s: string, style?: TextStyle): PxText {
    const t = new PxText(this.scene, x, y, s, style)
    this.root.add(t.objects())
    this.texts.push(t)
    return t
  }

  protected gfx(): Phaser.GameObjects.Graphics {
    const g = this.scene.add.graphics()
    this.root.add(g)
    return g
  }

  protected image(x: number, y: number, key: string, frame?: number | string): Phaser.GameObjects.Image {
    const i = this.scene.add.image(x, y, key, frame).setOrigin(0, 0)
    this.root.add(i)
    return i
  }

  tick(): void {
    this.frame++
  }

  abstract input(): void

  setVisible(v: boolean): void {
    this.root.setVisible(v)
  }

  close(r: R): void {
    this.done = true
    this.stack.remove(this)
    this.root.destroy(true)
    const res = this.resolve
    this.resolve = undefined
    res?.(r)
  }
}
