// LLMMON types are the labs that make the models, plus `classic` (basic moves and
// historic/component creatures: Perceptron, SGD...) and `glitch` (HalluciHound,
// Team Overfit). Ids are lowercase single words and double as the art chip ids
// (public/assets/game/ui/type_<id>.png).
//
// The lab chart is a perfectly even web: every lab beats exactly two labs and is
// beaten by exactly two. The only rule to learn: if A beats B, A's moves are super
// effective on B and B's moves are not very effective on A. Nothing else.
//
// Starter triangle: anthropic > zhipu > openai > anthropic
//   (Claude Fable > GLM > GPT 5.5 > Claude Fable)
//
// Adding a lab later (meta, xai, alibaba, microsoft...) without rebalancing: pick two
// arrows A > B and C > D from LAB_BEATS (four different labs, none of them already
// related to the newcomer) and replace them with A > X > B and C > X > D. X then
// beats two and loses to two, and every existing lab keeps its own two-and-two.

export const LAB_TYPE_IDS = ['anthropic', 'openai', 'google', 'zhipu', 'deepseek', 'mistral', 'moonshot', 'cohere'] as const
export const TYPE_IDS = [...LAB_TYPE_IDS, 'classic', 'glitch'] as const
export type LabTypeId = (typeof LAB_TYPE_IDS)[number]
export type TypeId = (typeof TYPE_IDS)[number]

export interface TypeInfo {
  id: TypeId
  /** Proper display name ("OpenAI"). */
  name: string
  /** 3-letter code for small pills ("OAI"). */
  short: string
  /** Chip fill colour (hex): the mid tone of the palette ramp in tools/art/sprites/ui.py TYPE_RAMPS. */
  color: string
  blurb: string
}

export const TYPES: Record<TypeId, TypeInfo> = {
  anthropic: { id: 'anthropic', name: 'Anthropic', short: 'ANT', color: '#d0642a', blurb: 'Claude models: careful, thoughtful, very good at long answers.' },
  openai: { id: 'openai', name: 'OpenAI', short: 'OAI', color: '#2a9490', blurb: 'GPT models: all-rounders that reach for the right tool.' },
  google: { id: 'google', name: 'Google', short: 'GGL', color: '#3f6cc0', blurb: 'Gemini and Gemma: huge context and sharp multimodal eyes.' },
  zhipu: { id: 'zhipu', name: 'Zhipu', short: 'ZHP', color: '#6c54bc', blurb: 'GLM models: graph-minded reasoners with open weights.' },
  deepseek: { id: 'deepseek', name: 'DeepSeek', short: 'DSK', color: '#40507c', blurb: 'DeepSeek models: deep thinkers, cheap to run, sturdy.' },
  mistral: { id: 'mistral', name: 'Mistral', short: 'MST', color: '#e8b830', blurb: 'Mistral models: quick and breezy, straight from Paris.' },
  moonshot: { id: 'moonshot', name: 'Moonshot', short: 'MSH', color: '#58b257', blurb: 'Kimi models: long-horizon agents aiming high.' },
  cohere: { id: 'cohere', name: 'Cohere', short: 'COH', color: '#946240', blurb: 'Command models: tidy retrieval for busy offices.' },
  classic: { id: 'classic', name: 'Classic', short: 'CLS', color: '#84808e', blurb: 'Basic moves and the old building blocks of the field.' },
  glitch: { id: 'glitch', name: 'Glitch', short: 'GLT', color: '#c83c44', blurb: 'Hallucinations, corrupted caches and broken prompts.' },
}

export interface Matchup {
  attacker: LabTypeId
  defender: LabTypeId
  /** One tongue-in-cheek in-world reason (Notebook / PromptDex). */
  reason: string
}

