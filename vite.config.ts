/// <reference types="vitest" />
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Base path the build is served from. '/' for local dev & preview,
// '/winglink/' for the GitHub Pages deployment (set via VITE_BASE in CI).
const base = process.env.VITE_BASE || '/'

/**
 * Injects a <base href> so that every relative URL in the app
 * (seeded photography, avatars, …) resolves correctly no matter how deep
 * the current SPA route is (e.g. /winglink/profile/username).
 */
function baseHrefPlugin(appBase: string): Plugin {
  return {
    name: 'winglink-base-href',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const ogImage = process.env.OG_IMAGE || `${appBase}images/f22-sunset.jpg`
        return html.replaceAll('%BASE_HREF%', appBase).replaceAll('%OG_IMAGE%', ogImage)
      },
    },
  }
}

/**
 * Content-Security-Policy for production builds (static meta CSP).
 * Locks the app down: no inline scripts, no external origins, no plugins —
 * dramatically shrinking the XSS surface. Injected only at build time so the
 * dev server keeps HMR working.
 */
function cspPlugin(): Plugin {
  // Supabase origin (REST + auth + storage + realtime websocket) must be
  // allowlisted when the cloud backend is configured — otherwise the browser
  // silently blocks every backend call (CSP connect-src/img-src).
  let sbHost = ''
  return {
    name: 'winglink-csp',
    apply: 'build',
    configResolved(config) {
      const env = loadEnv(config.mode, process.cwd(), '')
      const url = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
      try {
        sbHost = url.startsWith('http') ? new URL(url).host : ''
      } catch {
        sbHost = ''
      }
    },
    transformIndexHtml(html) {
      const connect = ["'self'", ...(sbHost ? [`https://${sbHost}`, `wss://${sbHost}`] : [])].join(' ')
      const imgs = ["'self'", 'data:', 'blob:', ...(sbHost ? [`https://${sbHost}`] : [])].join(' ')
      const csp = [
        "default-src 'self'",
        "base-uri 'self'",
        "object-src 'none'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        `img-src ${imgs}`,
        "media-src 'self' data: blob:",
        "font-src 'self'",
        `connect-src ${connect}`,
        "form-action 'self'",
      ].join('; ')
      return html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />`)
    },
  }
}

export default defineConfig({
  base,
  plugins: [react(), baseHrefPlugin(base), cspPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
    port: 5173,
    allowedHosts: true,
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
    // Tests always run the local encrypted-vault mode, even if a developer
    // (or CI job env) has Supabase credentials in the environment.
    env: {
      VITE_SUPABASE_URL: '',
      VITE_SUPABASE_ANON_KEY: '',
    },
  },
})
