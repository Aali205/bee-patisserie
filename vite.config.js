import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import { api } from './server/api.js';

const beeApi = {
  name: 'bee-api',
  configureServer(server) {
    server.middlewares.use(api);
  },
  configurePreviewServer(server) {
    server.middlewares.use(api);
  },
  // snapshot of the catalogue so the site also works on static hosting (GitHub Pages)
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'products.json', source: readFileSync('server/data/products.json', 'utf8') });
  },
};

export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [beeApi],
  build: {
    rollupOptions: {
      input: { main: 'index.html', admin: 'admin.html' },
    },
  },
});
