// Claude's side of the /admin editor, run by hand from a session (Node 18+, no dependencies):
//   TZ_CLAUDE_KEY=… node tools/editor-api.mjs inbox                      what Nero and the admins dropped in the inbox
//   TZ_CLAUDE_KEY=… node tools/editor-api.mjs draft <post.json> [slug]    saves a draft (signed by Claude, never published)
//   TZ_CLAUDE_KEY=… node tools/editor-api.mjs done <inbox-id> <slug> [note]
//   TZ_CLAUDE_KEY=… node tools/editor-api.mjs lines                      Nero's changes and notes on Ache's lines (/admin/lines)
//   node tools/editor-api.mjs fingerprint <scene.html>                     the 8 characters /admin shows for scene code
// The AI desk (netlify/functions/ai.mjs, guide in docs/ai-admin.md); articles travel as TZ Markdown:
//   … state                               everything at a glance: settings, what Claude may do alone, drafts, inbox, proposals
//   … read <slug>                         a post as TZ Markdown (prints the text; title and the rest on stderr)
//   … write <slug> <file.md> [title] [key=value …]   saves a draft from Markdown (excerpt=, category=, world=, seoTitle=)
//   … check <slug>                        errors and warnings (licensing, Ache's checks) for the saved draft
//   … parts <slug>                        the numbered parts of a draft
//   … ache <slug> <part index | "heading text"> <line> [line …]   Ache's lines for that part (heading = whole section)
//   … publish <slug> [note]               publishes if Nero allowed it, otherwise asks him
//   … settings [patch.json] [note]        shows the site settings, or merges a change
//   … takedown <path|post|image> <value> [note]     hides it now; "undo-takedown" brings it back
//   … proposals | log                     what is waiting for Nero; the activity log
//   … text <slug> [outline]               the article as one text (header + TZ Markdown), or only its headings and blocks
//   … put <slug> <file.md> [publish]      saves that one text back (the header carries title, excerpt, world, cover…)
//   … edit <slug> <edits.json>            small changes without resending: { edits: [{find, replace} | {after, insert} | …], set? }
//   … do <ops.json>                       many actions in one call: { ops: [{ op, … }] }
//   … guide [topic]                       short how-tos: start, markdown, blocks, ache, settings, templates
// TZ_SITE picks the site (default https://artache-tzero.netlify.app). The key is TZ_CLAUDE_KEY in Netlify's settings.
import fs from 'node:fs';
import { createHash } from 'node:crypto';

