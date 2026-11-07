/* Articles and pages written in /admin, kept in Netlify Blobs so publishing never needs a deploy (Nero's pick,
   2026-10-27). Estimated 3 to 5 credits a month at 10,000 views: readers' requests are answered by Netlify's CDN,
   which is purged on every publish, so few of them run this function. No schedule, no polling, no database.

   Public, cached:
   GET /api/content               -> { posts: [card...] } published items, newest first (scheduled ones hidden)
   GET /api/content/<slug>        -> the published post object (same Ricos format as tools/posts/<slug>.json)
   GET /api/media/<id>            -> an uploaded picture
   GET /api/lines                 -> { lines: { key: [line...] }, at } the sets of Ache's lines Nero changed and published
   Signed in (see ../lib/admin.mjs for roles; collaborators only see and change their own articles, and never
   scene code or pages; Claude, with its key, only saves drafts):
   GET    /api/admin/items                 -> drafts and published items
   GET    /api/admin/item/<slug>           -> { draft, published }
   PUT    /api/admin/item/<slug>           -> { post, publish?: true } saves a draft (and a version); publish puts it live
   POST   /api/admin/unpublish/<slug>      -> takes it off the site, keeps the draft
   DELETE /api/admin/item/<slug>           -> deletes a draft that isn't published
   GET    /api/admin/versions/<slug>       -> saved versions, newest first
   GET    /api/admin/version/<slug>/<key>  -> one version
   POST   /api/admin/media                 -> picture bytes (webp, png, jpeg, gif; under 2 MB) -> { url }
   GET    /api/admin/inbox                 -> the Claude inbox (Nero and admins): material for Claude to write from
   POST   /api/admin/inbox                 -> { text, pictures: [url] } drops something in it
   POST   /api/admin/inbox/<id>            -> { status: "done" | "open" | "deleted", note?, draft? }
   Ache's script editor (/admin/lines, Nero only):
   GET    /api/admin/lines                 -> { draft, published }
   PUT    /api/admin/lines                 -> { book, publish?: true } saves the draft (and a version); publish puts it live
   GET    /api/admin/lines/versions        -> saved versions, newest first
   GET    /api/admin/lines/version/<key>   -> one version

   Store "site-content": pub/<slug>, draft/<slug>, ver/<slug>/<time>, index, inbox/<time-id>,
   lines/draft, lines/pub, lines-ver/<time>. Store "site-media": <id>. */
import { getStore } from '@netlify/blobs';
import { purgeCache } from '@netlify/functions';
import { randomBytes } from 'node:crypto';
import { json, who, sameSite, claude, can } from '../lib/admin.mjs';

// Author ids from the Wix days, still used by the site's bylines
const CLAUDE_MEMBER = '1c53b988-3af9-4c8b-b6d4-0db133c2b09c', NERO_MEMBER = '38ba494c-02f6-400e-9e2d-5cb850448e7a';

const SLUG = /^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/;
const MAX_POST = 1_500_000, MAX_HTML = 400_000, MAX_MEDIA = 2_000_000;
const MEDIA_TYPES = { 'image/webp': 1, 'image/png': 1, 'image/jpeg': 1, 'image/gif': 1 };
const CDN = { 'Cache-Control': 'public, max-age=0, must-revalidate', 'Netlify-CDN-Cache-Control': 'public, durable, s-maxage=600, stale-while-revalidate=600', 'Netlify-Cache-Tag': 'content' };
const CARD = ['slug', 'kind', 'title', 'excerpt', 'authorName', 'authorSlug', 'firstPublishedDate', 'lastPublishedDate', 'publishAt', 'categoryIds', 'tagIds', 'memberId', 'minutesToRead', 'media'];

// The node types ricos.js knows how to draw. Anything else is refused, so nothing unknown is ever stored.
const NODES = new Set(['PARAGRAPH', 'TEXT', 'HEADING', 'BLOCKQUOTE', 'DIVIDER', 'BULLETED_LIST', 'ORDERED_LIST', 'LIST_ITEM', 'CODE_BLOCK',
  'IMAGE', 'GALLERY', 'VIDEO', 'TABLE', 'TABLE_ROW', 'TABLE_CELL', 'BUTTON', 'HTML', 'CAPTION', 'TZ_BLOCK']);
