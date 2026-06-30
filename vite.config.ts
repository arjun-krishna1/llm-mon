import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { rpgjs, tiledMapFolderPlugin } from '@rpgjs/vite'
import startServer from './src/server'

export default defineConfig({
  base: './',
  optimizeDeps: {
    include: ['pixi.js > @xmldom/xmldom'],
  },
  plugins: [
    tiledMapFolderPlugin({
      sourceFolder: './src/tiled',
      publicPath: '/map',
      buildOutputPath: 'assets/data',
    }),
    react(),
    ...rpgjs({
      server: startServer,
    }),
  ],
})
