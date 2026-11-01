/// <reference types="vitest" />
import { defineConfig, type Plugin } from 'vite'
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
        return html.replace('%BASE_HREF%', appBase)
      },
    },
  }
}

export default defineConfig({
  base,
  plugins: [react(), baseHrefPlugin(base)],
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
  },
})
