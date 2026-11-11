/* The site desk: settings that change the live site without a deploy (Nero asked for it, 2026-11-11).
   One JSON document in Netlify Blobs (store "site-content", key "site/settings"), read by every page through the
   CDN-cached GET /api/site (netlify/functions/site.mjs) and applied in the browser by assets/js/site.js.
   Every save keeps a version (site-ver/<time>) and writes a line in the activity log (log/<time>-<id>).
   Claude's own changes go through permissions Nero sets here (see CLAUDE_AREAS): allowed ones apply at once,
   the rest wait as proposals (prop/<id>) for Nero's tap. */
import { randomBytes } from 'node:crypto';

export const SETTINGS = 'site/settings';
export const LINE_KEY = /^[a-z0-9][a-z0-9-]{0,59}$/;
export const SLUG = /^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/;

// What Claude may change by itself. Nero flips these in /admin/site → Claude. Off = Claude proposes, Nero approves.
// Takedowns start on: hiding something is always safe to undo, and licensing problems can't wait for a reply.
export const CLAUDE_AREAS = {
  takedowns: 'Hide pages, posts and pictures (licensing takedowns)',
  notice: 'The notice bar at the top of every page',
  mood: "Ache's news moment",
  home: "The homepage's first polaroid",
  flags: 'Switches',
  links: 'Short links (/go/...)',
  newsletter: 'Newsletter form',
  publish: 'Publish articles (otherwise Claude saves drafts and asks)',
  lines: "Publish changes to Ache's script book",
};
export const DEFAULTS = {
  notice: { on: false, text: '', link: '', linkText: '', tone: 'red', until: '' },
  mood: { mode: 'wix', slug: '', topic: '', lines: [] },
  newsletter: { provider: '', id: '' },
  home: { pick: { on: false, img: '', alt: '', cap: '', kick: '', note: '', href: '', linkText: '' } },
  hide: { paths: [], posts: [], images: [], note: '' },
  flags: { 'cq-wip': true },
  links: {},
  claude: { takedowns: true, notice: false, mood: false, home: false, flags: false, links: false, newsletter: false, publish: false, lines: false },
};
// Switches the site's code knows about (shown with a label in /admin/site; any other key is a free switch)
export const KNOWN_FLAGS = {
  'cq-wip': 'Contrary Quest "under construction" tape cards (studio, story, lab)',
  'newsletter-band': 'Newsletter band above the footer',
  'share-row': 'Share buttons under articles',
};

