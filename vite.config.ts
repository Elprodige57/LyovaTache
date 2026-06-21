import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['lyova.svg'],
      manifest: {
        name: 'Lyova Tâches',
        short_name: 'Lyova',
        description: 'Gestion de tâches collaborative (Kanban) — Lyova Tech',
        lang: 'fr',
        theme_color: '#5b50e8',
        background_color: '#0c0c12',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        icons: [
          { src: '/lyova.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: '/lyova.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff,woff2}'],
        navigateFallback: '/index.html',
      },
      devOptions: { enabled: true },
    }),
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'supabase': ['@supabase/supabase-js'],
        },
      },
    },
  },
});
