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
    }),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
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
