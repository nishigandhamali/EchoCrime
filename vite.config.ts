import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// /api is the Express server (npm run server, or npm run dev:all for both)
export default defineConfig({ plugins: [react()], server: { port: 5173, proxy: { '/api': 'http://localhost:8787' } } })
