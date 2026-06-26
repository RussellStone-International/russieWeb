import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'ip-restrict',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const allowedIPs = ['197.155.50.6', '41.10.211.225', '156.155.28.43']
          const clientIP = req.headers['cf-connecting-ip'] || req.socket.remoteAddress

          if (!allowedIPs.includes(clientIP)) {
            res.statusCode = 403
            res.end('Access denied')
            return
          }
          next()
        })
      }
    }
  ],
  server: {
    allowedHosts: ["warm-diving-double-showed.trycloudflare.com"]
  }
})