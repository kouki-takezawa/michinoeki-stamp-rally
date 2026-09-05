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
        globPatterns: ['**/*.{js,css,html,svg}'],
        // マイページ・設定・友達・駅詳細・ミニ地図など、初回起動時にまず使わない画面のチャンクは
        // インストール時の一括プリキャッシュから外す(初回起動時のダウンロード量を減らすため)。
        // 実際に開いたときはruntimeCachingのStaleWhileRevalidateで裏側からキャッシュされ、
        // 次回以降はオフラインでも表示できる
        globIgnores: [
          '**/MyPage-*.js',
          '**/FriendsScreen-*.js',
          '**/SettingsPanel-*.js',
          '**/StationDetail-*.js',
          '**/StationMap-*.js',
          '**/StampBook-*.js',
          '**/photos-*.js',
        ],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'osm-tiles',
              expiration: { maxEntries: 1500, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            // 道の駅の代表画像(公式サイトのCDN)。一度表示した駅はオフラインでも見られるようにする
            urlPattern: /^https:\/\/www\.michi-no-eki\.jp\/sites\/default\/files\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'station-photos',
              expiration: { maxEntries: 1300, maxAgeSeconds: 60 * 60 * 24 * 90 },
            },
          },
          {
            // globIgnoresで初回プリキャッシュから外した遅延読み込みチャンク。開いた時点で
            // キャッシュされるので、2回目以降の訪問やオフライン時にも表示できる
            urlPattern: /\/assets\/.*\.(?:js|css)$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'lazy-chunks',
              expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // 全国1,231件の道の駅データ(JSONだが静的importでJSにインライン化される)を
          // アプリ本体のロジックとは別チャンクに分離し、メインチャンクの解析コストを下げる
          if (id.includes('data/michinoeki.json')) return 'station-data'
        },
      },
    },
  },
})
