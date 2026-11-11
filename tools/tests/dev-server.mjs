// A local stand-in for Netlify, for testing the admin without a deploy: serves the site's files, applies the
// simple rewrites of _redirects, and runs the functions with Netlify Blobs faked in memory.
//   node tools/tests/dev-server.mjs [port]      then open http://localhost:8787/admin/site
// Every /api call is treated as signed in as Nero (TZ_DEV_ROLE=none turns that off). Claude's key is "dev-key-dev-key-dev-key-dev".
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
process.env.TZ_CLAUDE_KEY = process.env.TZ_CLAUDE_KEY || 'dev-key-dev-key-dev-key-dev';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { handle: content } = await import('../../netlify/functions/content.mjs');
const { handle: site } = await import('../../netlify/functions/site.mjs');
const { handle: ai } = await import('../../netlify/functions/ai.mjs');
const { handle: auth } = await import('../../netlify/functions/auth.mjs');
const { issue } = await import('../../netlify/lib/admin.mjs');

export function fakeStore() {
  const m = new Map(); let n = 0;
  return {
    async get(k, o = {}) { const v = m.get(k); return v ? (o.type === 'json' ? JSON.parse(v.data) : v.data) : null },
    async getWithMetadata(k, o = {}) { const v = m.get(k); return v ? { data: o.type === 'json' ? JSON.parse(v.data) : v.data, etag: v.etag, metadata: v.metadata } : null },
    async getMetadata(k) { const v = m.get(k); return v ? { etag: v.etag, metadata: v.metadata } : null },
    async setJSON(k, val, o = {}) { return this.set(k, JSON.stringify(val), o) },
    async set(k, data, o = {}) {
      const cur = m.get(k);
      if (o.onlyIfNew && cur) return { modified: false };
      if (o.onlyIfMatch && (!cur || cur.etag !== o.onlyIfMatch)) return { modified: false };
      m.set(k, { data, etag: 'e' + ++n, metadata: o.metadata || {} }); return { modified: true };
    },
    async delete(k) { m.delete(k) },
    async list({ prefix = '' } = {}) { return { blobs: [...m.keys()].filter(k => k.startsWith(prefix)).map(key => ({ key })) } },
  };
}
const d = { store: fakeStore(), media: fakeStore(), auth: fakeStore(), purge: async () => {} };
d.contentDeps = d;
const cookie = (await issue(d.auth, { id: 34218910, login: 'rectornero' })).split(';')[0];
const TYPES = { html: 'text/html; charset=utf-8', js: 'text/javascript', mjs: 'text/javascript', css: 'text/css', json: 'application/json', svg: 'image/svg+xml', webp: 'image/webp', png: 'image/png', jpg: 'image/jpeg', gif: 'image/gif' };
const rules = fs.readFileSync(path.join(ROOT, '_redirects'), 'utf8').split('\n').map(l => l.trim().split(/\s+/)).filter(p => p.length >= 3 && p[2].startsWith('200') && !p[0].startsWith('#'));

const port = Number(process.argv[2]) || 8787;
http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost:' + port), p = decodeURIComponent(url.pathname);
    const fn = /^\/api\/(ai|mcp)(\/|$)/.test(p) ? ai : /^\/(api\/(site|settings)|go)(\/|$)/.test(p) ? site : /^\/api\/auth\//.test(p) ? (r => auth(r, d.auth)) : /^\/api\/(content|media|lines|admin)(\/|$)/.test(p) ? content : null;
    if (fn) {
      const chunks = []; for await (const c of req) chunks.push(c);
      const headers = new Headers(Object.entries(req.headers).filter(([, v]) => typeof v === 'string'));
      if (process.env.TZ_DEV_ROLE !== 'none' && !headers.get('authorization')) headers.set('cookie', cookie);
      headers.delete('origin');
      const r = await fn(new Request(url, { method: req.method, headers, body: chunks.length ? Buffer.concat(chunks) : undefined }), d);
      res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer())); return;
    }
    let file = p;
    for (const [from, to] of rules) {
      if (from === p || (from.endsWith('/*') && p.startsWith(from.slice(0, -1)))) { file = to; break }
    }
    if (file.endsWith('/')) file += 'index.html';
    let full = path.join(ROOT, file);
    if (!full.startsWith(ROOT)) { res.writeHead(403); res.end(); return }
    if (!fs.existsSync(full) && fs.existsSync(full + '.html')) full += '.html';
    if (!fs.existsSync(full) || fs.statSync(full).isDirectory()) { res.writeHead(404); res.end('not found'); return }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(full).slice(1)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(full).pipe(res);
  } catch (e) { console.error(e); res.writeHead(500); res.end(String(e)) }
}).listen(port, () => console.log('TZERØ test server on http://localhost:' + port));
