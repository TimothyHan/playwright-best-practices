// Tiny hermetic target app for the pattern examples.
// Zero dependencies: serves a single HTML page and an in-memory REST API.
// API responses carry ~150ms latency so synchronization patterns are meaningful.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = process.env.PORT ?? 4173;
const API_DELAY_MS = 150;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {{ id: string, name: string, created_at: string }[]} */
let items = [];

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const json = (res, status, body) => {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(body === undefined ? undefined : JSON.stringify(body));
};

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error('invalid JSON body'));
      }
    });
  });

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // ---- REST API ----
  if (url.pathname.startsWith('/api/')) {
    await delay(API_DELAY_MS);

    // current user profile — the demo backend always answers admin; tests
    // force other roles by mocking this route (§7 role-based UI testing)
    if (req.method === 'GET' && url.pathname === '/api/me') {
      return json(res, 200, { user: 'demo-user', role: 'admin' });
    }

    if (req.method === 'GET' && url.pathname === '/api/items') {
      return json(res, 200, { data: items });
    }

    if (req.method === 'POST' && url.pathname === '/api/items') {
      let body;
      try {
        body = await readBody(req);
      } catch {
        return json(res, 400, { message: 'invalid JSON body' });
      }
      if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
        return json(res, 400, { message: 'name is required' });
      }
      const item = { id: randomUUID(), name: body.name.trim(), created_at: new Date().toISOString() };
      items.push(item);
      return json(res, 201, item);
    }

    const itemMatch = url.pathname.match(/^\/api\/items\/([^/]+)$/);
    if (req.method === 'DELETE' && itemMatch) {
      const index = items.findIndex((item) => item.id === itemMatch[1]);
      if (index === -1) return json(res, 404, { message: 'not found' });
      items.splice(index, 1);
      return json(res, 204);
    }

    return json(res, 404, { message: 'unknown API route' });
  }

  // ---- static page ----
  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
    const html = await readFile(path.join(__dirname, 'public', 'index.html'));
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    return res.end(html);
  }

  res.writeHead(404);
  res.end('not found');
});

server.listen(PORT, () => {
  console.log(`target app listening on http://localhost:${PORT}`);
});
