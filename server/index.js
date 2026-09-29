// Production server: serves the built site from dist/ plus the API.
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { api } from './api.js';

const DIST = resolve(import.meta.dirname, '..', 'dist');
const PORT = Number(process.env.PORT) || 3000;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
};

createServer((req, res) => {
  api(req, res, () => {
    let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (path === '/admin') path = '/admin.html';
    const file = normalize(join(DIST, path.endsWith('/') ? `${path}index.html` : path));
    if (!file.startsWith(DIST) || !existsSync(file) || !statSync(file).isFile()) {
      res.statusCode = 404;
      return res.end('Not found');
    }
    res.setHeader('Content-Type', TYPES[extname(file)] || 'application/octet-stream');
    if (path.startsWith('/assets/')) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    createReadStream(file).pipe(res);
  });
}).listen(PORT, () => console.log(`🐝 Bee Patisserie running on http://localhost:${PORT}`));
