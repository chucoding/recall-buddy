import { initializeApp } from 'firebase/app';
import { getAuth, GithubAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: import.meta.env.VITE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_APP_ID,
  measurementId: import.meta.env.VITE_MEASUREMENT_ID,
};

// Firebase 앱 초기화
export const app = initializeApp(firebaseConfig);

// Auth 인스턴스 생성
export const auth = getAuth(app);

// GitHub 프로바이더 생성
export const githubProvider = new GithubAuthProvider();

// 스코프 설정 (필요한 GitHub 권한)
githubProvider.addScope('user:email');
githubProvider.addScope('read:user');
