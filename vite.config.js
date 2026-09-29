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
};

export default defineConfig({
  plugins: [beeApi],
  build: {
    rollupOptions: {
      input: { main: 'index.html', admin: 'admin.html' },
    },
  },
});
