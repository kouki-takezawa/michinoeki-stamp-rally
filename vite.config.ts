import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: '道の駅診断・スタンプラリー',
        short_name: '道の駅ラリー',
        description: '現在地から近い道の駅を提案し、訪問記録と制覇率を可視化するアプリ',
        theme_color: '#3c7a37',
        background_color: '#f5f2ec',
        display: 'standalone',
        lang: 'ja',
        icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
        shortcuts: [
          {
            name: '近くの道の駅',
            short_name: '近くの道の駅',
            url: '/?tab=nearby',
            icons: [{ src: '/icon.svg', sizes: 'any' }],
          },
          {
            name: 'マイページ',
            short_name: 'マイページ',
            url: '/?tab=mypage',
            icons: [{ src: '/icon.svg', sizes: 'any' }],
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,json}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'osm-tiles',
              expiration: { maxEntries: 1500, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],
})
