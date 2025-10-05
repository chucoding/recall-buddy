import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'logo192.png', 'logo512.png', 'til-alram.gif'],
      manifest: {
        name: 'Today I Learned Alarm',
        short_name: 'TIL Alarm',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#121212',
        icons: [
          { src: 'logo192.png', sizes: '192x192', type: 'image/png' },
          { src: 'logo512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,gif}']
      }
    })
  ],
  server: {
    proxy: {
      '/question-generator': {
        target: 'https://clovastudio.apigw.ntruss.com',
        changeOrigin: true,
        secure: true
      }
    }
  }
});
