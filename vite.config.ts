/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { resolve } from 'path';

export default defineConfig({
  root: 'src',
  publicDir: '../public',

  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/index.html'),
        
        cats: resolve(__dirname, 'src/cats/index.html'),
        zines: resolve(__dirname, 'src/zines/index.html'),
      },
    },
  },
  server: {
    middlewareMode: false,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon-cats.svg', 'favicon-zines.svg'],
      manifest: {
        name: 'Tiff Zhang Labs',
        short_name: 'Labs',
        description: 'A collection of experimental apps and tools by Tiff Zhang',
        theme_color: '#8b5cf6',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'favicon.svg',
            sizes: '32x32',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          },
          {
            src: 'favicon-cats.svg',
            sizes: '32x32',
            type: 'image/svg+xml'
          },
          {
            src: 'favicon-zines.svg',
            sizes: '32x32',
            type: 'image/svg+xml'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
        // Multi-root architecture: specific fallbacks for each app
        navigateFallback: undefined, // No global fallback
        navigateFallbackDenylist: [/^\/404\.html/], // Never intercept 404 page
        ignoreURLParametersMatching: [/dev/],
      },
      devOptions: {
        enabled: false, // Disable PWA in dev mode to avoid issues
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './cats/test/setupTests.ts',
  },
});
