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
      includeAssets: ['logo.svg', 'robots.txt'],
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      },
      manifest: {
        name: 'João Victor Barbershop',
        short_name: 'João Victor',
        description: 'Gestão da João Victor Barbershop — agenda, comissões e financeiro',
        lang: 'pt-BR',
        dir: 'ltr',
        theme_color: '#0ea5e9',
        background_color: '#0b1220',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        categories: ['business', 'productivity'],
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'Lançar atendimento', short_name: 'Lançar', url: '/lancar' },
          { name: 'Agenda', short_name: 'Agenda', url: '/agenda' },
          { name: 'Fila de espera', short_name: 'Fila', url: '/fila' },
        ],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
})
