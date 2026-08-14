import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Scoped to /checkin — "Add to Home Screen" only offers to install this
    // app while browsing under that path, and the installed icon always
    // opens straight to the door-staff scanner, not the public site.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['checkin-icons/apple-touch-icon.png'],
      // The whole site (admin/dashboard/public/checkin) ships as one JS
      // bundle — well over Workbox's 2MB default. Raising this precaches
      // the real bundle so the checkin app shell works offline; splitting
      // the checkin route into its own small chunk would be the tighter
      // fix, but isn't worth the churn under an event-day deadline.
      workbox: { maximumFileSizeToCacheInBytes: 6 * 1024 * 1024 },
      manifest: {
        name: 'NIA Check-In',
        short_name: 'NIA Check-In',
        description: 'Scan guest QR codes to check attendees in at the door.',
        start_url: '/checkin',
        scope: '/checkin/',
        display: 'standalone',
        theme_color: '#1a2b5e',
        background_color: '#ffffff',
        icons: [
          { src: '/checkin-icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/checkin-icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/checkin-icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
