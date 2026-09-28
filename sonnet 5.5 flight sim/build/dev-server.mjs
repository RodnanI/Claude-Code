// Serves src/ with native ES modules for fast iteration. Usage: node build/dev-server.mjs [port]
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generate } from './gen-registry.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');
const port = +process.argv[2] || 5173;
const TYPES = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.json': 'application/json' };
generate();

createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const file = join(root, p);
  if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
  let body = readFileSync(file);
  if (p === '/index.html') {
    const css = '<link rel="stylesheet" href="/styles/main.css">';
    const entry = new URL(req.url, 'http://x').searchParams.get('entry') || 'main.js';
    body = body.toString().replace('<!--HEAD-->', css).replace('<!--BODYEND-->', `<script type="module" src="/${entry}"></script>`);
  }
  res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  res.end(body);
}).listen(port, () => console.log(`dev server on http://localhost:${port}  (viewer: /?entry=test-scenes/viewer.js)`));
