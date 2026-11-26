import type { EventDefinition, RpgPlayer } from '@rpgjs/server'

export function ProfessorKarpathy(): EventDefinition {
  return {
    onInit() {
      this.setGraphic('professor')
    },
    onAction(player: RpgPlayer) {
      player.showText('The HalluciHound is glitching by Octavia 101. Pick a Prompt Orb and keep your context steady.')
    },
  }
}
