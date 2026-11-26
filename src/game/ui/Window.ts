// 9-slice window built from a 24x24 frame (8px corners): ui/frame_dialog, ui/frame_menu, ui/frame_battle.

import Phaser from 'phaser'

export type FrameKey = 'ui/frame_dialog' | 'ui/frame_menu' | 'ui/frame_battle' | string

export class Window {
  readonly obj: Phaser.GameObjects.NineSlice
  constructor(scene: Phaser.Scene, x: number, y: number, w: number, h: number, frame: FrameKey = 'ui/frame_menu') {
    this.obj = scene.add.nineslice(Math.round(x), Math.round(y), frame, undefined, w, h, 8, 8, 8, 8)
    this.obj.setOrigin(0, 0)
    this.obj.setScrollFactor(0)
  }
  get x(): number {
    return this.obj.x
  }
  get y(): number {
    return this.obj.y
  }
  get width(): number {
    return this.obj.width
  }
  get height(): number {
    return this.obj.height
  }
  setPosition(x: number, y: number): this {
    this.obj.setPosition(Math.round(x), Math.round(y))
    return this
  }
  setSize(w: number, h: number): this {
    this.obj.setSize(w, h)
    return this
  }
  setDepth(d: number): this {
    this.obj.setDepth(d)
    return this
  }
  setVisible(v: boolean): this {
    this.obj.setVisible(v)
    return this
  }
  destroy(): void {
    this.obj.destroy()
  }
}
