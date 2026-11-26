// Focus stack: every widget ticks each frame (animation), only the top one reads input.

export interface Widget {
  /** Every frame (animations). */
  tick(): void
  /** Only when this widget is on top of the stack. */
  input(): void
  /** Set true when finished; the stack drops it. */
  done?: boolean
}

export class WidgetStack {
  private list: Widget[] = []

  push<T extends Widget>(w: T): T {
    this.list.push(w)
    return w
  }

  remove(w: Widget): void {
    this.list = this.list.filter((x) => x !== w)
  }

  get top(): Widget | undefined {
    return this.list[this.list.length - 1]
  }

  get size(): number {
    return this.list.length
  }

  has(w: Widget): boolean {
    return this.list.includes(w)
  }

  /** Call once per frame from the owning scene's update(). */
  update(): void {
    const top = this.top
    for (const w of [...this.list]) w.tick()
    if (top && !top.done && this.list.includes(top)) top.input()
    this.list = this.list.filter((w) => !w.done)
  }
}
