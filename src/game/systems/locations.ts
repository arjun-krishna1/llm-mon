// Town map data: every location on the 240×160 schematic, its region, and where fast
// travel (Attend) lands. Visiting is recorded automatically: entering a zone whose name
// matches a location's `zones` (or a map listed in `maps`) sets flag `visited_<id>`.
//
// CONTENT fills in the real arrival spawns as maps are built:
//   registerLocation({ ...location('menlo_park')!, map: 'menlo_park', spawn: 'center_door' })

import { state } from '../state'

export type RegionId = 'peninsula' | 'ontario' | 'northwest' | 'summit'
export type LocationKind = 'town' | 'route' | 'landmark' | 'dungeon'

export interface LocationDef {
  id: string
  name: string
  region: RegionId
  kind: LocationKind
  /** Marker position on the town map (px, 240×160 screen). */
  x: number
  y: number
  /** Zone names (as on the map's `zone` objects, case-insensitive) that count as being here. */
  zones?: string[]
  /** Map ids that count as being here (whole map). */
  maps?: string[]
  /** Fast-travel arrival (Attend); towns only. */
  map?: string
  spawn?: string
  facing?: 'down' | 'up' | 'left' | 'right'
  /** One line for the info bar. */
  blurb?: string
}

export interface RegionDef {
  id: RegionId
  name: string
  /** Landmass outline on the town map: polygon points (px). */
  shape: Array<[number, number]>
}

export const REGIONS: RegionDef[] = [
  { id: 'peninsula', name: 'THE PENINSULA', shape: [[28, 70], [52, 66], [66, 74], [70, 92], [84, 110], [94, 128], [86, 138], [66, 136], [52, 122], [40, 104], [30, 88]] },
  { id: 'northwest', name: 'THE NORTHWEST', shape: [[18, 22], [58, 18], [104, 22], [110, 40], [96, 54], [64, 58], [34, 54], [20, 42]] },
  { id: 'ontario', name: 'ONTARIO', shape: [[134, 52], [168, 42], [206, 46], [228, 62], [226, 96], [206, 118], [176, 122], [150, 110], [134, 88]] },
  { id: 'summit', name: 'THE SUMMIT', shape: [] },
]

/** Default table (STORY_BIBLE §4). Positions are schematic; `map`/`spawn` are filled where built. */
const LOCATIONS: LocationDef[] = [
  { id: 'summit', name: 'The Summit', region: 'peninsula', kind: 'landmark', x: 36, y: 74, blurb: 'The hill above Hayes Valley. Closed.' },
  { id: 'hayes_valley', name: 'Hayes Valley', region: 'peninsula', kind: 'town', x: 44, y: 82, zones: ['HAYES VALLEY'], map: 'overworld', spawn: 'home_door', facing: 'down', blurb: 'Home. Mom, and the professor’s lab.' },
  { id: 'route_101', name: 'Route 101', region: 'peninsula', kind: 'route', x: 48, y: 76, zones: ['ROUTE 101'], blurb: 'Tall grass between home and SoMa Node.' },
  { id: 'soma_node', name: 'SoMa Node', region: 'peninsula', kind: 'town', x: 54, y: 72, zones: ['SOMA NODE'], map: 'overworld', spawn: 'center_door', facing: 'down', blurb: 'Gradient Gym. The first Model Center.' },
  { id: 'caltrain', name: 'Caltrain Line', region: 'peninsula', kind: 'route', x: 56, y: 92, zones: ['CALTRAIN LINE'], blurb: 'Platforms south along the Peninsula.' },
  { id: 'sfo', name: 'SFO Terminal', region: 'peninsula', kind: 'landmark', x: 72, y: 90, zones: ['SFO TERMINAL'], blurb: 'Flights to Ontario.' },
  { id: 'menlo_park', name: 'Menlo Park', region: 'peninsula', kind: 'town', x: 62, y: 104, zones: ['MENLO PARK'], blurb: 'Bigram Gym. Benchmark Corp campus.' },
  { id: 'palo_alto', name: 'Palo Alto', region: 'peninsula', kind: 'town', x: 70, y: 116, zones: ['PALO ALTO'], blurb: 'Embedding Gym. The university library.' },
  { id: 'mountain_view', name: 'Mountain View', region: 'peninsula', kind: 'town', x: 80, y: 128, zones: ['MOUNTAIN VIEW'], blurb: 'Norm Gym. A stream through a tower.' },
  { id: 'toronto', name: 'Toronto', region: 'ontario', kind: 'town', x: 200, y: 98, zones: ['TORONTO'], blurb: 'Backprop Dojo. Snow and streetcars.' },
  { id: 'highway_401', name: 'Highway 401', region: 'ontario', kind: 'route', x: 176, y: 86, zones: ['HIGHWAY 401'], blurb: 'A long road west through the snow.' },
  { id: 'waterloo', name: 'Waterloo', region: 'ontario', kind: 'town', x: 152, y: 74, zones: ['WATERLOO'], blurb: 'Wave Tower. Geese with opinions.' },
  { id: 'seattle', name: 'Seattle', region: 'northwest', kind: 'town', x: 38, y: 36, zones: ['SEATTLE'], blurb: 'Attention Gym. Rain, ferries, coffee.' },
  { id: 'cascade_dc', name: 'Cascade Data Centre', region: 'northwest', kind: 'dungeon', x: 88, y: 30, zones: ['CASCADE DATA CENTRE'], blurb: 'Racks humming in the hills.' },
  { id: 'redmond', name: 'Redmond', region: 'northwest', kind: 'town', x: 66, y: 44, zones: ['REDMOND'], blurb: 'Token Works. Print shops and loading docks.' },
]