/** The 16 arrows of the lab web. Each lab appears exactly twice as attacker and twice as defender. */
export const LAB_BEATS: Matchup[] = [
  { attacker: 'anthropic', defender: 'zhipu', reason: 'A good story beats a proof: GLM gets lost in the plot.' },
  { attacker: 'anthropic', defender: 'google', reason: 'Claude asks Gemini for a source, and Gemini stops to search.' },
  { attacker: 'openai', defender: 'anthropic', reason: "GPT fact-checks Claude's fable with a tool call mid-story." },
  { attacker: 'openai', defender: 'mistral', reason: 'Function calls cut straight through the wind.' },
  { attacker: 'google', defender: 'deepseek', reason: 'Search goes so deep it finds the bottom of any sea.' },
  { attacker: 'google', defender: 'moonshot', reason: 'A big telescope spots every moonshot before launch.' },
  { attacker: 'zhipu', defender: 'openai', reason: 'GLM maps the call graph before GPT finishes calling.' },
  { attacker: 'zhipu', defender: 'moonshot', reason: "GLM graphs the moon's orbit and waits where Kimi lands." },
  { attacker: 'deepseek', defender: 'openai', reason: 'It thinks out loud for so long GPT runs out of effort.' },
  { attacker: 'deepseek', defender: 'cohere', reason: 'A deep dive surfaces the answer before the rerank.' },
  { attacker: 'mistral', defender: 'zhipu', reason: 'A cool mistral breeze scatters the carefully drawn graph.' },
  { attacker: 'mistral', defender: 'deepseek', reason: 'Wind from Paris whips the deep water into waves.' },
  { attacker: 'moonshot', defender: 'anthropic', reason: 'Claude stops mid-sentence to admire the moon.' },
  { attacker: 'moonshot', defender: 'cohere', reason: 'Kimi reads every document before Command can sort them.' },
  { attacker: 'cohere', defender: 'mistral', reason: 'Clear commands: even the wind follows instructions.' },
  { attacker: 'cohere', defender: 'google', reason: "Rerank shuffles Google's results and it gets flustered." },
]

/** Every lab can fact-check a hallucination; glitch corrupts the plain classics. */
export const GLITCH_REASONS = {
  weakTo: 'Any real lab can fact-check a hallucination.',
  strongVs: 'Classic creatures have no guardrails against nonsense.',
}

function buildChart(): Record<TypeId, Partial<Record<TypeId, number>>> {
  const chart = Object.fromEntries(TYPE_IDS.map((t) => [t, {}])) as Record<TypeId, Partial<Record<TypeId, number>>>
  for (const { attacker, defender } of LAB_BEATS) {
    chart[attacker][defender] = 2
    chart[defender][attacker] = 0.5
  }
  for (const lab of LAB_TYPE_IDS) chart[lab].glitch = 2
  chart.glitch.classic = 2
  chart.glitch.glitch = 0.5
  return chart
}

/** Only non-1 entries. CHART[attacker][defender] = multiplier. */
const CHART = buildChart()

/** Multiplier of one attacking type against one defending type. */
export function typeMultiplier(attack: TypeId, defend: TypeId): number {
  return CHART[attack]?.[defend] ?? 1
}

/** Combined multiplier against the defender's types (species are single-typed today). */
export function effectiveness(attack: TypeId, defenderTypes: readonly TypeId[]): number {
  return defenderTypes.reduce((m, t) => m * typeMultiplier(attack, t), 1)
}

/** The in-world reason for an attacker/defender pair, either direction, or null. */
export function matchupReason(attack: TypeId, defend: TypeId): string | null {
  const m = LAB_BEATS.find((x) => (x.attacker === attack && x.defender === defend) || (x.attacker === defend && x.defender === attack))
  if (m) return m.reason
  if (defend === 'glitch' && attack !== 'classic' && attack !== 'glitch') return GLITCH_REASONS.weakTo
  if (attack === 'glitch' && defend === 'classic') return GLITCH_REASONS.strongVs
  return null
}

/** UI text for a multiplier, or null when nothing should be said. */
export function effectivenessText(multiplier: number): string | null {
  if (multiplier === 0) return "It doesn't seem to do anything..."
  if (multiplier > 1) return "It's super effective!"
  if (multiplier < 1) return "It's not very effective..."
  return null
}
