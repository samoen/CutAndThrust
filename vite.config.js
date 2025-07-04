import { defineConfig } from 'vite'

export default defineConfig({
  base: "",
  plugins: [
    {
      name: 'reloads',
      configureServer(server) {
        const { ws, watcher } = server
        watcher.on('change', file => {
          ws.send({
            type: 'full-reload'
          })
        })
      }
    }
  ]
})