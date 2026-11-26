import { provideRpg, startGame } from '@rpgjs/client'
import { mergeConfig } from '@signe/di'
import configClient from '../config/config.client'
import startServer from '../server'

let runtimeStarted = false
let runtimePromise: Promise<void> | null = null

async function waitForRpgMount() {
  for (let attempts = 0; attempts < 60; attempts += 1) {
    if (document.body.querySelector('#rpg')) {
      return
    }

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve())
    })
  }

  throw new Error('RPGJS mount node #rpg was not available')
}

export async function startRpgRuntime() {
  if (runtimeStarted) {
    return runtimePromise
  }

  runtimeStarted = true
  runtimePromise = (async () => {
    await waitForRpgMount()
    await startGame(
      mergeConfig(configClient, {
        providers: [provideRpg(startServer)],
      }),
    )
  })()

  try {
    await runtimePromise
  } catch (error) {
    runtimeStarted = false
    runtimePromise = null
    throw error
  }
}