const DECOS = new Set(['BOLD', 'ITALIC', 'UNDERLINE', 'LINK', 'COLOR', 'FONT_SIZE']);

function check(post) {
  const errs = [];
  if (!post || typeof post !== 'object') return ['no post'];
  if (typeof post.title !== 'string' || !post.title.trim() || post.title.length > 200) errs.push('title');
  if (post.excerpt != null && (typeof post.excerpt !== 'string' || post.excerpt.length > 600)) errs.push('excerpt');
  if (!['article', 'page'].includes(post.kind || 'article')) errs.push('kind');
  if (post.publishAt != null && isNaN(Date.parse(post.publishAt))) errs.push('publishAt');
  let count = 0;
  const walk = (n, depth) => {
    if (++count > 20000 || depth > 12) { errs.push('too big'); return }
    if (!n || typeof n !== 'object' || !NODES.has(n.type)) { errs.push('node ' + (n && n.type)); return }
    if (n.type === 'HTML' && n.htmlData && n.htmlData.html != null && (typeof n.htmlData.html !== 'string' || n.htmlData.html.length > MAX_HTML)) errs.push('scene too big');
    for (const d of (n.textData && n.textData.decorations) || []) if (!DECOS.has(d.type)) errs.push('decoration ' + d.type);
    for (const c of n.nodes || []) walk(c, depth + 1);
  };
  for (const n of (post.richContent && post.richContent.nodes) || []) walk(n, 0);
  return [...new Set(errs)].slice(0, 10);
}

// Ache's script book: only the sets Nero touched, as { key: { lines: [{ t, off?, note? }], note? } }.
// Lines are plain text (the site only ever puts them in textContent); the limits keep one save small.
const LINE_KEY = /^[a-z0-9][a-z0-9-]{0,59}$/;
function checkBook(book) {
  if (!book || typeof book !== 'object' || !book.topics || typeof book.topics !== 'object') return 'no book';
  const keys = Object.keys(book.topics);
  if (keys.length > 200) return 'too many sets';
  for (const k of keys) {
    const t = book.topics[k];
    if (!LINE_KEY.test(k) || !t || !Array.isArray(t.lines) || t.lines.length > 400) return 'set ' + k;
    if (t.note != null && (typeof t.note !== 'string' || t.note.length > 2000)) return 'note on ' + k;
    for (const l of t.lines) {
      if (!l || typeof l.t !== 'string' || l.t.length > 400) return 'line in ' + k;
      if (l.note != null && (typeof l.note !== 'string' || l.note.length > 1000)) return 'line note in ' + k;
    }
  }
  return '';
}
// What the site reads: per set, the lines that aren't muted. A set with nothing left is skipped, so Ache keeps
// the lines it had rather than going quiet.
const bookLines = book => Object.fromEntries(Object.entries(book.topics)
  .map(([k, t]) => [k, t.lines.filter(l => !l.off && l.t.trim()).map(l => l.t.trim().replace(/\s+/g, ' '))])
  .filter(([, a]) => a.length));

const live = (p, now = Date.now()) => p && !(p.publishAt && Date.parse(p.publishAt) > now);
const hasScene = post => JSON.stringify(post.richContent || {}).includes('"type":"HTML"');
const ownerOf = x => x && (x.post ? x.post.ownerId : x.ownerId);
const card = p => Object.fromEntries(CARD.filter(k => p[k] != null).map(k => [k, p[k]]));

async function editIndex(store, fn) {
  for (let i = 0; i < 6; i++) {
    const cur = await store.getWithMetadata('index', { type: 'json', consistency: 'strong' });
    const next = fn((cur && cur.data) || []).sort((a, b) => (b.firstPublishedDate || '').localeCompare(a.firstPublishedDate || ''));
    const res = cur ? await store.setJSON('index', next, { onlyIfMatch: cur.etag }) : await store.setJSON('index', next, { onlyIfNew: true });
    if (res.modified !== false) return next;
  }
  throw new Error('index busy');
}

