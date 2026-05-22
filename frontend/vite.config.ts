import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'

// Dev proxy: /api → backend, /uploads → backend (Media Library files
// diserve oleh r.Static di Go). Production pakai nginx (lihat nginx.conf).
// Override backend URL via env VITE_BACKEND_URL kalau backend bukan di
// localhost:8080.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backend = env.VITE_BACKEND_URL || 'http://localhost:8088'
  return {
    plugins: [react()],
    server: {
      port: 5179,
      proxy: {
        '/api': { target: backend, changeOrigin: true },
        '/uploads': { target: backend, changeOrigin: true },
      },
    },
  }
})