/** Lines between locations (routes / travel legs). `kind` changes the stroke. */
export interface LinkDef { from: string; to: string; kind?: 'road' | 'rail' | 'air' | 'ferry' }

export const LINKS: LinkDef[] = [
  { from: 'hayes_valley', to: 'route_101' }, { from: 'route_101', to: 'soma_node' }, { from: 'hayes_valley', to: 'summit' },
  { from: 'soma_node', to: 'caltrain', kind: 'rail' }, { from: 'caltrain', to: 'menlo_park', kind: 'rail' },
  { from: 'menlo_park', to: 'palo_alto', kind: 'rail' }, { from: 'palo_alto', to: 'mountain_view', kind: 'rail' },
  { from: 'caltrain', to: 'sfo' }, { from: 'sfo', to: 'toronto', kind: 'air' },
  { from: 'toronto', to: 'highway_401' }, { from: 'highway_401', to: 'waterloo' },
  { from: 'waterloo', to: 'seattle', kind: 'air' }, { from: 'seattle', to: 'redmond', kind: 'ferry' },
  { from: 'redmond', to: 'cascade_dc' }, { from: 'redmond', to: 'summit', kind: 'air' },
]

export function registerLocation(l: LocationDef): void {
  const i = LOCATIONS.findIndex((x) => x.id === l.id)
  if (i >= 0) LOCATIONS[i] = l
  else LOCATIONS.push(l)
}

export function registerLink(l: LinkDef): void {
  LINKS.push(l)
}

export function locations(): LocationDef[] {
  return LOCATIONS
}

export function location(id: string): LocationDef | undefined {
  return LOCATIONS.find((l) => l.id === id)
}

export function visitedFlag(id: string): string {
  return `visited_${id}`
}

export function visited(id: string): boolean {
  return state.flag(visitedFlag(id))
}

/** The location the player is in (by zone name, then map id). */
export function locationAt(mapId: string, zoneName: string): LocationDef | undefined {
  const z = zoneName.trim().toUpperCase()
  return LOCATIONS.find((l) => z && l.zones?.some((n) => n.toUpperCase() === z))
    ?? LOCATIONS.find((l) => l.maps?.includes(mapId))
}

/** Called by the overworld on every zone change: marks the location visited. Returns it. */
export function noteVisit(mapId: string, zoneName: string): LocationDef | undefined {
  const l = locationAt(mapId, zoneName)
  if (l && !visited(l.id)) state.setFlag(visitedFlag(l.id))
  if (l) state.setFlag('last_location', l.id)
  return l
}

/** Towns Attend can fly to: visited, with an arrival map. */
export function flyTargets(): LocationDef[] {
  return LOCATIONS.filter((l) => l.kind === 'town' && l.map && visited(l.id))
}
