import type { SongDef } from '../song.ts'
import { battle_rival } from './battle_rival.ts'
import { battle_trainer } from './battle_trainer.ts'
import { ending } from './ending.ts'
import { rival_encounter } from './rival_encounter.ts'
import { battle_wild } from './battle_wild.ts'
import { center } from './center.ts'
import { encounter_trainer } from './encounter_trainer.ts'
import { hayes_valley } from './hayes_valley.ts'
import { home } from './home.ts'
import { intro } from './intro.ts'
import { lab } from './lab.ts'
import { route_101 } from './route_101.ts'
import { soma_node } from './soma_node.ts'
import { title } from './title.ts'
import { victory } from './victory.ts'

/** Every music id in docs/VERTICAL_SLICE_PLAN.md §4.7, plus round-3 additions. */
export const SONGS: Record<string, SongDef> = {
  title,
  intro,
  hayes_valley,
  home,
  lab,
  route_101,
  soma_node,
  center,
  battle_wild,
  battle_trainer,
  victory,
  encounter_trainer,
  battle_rival,
  rival_encounter,
  ending,
}
