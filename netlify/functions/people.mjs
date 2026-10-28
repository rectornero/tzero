/* The people who write for TZERØ: public profiles, and Nero's team management (asked 2026-10-27).
   Public, cached:
   GET  /api/people              -> { people: [profile...] } everyone active, with a profile page at /people/<slug>
   Signed in:
   GET  /api/me                  -> my profile and role
   PUT  /api/me                  -> { name, slug, bio, avatar, links: [{ label, url }] }
   Nero only:
   GET  /api/team                -> everyone, with role, state and last sign-in
   POST /api/team                -> { login, role } invites a GitHub account (looked up by its name, kept by its id)
   POST /api/team/<id>           -> { role?, active? } changes a role, or removes (active: false) and ends their sessions
   Everything lives in one Blobs entry (admin-auth/people). Estimated cost: well under 1 credit a month. */
import { getStore } from '@netlify/blobs';
import { purgeCache } from '@netlify/functions';
import { json, who, sameSite, people, editPeople, ROLES, slugify, publicProfile, ADMIN_ID } from '../lib/admin.mjs';

const CDN = { 'Cache-Control': 'public, max-age=0, must-revalidate', 'Netlify-CDN-Cache-Control': 'public, durable, s-maxage=600, stale-while-revalidate=600', 'Netlify-Cache-Tag': 'people' };
const str = (v, max) => typeof v === 'string' ? v.trim().slice(0, max) : '';
function cleanLinks(links) {
  return (Array.isArray(links) ? links : []).slice(0, 6).map(l => {
    let url = ''; try { const u = new URL(str(l && l.url, 300)); if (u.protocol === 'https:') url = u.href } catch (e) {}
    return { label: str(l && l.label, 40) || (url && new URL(url).hostname), url };
  }).filter(l => l.url);
}
const okAvatar = a => /^\/api\/media\/[\w-]+\.(webp|png|jpg|gif)$/.test(a) || /^https:\/\/avatars\.githubusercontent\.com\//.test(a);

export async function handle(req, { auth, gh = fetch, purge = async () => { try { await purgeCache({ tags: ['people'] }) } catch (e) { console.log('purge', e.message) } } }) {
  const url = new URL(req.url);
  const [, area, id] = url.pathname.split('/').filter(Boolean); // api, area, id

  if (area === 'people' && req.method === 'GET') {
    const team = await people(auth);
    const list = Object.values(team).filter(p => p.active || p.role === 'owner' || p.id === ADMIN_ID).map(publicProfile)
      .sort((a, b) => (a.role === 'Founder' ? -1 : b.role === 'Founder' ? 1 : a.name.localeCompare(b.name)));
    return json({ people: list }, 200, CDN);
  }

  const me = await who(req, auth);
  if (!me) return json({ error: 'signed out' }, 401);
  if (req.method !== 'GET' && !sameSite(req)) return json({ error: 'origin' }, 403);
  const body = req.method === 'GET' ? {} : await req.json().catch(() => ({}));

  if (area === 'me') {
    if (req.method === 'GET') { const p = (await people(auth))[me.id] || {}; return json({ ...publicProfile({ ...p, ...me, role: me.role }), login: me.login, role: me.role, id: me.id }) }
    if (req.method !== 'PUT') return json({ error: 'method' }, 405);
    const slug = slugify(body.slug || body.name || me.login);
    if (!slug) return json({ error: 'address' }, 400);
    let clash = false;
    await editPeople(auth, team => {
      if (Object.values(team).some(p => p.id !== me.id && p.slug === slug)) { clash = true; return team }
      const p = team[me.id] || { id: me.id, login: me.login, role: me.role === 'owner' ? 'owner' : me.role, active: true };
      const avatar = str(body.avatar, 300);
      team[me.id] = { ...p, name: str(body.name, 60) || me.login, slug, bio: str(body.bio, 600), links: cleanLinks(body.links), ...(avatar && okAvatar(avatar) ? { avatar, avatarCustom: avatar.startsWith('/api/media/') } : {}) };
      return team;
    });
    if (clash) return json({ error: 'That address is taken' }, 409);
    await purge();
    return json({ ok: true, slug });
  }

  if (area !== 'team') return json({ error: 'not found' }, 404);
  if (me.role !== 'owner') return json({ error: 'only Nero' }, 403);

  if (req.method === 'GET' && !id) {
    const team = await people(auth);
    return json({ team: Object.values(team).map(p => ({ id: p.id, login: p.login, name: p.name, slug: p.slug, role: p.id === ADMIN_ID ? 'owner' : p.role, active: p.id === ADMIN_ID || Boolean(p.active), lastSeen: p.lastSeen || null, avatar: p.avatar || '' })) });
  }

  if (req.method === 'POST' && !id) {
    const login = str(body.login, 39).replace(/^@/, '');
    if (!/^[a-z\d](?:[a-z\d-]{0,38})$/i.test(login)) return json({ error: 'That is not a GitHub name' }, 400);
    if (!ROLES.includes(body.role)) return json({ error: 'role' }, 400);
    const u = await gh('https://api.github.com/users/' + encodeURIComponent(login), { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'tzero-admin' } }).then(r => r.ok ? r.json() : null).catch(() => null);
    if (!u || !u.id) return json({ error: 'No GitHub account with that name' }, 404);
    if (u.id === ADMIN_ID) return json({ error: 'That is you' }, 400);
    await editPeople(auth, team => {
      const p = team[u.id] || {};
      let slug = p.slug || slugify(u.login);
      while (Object.values(team).some(x => x.id !== u.id && x.slug === slug)) slug += '-1';
      team[u.id] = { bio: '', links: [], ...p, id: u.id, login: u.login, name: p.name || u.name || u.login, slug, avatar: p.avatarCustom ? p.avatar : u.avatar_url, role: body.role, active: true, invitedAt: new Date().toISOString() };
      return team;
    });
    await purge();
    return json({ ok: true, login: u.login });
  }

  if (req.method === 'POST' && id) {
    const n = Number(id);
    if (n === ADMIN_ID) return json({ error: 'You stay the owner' }, 400);
    let found = false;
    await editPeople(auth, team => {
      if (!team[n]) return team;
      found = true;
      if (body.role !== undefined) { if (ROLES.includes(body.role)) team[n].role = body.role }
      if (body.active !== undefined) team[n].active = Boolean(body.active);
      return team;
    });
    if (!found) return json({ error: 'not found' }, 404);
    await purge();
    return json({ ok: true });
  }
  return json({ error: 'not found' }, 404);
}

export default req => handle(req, { auth: getStore('admin-auth') });

export const config = {
  path: ['/api/people', '/api/me', '/api/team', '/api/team/*'],
  rateLimit: { windowLimit: 60, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};
