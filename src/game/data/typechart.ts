// LLMMON type system. 8 types, lowercase single-word ids (these are also the
// art chip ids: public/assets/game/ui/type_<id>.png).
//
// Starter triangle: myth > logic > tool > myth
//   (a good story beats a proof; reasoning outsmarts a tool loop; grounding with
//    tools debunks a myth)

export const TYPE_IDS = ['neutral', 'myth', 'logic', 'tool', 'speed', 'open', 'vision', 'glitch'] as const
export type TypeId = (typeof TYPE_IDS)[number]

export interface TypeInfo {
  id: TypeId
  name: string
  /** 3-letter abbreviation for tight HUDs. */
  short: string
  /** Suggested chip colour (hex) for the art/UI agents. Final colours come from tools/art/palette.py. */
  color: string
  blurb: string
}

export const TYPES: Record<TypeId, TypeInfo> = {
  neutral: { id: 'neutral', name: 'Neutral', short: 'NEU', color: '#a8a29a', blurb: 'Plain completions. No strengths, no weaknesses, mostly.' },
  myth: { id: 'myth', name: 'Myth', short: 'MYT', color: '#e08a3c', blurb: 'Stories, character and persuasion.' },
  logic: { id: 'logic', name: 'Logic', short: 'LOG', color: '#3fae8a', blurb: 'Proofs, graphs and careful reasoning.' },
  tool: { id: 'tool', name: 'Tool', short: 'TOL', color: '#3a8fd8', blurb: 'Function calls, search and getting things done.' },
  speed: { id: 'speed', name: 'Speed', short: 'SPD', color: '#f2c94c', blurb: 'Low latency, small footprints, quick answers.' },
  open: { id: 'open', name: 'Open', short: 'OPN', color: '#7bbf4a', blurb: 'Open weights: sturdy, forkable, community-patched.' },
  vision: { id: 'vision', name: 'Vision', short: 'VIS', color: '#b86fd6', blurb: 'Multimodal eyes that see the ground truth.' },
  glitch: { id: 'glitch', name: 'Glitch', short: 'GLT', color: '#d6456a', blurb: 'Hallucinations, corrupted caches and broken prompts.' },
}

/** Only non-1 entries are listed. CHART[attacker][defender] = multiplier. */
const CHART: Record<TypeId, Partial<Record<TypeId, number>>> = {
  neutral: {},
  myth: { logic: 2, open: 2, tool: 0.5, myth: 0.5 },
  logic: { tool: 2, glitch: 2, myth: 0.5, logic: 0.5 },
  tool: { myth: 2, speed: 2, logic: 0.5, open: 0.5 },
  speed: { vision: 2, glitch: 2, open: 0.5, speed: 0.5 },
  open: { tool: 2, speed: 2, vision: 0.5 },
  vision: { myth: 2, glitch: 2, speed: 0.5 },
  glitch: { logic: 2, vision: 2, neutral: 2, open: 0.5, glitch: 0.5 },
}

/** Multiplier of one attacking type against one defending type. */
export function typeMultiplier(attack: TypeId, defend: TypeId): number {
  return CHART[attack][defend] ?? 1
}

/** Combined multiplier against a (possibly dual-typed) defender: 0.25, 0.5, 1, 2 or 4. */
export function effectiveness(attack: TypeId, defenderTypes: readonly TypeId[]): number {
  return defenderTypes.reduce((m, t) => m * typeMultiplier(attack, t), 1)
}

/** UI text for a multiplier, or null when nothing should be said. */
export function effectivenessText(multiplier: number): string | null {
  if (multiplier === 0) return "It doesn't seem to do anything..."
  if (multiplier > 1) return "It's super effective!"
  if (multiplier < 1) return "It's not very effective..."
  return null
}