const [cmd, a, b, ...rest] = process.argv.slice(2);
const SITE = (process.env.TZ_SITE || 'https://artache-tzero.netlify.app').replace(/\/$/, '');
const call = async (path, opts = {}) => {
  const r = await fetch(SITE + path, { ...opts, headers: { Authorization: 'Bearer ' + process.env.TZ_CLAUDE_KEY, 'Content-Type': 'application/json', ...(opts.headers || {}) } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(r.status + ' ' + JSON.stringify(j));
  return j;
};

if (cmd === 'fingerprint') {
  const norm = fs.readFileSync(a, 'utf8').replace(/\r\n?/g, '\n').trim();
  const hex = createHash('sha256').update(norm).digest('hex').slice(0, 8).toUpperCase();
  console.log(hex.slice(0, 4) + '-' + hex.slice(4));
} else if (cmd === 'inbox') {
  const { items } = await call('/api/admin/inbox');
  for (const it of items) console.log(`\n[${it.status}] ${it.id} · ${it.at} · ${it.by}\n${it.text}${it.pictures.length ? '\npictures: ' + it.pictures.map(p => SITE + p).join(' ') : ''}`);
  if (!items.length) console.log('Inbox is empty');
} else if (cmd === 'draft') {
  const post = JSON.parse(fs.readFileSync(a, 'utf8'));
  const slug = b || post.slug;
  console.log(await call('/api/admin/item/' + encodeURIComponent(slug), { method: 'PUT', body: JSON.stringify({ post }) }));
  console.log('Draft is in Nero\'s editor: ' + SITE + '/admin');
} else if (cmd === 'done') {
  console.log(await call('/api/admin/inbox/' + encodeURIComponent(a), { method: 'POST', body: JSON.stringify({ status: 'done', draft: b, note: rest.join(' ') || undefined }) }));
} else if (cmd === 'lines') {
  const { draft, published } = await call('/api/admin/lines');
  if (!draft) console.log('Nero has not saved any line changes yet');
  for (const [k, t] of Object.entries((draft && draft.topics) || {})) {
    console.log(`\n== ${k}${published && published.lines && published.lines[k] ? ' (live)' : ' (draft)'}${t.note ? '\nNOTE: ' + t.note : ''}`);
    for (const l of t.lines) console.log(`${l.off ? '  [muted] ' : '  '}${l.t}${l.note ? '\n      note: ' + l.note : ''}`);
  }
} else if (cmd === 'text' || cmd === 'guide') {
  const r = await fetch(SITE + (cmd === 'guide' ? '/api/ai/guide/' + (a || 'start') : '/api/ai/posts/' + encodeURIComponent(a) + '?as=' + (b === 'outline' ? 'outline' : 'text')), { headers: { Authorization: 'Bearer ' + process.env.TZ_CLAUDE_KEY } });
  if (!r.ok) throw new Error(r.status + ' ' + await r.text());
  console.log(await r.text());
} else if (cmd === 'put') {
  console.log(JSON.stringify(await call('/api/ai/posts/' + encodeURIComponent(a), { method: 'PUT', body: JSON.stringify({ markdown: fs.readFileSync(b, 'utf8'), ...(rest[0] === 'publish' ? { publish: 'ask' } : {}) }) })));
} else if (cmd === 'edit') {
  console.log(JSON.stringify(await call('/api/ai/posts/' + encodeURIComponent(a) + '/edit', { method: 'POST', body: fs.readFileSync(b, 'utf8') })));
} else if (cmd === 'do') {
  const r = await fetch(SITE + '/api/ai/do', { method: 'POST', headers: { Authorization: 'Bearer ' + process.env.TZ_CLAUDE_KEY, 'Content-Type': 'application/json' }, body: fs.readFileSync(a, 'utf8') });
  console.log(JSON.stringify(await r.json(), null, 1));
} else if (cmd === 'state') {
  console.log(JSON.stringify(await call('/api/ai/state'), null, 1));
} else if (cmd === 'read') {
  const r = await call('/api/ai/posts/' + encodeURIComponent(a));
  const { markdown, ...meta } = r.draft || {};
  console.error(JSON.stringify({ slug: r.slug, live: r.live, ...meta }, null, 1));
  console.log(markdown);
} else if (cmd === 'write') {
  const body = { markdown: fs.readFileSync(b, 'utf8') };
  for (const x of rest) { const i = x.indexOf('='); if (i > 0 && /^(excerpt|category|world|seoTitle|kind|publishAt)$/.test(x.slice(0, i))) body[x.slice(0, i)] = x.slice(i + 1); else body.title = x }
  console.log(JSON.stringify(await call('/api/ai/posts/' + encodeURIComponent(a), { method: 'PUT', body: JSON.stringify(body) }), null, 1));
} else if (cmd === 'check') {
  console.log(JSON.stringify(await call('/api/ai/posts/' + encodeURIComponent(a) + '/check', { method: 'POST', body: '{}' }), null, 1));
} else if (cmd === 'parts') {
  for (const p of (await call('/api/ai/posts/' + encodeURIComponent(a) + '/parts')).parts) console.log(String(p.index).padStart(3) + '  ' + p.kind.padEnd(14) + (p.ache ? 'ACHE: ' + (p.ache.set || p.ache.lines.join(' / ')) : p.text));
} else if (cmd === 'ache') {
  const where = /^\d+$/.test(b) ? { after: Number(b) } : { heading: b };
  const r = await call('/api/ai/posts/' + encodeURIComponent(a) + '/ache', { method: 'POST', body: JSON.stringify({ ...where, lines: rest }) });
  console.log(r.note || 'Saved in the draft');
} else if (cmd === 'publish') {
  console.log(JSON.stringify(await call('/api/ai/posts/' + encodeURIComponent(a) + '/publish', { method: 'POST', body: JSON.stringify({ note: [b, ...rest].filter(Boolean).join(' ') }) }), null, 1));
} else if (cmd === 'settings') {
  if (!a) console.log(JSON.stringify((await call('/api/ai/settings')).settings, null, 1));
  else console.log(JSON.stringify(await call('/api/ai/settings', { method: 'PATCH', body: JSON.stringify({ patch: JSON.parse(fs.readFileSync(a, 'utf8')), note: [b, ...rest].filter(Boolean).join(' ') }) }), null, 1));
} else if (cmd === 'takedown' || cmd === 'undo-takedown') {
  const r = await call('/api/ai/takedown', { method: 'POST', body: JSON.stringify({ type: a, value: b, note: rest.join(' '), undo: cmd !== 'takedown' }) });
  console.log(r.proposed ? r.message : 'Done: ' + JSON.stringify(r.settings.hide));
} else if (cmd === 'proposals') {
  console.log(JSON.stringify((await call('/api/ai/proposals?all=1')).proposals, null, 1));
} else if (cmd === 'log') {
  for (const l of (await call('/api/ai/log')).log) console.log(l.at + '  ' + l.by + ' ' + l.action + ': ' + l.what);
} else {
  console.log('AI desk: guide [topic] | text <slug> [outline] | put <slug> <file.md> [publish] | edit <slug> <edits.json> | do <ops.json> | state | read <slug> | write <slug> <file.md> [title] [key=value] | check <slug> | parts <slug> | ache <slug> <index|heading> <line>… | publish <slug> | settings [patch.json] | takedown <path|post|image> <value> [note] | undo-takedown … | proposals | log');
  console.log('Commands: inbox | lines | draft <post.json> [slug] | done <inbox-id> <slug> [note] | fingerprint <scene.html>');
}
