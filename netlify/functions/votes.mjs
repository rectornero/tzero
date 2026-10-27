/* Idea Lab hearts (/lab). The only server code on this site, added on Nero's pick (2026-10-26).
   GET /api/votes          -> { counts: { ideaId: hearts } }, cached on Netlify's CDN for 60 s so page views
                              rarely reach the function
   POST /api/votes {idea, delta: 1 | -1} -> the new counts
   Counts live in one Netlify Blobs entry. Writes are conditional (ETag), so two hearts at the same moment can't
   overwrite each other. No database: nothing here wakes one. */
import { getStore } from '@netlify/blobs';

// Keep in step with data-idea in lab.html. Unknown ids are refused, so nobody can fill the store with junk.
export const IDEAS = ['lmo-light', 'cnq-no', 'ice-handshake', 'ovg-night', 'ded-rewind'];
const KEY = 'counts';

const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });

function clean(data) {
  const out = {};
  for (const id of IDEAS) out[id] = Math.max(0, Number(data && data[id]) || 0);
  return out;
}

export async function handle(req, store) {
  if (req.method === 'GET') {
    const data = await store.get(KEY, { type: 'json' });
    return json({ counts: clean(data) }, 200, {
      'Cache-Control': 'public, max-age=0, must-revalidate',
      'Netlify-CDN-Cache-Control': 'public, durable, s-maxage=60, stale-while-revalidate=120',
    });
  }
  if (req.method !== 'POST') return json({ error: 'method' }, 405, { Allow: 'GET, POST' });

  let body;
  try { body = await req.json() } catch (e) { return json({ error: 'body' }, 400) }
  const idea = body && body.idea;
  const delta = body && body.delta;
  if (!IDEAS.includes(idea) || (delta !== 1 && delta !== -1)) return json({ error: 'vote' }, 400);

  for (let i = 0; i < 5; i++) {
    const cur = await store.getWithMetadata(KEY, { type: 'json', consistency: 'strong' });
    const counts = clean(cur && cur.data);
    counts[idea] = Math.max(0, counts[idea] + delta);
    const res = cur
      ? await store.setJSON(KEY, counts, { onlyIfMatch: cur.etag })
      : await store.setJSON(KEY, counts, { onlyIfNew: true });
    if (res.modified !== false) return json({ counts }, 200, { 'Cache-Control': 'no-store' });
  }
  return json({ error: 'busy' }, 409);
}

export default req => handle(req, getStore('idea-votes'));

export const config = {
  path: '/api/votes',
  // Blocked at Netlify's edge before the function runs, so a flood costs requests, not compute
  rateLimit: { windowLimit: 30, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};
