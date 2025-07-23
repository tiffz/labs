import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import checker from 'vite-plugin-checker';
import { VitePWA } from 'vite-plugin-pwa';
import { resolve } from 'path'
import { viteStaticCopy } from 'vite-plugin-static-copy'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    checker({
      typescript: true,
      eslint: {
        useFlatConfig: true,
        lintCommand: 'eslint .',
      },
    }),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // This will cache all assets, including all your html entry points
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
      // A simple manifest is fine
      manifest: {
        name: 'Tiffany\'s Lab',
        short_name: 'Labs',
        description: 'A collection of Tiffany\'s experiments',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
    }),
    viteStaticCopy({
      targets: [
        {
          src: resolve(__dirname, 'CNAME'),
          dest: '.',
        },
      ],
    }),
  ],
  publicDir: '../public',
  root: 'src',
  build: {
    outDir: '../dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/index.html'),
        zines: resolve(__dirname, 'src/zines/index.html'),
        cats: resolve(__dirname, 'src/cats/index.html'),
      },
    },
  },
})
