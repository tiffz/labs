/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { viteStaticCopy } from 'vite-plugin-static-copy';
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
    viteStaticCopy({
      targets: [
        { src: '../src/404.html', dest: '.' },
        { src: '../CNAME', dest: '.' }
      ]
    }),
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
            type: 'image/svg+xml'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        navigateFallback: undefined,
        navigateFallbackDenylist: [/^\/404\.html/],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './shared/test/setupTests.ts',
    testTimeout: 30000, // 30 seconds max per test
    hookTimeout: 30000, // 30 seconds max for setup/teardown
  },
});
