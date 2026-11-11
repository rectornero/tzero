/* The site desk's server (/admin/site): settings that change the live site without a deploy.
   Public, cached on Netlify's CDN and purged on every change (no polling, no schedule, no database):
   GET  /api/site                       -> what every page applies: notice bar, Ache's news moment, newsletter form,
                                           homepage pick, takedowns, switches, and Ache's published lines.
                                           It replaces the old /api/lines request, so a page view costs no extra call.
   GET  /go/<name>                      -> a short link (302 to where Nero pointed it)
   Signed in (Nero and admins; Claude with its key, inside the permissions Nero sets):
   GET  /api/settings                   -> { settings, flags, areas }
   PATCH /api/settings                  -> { patch, note? } merges a change and puts it live at once
   GET  /api/settings/versions          -> saved versions, newest first
   GET  /api/settings/version/<at>      -> one version
   POST /api/settings/restore/<at>      -> puts an old version back live
   GET  /api/settings/log?limit=50      -> the activity log (everything changed in the admin, by whom)
   GET  /api/settings/proposals         -> what Claude asked for and is waiting on Nero
   POST /api/settings/proposals/<id>    -> { action: "approve" | "decline", note? } (Nero and admins)
   Estimated cost: GET /api/site is the one CDN-cached request per page view that /api/lines already was
   (about 2 credits per 10,000 views); writes and short links are a handful of calls a day, well under 1 credit. */
import { getStore } from '@netlify/blobs';
import { purgeCache } from '@netlify/functions';
import { json, who, sameSite, claude, can } from '../lib/admin.mjs';
import { readSettings, writeSettings, publicView, merge, areas, log, readLog, propose, proposals, CLAUDE_AREAS, KNOWN_FLAGS, LINE_KEY } from '../lib/site.mjs';
import { handle as content } from './content.mjs';

const CDN = { 'Cache-Control': 'public, max-age=0, must-revalidate', 'Netlify-CDN-Cache-Control': 'public, durable, s-maxage=600, stale-while-revalidate=600', 'Netlify-Cache-Tag': 'site' };
const defaultPurge = async (tags = ['site']) => { try { await purgeCache({ tags }) } catch (e) { console.log('purge', e.message) } };

// A change from Claude: does every area it touches allow Claude to act alone?
export const claudeMay = (settings, list) => list.length > 0 && list.every(a => settings.claude[a === 'hide' ? 'takedowns' : a]);

// Apply a settings change (used by the desk, by Claude and by approving a proposal)
export async function applySettings(store, me, patch, note, purge) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return { status: 400, body: { error: 'patch must be an object' } };
  if ('claude' in patch && !can.manage(me.role)) return { status: 403, body: { error: "Only Nero changes what Claude may do" } };
  const res = await writeSettings(store, old => merge(old, patch), me.login || me.name);
  if (res.errors) return { status: 400, body: { error: 'invalid', details: res.errors } };
  await purge(['site']);
  await log(store, me, 'settings', (note ? note + ' · ' : '') + 'changed ' + areas(patch).join(', '), { patch });
  return { status: 200, body: { ok: true, settings: res.value } };
}

