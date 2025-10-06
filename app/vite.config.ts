import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  // 환경변수 로드
  const env = loadEnv(mode, process.cwd(), '');
  
  // Firebase Functions URL 동적 생성
  const projectId = env.VITE_FIREBASE_PROJECT_ID || 'til-alarm';
  const region = env.VITE_FIREBASE_REGION || 'us-central1';
  
  const functionsUrl = {
    local: env.VITE_FUNCTIONS_URL_LOCAL || `http://localhost:5001/${projectId}/${region}`,
    prod: env.VITE_FUNCTIONS_URL_PROD || `https://${region}-${projectId}.cloudfunctions.net`
  };

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
          target: mode === 'production' ? functionsUrl.prod : functionsUrl.local,
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/api/, '')
        }
      }
    }
  };
});
