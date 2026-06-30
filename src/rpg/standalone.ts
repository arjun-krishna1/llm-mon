import { provideRpg, startGame } from '@rpgjs/client'
import { mergeConfig } from '@signe/di'
import configClient from '../config/config.client'
import startServer from '../server'

let runtimeStarted = false

export async function startRpgRuntime() {
  if (runtimeStarted) {
    return
  }

  runtimeStarted = true
  await startGame(
    mergeConfig(configClient, {
      providers: [provideRpg(startServer)],
    }),
  )
}