const str = (v, max) => typeof v === 'string' ? v.trim().slice(0, max) : '';
const bool = v => v === true;
// A link the site may show: an own path or an https address
export function href(v) {
  v = str(v, 500);
  if (!v) return '';
  if (/^\/(?!\/)[^\s<>"]*$/.test(v)) return v;
  try { const u = new URL(v); return u.protocol === 'https:' ? u.href : null } catch (e) { return null }
}
const path = v => { v = str(v, 200); return /^\/[a-z0-9\-/_.%]*$/i.test(v) && !/^\/(admin|api|assets|embed)(\/|$)/.test(v) ? v.replace(/\/+$/, '') || '/' : null };

// Cleans one whole settings document. Returns { value, errors }: unknown keys are dropped, bad values reported.
export function clean(input) {
  const s = input && typeof input === 'object' ? input : {};
  const errors = [];
  const bad = what => { errors.push(what); return '' };
  const n = s.notice || {}, m = s.mood || {}, nl = s.newsletter || {}, pk = (s.home && s.home.pick) || {}, h = s.hide || {};
  const out = {
    notice: {
      on: bool(n.on), text: str(n.text, 280), link: href(n.link) ?? bad('notice.link'), linkText: str(n.linkText, 60),
      tone: ['red', 'navy', 'sun'].includes(n.tone) ? n.tone : 'red',
      until: n.until ? (isNaN(Date.parse(n.until)) ? bad('notice.until') : new Date(n.until).toISOString()) : '',
    },
    mood: {
      mode: ['wix', 'on', 'off'].includes(m.mode) ? m.mode : 'wix',
      slug: m.slug ? (SLUG.test(m.slug) ? m.slug : bad('mood.slug')) : '',
      topic: str(m.topic, 120),
      lines: (Array.isArray(m.lines) ? m.lines : []).map(l => str(l, 300)).filter(Boolean).slice(0, 30),
    },
    newsletter: {
      provider: ['', 'kit', 'buttondown', 'mailerlite'].includes(nl.provider) ? nl.provider : bad('newsletter.provider'),
      id: /^[\w\-/]{0,80}$/.test(nl.id || '') ? (nl.id || '') : bad('newsletter.id'),
    },
    home: { pick: {
      on: bool(pk.on), img: href(pk.img) ?? bad('home.pick.img'), alt: str(pk.alt, 200), cap: str(pk.cap, 80), kick: str(pk.kick, 60),
      note: str(pk.note, 300), href: href(pk.href) ?? bad('home.pick.href'), linkText: str(pk.linkText, 60),
    } },
    hide: {
      paths: (Array.isArray(h.paths) ? h.paths : []).slice(0, 100).map(x => {
        const p = path(x && x.path);
        return p ? { path: p, note: str(x.note, 300), at: str(x.at, 40) || new Date().toISOString() } : bad('hide.paths ' + (x && x.path));
      }).filter(Boolean),
      posts: (Array.isArray(h.posts) ? h.posts : []).slice(0, 300).map(x => {
        const slug = typeof x === 'string' ? x : x && x.slug;
        return SLUG.test(slug || '') ? { slug, note: str(x && x.note, 300), at: str(x && x.at, 40) || new Date().toISOString() } : bad('hide.posts ' + slug);
      }).filter(Boolean),
      images: (Array.isArray(h.images) ? h.images : []).slice(0, 300).map(x => {
        const match = str(typeof x === 'string' ? x : x && x.match, 300);
        return match.length >= 6 && !/["\\<>]/.test(match) ? { match, note: str(x && x.note, 300), at: str(x && x.at, 40) || new Date().toISOString() } : bad('hide.images ' + match);
      }).filter(Boolean),
      note: str(h.note, 300),
    },
    flags: {},
    links: {},
    claude: {},
  };
  for (const [k, v] of Object.entries(s.flags || {}).slice(0, 60)) {
    if (LINE_KEY.test(k) && typeof v === 'boolean') out.flags[k] = v; else bad('flags.' + k);
  }
  for (const [k, v] of Object.entries(s.links || {}).slice(0, 200)) {
    const to = href(v && typeof v === 'object' ? v.to : v);
    if (LINE_KEY.test(k) && to) out.links[k] = to; else bad('links.' + k);
  }
  for (const k of Object.keys(CLAUDE_AREAS)) out.claude[k] = s.claude && k in s.claude ? bool(s.claude[k]) : DEFAULTS.claude[k];
  if (out.notice.on && !out.notice.text) bad('notice.text (the bar is on but empty)');
  if (out.mood.mode === 'on' && !out.mood.slug) bad('mood.slug (which article Ache grieves over)');
  return { value: out, errors: [...new Set(errors)].slice(0, 20) };
}

// Deep merge of a partial change into the settings: objects merge, arrays and values replace
export function merge(base, patch) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return patch;
  const out = { ...(base && typeof base === 'object' && !Array.isArray(base) ? base : {}) };
  for (const [k, v] of Object.entries(patch)) {
    if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
    out[k] = v === null ? undefined : merge(out[k], v);
    if (out[k] === undefined) delete out[k];
  }
  return out;
}

// Which areas (top-level keys) a change touches
export const areas = patch => Object.keys(patch || {}).filter(k => k in DEFAULTS);

export async function readSettings(store) {
  const cur = await store.get(SETTINGS, { type: 'json', consistency: 'strong' });
  return clean(merge(DEFAULTS, cur || {})).value;
}

// Saves the whole settings document with a version, safely against two saves at once. fn(old) -> new.
export async function writeSettings(store, fn, by) {
  for (let i = 0; i < 6; i++) {
    const cur = await store.getWithMetadata(SETTINGS, { type: 'json', consistency: 'strong' });
    const old = clean(merge(DEFAULTS, (cur && cur.data) || {})).value;
    const { value, errors } = clean(fn(old));
    if (errors.length) return { errors };
    const at = new Date().toISOString();
    const doc = { ...value, savedAt: at, by };
    const res = cur ? await store.setJSON(SETTINGS, doc, { onlyIfMatch: cur.etag }) : await store.setJSON(SETTINGS, doc, { onlyIfNew: true });
    if (res.modified === false) continue;
    await store.setJSON('site-ver/' + at, { settings: doc, by });
    return { value: doc, old };
  }
  throw new Error('settings busy');
}

// What every visitor may see: no Claude permissions, no short links, expired notices dropped
export function publicView(s, lines, now = Date.now()) {
  const notice = s.notice.on && s.notice.text && !(s.notice.until && Date.parse(s.notice.until) < now)
    ? { text: s.notice.text, link: s.notice.link, linkText: s.notice.linkText, tone: s.notice.tone, id: hash(s.notice.text + s.notice.link) } : null;
  return {
    at: s.savedAt || null,
    notice,
    mood: s.mood.mode === 'on' ? { mode: 'on', slug: s.mood.slug, topic: s.mood.topic || s.mood.slug, lines: s.mood.lines } : { mode: s.mood.mode },
    newsletter: s.newsletter.provider && s.newsletter.id ? s.newsletter : null,
    home: { pick: s.home.pick.on ? s.home.pick : null },
    hide: { paths: s.hide.paths.map(x => ({ path: x.path, note: x.note })), posts: s.hide.posts.map(x => x.slug), images: s.hide.images.map(x => x.match) },
    flags: s.flags,
    lines: lines || {},
  };
}
const hash = t => { let h = 2166136261; for (const c of String(t)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619) } return (h >>> 0).toString(36) };

// The activity log: who changed what, newest first in /admin/site → Activity
export async function log(store, who, action, what, extra = {}) {
  try {
    const at = new Date().toISOString();
    await store.setJSON('log/' + at + '-' + randomBytes(3).toString('hex'), { at, by: who && (who.login || who.name) || '?', role: who && who.role || '', action, what: String(what || '').slice(0, 300), ...extra });
  } catch (e) { console.log('log', e.message) }
}
export async function readLog(store, limit = 50) {
  const { blobs } = await store.list({ prefix: 'log/' });
  const keys = blobs.map(b => b.key).sort().reverse().slice(0, Math.min(200, limit));
  return (await Promise.all(keys.map(k => store.get(k, { type: 'json' })))).filter(Boolean);
}

// Proposals: what Claude asked for and Nero hasn't answered yet
export async function propose(store, kind, payload, note) {
  const at = new Date().toISOString(), id = at.replace(/[:.]/g, '-') + '-' + randomBytes(3).toString('hex');
  const p = { id, at, kind, payload, note: str(note, 2000), status: 'open', by: 'claude' };
  await store.setJSON('prop/' + id, p);
  return p;
}
export async function proposals(store, all = false) {
  const { blobs } = await store.list({ prefix: 'prop/' });
  const items = (await Promise.all(blobs.map(b => store.get(b.key, { type: 'json', consistency: 'strong' })))).filter(Boolean);
  return items.filter(p => all || p.status === 'open').sort((a, b) => b.at.localeCompare(a.at)).slice(0, 100);
}
