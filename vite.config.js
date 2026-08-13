import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Custom service worker so we can handle Web Push + notification clicks.
      // Workbox precaching is wired inside src/sw.js via self.__WB_MANIFEST.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      injectRegister: null, // we register manually in main.jsx (need the registration object)
      includeAssets: ['logo.svg', 'apple-touch-icon.png', 'robots.txt'],
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      },
      manifest: {
        name: 'Lanchonete Rodrigues',
        short_name: 'Rodrigues',
        description: 'Espetinho e jantinha — peça pelo app e acompanhe em tempo real.',
        lang: 'pt-BR',
        dir: 'ltr',
        theme_color: '#f5a800',
        background_color: '#1a1206',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        categories: ['food', 'shopping', 'lifestyle'],
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'Ver cardápio', short_name: 'Cardápio', url: '/' },
          { name: 'Meus pedidos', short_name: 'Pedidos', url: '/pedidos' },
          { name: 'Painel do gestor', short_name: 'Gestor', url: '/gestor' },
        ],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
})
