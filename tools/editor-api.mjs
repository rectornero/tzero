// Claude's side of the /admin editor, run by hand from a session (Node 18+, no dependencies):
//   TZ_CLAUDE_KEY=… node tools/editor-api.mjs inbox                      what Nero and the admins dropped in the inbox
//   TZ_CLAUDE_KEY=… node tools/editor-api.mjs draft <post.json> [slug]    saves a draft (signed by Claude, never published)
//   TZ_CLAUDE_KEY=… node tools/editor-api.mjs done <inbox-id> <slug> [note]
//   node tools/editor-api.mjs fingerprint <scene.html>                     the 8 characters /admin shows for scene code
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
} else {
  console.log('Commands: inbox | draft <post.json> [slug] | done <inbox-id> <slug> [note] | fingerprint <scene.html>');
}
