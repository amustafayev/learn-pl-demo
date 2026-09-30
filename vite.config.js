import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Two apps, one site: the teacher app (index.html, src/) at /, and the
// student app (student/index.html, student/src/) at /student/. Both share
// the design system, tokens and mock db in src/ — the student app imports
// them as `@app/…`.
const root = (p) => fileURLToPath(new URL(p, import.meta.url))

// A student-app deep link (/student/classes/…) opened directly must load the
// student app's page, not fall through to the teacher app's index.html.
// Page requests only: modules and assets (anything with an extension) pass.
function studentAppFallback() {
  const rewrite = (req, _res, next) => {
    const path = (req.url || '').split('?')[0]
    if (/^\/student(\/|$)/.test(path) && !/\.[a-z0-9]+$/i.test(path) && req.headers.accept?.includes('text/html')) {
      req.url = '/student/index.html'
    }
    next()
  }
  return {
    name: 'student-app-fallback',
    configureServer: (server) => { server.middlewares.use(rewrite) },
    configurePreviewServer: (server) => { server.middlewares.use(rewrite) },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), studentAppFallback()],
  resolve: {
    alias: { '@app': root('./src') },
  },
  build: {
    rolldownOptions: {
      input: { main: root('./index.html'), student: root('./student/index.html') },
    },
  },
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
