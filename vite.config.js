import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // 기상청 API CORS 우회 (개발 환경에서만)
      '/api/kma': {
        target: 'http://apis.data.go.kr',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/kma/, ''),
      },
      // KPX SMP API CORS 우회
      '/api/kpx': {
        target: 'https://openapi.kpx.or.kr',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/kpx/, ''),
      },
    },
  },
})
