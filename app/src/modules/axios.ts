import axios from 'axios';

// Firebase Functions URL 설정
const FUNCTIONS_URL = import.meta.env.PROD 
  ? import.meta.env.VITE_FUNCTIONS_URL_PROD || `https://us-central1-${import.meta.env.VITE_FIREBASE_PROJECT_ID || 'til-alarm'}.cloudfunctions.net`
  : '/api'; // Vite 프록시 사용

// 기본 axios 인스턴스 생성
export const apiClient = axios.create({
  baseURL: FUNCTIONS_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터
apiClient.interceptors.request.use(
  (config) => {
    console.log(`API 요청: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API 요청 오류:', error);
    return Promise.reject(error);
  }
);

// 응답 인터셉터
apiClient.interceptors.response.use(
  (response) => {
    console.log(`API 응답: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('API 응답 오류:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default apiClient;
