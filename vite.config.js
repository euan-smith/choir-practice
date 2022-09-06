import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    VitePWA({ 
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true
      },
      workbox:{
        runtimeCaching:[
          {
            handler:'StaleWhileRevalidate',
            urlPattern:/^.*\.(mp3|json)$/,
            options: {
              cacheName: 'scores',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 180 * 24 * 60 * 60, // 180 days
              },
            },
          },
          {
            handler:'CacheFirst',
            urlPattern:/^.*\.js$/,
            options: {
              cacheName: 'scores',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 180 * 24 * 60 * 60, // 180 days
              },
            },
          }
        ]
      }
    })
  ],
  // assetsInclude:['public/*.json','public/*.mp3']
})