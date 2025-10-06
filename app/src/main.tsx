import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { getMessaging, getToken } from "firebase/messaging";
import { initializeApp } from "firebase/app";
import { registerDeviceToken, registerSchedule, removeDeviceToken } from "./api/ncloud-api";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_API_KEY,
    authDomain: import.meta.env.VITE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_APP_ID,
    measurementId: import.meta.env.VITE_MEASUREMENT_ID,
};
  
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

async function setupAlarm(): Promise<void> {
    const permission = await Notification.requestPermission();
    if (permission === "denied") {
      console.log("알림 권한 허용 안됨");
      return;
    }

    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_VAPID_KEY,
    });
  
    if (localStorage.getItem("token") === token) return;

    await removeDeviceToken(import.meta.env.VITE_USER_ID);
    const isOk = await registerDeviceToken(import.meta.env.VITE_USER_ID, token);

    if (isOk) {
      registerSchedule(import.meta.env.VITE_SCHEDULE_CODE);
      localStorage.setItem("token", token);
    }
}

// 앱 시작 시 알림 설정 초기화
setupAlarm();

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
