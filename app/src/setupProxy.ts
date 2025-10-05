// Vite에서는 vite.config.ts에서 프록시 설정을 처리하므로 이 파일은 참고용으로만 보관
// 실제 프록시 설정은 vite.config.ts에 있음

const proxyConfig = {
  '/question-generator': {
    target: import.meta.env.VITE_NCLOUD_HYPERCLOVAX_URL,
    changeOrigin: true
  }
};

export default proxyConfig;