export async function handle(req, { store, auth, purge = defaultPurge, contentDeps }) {
  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);

  // Short links
  if (parts[0] === 'go') {
    const s = await readSettings(store);
    const to = LINE_KEY.test(parts[1] || '') && s.links[parts[1]];
    return new Response(null, { status: to ? 302 : 302, headers: { Location: to || '/', 'Cache-Control': 'public, max-age=0, must-revalidate', 'Netlify-CDN-Cache-Control': CDN['Netlify-CDN-Cache-Control'], 'Netlify-Cache-Tag': 'site' } });
  }

  // What every page reads
  if (parts[1] === 'site' && req.method === 'GET') {
    const [s, lines] = await Promise.all([readSettings(store), store.get('lines/pub', { type: 'json' })]);
    return json(publicView(s, lines && lines.lines), 200, CDN);
  }

  if (parts[1] !== 'settings') return json({ error: 'not found' }, 404);
  const me = claude(req) || await who(req, auth);
  if (!me) return json({ error: 'signed out' }, 401);
  if (!can.everything(me.role) && me.role !== 'claude') return json({ error: 'The site desk is for Nero and the admins' }, 403);
  if (me.role !== 'claude' && req.method !== 'GET' && !sameSite(req)) return json({ error: 'origin' }, 403);
  const [, , a, b] = parts;

  if (req.method === 'GET' && !a) {
    return json({ settings: await readSettings(store), flags: KNOWN_FLAGS, areas: CLAUDE_AREAS, claudeKey: Boolean(process.env.TZ_CLAUDE_KEY && process.env.TZ_CLAUDE_KEY.length >= 24) });
  }

  if (req.method === 'PATCH' && !a) {
    const body = await req.json().catch(() => null);
    if (!body) return json({ error: 'body' }, 400);
    const list = areas(body.patch);
    if (me.role === 'claude') {
      const s = await readSettings(store);
      if (!claudeMay(s, list)) {
        const p = await propose(store, 'settings', { patch: body.patch }, body.note);
        await log(store, me, 'proposal', 'asked to change ' + list.join(', ') + (body.note ? ' · ' + body.note : ''), { proposal: p.id });
        return json({ ok: true, proposed: true, proposal: p.id, message: 'Waiting for Nero: he approves it in /admin/site → Claude' }, 202);
      }
    }
    const r = await applySettings(store, me, body.patch, body.note, purge);
    return json(r.body, r.status);
  }

  if (req.method === 'GET' && a === 'versions') {
    const { blobs } = await store.list({ prefix: 'site-ver/' });
    return json({ versions: blobs.map(x => x.key.slice(9)).sort().reverse().slice(0, 100) });
  }
  if (req.method === 'GET' && a === 'version' && b) {
    const v = await store.get('site-ver/' + b, { type: 'json', consistency: 'strong' });
    return v ? json(v) : json({ error: 'not found' }, 404);
  }
  if (req.method === 'POST' && a === 'restore' && b) {
    if (me.role === 'claude') return json({ error: 'Nero restores versions' }, 403);
    const v = await store.get('site-ver/' + b, { type: 'json', consistency: 'strong' });
    if (!v) return json({ error: 'not found' }, 404);
    const keep = (await readSettings(store)).claude; // restoring never changes Claude's permissions behind Nero's back
    const { savedAt, by, ...old } = v.settings;
    const res = await writeSettings(store, () => ({ ...old, claude: can.manage(me.role) ? old.claude : keep }), me.login);
    if (res.errors) return json({ error: 'invalid', details: res.errors }, 400);
    await purge(['site']);
    await log(store, me, 'restore', 'settings from ' + b);
    return json({ ok: true, settings: res.value });
  }

  if (req.method === 'GET' && a === 'log') {
    return json({ log: await readLog(store, Number(url.searchParams.get('limit')) || 50) });
  }

  if (a === 'proposals') {
    if (req.method === 'GET' && !b) return json({ proposals: await proposals(store, url.searchParams.get('all') === '1') });
    if (req.method === 'POST' && b) {
      if (me.role === 'claude') return json({ error: 'Nero answers proposals' }, 403);
      const p = await store.get('prop/' + b, { type: 'json', consistency: 'strong' });
      if (!p) return json({ error: 'not found' }, 404);
      if (p.status !== 'open') return json({ error: 'already ' + p.status }, 409);
      const body = await req.json().catch(() => ({}));
      const note = typeof body.note === 'string' ? body.note.slice(0, 1000) : '';
      if (body.action === 'decline') {
        await store.setJSON('prop/' + b, { ...p, status: 'declined', answer: note, answeredAt: new Date().toISOString(), answeredBy: me.login });
        await log(store, me, 'declined', p.kind + ' from Claude' + (note ? ' · ' + note : ''));
        return json({ ok: true });
      }
      if (body.action !== 'approve') return json({ error: 'action' }, 400);
      let r;
      if (p.kind === 'settings') r = await applySettings(store, me, p.payload.patch, 'approved Claude\'s proposal', purge);
      else if (p.kind === 'publish' || p.kind === 'lines') {
        // Run it through the content function as Nero, so every rule there still applies
        const target = p.kind === 'publish' ? '/api/admin/item/' + encodeURIComponent(p.payload.slug) : '/api/admin/lines';
        let payload;
        if (p.kind === 'publish') {
          const d = await store.get('draft/' + p.payload.slug, { type: 'json', consistency: 'strong' });
          if (!d) return json({ error: 'the draft is gone' }, 404);
          payload = { post: { ...d.post, memberId: d.post.memberId || 'keep' }, publish: true };
        } else {
          const cur = (await store.get('lines/draft', { type: 'json', consistency: 'strong' })) || { topics: {} };
          payload = { book: { topics: { ...cur.topics, ...p.payload.topics } }, publish: true };
        }
        const h = new Headers(req.headers); h.set('content-type', 'application/json'); h.set('x-tz', '1'); h.delete('origin');
        const res = await content(new Request(url.origin + target, { method: 'PUT', headers: h, body: JSON.stringify(payload) }), contentDeps || { store, media: getStore('site-media'), auth });
        r = { status: res.status, body: await res.json() };
      } else return json({ error: 'unknown kind' }, 400);
      if (r.status >= 300) return json(r.body, r.status);
      await store.setJSON('prop/' + b, { ...p, status: 'approved', answer: note, answeredAt: new Date().toISOString(), answeredBy: me.login });
      await log(store, me, 'approved', p.kind + ' from Claude' + (p.note ? ' · ' + p.note.slice(0, 120) : ''));
      return json({ ok: true, result: r.body });
    }
  }
  return json({ error: 'not found' }, 404);
}

export default req => handle(req, { store: getStore('site-content'), auth: getStore('admin-auth') });

export const config = {
  path: ['/api/site', '/api/settings', '/api/settings/*', '/go/*'],
  rateLimit: { windowLimit: 120, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};
