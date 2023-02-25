import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    VitePWA({ 
      registerType: 'autoUpdate',
      workbox:{
        runtimeCaching:[
          {
            handler:'StaleWhileRevalidate',
            urlPattern:/\.(mp3|json|mid)/,
            options: {
              cacheName: 'scores',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 180 * 24 * 60 * 60, // 180 days
              },
              cacheableResponse: {statuses: [0, 200]},
            },
          },
          {
            handler:'CacheFirst',
            urlPattern:/\.(js|ttf|png)/,
            options: {
              cacheName: 'assets',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 180 * 24 * 60 * 60, // 180 days
              },
              cacheableResponse:{statuses:[0,200]},
            },
          }
        ]
      }
    })
  ],
  define: {
    '__APP_VERSION__': JSON.stringify(process.env.npm_package_version),
  }
  // assetsInclude:['public/*.json','public/*.mp3']
})