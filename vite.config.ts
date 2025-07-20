import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'pretty-url-rewrite',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          if (req.url === '/zines') {
            req.url = '/zines/index.html';
          }
          next();
        });
      },
    },
  ],
  base: '/',
  server: {
    port: 8080,
    fs: { allow: [process.cwd()] },
  },
  build: {
    outDir: 'build',
    rollupOptions: {
      input: {
        main: path.resolve(process.cwd(), 'index.html'),
        zines: path.resolve(process.cwd(), 'zines/index.html'),
      },
    },
  },
})
