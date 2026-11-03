import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'

/** Fonts the first screen needs, preloaded so text renders in its real face without a swap. */
const PRELOAD_FONTS = /(inter|space-grotesk)-latin-wght-normal-[\w-]+\.woff2$/

function preloadFonts(): Plugin {
  return {
    name: 'preload-fonts',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        return Object.keys(ctx.bundle ?? {})
          .filter((f) => PRELOAD_FONTS.test(f))
          .map((f) => ({
            tag: 'link',
            attrs: { rel: 'preload', href: `/${f}`, as: 'font', type: 'font/woff2', crossorigin: '' },
            injectTo: 'head-prepend' as const,
          }))
      },
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), preloadFonts()],
  build: {
    // older phones and tablets (iOS 14/15 Safari) still run the site
    target: 'es2020',
    // the three.js chunk is large by nature and only loads on /products
    chunkSizeWarningLimit: 1000,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            // libraries change rarely, so they get their own long-lived cached files
            { name: 'react', test: /node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler|cookie|set-cookie-parser)[\\/]/, priority: 20 },
            { name: 'three', test: /node_modules[\\/](three|three-stdlib|@react-three)[\\/]/, priority: 10 },
          ],
        },
      },
    },
  },
})
