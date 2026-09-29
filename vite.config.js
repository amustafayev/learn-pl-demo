import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // The Interactive (H5P) block talks to the real H5P backend in
    // ./server (see server/README notes) — proxied here so the frontend
    // can call a same-origin relative path and never deal with CORS.
    // Only relevant to local dev; this proxy doesn't exist in production.
    // '/api' is the Go backend (../backend/lucid-backend, repo
    // learnin-pl-backend) — on 8081 because the H5P server owns 8080.
    proxy: {
      '/h5p': 'http://localhost:8080',
      '/api': 'http://localhost:8081',
    },
  },
})
