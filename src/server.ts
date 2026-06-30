import { createServer, LocalStorageSaveStorageStrategy, provideSaveStorage, provideServerModules } from '@rpgjs/server'
import { provideTiledMap } from '@rpgjs/tiledmap/server'
import { provideMain } from './modules/main'

export default createServer({
  providers: [
    provideMain(),
    provideSaveStorage(new LocalStorageSaveStorageStrategy({ key: 'llmmon-save-v2' })),
    provideServerModules([]),
    provideTiledMap({ basePath: 'map' }),
  ],
})
