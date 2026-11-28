// Notebook pages (ENGINE registry; CONTENT registers the pages). Two tabs:
//   build  — the eight lecture pages (one per gym)
//   safety — the safety-arc pages (SAFETY_ARC §3)
// A page is "found" once a script unlocks it (`s.unlockPage(id)`), saved as flag `nb_<id>`.
//
//   registerNotebookPage({ id: 'micrograd', tab: 'build', order: 1, title: 'Gradients',
//     lines: ['A network is a graph of tiny sums and products.', '...', '...'],
//     credit: 'Rumelhart, Hinton & Williams, 1986', source: 'micrograd (lecture 1)' })

import { state } from '../state'

export type NotebookTab = 'build' | 'safety'

export interface NotebookPage {
  id: string
  tab: NotebookTab
  /** Sort key inside the tab (page number). */
  order: number
  title: string
  /** Three short sentences (more are allowed but must fit the page). */
  lines: string[]
  /** "Credit: …" line (people / papers). */
  credit?: string
  /** Pointer to the source (lecture, paper, essay). */
  source?: string
}

const pages = new Map<string, NotebookPage>()

export function registerNotebookPage(p: NotebookPage): void {
  pages.set(p.id, { ...p, lines: [...p.lines] })
}

export function notebookPage(id: string): NotebookPage | undefined {
  return pages.get(id)
}

export function notebookPages(tab?: NotebookTab): NotebookPage[] {
  return [...pages.values()].filter((p) => !tab || p.tab === tab).sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
}

export function pageFlag(id: string): string {
  return `nb_${id}`
}

export function pageFound(id: string): boolean {
  return state.flag(pageFlag(id))
}

/** Mark a page found. Returns true if it was new. */
export function markPageFound(id: string): boolean {
  if (pageFound(id)) return false
  if (!pages.has(id)) console.warn(`[notebook] unlockPage('${id}'): no such page registered (flag set anyway)`)
  state.setFlag(pageFlag(id))
  return true
}

export function foundCount(tab?: NotebookTab): number {
  return notebookPages(tab).filter((p) => pageFound(p.id)).length
}
