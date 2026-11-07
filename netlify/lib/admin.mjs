/* Who may write: Nero (the owner) and the collaborators he invites, signed in with GitHub; plus Claude with its
   own key (drafts only). Shared by the auth, content and people functions.
   Roles: owner (Nero: everything, and managing people), admin (scene code, the Claude inbox, everyone's posts,
   pages), collaborator (their own articles with the no-code blocks, published directly: Nero's pick 2026-10-27).
   The session is one cookie (__Host-tz_admin): HttpOnly, so no script on any page can read it, Secure, and
   SameSite=Strict, so other sites can't make the browser send it. It holds the GitHub user id, an expiry and a
   generation number, signed with HMAC-SHA256. Bumping the generation (sign out everywhere) voids every cookie. */
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const ADMIN_ID = Number(process.env.TZ_ADMIN_GITHUB_ID || 34218910); // rectornero
export const COOKIE = '__Host-tz_admin';
const DAYS = 30;

export const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers } });

export function cookies(req) {
  const out = {};
  for (const part of (req.headers.get('cookie') || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

// The signing secret: TZ_SESSION_SECRET if Nero sets one, otherwise made once and kept in Blobs
export async function secrets(auth) {
  let s = await auth.get('secret', { type: 'json', consistency: 'strong' });
  if (!s) {
    s = { key: randomBytes(32).toString('base64url'), gen: 1 };
    await auth.setJSON('secret', s, { onlyIfNew: true });
    s = await auth.get('secret', { type: 'json', consistency: 'strong' });
  }
  return { key: process.env.TZ_SESSION_SECRET || s.key, gen: s.gen || 1, raw: s };
}

const sign = (key, data) => createHmac('sha256', key).update(data).digest('base64url');

export async function issue(auth, user) {
  const { key, gen } = await secrets(auth);
  const data = Buffer.from(JSON.stringify({ id: user.id, login: user.login, gen, exp: Date.now() + DAYS * 864e5 })).toString('base64url');
  return `${COOKIE}=${data}.${sign(key, data)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${DAYS * 86400}`;
}

export const clear = () => `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;

// The team: { [githubId]: { id, login, role, active, name, slug, bio, avatar, links } } in Blobs admin-auth/people
export const ROLES = ['admin', 'collaborator'];
export async function people(auth) { return (await auth.get('people', { type: 'json', consistency: 'strong' })) || {} }
export async function editPeople(auth, fn) {
  for (let i = 0; i < 6; i++) {
    const cur = await auth.getWithMetadata('people', { type: 'json', consistency: 'strong' });
    const next = fn((cur && cur.data) || {});
    const res = cur ? await auth.setJSON('people', next, { onlyIfMatch: cur.etag }) : await auth.setJSON('people', next, { onlyIfNew: true });
    if (res.modified !== false) return next;
  }
  throw new Error('people busy');
}
// The role a GitHub account has here, or null when it may not sign in
export function roleOf(id, team) {
  if (id === ADMIN_ID) return 'owner';
  const p = team[id];
  return p && p.active && ROLES.includes(p.role) ? p.role : null;
}
export const can = {
  manage: r => r === 'owner',
  everything: r => r === 'owner' || r === 'admin', // scene code, pages, the inbox, anyone's posts
};
export const slugify = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
// What anyone may see of a person
export const publicProfile = p => ({ slug: p.slug, name: p.name || p.login, bio: p.bio || '', avatar: p.avatar || '', links: p.links || [], role: p.role === 'owner' ? 'Founder' : p.role === 'admin' ? 'Editor' : 'Collaborator' });

// Claude's key (TZ_CLAUDE_KEY): reads the inbox and saves drafts, never publishes
export function claude(req) {
  const key = process.env.TZ_CLAUDE_KEY, h = req.headers.get('authorization') || '';
  if (!key || key.length < 24 || !h.startsWith('Bearer ')) return null;
  const a = Buffer.from(h.slice(7)), b = Buffer.from(key);
  return a.length === b.length && timingSafeEqual(a, b) ? { id: 'claude', login: 'claude', role: 'claude', name: 'Claude', slug: 'claude' } : null;
}

// The signed-in person ({ id, login, role, name, slug }), or null
export async function who(req, auth) {
  const raw = cookies(req)[COOKIE];
  if (!raw || raw.indexOf('.') < 0) return null;
  const [data, sig] = raw.split('.');
  const { key, gen } = await secrets(auth);
  const want = Buffer.from(sign(key, data)), got = Buffer.from(sig || '');
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  let p; try { p = JSON.parse(Buffer.from(data, 'base64url').toString()) } catch (e) { return null }
  if (p.gen !== gen || !(p.exp > Date.now())) return null;
  // Checked on every call, so removing someone ends their sessions at once
  const team = await people(auth), role = roleOf(p.id, team);
  if (!role) return null;
  const me = team[p.id] || {};
  return { id: p.id, login: me.login || p.login, role, name: me.name || me.login || p.login, slug: me.slug || slugify(p.login) };
}

// Writes must come from this site's own pages: same Origin, plus a custom header that a plain cross-site form
// or image can't send (it forces a CORS preflight, which this API never approves)
export function sameSite(req) {
  const origin = req.headers.get('origin');
  return req.headers.get('x-tz') === '1' && (!origin || origin === new URL(req.url).origin);
}
