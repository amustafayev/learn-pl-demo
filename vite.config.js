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
    proxy: {
      '/h5p': 'http://localhost:8080',
    },
  },
})
