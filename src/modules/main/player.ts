import type { RpgPlayer, RpgPlayerHooks } from '@rpgjs/server'

export const player: RpgPlayerHooks = {
  onConnected(player: RpgPlayer) {
    player.name = 'Arjun'
    player.setGraphic('hero')
    player.changeMap('simplemap', {
      x: 300,
      y: 300,
    })
  },
  onInput(player: RpgPlayer, { action }) {
    if (action === 'escape') {
      player.callMainMenu()
    }
  },
}
