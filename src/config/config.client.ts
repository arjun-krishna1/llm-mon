import { provideClientGlobalConfig, provideClientModules, Presets } from '@rpgjs/client'
import { provideTiledMap } from '@rpgjs/tiledmap/client'
import { provideMain } from '../modules/main'

export default {
  providers: [
    provideTiledMap({
      basePath: 'map',
    }),
    provideClientGlobalConfig(),
    provideMain(),
    provideClientModules([
      {
        spritesheets: [
          {
            id: 'hero',
            image: 'spritesheets/hero.png',
            ...Presets.RMSpritesheet(3, 4),
          },
          {
            id: 'professor',
            image: 'spritesheets/female.png',
            ...Presets.RMSpritesheet(3, 4),
          },
        ],
      },
    ]),
  ],
}
