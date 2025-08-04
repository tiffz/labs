/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { resolve } from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import { compression } from 'vite-plugin-compression2';

export default defineConfig({
  root: 'src',
  publicDir: '../public',

  build: {
    outDir: '../dist',
    emptyOutDir: true,
    minify: 'terser',
    cssMinify: true,
    sourcemap: false,
    target: 'es2020',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/index.html'),
        cats: resolve(__dirname, 'src/cats/index.html'),
        zines: resolve(__dirname, 'src/zines/index.html'),
      },
      output: {
        manualChunks: {
          // Vendor chunk for React and related libraries
          vendor: ['react', 'react-dom'],
        },
        // Better chunk naming
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            return 'css/[name]-[hash][extname]';
          }
          if (assetInfo.name?.match(/\.(png|jpe?g|svg|gif|webp|avif)$/)) {
            return 'images/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info'],
      },
    },
  },
  server: {
    middlewareMode: false,
  },
  plugins: [
    react({
      // Enable Fast Refresh in development
      fastRefresh: true,
    }),
    viteStaticCopy({
      targets: [
        { src: '../src/404.html', dest: '.' },
        { src: '../CNAME', dest: '.' },
        { src: '../public/robots.txt', dest: '.' }
      ]
    }),
    compression({
      algorithm: 'gzip',
      ext: '.gz',
    }),
    compression({
      algorithm: 'brotliCompress',
      ext: '.br',
    }),
    // Bundle analyzer - only in analyze mode
    ...(process.env.ANALYZE ? [visualizer({
      filename: 'dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
    })] : []),
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
