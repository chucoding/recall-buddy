import React from 'react';
import ReactDOM from 'react-dom/client';
import Clarity from '@microsoft/clarity';
import App from './App';
import './index.css';

// Microsoft Clarity (히트맵·세션 녹화): 프로젝트 ID가 있을 때만 로드
const clarityId = import.meta.env.VITE_CLARITY_PROJECT_ID;
if (typeof clarityId === 'string' && clarityId.trim()) {
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.clarity.ms/tag/' + clarityId.trim();
  document.head.appendChild(script);
}

// PWA Service Worker 등록
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/firebase-messaging-sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
