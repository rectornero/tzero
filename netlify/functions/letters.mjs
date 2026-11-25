/* Reader letters: what readers send from a "reader's choice" box in an article (TZ_BLOCK kind "ask", drawn by
   assets/js/blocks.js). Nero's idea, 2026-11-25: three choices, a line of their own, and Send (to us).
   POST   /api/letters  { post, box, choice: 0..2 | -1, label?, text?, question? }  -> { ok }   (anyone, rate-limited)
   GET    /api/letters?limit=200                                -> { letters } newest first  (Nero, admins, Claude's key)
   DELETE /api/letters/<id>                                     -> { ok }                   (Nero and admins)
   One Blobs entry per letter (store "reader-letters", key l/<time>-<random>), so two letters never overwrite each
   other and there is no read-modify-write. Nothing about the reader is kept: no IP, no cookie, no name unless they
   write it. No database, no schedule, no polling.
   Estimated cost: a letter is one function call and one small write; 1,000 letters a month is well under 1 credit.
   Reading them is a few calls when Nero opens the desk. */
import { getStore } from '@netlify/blobs';
import { json, who, sameSite, claude, can } from '../lib/admin.mjs';

const SLUG = /^[a-z0-9][a-z0-9-]{0,79}$/;
const BOX = /^[a-z0-9][a-z0-9-]{0,39}$/;
const ID = /^l\/\d{4}-\d\d-\d\dT[\d:.]+Z-[a-z0-9]{6}$/;
const clip = (v, max) => typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').trim().slice(0, max) : '';

export async function handle(req, { letters, auth }) {
  const url = new URL(req.url);
  const rest = url.pathname.replace(/^\/api\/letters\/?/, '');

  if (req.method === 'POST' && !rest) {
    if (!sameSite(req)) return json({ error: 'forbidden' }, 403);
    let b; try { b = await req.json() } catch (e) { return json({ error: 'body' }, 400) }
    if (!b || typeof b !== 'object') return json({ error: 'body' }, 400);
    if (b.website) return json({ ok: true }); // the hidden field only a bot fills in
    const post = clip(b.post, 80), box = clip(b.box, 40);
    const choice = Number.isInteger(b.choice) && b.choice >= -1 && b.choice <= 2 ? b.choice : -1;
    const text = clip(b.text, 600);
    if (!SLUG.test(post) || !BOX.test(box)) return json({ error: 'where' }, 400);
    if (choice < 0 && !text) return json({ error: 'Pick one or write a line first' }, 400);
    const at = new Date().toISOString();
    const id = 'l/' + at + '-' + Math.random().toString(36).slice(2, 8).padEnd(6, '0');
    await letters.setJSON(id, { at, post, box, question: clip(b.question, 200), choice, label: choice >= 0 ? clip(b.label, 120) : '', text });
    return json({ ok: true });
  }

  const me = claude(req) || await who(req, auth);
  if (!me) return json({ error: 'signed out' }, 401);
  const staff = me.role === 'claude' || can.everything(me.role);
  if (!staff) return json({ error: 'For Nero and the admins' }, 403);

  if (req.method === 'GET' && !rest) {
    const limit = Math.min(500, Math.max(1, +url.searchParams.get('limit') || 200));
    const { blobs } = await letters.list({ prefix: 'l/' });
    const keys = blobs.map(x => x.key).sort().reverse().slice(0, limit);
    const out = (await Promise.all(keys.map(async k => { const v = await letters.get(k, { type: 'json' }); return v && { id: k, ...v } }))).filter(Boolean);
    return json({ letters: out, total: blobs.length });
  }

  if (req.method === 'DELETE' && ID.test(rest)) {
    if (me.role === 'claude') return json({ error: 'Only Nero and the admins delete letters' }, 403);
    if (!sameSite(req)) return json({ error: 'forbidden' }, 403);
    await letters.delete(rest);
    return json({ ok: true });
  }
  return json({ error: 'not found' }, 404);
}

export default req => handle(req, { letters: getStore('reader-letters'), auth: getStore('admin-auth') });

export const config = {
  path: ['/api/letters', '/api/letters/*'],
  // Blocked at Netlify's edge before the function runs, so a flood costs requests, not compute
  rateLimit: { windowLimit: 10, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};