export async function handle(req, { store, media, auth, purge = async (tags = ['content']) => { try { await purgeCache({ tags }) } catch (e) { console.log('purge', e.message) } } }) {
  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean).slice(1).map(decodeURIComponent); // drop "api"
  const [area, a, b] = parts;

  // Public reads
  if (req.method === 'GET' && area === 'content') {
    if (!a) {
      const idx = (await store.get('index', { type: 'json' })) || [];
      return json({ posts: idx.filter(p => live(p)) }, 200, CDN);
    }
    const p = SLUG.test(a) ? await store.get('pub/' + a, { type: 'json' }) : null;
    return live(p) ? json(p, 200, CDN) : json({ error: 'not found' }, 404, { ...CDN, 'Netlify-CDN-Cache-Control': 'public, durable, s-maxage=60' });
  }
  if (req.method === 'GET' && area === 'media' && /^[\w-]{10,40}\.(webp|png|jpg|gif)$/.test(a || '')) {
    const m = await media.getWithMetadata(a, { type: 'arrayBuffer' });
    if (!m) return json({ error: 'not found' }, 404);
    return new Response(m.data, { headers: { 'Content-Type': m.metadata.type, 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'" } });
  }

  if (req.method === 'GET' && area === 'lines' && !a) {
    const p = await store.get('lines/pub', { type: 'json' });
    const cache = { ...CDN, 'Netlify-Cache-Tag': 'lines' };
    return p ? json(p, 200, cache) : json({ error: 'none yet' }, 404, cache);
  }

  if (area !== 'admin') return json({ error: 'not found' }, 404);
  const me = claude(req) || await who(req, auth);
  if (!me) return json({ error: 'signed out' }, 401);
  if (me.role !== 'claude' && req.method !== 'GET' && !sameSite(req)) return json({ error: 'origin' }, 403);
  const all = can.everything(me.role) || me.role === 'claude';
  const mine = x => all || ownerOf(x) === me.id;

  // The Claude inbox: Nero and admins drop material, Claude reads it and writes drafts from it
  if (a === 'inbox') {
    if (!all) return json({ error: 'not for collaborators' }, 403);
    if (req.method === 'GET') {
      const { blobs } = await store.list({ prefix: 'inbox/' });
      const items = (await Promise.all(blobs.map(x => store.get(x.key, { type: 'json', consistency: 'strong' })))).filter(x => x && x.status !== 'deleted');
      return json({ items: items.sort((x, y) => y.at.localeCompare(x.at)) });
    }
    const body = await req.json().catch(() => ({}));
    if (req.method === 'POST' && !b) {
      if (me.role === 'claude') return json({ error: 'Claude reads the inbox' }, 403);
      const text = typeof body.text === 'string' ? body.text.slice(0, 20000) : '';
      const pictures = (Array.isArray(body.pictures) ? body.pictures : []).filter(u => typeof u === 'string' && /^\/api\/media\/[\w-]+\.\w+$/.test(u)).slice(0, 20);
      if (!text.trim() && !pictures.length) return json({ error: 'empty' }, 400);
      const at = new Date().toISOString(), id = at.replace(/[:.]/g, '-') + '-' + randomBytes(3).toString('hex');
      await store.setJSON('inbox/' + id, { id, at, by: me.name, text, pictures, status: 'open' });
      return json({ ok: true, id });
    }
    if (req.method === 'POST' && /^[\w-]{10,60}$/.test(b || '')) {
      const cur = await store.get('inbox/' + b, { type: 'json', consistency: 'strong' });
      if (!cur) return json({ error: 'not found' }, 404);
      if (!['done', 'open', 'deleted'].includes(body.status)) return json({ error: 'status' }, 400);
      await store.setJSON('inbox/' + b, { ...cur, status: body.status, note: typeof body.note === 'string' ? body.note.slice(0, 1000) : cur.note, draft: typeof body.draft === 'string' ? body.draft.slice(0, 80) : cur.draft, doneAt: new Date().toISOString() });
      return json({ ok: true });
    }
    return json({ error: 'not found' }, 404);
  }

  // Ache's lines are Nero's alone
  if (a === 'lines') {
    // Claude may read them (Nero's notes are for Claude), never save
    if (!can.manage(me.role) && !(me.role === 'claude' && req.method === 'GET')) return json({ error: 'Ache\'s lines are Nero\'s' }, 403);
    if (req.method === 'GET' && !b) {
      const [draft, published] = await Promise.all([store.get('lines/draft', { type: 'json', consistency: 'strong' }), store.get('lines/pub', { type: 'json', consistency: 'strong' })]);
      return json({ draft, published });
    }
    if (req.method === 'GET' && b === 'versions') {
      const { blobs } = await store.list({ prefix: 'lines-ver/' });
      return json({ versions: blobs.map(x => x.key.slice(10)).sort().reverse().slice(0, 100) });
    }
    if (req.method === 'GET' && b === 'version' && parts[3]) {
      const v = await store.get('lines-ver/' + parts[3], { type: 'json', consistency: 'strong' });
      return v ? json(v) : json({ error: 'not found' }, 404);
    }
    if (req.method === 'PUT' && !b) {
      const text = await req.text();
      if (text.length > MAX_POST) return json({ error: 'too big' }, 413);
      let body; try { body = JSON.parse(text) } catch (e) { return json({ error: 'body' }, 400) }
      const err = checkBook(body && body.book);
      if (err) return json({ error: 'invalid', details: [err] }, 400);
      const now = new Date().toISOString(), book = { topics: body.book.topics, savedAt: now, by: me.login };
      await store.setJSON('lines/draft', book);
      await store.setJSON('lines-ver/' + now, { book, published: Boolean(body.publish) });
      if (body.publish) {
        await store.setJSON('lines/pub', { lines: bookLines(book), at: now });
        await purge(['lines']);
      }
      return json({ ok: true, savedAt: now, published: Boolean(body.publish) });
    }
    return json({ error: 'not found' }, 404);
  }

  if (req.method === 'GET' && a === 'items') {
    const [drafts, idx] = await Promise.all([store.list({ prefix: 'draft/' }), store.get('index', { type: 'json', consistency: 'strong' })]);
    const pub = new Map((idx || []).map(p => [p.slug, p]));
    const items = await Promise.all(drafts.blobs.map(async x => {
      const d = await store.get(x.key, { type: 'json', consistency: 'strong' });
      if (!d || !mine(d)) return null;
      const slug = x.key.slice(6);
      return { slug, title: d.post.title, kind: d.post.kind || 'article', author: d.post.authorName || '', savedAt: d.savedAt, published: pub.has(slug), publishAt: pub.has(slug) ? pub.get(slug).publishAt || null : null };
    }));
    return json({ items: items.filter(Boolean).sort((x, y) => (y.savedAt || '').localeCompare(x.savedAt || '')) });
  }

  if (a === 'media' && req.method === 'POST') {
    const type = (req.headers.get('content-type') || '').split(';')[0];
    if (!MEDIA_TYPES[type]) return json({ error: 'type' }, 415);
    const buf = await req.arrayBuffer();
    if (!buf.byteLength || buf.byteLength > MAX_MEDIA) return json({ error: 'size' }, 413);
    const id = randomBytes(12).toString('base64url') + '.' + ({ 'image/jpeg': 'jpg' }[type] || type.slice(6));
    await media.set(id, buf, { metadata: { type, by: me.login, at: new Date().toISOString() } });
    return json({ url: '/api/media/' + id });
  }

  if (!SLUG.test(b || '')) return json({ error: 'slug' }, 400);
  const slug = b;

  const [draft, published] = await Promise.all([store.get('draft/' + slug, { type: 'json', consistency: 'strong' }), store.get('pub/' + slug, { type: 'json', consistency: 'strong' })]);
  const exists = draft || published;
  if (exists && !mine(draft || published)) return json({ error: 'That one belongs to someone else' }, 403);

  if (a === 'item' && req.method === 'GET') return json({ draft, published });

  if (a === 'item' && req.method === 'PUT') {
    const text = await req.text();
    if (text.length > MAX_POST) return json({ error: 'too big' }, 413);
    let body; try { body = JSON.parse(text) } catch (e) { return json({ error: 'body' }, 400) }
    const post = body && body.post;
    const errs = check(post);
    if (errs.length) return json({ error: 'invalid', details: errs }, 400);
    if (body.publish && me.role === 'claude') return json({ error: 'Claude saves drafts; Nero publishes' }, 403);
    if (!can.everything(me.role) && me.role !== 'claude') {
      if ((post.kind || 'article') !== 'article') return json({ error: 'Pages are for admins' }, 403);
      if (hasScene(post)) return json({ error: 'Scene code is for admins. Use the no-code blocks.' }, 403);
    }
    const now = new Date().toISOString();
    const old = published;
    const clean = { ...post, slug, own: true, live: true, kind: post.kind || 'article', ownerId: ownerOf(exists) || me.id };
    // The byline. Claude signs as Claude; collaborators as themselves; Nero and admins pick "self" or Claude, and
    // anything else keeps the byline an article already has (an admin fixing someone else's piece).
    const prev = (draft && draft.post) || published, sign = post.memberId;
    if (me.role === 'claude' || (can.everything(me.role) && sign === CLAUDE_MEMBER)) Object.assign(clean, { memberId: CLAUDE_MEMBER, authorName: 'Claude', authorSlug: 'claude' });
    else if (can.everything(me.role) && sign !== 'self' && prev && ownerOf(exists) !== me.id) Object.assign(clean, { memberId: prev.memberId, authorName: prev.authorName, authorSlug: prev.authorSlug });
    else Object.assign(clean, { memberId: me.role === 'owner' ? NERO_MEMBER : undefined, authorName: me.name, authorSlug: me.slug });
    if (!clean.memberId) delete clean.memberId;
    clean.firstPublishedDate = (old && old.firstPublishedDate) || post.publishAt || now;
    clean.lastPublishedDate = now;
    await store.setJSON('draft/' + slug, { post: clean, savedAt: now });
    await store.setJSON('ver/' + slug + '/' + now, { post: clean, savedAt: now, published: Boolean(body.publish) });
    if (body.publish) {
      await store.setJSON('pub/' + slug, clean);
      await editIndex(store, idx => idx.filter(p => p.slug !== slug).concat(card(clean)));
      await purge();
    }
    return json({ ok: true, savedAt: now, published: Boolean(body.publish) || Boolean(old) });
  }

  if (a === 'unpublish' && req.method === 'POST') {
    await store.delete('pub/' + slug);
    await editIndex(store, idx => idx.filter(p => p.slug !== slug));
    await purge();
    return json({ ok: true });
  }

  if (a === 'item' && req.method === 'DELETE') {
    if (await store.get('pub/' + slug, { consistency: 'strong' })) return json({ error: 'unpublish first' }, 409);
    await store.delete('draft/' + slug);
    return json({ ok: true });
  }

  if (a === 'versions' && req.method === 'GET') {
    const { blobs } = await store.list({ prefix: 'ver/' + slug + '/' });
    return json({ versions: blobs.map(x => x.key.split('/').pop()).sort().reverse() });
  }
  if (a === 'version' && req.method === 'GET' && parts[3]) {
    const v = await store.get('ver/' + slug + '/' + parts[3], { type: 'json', consistency: 'strong' });
    return v ? json(v) : json({ error: 'not found' }, 404);
  }
  return json({ error: 'not found' }, 404);
}

export default req => handle(req, { store: getStore('site-content'), media: getStore('site-media'), auth: getStore('admin-auth') });

export const config = {
  path: ['/api/content', '/api/content/*', '/api/media/*', '/api/lines', '/api/admin/*'],
  rateLimit: { windowLimit: 120, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};
