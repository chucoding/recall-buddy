import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const functionsUrl = mode === 'production' 
    ? env.VITE_FUNCTIONS_URL_PROD 
    : env.VITE_FUNCTIONS_URL_LOCAL;

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico'],
        manifest: {
          name: 'Today I Learned Alarm',
          short_name: 'TIL Alarm',
          description: '매일 학습한 내용을 정리하고 알림을 받는 앱',
          start_url: '/',
          display: 'standalone',
          background_color: '#ffffff',
          theme_color: '#121212',
          icons: [
            {
              src: 'favicon.ico',
              sizes: '64x64 32x32 24x24 16x16',
              type: 'image/x-icon'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,gif}']
        }
      })
    ],
    server: {
      open: true,
      proxy: {
        '/api': {
          target: functionsUrl,
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/api/, '')
        }
      }
    }
  };
});
