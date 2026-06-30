import { defineModule } from '@rpgjs/common'
import type { RpgServer } from '@rpgjs/server'
import { ProfessorKarpathy } from './event'
import { player } from './player'

export default defineModule<RpgServer>({
  player,
  maps: [
    {
      id: 'simplemap',
      events: [
        {
          id: 'professor-karpathy',
          x: 420,
          y: 330,
          event: ProfessorKarpathy(),
        },
      ],
    },
  ],
})
