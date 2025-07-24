/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        cats: resolve(__dirname, 'src/cats/index.html'),
        zines: resolve(__dirname, 'src/zines/index.html'),
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2}'],
        // Don't precache API responses or other dynamic content
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
        // This is crucial for multi-page apps.
        // It ensures that any URL that doesn't match a precached file
        // will be served by '/index.html' (or another specified fallback).
        navigateFallback: '/index.html',
        // This regex ensures that URLs with 'dev=true' are ignored by the service worker,
        // preventing the dev panel from being cached and shown to regular users.
        ignoreURLParametersMatching: [/dev/],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/cats/setupTests.ts',
  },
});
