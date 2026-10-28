/* Sign in to /admin with GitHub (Nero picked it, 2026-10-27). Nero (ADMIN_ID) and the people he invited get a
   session; anyone else is turned away.
   GET  /api/auth/login     -> to GitHub's sign-in page
   GET  /api/auth/callback  -> back from GitHub: check who it is, set the session cookie, go to /admin
   GET  /api/auth/me        -> { login } or 401
   POST /api/auth/logout    -> clears this browser's session
   POST /api/auth/everywhere -> Nero only: signs out every browser of everyone (new generation)
   Needs TZ_GITHUB_CLIENT_ID and TZ_GITHUB_CLIENT_SECRET (a GitHub App's user sign-in). The GitHub token is
   used once to read who signed in, then dropped; nothing from GitHub is stored. */
import { getStore } from '@netlify/blobs';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { ADMIN_ID, json, cookies, issue, clear, who, sameSite, secrets, people, editPeople, roleOf, slugify } from '../lib/admin.mjs';

const STATE = '__Host-tz_state';
const go = (to, cookie) => new Response(null, { status: 302, headers: { Location: to, 'Cache-Control': 'no-store', ...(cookie ? { 'Set-Cookie': cookie } : {}) } });

export async function handle(req, auth, gh = fetch) {
  const url = new URL(req.url);
  const step = url.pathname.replace(/^\/api\/auth\/?/, '');
  const id = process.env.TZ_GITHUB_CLIENT_ID, secret = process.env.TZ_GITHUB_CLIENT_SECRET;
  const back = url.origin + '/api/auth/callback';

  if (step === 'login') {
    if (!id) return json({ error: 'GitHub sign-in is not set up yet' }, 503);
    const state = randomBytes(18).toString('base64url');
    const to = 'https://github.com/login/oauth/authorize?' + new URLSearchParams({ client_id: id, redirect_uri: back, state, allow_signup: 'false' });
    return go(to, `${STATE}=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);
  }

  if (step === 'callback') {
    const state = url.searchParams.get('state') || '', code = url.searchParams.get('code');
    const want = Buffer.from(cookies(req)[STATE] || ''), got = Buffer.from(state);
    if (!code || !want.length || want.length !== got.length || !timingSafeEqual(want, got)) return go('/admin?signin=state');
    const t = await gh('https://github.com/login/oauth/access_token', {
      method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: id, client_secret: secret, code, redirect_uri: back }),
    }).then(r => r.json()).catch(() => ({}));
    if (!t.access_token) return go('/admin?signin=github');
    const user = await gh('https://api.github.com/user', { headers: { Authorization: 'Bearer ' + t.access_token, Accept: 'application/vnd.github+json', 'User-Agent': 'tzero-admin' } })
      .then(r => r.ok ? r.json() : null).catch(() => null);
    if (!user || !roleOf(user.id, await people(auth))) return go('/admin?signin=denied');
    // Keep their GitHub name and picture fresh; Nero gets a profile the first time
    await editPeople(auth, team => {
      const owner = user.id === ADMIN_ID;
      const p = team[user.id] || { id: user.id, role: 'owner', active: true, name: owner ? 'Nero' : user.name || user.login, slug: owner ? 'nero' : slugify(user.login), bio: '', links: [] };
      team[user.id] = { ...p, login: user.login, avatar: p.avatarCustom ? p.avatar : user.avatar_url, lastSeen: new Date().toISOString() };
      return team;
    });
    const res = go('/admin');
    res.headers.append('Set-Cookie', await issue(auth, user));
    res.headers.append('Set-Cookie', `${STATE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
    return res;
  }

  if (step === 'me') {
    const me = await who(req, auth);
    return me ? json(me) : json({ error: 'signed out', ready: Boolean(id) }, 401);
  }

  if (req.method === 'POST' && sameSite(req) && step === 'logout') return json({ ok: true }, 200, { 'Set-Cookie': clear() });

  if (req.method === 'POST' && sameSite(req) && step === 'everywhere') {
    const me = await who(req, auth);
    if (!me || me.role !== 'owner') return json({ error: 'only Nero' }, 403);
    const { raw } = await secrets(auth);
    await auth.setJSON('secret', { ...raw, gen: (raw.gen || 1) + 1 });
    return json({ ok: true }, 200, { 'Set-Cookie': clear() });
  }
  return json({ error: 'not found' }, 404);
}

export default req => handle(req, getStore('admin-auth'));

export const config = {
  path: '/api/auth/*',
  // Blocked at Netlify's edge before the function runs
  rateLimit: { windowLimit: 20, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};
