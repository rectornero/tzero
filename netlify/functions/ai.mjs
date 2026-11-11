/* The AI desk: the admin, made for Claude (Nero asked for it, 2026-11-11). Two doors to the same rules:
     REST  /api/ai/...   JSON in, JSON out, articles as TZ Markdown (netlify/lib/markdown.mjs)
     MCP   /api/mcp      the same actions as Model Context Protocol tools (JSON-RPC over HTTP, stateless)
   Both need Claude's key: "Authorization: Bearer <TZ_CLAUDE_KEY>". Nothing here bypasses the editor's rules: every
   call is passed to the content and site functions as Claude, so drafts are signed by Claude, collaborators' rules
   don't apply, and anything Nero hasn't allowed (publishing, settings areas, Ache's script book) becomes a proposal
   he approves in /admin/site → Claude. Full guide: docs/ai-admin.md, or GET /api/ai.
   Cost: one short function run per call, only when a session uses it (no schedule, no polling): well under
   1 credit a month at a few hundred calls. */
import { getStore } from '@netlify/blobs';
import { json, claude } from '../lib/admin.mjs';
import { toMarkdown, toRicos, parts, acheNode, noteMarkdown, BLOCK_GUIDE } from '../lib/markdown.mjs';
import { readSettings, propose, proposals, readLog, log, CLAUDE_AREAS, KNOWN_FLAGS, LINE_KEY, SLUG } from '../lib/site.mjs';
import { handle as contentHandle, check } from './content.mjs';
import { handle as siteHandle } from './site.mjs';

const CATS = { devlog: '986847d2-3b96-464b-8b8b-338e07845d9c', studio: 'de8055a9-ce06-426e-a47f-d860d026981f' };
const CAT_NAME = Object.fromEntries(Object.entries(CATS).map(([k, v]) => [v, k]));
const TAG_TZERO = 'ee35b6d4-c6dc-490a-83cd-4cd17980a6bc';
// Licensing (Nero, 2026-11-11): no Starchasers crew art and no old characters anywhere on the site. These
// patterns only warn (a person still decides); anything on the takedown list is refused outright.
const LICENSING = [
  [/contrary|cnq-|agata|\/caw\/(outfit|banner|token|door|ref)/i, 'looks like an old character picture (old characters are down until they are redrawn)'],
  [/starchasers\/(?!(logo-emblem|title-key-art|weary-reach))/i, 'a Starchasers picture other than the emblem, title key art (ship only) or Weary Reach maps: crew art is banned until the new designs'],
  [/crew|captain|aria|charlotte|matilda|wilhelm|zephir/i, 'the file name suggests Starchasers crew art, which is banned'],
];

const MANUAL = {
  name: 'TZERØ admin for AI',
  version: 1,
  auth: 'Authorization: Bearer <TZ_CLAUDE_KEY> on every call',
  rules: [
    'You are Claude. Drafts you save are signed by Claude and wait for Nero, unless Nero switched on "publish" for you.',
    'Changes to areas Nero has not opened to you become proposals; Nero approves them in /admin/site → Claude. The response says proposed: true.',
    'Licensing: never use Starchasers crew art or old characters (Contrary Quest, Characters Across Worlds cast). Check pictures with POST /api/ai/posts/<slug>/check.',
    'No spoilers about Starchasers (boss names, ending, late twists, secret modes).',
    'Each production deploy costs 15 Netlify credits; nothing here deploys. Do not call this API on a schedule or in a loop.',
  ],
  articleFormat: 'TZ Markdown, see GET /api/ai/markdown. Unknown blocks come back as ```tz-node fences: keep them as they are.',
  endpoints: {
    'GET /api/ai/state': 'One look at everything: settings, your permissions, drafts, open inbox items, your open proposals, the last 15 changes',
    'GET /api/ai/posts': 'Drafts and published posts and pages',
    'GET /api/ai/posts/<slug>': 'One post: title, excerpt, category, markdown (draft first, then the live copy)',
    'PUT /api/ai/posts/<slug>': '{ title, excerpt?, markdown | richContent, category?: "studio"|"devlog", world?: "<game world key from /assets/worlds.json, empty for the TZERØ look>", kind?: "article"|"page", publishAt?, seoTitle?, cover?: { url, width, height, alt } } saves a draft. Missing fields keep the draft\'s current values.',
    'POST /api/ai/posts/<slug>/check': 'Dry run: { markdown?, ... } or the saved draft. Returns errors (would be refused) and warnings (licensing, Ache checks)',
    'GET /api/ai/posts/<slug>/parts': 'The numbered parts of the draft, with Ache markers, to place Ache\'s lines',
    'POST /api/ai/posts/<slug>/ache': '{ after: <part index> | heading: "<heading text>", lines: [..] | set: "<line set key>", scope?: "part"|"section", show?: "hidden"|"bubble" } adds Ache\'s lines to a part. With heading, the marker goes at the end of that section with scope "section".',
    'DELETE /api/ai/posts/<slug>/ache/<index>': 'Removes the Ache marker at that part index',
    'POST /api/ai/posts/<slug>/publish': '{ note? } publishes if Nero allowed it, otherwise asks him (proposal)',
    'DELETE /api/ai/posts/<slug>': 'Deletes a draft that is not published',
    'GET /api/ai/settings': 'The site settings (notice bar, Ache news moment, newsletter, homepage pick, takedowns, switches, short links, your permissions)',
    'PATCH /api/ai/settings': '{ patch, note } merges a change: objects merge, arrays replace, null removes a key',
    'POST /api/ai/takedown': '{ type: "path"|"post"|"image", value, note, undo?: true } hides a page, a post or every picture whose address contains value',
    'GET /api/ai/lines': 'Ache\'s script book as Nero left it: sets, muted lines and his notes for you',
    'POST /api/ai/lines': '{ topics: { "<set>": { lines: [{ t, off?, note? }], note? } }, note } proposes new or changed sets (merged over his draft)',
    'GET /api/ai/inbox': 'Material Nero and the admins dropped for you',
    'POST /api/ai/inbox/<id>': '{ status: "done"|"open", draft?: "<slug>", note? }',
    'POST /api/ai/media': 'Picture bytes (Content-Type image/webp|png|jpeg|gif, under 2 MB) or JSON { base64, type } -> { url }',
    'GET /api/ai/proposals': 'Your proposals and Nero\'s answers (?all=1 includes answered ones)',
    'GET /api/ai/log': 'The activity log, newest first (?limit=50)',
    'POST /api/ai/do': '{ ops: [{ op, ... }], keepGoing? } many actions in one call (ops: GET /api/ai/guide/start)',
    'POST /api/ai/posts/<slug>/edit': '{ edits: [{find, replace} | {after|before, insert} | {append} | {prepend} | {remove}], set?, publish? } changes a draft without resending it',
    'GET /api/ai/posts/<slug>?as=text|outline': 'The article as one text (header + TZ Markdown), or only its headings and blocks',
    'GET /api/ai/guide/<topic>': 'Short how-tos: start, markdown, blocks, ache, settings, templates',
    'POST /api/mcp': 'MCP: six tools (state, guide, read, write, edit, do); ?tools=all lists every op as a tool',
  },
};

const MARKDOWN_GUIDE = `TZ Markdown (articles through the AI desk)
Blocks
  ## Heading   ### Subheading   #### Small heading
  ::kicker STUDIO NOTES · 11 NOVEMBER        small red line that opens an article
  ---  /  ===                                divider / double divider
  ::space                                    an empty line of space
  > quote (an empty ">" line starts a new paragraph of the quote)
  - item  /  1. item
  ![what the picture shows](url "caption"){1280x720}
  ::youtube https://youtu.be/ID caption
  ::button [Open Starchasers](/starchasers)
  \`\`\`js  ...code...  \`\`\`
  :::ache scope=part show=hidden
  a line Ache says near the part ABOVE this marker
  another line (one per line, up to 30)
  :::
     scope=section: the whole section since the last heading. show=bubble: also a small visible "Ache says" note.
     set=<key>: use a set from his script book (GET /api/ai/lines) instead of lines written here.
  \`\`\`tz-node  {any Ricos node as JSON}  \`\`\`  visual novels, hotspots, scene code, galleries; keep them as they are
Inline
  **bold**  *italic*  ++underline++  [link](https://...)  {red:text}  {navy:text}  {#2a6f97:text}  {20px:text}  {big:text}
  A backslash escapes * [ ] { } + \\
Ache's voice: lowercase, short, funny, warm, a bit smug; never mean; never spoilers.`;

const err = (status, error, extra = {}) => json({ error, ...extra }, status);

function deps(env) {
  return env || { store: getStore('site-content'), media: getStore('site-media'), auth: getStore('admin-auth') };
}

export async function handle(req, env) {
  const d = deps(env);
  const me = claude(req);
  if (!me) return err(401, 'Claude\'s key is missing or wrong (Authorization: Bearer <TZ_CLAUDE_KEY>)');
  const url = new URL(req.url);
  if (url.pathname === '/api/mcp') return mcp(req, d);
  const p = url.pathname.split('/').filter(Boolean).slice(2).map(decodeURIComponent); // after api/ai
  const body = ['GET', 'DELETE'].includes(req.method) ? {} : await readBody(req);
  if (body instanceof Response) return body;
  const out = await route(req.method, p, body, url.searchParams, d, req);
  return out instanceof Response ? out : json(out.body, out.status || 200);
}

async function readBody(req) {
  const type = (req.headers.get('content-type') || '').split(';')[0];
  if (type.startsWith('image/')) return { bytes: await req.arrayBuffer(), type };
  const t = await req.text();
  if (t.length > 1_600_000) return err(413, 'too big');
  try { return t ? JSON.parse(t) : {} } catch (e) { return err(400, 'body is not JSON') }
}

// Calls the content or site function as Claude
async function inner(d, fn, method, path, body, headers = {}) {
  const h = { authorization: 'Bearer ' + process.env.TZ_CLAUDE_KEY, ...headers };
  let payload;
  if (body instanceof ArrayBuffer) payload = body;
  else if (body !== undefined) { payload = JSON.stringify(body); h['content-type'] = 'application/json' }
  const res = await fn(new Request('https://site.local' + path, { method, headers: h, body: payload }), d);
  const j = await res.json().catch(() => ({}));
  return { status: res.status, body: j };
}
const C = (d, ...a) => inner(d, contentHandle, ...a);
const S = (d, ...a) => inner(d, siteHandle, ...a);

async function draftOf(d, slug) {
  const r = await C(d, 'GET', '/api/admin/item/' + encodeURIComponent(slug));
  if (r.status !== 200) return { status: r.status, body: r.body };
  return { status: 200, draft: r.body.draft, published: r.body.published };
}

function describe(post, extra = {}) {
  if (!post) return null;
  const cover = post.media && post.media.wixMedia && post.media.wixMedia.image;
  const seo = ((post.seoData && post.seoData.tags) || []).find(t => t.type === 'title');
  return {
    title: post.title, excerpt: post.excerpt || '', kind: post.kind || 'article', category: (post.categoryIds || []).map(c => CAT_NAME[c] || c)[0] || '',
    world: post.world || '', author: post.authorName || '', publishAt: post.publishAt || null, seoTitle: seo ? String(seo.children).replace(/ \| TZERØ$/, '') : '',
    cover: cover ? { url: cover.url || cover.id, width: cover.width, height: cover.height, alt: post.media.altText || '' } : null,
    markdown: toMarkdown(post.richContent, post.ache), ...extra,
  };
}

// One text for a whole article: a short header (title, excerpt, category, world, cover…) and the TZ Markdown body.
// Reading and writing this form costs the fewest tokens: no JSON around the text.
const HEAD = ['title', 'excerpt', 'category', 'world', 'kind', 'publishAt', 'seoTitle', 'cover', 'publish'];
function frontMatter(md) {
  const m = /^---\n([\s\S]*?)\n---[ \t]*(\n|$)/.exec(md.replace(/\r\n?/g, '\n'));
  if (!m) return { fields: {}, body: md };
  const fields = {};
  for (const l of m[1].split('\n')) {
    const i = l.indexOf(':'); if (i < 1) continue;
    const k = l.slice(0, i).trim(), v = l.slice(i + 1).trim();
    if (!HEAD.includes(k)) continue;
    if (k === 'cover') { const [url, alt, size] = v.split(/\s*\|\s*/); const wh = /^(\d+)x(\d+)$/.exec(size || ''); fields.cover = url ? { url, alt: alt || '', ...(wh ? { width: +wh[1], height: +wh[2] } : {}) } : null }
    else if (k === 'publish') fields.publish = v === 'true' || v === 'yes' ? true : v === 'ask' ? 'ask' : false;
    else fields[k] = v;
  }
  return { fields, body: md.replace(/\r\n?/g, '\n').slice(m[0].length) };
}
function asText(slug, post, state) {
  const x = describe(post);
  const head = ['---', '# ' + slug + ' · ' + state, 'title: ' + x.title, 'excerpt: ' + x.excerpt.replace(/\n/g, ' '), 'kind: ' + x.kind];
  if (x.category) head.push('category: ' + x.category);
  if (x.world) head.push('world: ' + x.world);
  if (x.seoTitle && x.seoTitle !== x.title) head.push('seoTitle: ' + x.seoTitle);
  if (x.publishAt) head.push('publishAt: ' + x.publishAt);
  if (x.cover) head.push('cover: ' + [x.cover.url, x.cover.alt, x.cover.width && x.cover.height ? x.cover.width + 'x' + x.cover.height : ''].join(' | '));
  return head.join('\n') + '\n---\n' + x.markdown;
}
const plain = t => new Response(t, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });

// Builds the post the editor would save, from Claude's fields over the current draft
function buildPost(base, a) {
  if (typeof a.markdown === 'string') { const fm = frontMatter(a.markdown); a = { ...fm.fields, ...a, markdown: fm.body } }
  const post = { ...(base || { kind: 'article', title: '', excerpt: '', richContent: { nodes: [] }, categoryIds: [CATS.studio], tagIds: [TAG_TZERO] }) };
  if (a.title != null) post.title = String(a.title);
  if (a.excerpt != null) post.excerpt = String(a.excerpt);
  if (a.kind) post.kind = a.kind;
  if (a.world !== undefined) { if (a.world) post.world = String(a.world); else delete post.world }
  if (a.markdown != null) {
    const rc = toRicos(a.markdown);
    post.richContent = { nodes: rc.nodes };
    // Ache's critic note travels in the text (:::achenote); a note the text can't express is left alone
    if (rc.ache) post.ache = rc.ache; else if (post.ache && noteMarkdown(post.ache)) delete post.ache;
  }
  else if (a.richContent) post.richContent = a.richContent;
  if (a.category) { if (!CATS[a.category]) throw new Error('category: studio or devlog'); post.categoryIds = [CATS[a.category]] }
  if (post.kind === 'page') { post.categoryIds = []; post.tagIds = [] }
  else if (!(post.tagIds || []).includes(TAG_TZERO)) post.tagIds = [...(post.tagIds || []), TAG_TZERO];
  if (a.publishAt !== undefined) { if (a.publishAt) post.publishAt = new Date(a.publishAt).toISOString(); else delete post.publishAt }
  // Same shape the editor saves: search title and description
  const oldSeo = ((post.seoData && post.seoData.tags) || []).find(t => t.type === 'title');
  const seoTitle = a.seoTitle !== undefined ? String(a.seoTitle || '').slice(0, 70) : oldSeo && a.title == null ? String(oldSeo.children).replace(/ \| TZERØ$/, '') : '';
  post.seoData = { tags: [{ type: 'title', children: (seoTitle || post.title) + ' | TZERØ', custom: true }, { type: 'meta', props: { name: 'description', content: post.excerpt || '' }, custom: true }] };
  post.minutesToRead = Math.max(1, Math.round(toMarkdown(post.richContent).replace(/```tz-node[\s\S]*?```/g, '').split(/\s+/).filter(Boolean).length / 220));
  if (a.cover !== undefined) {
    if (!a.cover) delete post.media;
    else post.media = { displayed: true, custom: true, wixMedia: { image: { url: a.cover.url, width: a.cover.width || 1600, height: a.cover.height || 900 } }, altText: a.cover.alt || '' };
  }
  delete post.memberId; // the content function signs Claude's drafts as Claude
  return post;
}

async function review(d, post) {
  const errors = check(post);
  const warnings = [];
  const s = await readSettings(d.store);
  const pics = [];
  const walk = n => {
    if (!n || typeof n !== 'object') return;
    if (n.type === 'IMAGE') pics.push(n.imageData && n.imageData.image && n.imageData.image.src && (n.imageData.image.src.url || n.imageData.image.src.id));
    if (n.type === 'TZ_BLOCK' || n.type === 'GALLERY') JSON.stringify(n).replace(/"(?:img|bg|before|after|url|id)":"([^"]+\.(?:png|jpe?g|webp|gif)[^"]*)"/gi, (_, u) => { pics.push(u); return '' });
    (n.nodes || []).forEach(walk);
  };
  (post.richContent && post.richContent.nodes || []).forEach(walk);
  const cov = post.media && post.media.wixMedia && post.media.wixMedia.image; if (cov) pics.push(cov.url || cov.id);
  for (const u of pics.filter(Boolean)) {
    const banned = s.hide.images.find(x => u.includes(x.match));
    if (banned) errors.push('picture is taken down: ' + u + (banned.note ? ' (' + banned.note + ')' : ''));
    for (const [re, why] of LICENSING) if (re.test(u)) warnings.push('licensing: ' + u + ' ' + why);
  }
  const nodes = (post.richContent && post.richContent.nodes) || [];
  if (!post.excerpt) warnings.push('no excerpt: cards and search show an empty line');
  if (!nodes.some(n => n.type === 'IMAGE') && !cov) warnings.push('no pictures (the article protocol wants one per section)');
  if (!nodes.some(n => n.type === 'HTML' || (n.type === 'TZ_BLOCK' && n.blockData && n.blockData.kind !== 'ache'))) warnings.push('nothing interactive yet: we are a game studio journal');
  if (!nodes.some(n => n.type === 'TZ_BLOCK' && n.blockData && n.blockData.kind === 'ache')) warnings.push('Ache has no lines of his own in this article yet (POST .../ache)');
  return { errors, warnings: [...new Set(warnings)] };
}

async function publish(d, slug, note) {
  const r = await draftOf(d, slug); if (r.status !== 200) return r;
  if (!r.draft) return { status: 404, body: { error: 'no draft to publish' } };
  const rv = await review(d, r.draft.post);
  if (rv.errors.length) return { status: 400, body: { error: 'invalid', details: rv.errors } };
  const s = await readSettings(d.store);
  if (s.claude.publish) {
    const post = { ...r.draft.post }; delete post.memberId;
    const out = await C(d, 'PUT', '/api/admin/item/' + encodeURIComponent(slug), { post, publish: true });
    return out.status === 200 ? { body: { ok: true, published: true, url: (post.kind === 'page' ? '/p/' : '/post/') + slug } } : out;
  }
  const open = (await proposals(d.store)).find(x => x.kind === 'publish' && x.payload.slug === slug);
  if (open) return { status: 202, body: { ok: true, proposed: true, proposal: open.id, message: 'Already waiting for Nero' } };
  const pr = await propose(d.store, 'publish', { slug, title: r.draft.post.title }, note);
  await log(d.store, { login: 'claude', role: 'claude' }, 'proposal', 'asked to publish ' + slug);
  return { status: 202, body: { ok: true, proposed: true, proposal: pr.id, message: 'Waiting for Nero: he approves it in /admin/site' } };
}

// Small changes to a draft without sending the article again. Each edit is one of:
//   { find, replace, all? }         swap text in the TZ Markdown (find must be there once, unless all)
//   { after | before: "text", insert: "markdown" }   add blocks next to the block that contains the text
//   { append: "markdown" } / { prepend: "markdown" }
//   { remove: "text" }              drop the whole block that contains the text
function splitBlocks(md) {
  const out = []; let cur = [], fence = false;
  for (const l of md.replace(/\s*$/, '').split('\n')) {
    if (/^```/.test(l.trim())) fence = !fence;
    else if (!fence && /^:::\w/.test(l.trim())) fence = ':';
    else if (fence === ':' && l.trim() === ':::') { cur.push(l); fence = false; continue }
    if (!fence && !l.trim()) { if (cur.length) out.push(cur.join('\n')); cur = []; continue }
    cur.push(l);
  }
  if (cur.length) out.push(cur.join('\n'));
  return out;
}
function applyEdits(md, edits) {
  const count = (h, n) => h.split(n).length - 1;
  for (const [i, e] of (Array.isArray(edits) ? edits : []).entries()) {
    const fail = why => { throw new Error('edit ' + (i + 1) + ': ' + why) };
    if (e.append != null) { md = md.replace(/\s*$/, '') + '\n\n' + e.append + '\n'; continue }
    if (e.prepend != null) { md = e.prepend + '\n\n' + md; continue }
    if (e.find != null) {
      const n = count(md, e.find);
      if (!n) fail('"' + String(e.find).slice(0, 60) + '" is not in the draft');
      if (n > 1 && !e.all) fail('"' + String(e.find).slice(0, 60) + '" is there ' + n + ' times: add more of the text, or all: true');
      md = md.split(e.find).join(e.replace == null ? '' : e.replace); continue;
    }
    const key = e.after != null ? 'after' : e.before != null ? 'before' : e.remove != null ? 'remove' : null;
    if (!key) fail('use find/replace, after/before + insert, append, prepend or remove');
    const blocks = splitBlocks(md);
    const hits = blocks.map((b, k) => b.includes(e[key]) ? k : -1).filter(k => k >= 0);
    if (!hits.length) fail('"' + String(e[key]).slice(0, 60) + '" is not in the draft');
    if (hits.length > 1) fail('"' + String(e[key]).slice(0, 60) + '" is in ' + hits.length + ' blocks: add more of the text');
    if (key === 'remove') blocks.splice(hits[0], 1);
    else { if (e.insert == null) fail('insert is missing'); blocks.splice(hits[0] + (key === 'after' ? 1 : 0), 0, e.insert) }
    md = blocks.join('\n\n') + '\n';
  }
  return md;
}

// The short list of what is going on, for the start of a session (few tokens); ?full=1 gives everything
function brief(settings, items, inbox, props, lg) {
  const s = settings, off = Object.entries(s.flags).filter(([, v]) => v === false).map(([k]) => k);
  return {
    alone: Object.keys(CLAUDE_AREAS).filter(k => s.claude[k]), ask: Object.keys(CLAUDE_AREAS).filter(k => !s.claude[k]),
    live: {
      notice: s.notice.on ? s.notice.text : null, mood: s.mood.mode === 'on' ? s.mood.slug : s.mood.mode, newsletter: s.newsletter.provider || null,
      pick: s.home.pick.on ? s.home.pick.cap || s.home.pick.href : null, off, links: Object.keys(s.links).length,
      hidden: { paths: s.hide.paths.map(x => x.path), posts: s.hide.posts.map(x => x.slug), images: s.hide.images.map(x => x.match) },
    },
    posts: items.map(x => x.slug + (x.kind === 'page' ? ' [page]' : '') + (x.published ? ' [live]' : ' [draft]') + ' ' + x.title),
    inbox: inbox.map(x => ({ id: x.id, by: x.by, text: x.text.length > 240 ? x.text.slice(0, 240) + '…' : x.text, pictures: x.pictures.length || undefined })),
    proposals: props.map(x => ({ id: x.id, kind: x.kind, status: x.status, about: x.kind === 'publish' ? x.payload.slug : x.kind === 'lines' ? Object.keys(x.payload.topics).join(',') : Object.keys(x.payload.patch || {}).join(','), answer: x.answer || undefined })),
    recent: lg.map(l => l.at.slice(5, 16) + ' ' + l.by + ' ' + l.action + ': ' + l.what.slice(0, 80)),
    next: 'guide topics: GET /api/ai/guide/<start|markdown|blocks|ache|settings|templates>',
  };
}

async function route(method, p, body, q, d, req) {
  const [area, slug, sub, idx] = p;
  try {
    if (!area && method === 'GET') return { body: MANUAL };
    if (area === 'markdown' && method === 'GET') return plain(MARKDOWN_GUIDE + '\n\n' + BLOCK_GUIDE);
    if (area === 'guide' && method === 'GET') return GUIDES[slug || 'start'] ? plain(GUIDES[slug || 'start']) : { status: 404, body: { error: 'topics: ' + Object.keys(GUIDES).join(', ') } };

    // Many actions in one call: { ops: [{ op, ...fields }], keepGoing? }. Stops at the first error unless keepGoing.
    if (area === 'do' && method === 'POST') {
      const ops = Array.isArray(body.ops) ? body.ops.slice(0, 40) : null;
      if (!ops) return { status: 400, body: { error: 'ops: [{ op, ... }]. Ops: ' + Object.keys(OPS).join(', ') } };
      const results = [];
      for (const o of ops) {
        const make = OPS[o && o.op];
        let r;
        if (!make) r = { status: 400, body: { error: 'unknown op ' + (o && o.op) } };
        else { const [m, path, b, qs] = make(o); r = await route(m, path, b || {}, new URLSearchParams(qs || ''), d); if (r instanceof Response) r = { status: r.status, body: await r.text() } }
        const status = r.status || 200;
        results.push(status < 400 ? r.body : { failed: true, status, ...(typeof r.body === 'object' ? r.body : { error: r.body }) });
        if (status >= 400 && !body.keepGoing) { results.push({ stopped: 'the ' + (ops.length - results.length) + ' ops after this were not run' }); break }
      }
      return { status: results.some(x => x && x.failed) ? 207 : 200, body: { results } };
    }

    if (area === 'state' && method === 'GET') {
      const [settings, items, inbox, props, lg] = await Promise.all([
        readSettings(d.store), C(d, 'GET', '/api/admin/items'), C(d, 'GET', '/api/admin/inbox'), proposals(d.store, false), readLog(d.store, 15),
      ]);
      if (q.get('full') !== '1') {
        // open proposals, plus the ones Nero answered in the last week (so Claude sees his yes or no)
        const answered = (await proposals(d.store, true)).filter(x => x.status !== 'open' && Date.now() - Date.parse(x.answeredAt || x.at) < 7 * 864e5).slice(0, 10);
        return { body: brief(settings, items.body.items || [], (inbox.body.items || []).filter(x => x.status === 'open'), props.concat(answered), lg.slice(0, 8)) };
      }
      return { body: {
        you: 'Claude', canDoAlone: Object.keys(CLAUDE_AREAS).filter(k => settings.claude[k]), mustAsk: Object.keys(CLAUDE_AREAS).filter(k => !settings.claude[k]),
        settings, posts: items.body.items || [], inbox: (inbox.body.items || []).filter(x => x.status === 'open'), proposals: props, recent: lg,
      } };
    }

    if (area === 'posts') {
      if (!slug && method === 'GET') return C(d, 'GET', '/api/admin/items');
      if (!SLUG.test(slug || '')) return { status: 400, body: { error: 'slug: a-z, 0-9 and dashes' } };
      const at = '/api/admin/item/' + encodeURIComponent(slug);
      if (!sub && method === 'GET') {
        const r = await draftOf(d, slug); if (r.status !== 200) return r;
        if (!r.draft && !r.published) return { status: 404, body: { error: 'no such post' } };
        if (q.get('as') === 'text') return plain(asText(slug, q.get('published') === '1' && r.published ? r.published : (r.draft && r.draft.post) || r.published, r.published ? 'live' : 'draft'));
        if (q.get('as') === 'outline') return plain(parts(((r.draft && r.draft.post) || r.published).richContent).filter(x => x.kind === 'heading' || x.kind.startsWith('block:') || x.kind === 'image' || x.kind === 'html').map(x => x.index + ' ' + x.kind + ' ' + (x.ache ? (x.ache.set || x.ache.lines[0]) : x.text)).join('\n'));
        return { body: { slug, live: Boolean(r.published), draft: describe(r.draft && r.draft.post, { savedAt: r.draft && r.draft.savedAt }), published: q.get('published') === '1' ? describe(r.published) : undefined } };
      }
      if (!sub && method === 'PUT') {
        const r = await draftOf(d, slug); if (r.status !== 200) return r;
        let post; try { post = buildPost((r.draft && r.draft.post) || r.published, body) } catch (e) { return { status: 400, body: { error: e.message } } }
        const rv = await review(d, post);
        if (rv.errors.length) return { status: 400, body: { error: 'invalid', details: rv.errors, warnings: rv.warnings } };
        const s = await C(d, 'PUT', at, { post });
        if (s.status !== 200) return s;
        const fm = typeof body.markdown === 'string' ? frontMatter(body.markdown).fields : {};
        const want = body.publish !== undefined ? body.publish : fm.publish;
        const out = { ok: true, draft: slug, parts: post.richContent.nodes.length, ...(rv.warnings.length ? { warnings: rv.warnings } : {}) };
        if (want) { const pb = await publish(d, slug, body.note); Object.assign(out, pb.body, pb.status >= 400 ? { publishFailed: true } : {}) }
        return { body: out };
      }
      if (sub === 'edit' && method === 'POST') {
        const r = await draftOf(d, slug); if (r.status !== 200) return r;
        const base = (r.draft && r.draft.post) || r.published;
        if (!base) return { status: 404, body: { error: 'no such post' } };
        let post;
        try {
          const md = applyEdits(toMarkdown(base.richContent, base.ache), body.edits);
          post = buildPost(base, { ...(body.set || {}), markdown: md });
        } catch (e) { return { status: 400, body: { error: e.message } } }
        const rv = await review(d, post);
        if (rv.errors.length) return { status: 400, body: { error: 'invalid', details: rv.errors } };
        const s = await C(d, 'PUT', at, { post });
        if (s.status !== 200) return s;
        const out = { ok: true, draft: slug, parts: post.richContent.nodes.length, ...(rv.warnings.length ? { warnings: rv.warnings } : {}) };
        if (body.publish) { const pb = await publish(d, slug, body.note); Object.assign(out, pb.body) }
        return { body: out };
      }
      if (sub === 'check' && method === 'POST') {
        const r = await draftOf(d, slug); if (r.status !== 200) return r;
        let post; try { post = buildPost((r.draft && r.draft.post) || r.published, body || {}) } catch (e) { return { status: 400, body: { error: e.message } } }
        return { body: await review(d, post) };
      }
      if (sub === 'parts' && method === 'GET') {
        const r = await draftOf(d, slug); if (r.status !== 200) return r;
        const post = (r.draft && r.draft.post) || r.published;
        if (!post) return { status: 404, body: { error: 'no such post' } };
        return { body: { slug, parts: parts(post.richContent) } };
      }
      if (sub === 'ache' && (method === 'POST' || method === 'DELETE')) {
        const r = await draftOf(d, slug); if (r.status !== 200) return r;
        const post = (r.draft && r.draft.post) || r.published;
        if (!post) return { status: 404, body: { error: 'no such post' } };
        const nodes = [...((post.richContent && post.richContent.nodes) || [])];
        if (method === 'DELETE') {
          const i = Number(idx);
          if (!(nodes[i] && nodes[i].type === 'TZ_BLOCK' && nodes[i].blockData.kind === 'ache')) return { status: 400, body: { error: 'no Ache marker at that index (GET .../parts)' } };
          nodes.splice(i, 1);
        } else {
          // one marker, or many at once: { many: [{ heading | after, lines | set, scope?, show? }] }
          const list = Array.isArray(body.many) ? body.many.slice(0, 40) : [body];
          // place from the bottom up so earlier indexes stay right
          const placed = [];
          for (const one of list) {
            const node = acheNode(one);
            if (!node.blockData.data.lines.length && !node.blockData.data.set) return { status: 400, body: { error: 'give lines: [...] or set: "<key>"' } };
            let at;
            if (one.heading != null) {
              const want = String(one.heading).trim().toLowerCase();
              const h = parts(post.richContent).find(x => x.kind === 'heading' && x.text.toLowerCase().includes(want));
              if (!h) return { status: 400, body: { error: 'no heading matches "' + one.heading + '"' } };
              let end = h.index + 1; while (end < nodes.length && nodes[end].type !== 'HEADING') end++;
              // after the last real part of the section (before trailing dividers and spacers)
              while (end - 1 > h.index && (nodes[end - 1].type === 'DIVIDER' || (nodes[end - 1].type === 'PARAGRAPH' && !(nodes[end - 1].nodes || []).length))) end--;
              node.blockData.data.scope = one.scope === 'part' ? 'part' : 'section';
              at = end;
            } else {
              const i = Number(one.after);
              if (!Number.isInteger(i) || i < 0 || i >= nodes.length) return { status: 400, body: { error: 'after: a part index from GET .../parts' } };
              at = i + 1;
            }
            placed.push([at, node]);
          }
          placed.sort((x, y) => y[0] - x[0]).forEach(([at, node]) => nodes.splice(at, 0, node));
        }
        const next = { ...post, richContent: { ...(post.richContent || {}), nodes } };
        delete next.memberId;
        const s = await C(d, 'PUT', '/api/admin/item/' + encodeURIComponent(slug), { post: next });
        if (s.status !== 200) return s;
        return { body: { ok: true, savedAsDraft: true, markers: next.richContent.nodes.filter(n => n.type === 'TZ_BLOCK' && n.blockData.kind === 'ache').length, ...(q.get('parts') === '1' ? { parts: parts(next.richContent) } : {}), note: r.published ? 'Saved in the draft. The live article changes when it is published again.' : undefined } };
      }
      if (sub === 'publish' && method === 'POST') return publish(d, slug, body.note);
      if (!sub && method === 'DELETE') return C(d, 'DELETE', '/api/admin/item/' + encodeURIComponent(slug));
    }

    if (area === 'settings') {
      if (method === 'GET') return S(d, 'GET', '/api/settings');
      if (method === 'PATCH') return S(d, 'PATCH', '/api/settings', body);
    }

    if (area === 'takedown' && method === 'POST') {
      const s = await readSettings(d.store);
      const hide = JSON.parse(JSON.stringify(s.hide));
      const v = String(body.value || '').trim(), note = String(body.note || '').slice(0, 300), at = new Date().toISOString();
      const key = { path: 'paths', post: 'posts', image: 'images' }[body.type];
      if (!key || !v) return { status: 400, body: { error: 'type: path|post|image and value' } };
      const field = { paths: 'path', posts: 'slug', images: 'match' }[key];
      hide[key] = hide[key].filter(x => x[field] !== v);
      if (!body.undo) hide[key].push({ [field]: v, note, at });
      return S(d, 'PATCH', '/api/settings', { patch: { hide }, note: (body.undo ? 'undo takedown ' : 'takedown ') + body.type + ' ' + v + (note ? ': ' + note : '') });
    }

    if (area === 'lines') {
      if (method === 'GET') return C(d, 'GET', '/api/admin/lines');
      if (method === 'POST') {
        const topics = body.topics;
        if (!topics || typeof topics !== 'object') return { status: 400, body: { error: 'topics: { "<set>": { lines: [{ t }] } }' } };
        for (const [k, t] of Object.entries(topics)) if (!LINE_KEY.test(k) || !t || !Array.isArray(t.lines) || t.lines.some(l => !l || typeof l.t !== 'string')) return { status: 400, body: { error: 'set ' + k } };
        const s = await readSettings(d.store);
        if (s.claude.lines) {
          // Nero let Claude publish lines: merge over his current draft and publish through his own endpoint's checks
          const cur = await C(d, 'GET', '/api/admin/lines');
          const base = (cur.body.draft && cur.body.draft.topics) || {};
          return C(d, 'PUT', '/api/admin/lines', { book: { topics: { ...base, ...topics } }, publish: true });
        }
        const pr = await propose(d.store, 'lines', { topics }, body.note);
        await log(d.store, { login: 'claude', role: 'claude' }, 'proposal', 'suggested lines for ' + Object.keys(topics).join(', '));
        return { status: 202, body: { ok: true, proposed: true, proposal: pr.id, message: 'Waiting for Nero: he approves it in /admin/site → Claude' } };
      }
    }

    if (area === 'inbox') {
      if (method === 'GET') return C(d, 'GET', '/api/admin/inbox');
      if (method === 'POST' && slug) return C(d, 'POST', '/api/admin/inbox/' + encodeURIComponent(slug), body);
    }

    if (area === 'media' && method === 'POST') {
      let bytes = body.bytes, type = body.type;
      if (!bytes && body.base64) { const b = Buffer.from(String(body.base64), 'base64'); bytes = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) }
      if (!bytes) return { status: 400, body: { error: 'picture bytes, or { base64, type }' } };
      return C(d, 'POST', '/api/admin/media', bytes, { 'content-type': type || 'image/webp' });
    }

    if (area === 'proposals' && method === 'GET') return { body: { proposals: await proposals(d.store, q.get('all') === '1') } };
    if (area === 'log' && method === 'GET') return { body: { log: await readLog(d.store, Number(q.get('limit')) || 50) } };
    return { status: 404, body: { error: 'not found: GET /api/ai lists everything' } };
  } catch (e) {
    console.log('ai', e.stack);
    return { status: 500, body: { error: e.message } };
  }
}

// ---- Every action by name: used by POST /api/ai/do and by the MCP tools ----
const enc = encodeURIComponent;
const OPS = {
  state: a => ['GET', ['state'], null, a.full ? 'full=1' : ''],
  guide: a => ['GET', ['guide', a.topic || 'start']],
  posts: () => ['GET', ['posts']],
  read: a => ['GET', ['posts', a.slug], null, 'as=' + (a.as || 'text') + (a.published ? '&published=1' : '')],
  write: a => ['PUT', ['posts', a.slug], a],
  edit: a => ['POST', ['posts', a.slug, 'edit'], a],
  check: a => ['POST', ['posts', a.slug, 'check'], a],
  parts: a => ['GET', ['posts', a.slug, 'parts']],
  ache: a => ['POST', ['posts', a.slug, 'ache'], a],
  unache: a => ['DELETE', ['posts', a.slug, 'ache', String(a.index)]],
  publish: a => ['POST', ['posts', a.slug, 'publish'], a],
  delete: a => ['DELETE', ['posts', a.slug]],
  settings: () => ['GET', ['settings']],
  set: a => ['PATCH', ['settings'], a],
  takedown: a => ['POST', ['takedown'], a],
  lines: () => ['GET', ['lines']],
  propose_lines: a => ['POST', ['lines'], a],
  inbox: () => ['GET', ['inbox']],
  inbox_done: a => ['POST', ['inbox', a.id], { status: 'done', draft: a.draft, note: a.note }],
  upload: a => ['POST', ['media'], a],
  proposals: a => ['GET', ['proposals'], null, a.all ? 'all=1' : ''],
  log: a => ['GET', ['log'], null, 'limit=' + (a.limit || 30)],
};

const GUIDES = {
  start: `TZERØ admin for AI. You are Claude; drafts are signed Claude. Spend few calls: one "do" can carry many ops.
RULES
- What Nero has not switched on for you becomes a proposal (answer says proposed: true); he approves it on /admin/site. state shows his answers.
- Licensing: no Starchasers crew art, no old characters (Contrary Quest, Characters Across Worlds cast). Allowed Starchasers art: emblem, title key art (ship only), Weary Reach maps.
- No Starchasers spoilers. Never call this on a schedule or in a loop (Netlify credits). Nothing here deploys.
OPS (POST /api/ai/do { ops: [{ op, ... }] } or the MCP tool "do")
- state {full?}                         start here
- read {slug, as?: text|outline|json}    an article as one text (header + TZ Markdown)
- write {slug, markdown, publish?}       whole article in one text; header lines title:, excerpt:, category:, world:, cover:, publish: ask
- edit {slug, edits: [...], set?, publish?}   change a draft without resending it:
    {find, replace, all?} | {after|before: "text in a block", insert: "markdown"} | {append} | {prepend} | {remove: "text in a block"}
- ache {slug, many: [{heading | after, lines: [..] | set, scope?, show?}]}   Ache's lines for parts (or write :::ache in the text)
- unache {slug, index} · parts {slug} · check {slug} · publish {slug, note?} · delete {slug} · posts
- settings · set {patch, note} · takedown {type: path|post|image, value, note, undo?}
- lines · propose_lines {topics: {key: {lines: [{t}]}}, note}
- inbox · inbox_done {id, draft, note} · upload {base64, type} · proposals {all?} · log {limit?}
- guide {topic: markdown | blocks | ache | settings | templates}
CHEAPEST PATHS
- New article: guide templates (once) -> one write with publish: ask. Two calls.
- Fix a typo or add a section: one edit. Never read + rewrite the whole article for a small change.
- Before editing an article you have not seen: read as outline first; read as text only if you need the words.`,
  markdown: MARKDOWN_GUIDE,
  blocks: BLOCK_GUIDE,
  ache: `Ache's lines in an article
- For a part: a :::ache marker right under the block it belongs to. scope=section covers everything back to the last heading. show=bubble also shows a small "Ache says" note readers tap for the next line. set=<key> uses a set from his script book (op lines) instead of lines here.
  :::ache scope=section show=hidden
  line one
  line two
  :::
- Without rewriting: op ache {slug, many: [{heading: "What's new", lines: ["…", "…"]}, {after: 4, lines: ["…"], show: "bubble"}]}
- His critic note on top of an article: :::achenote (guide blocks).
- Sets used across the site (headings, pictures, cards): op lines to read, propose_lines to suggest; Nero approves.
VOICE: lowercase, short (under 90 characters is best), funny, warm, a bit smug, proud of Artache; under the sass he keeps players safe. Never mean, never spoilers, no emoji. 2 to 5 lines per part; he says one at a time, at random.
GOOD: "that ship is mine. I named it." / "read this bit slowly. it's the good bit." / "I helped. I watched. same thing."`,
  settings: `Site settings (op settings to read, op set {patch, note} to change; objects merge, arrays replace, null removes)
notice {on, text, link, linkText, tone: red|navy|sun, until}       bar on top of every page
mood {mode: wix|on|off, slug, topic, lines: []}                    Ache's news moment on one article
home.pick {on, img, alt, cap, kick, note, href, linkText}          Nero's pick on the homepage (first boarding ticket)
newsletter {provider: kit|buttondown|mailerlite, id}
flags {"cq-wip": bool, "share-row": bool, "newsletter-band": bool, "<your-switch>": bool}
hide {paths: [{path, note}], posts: [{slug, note}], images: [{match, note}]}   or op takedown
links {"<name>": "https://… or /path"}                             short links at /go/<name>
Example: {"op":"set","patch":{"notice":{"on":true,"text":"Devlog #7 is out","link":"/post/devlog-7","linkText":"Read it"}},"note":"new devlog"}`,
  templates: `Article skeletons (article protocol: a picture per section, spaced sections, something to play with, Ache has lines). Replace the …, keep the shape.
NEWS / TAKE
---
title: …
excerpt: one or two sentences that make people want to read on
category: studio
world:
cover: /api/media/….webp | what it shows | 1600x900
publish: ask
---
::kicker STUDIO  ·  NEWS  ·  NERO'S TAKE

*{navy:{big:The standfirst: what happened and why it matters to us.}}*

![what it shows](/api/media/….webp "Caption. Illustration: TZERØ."){1280x720}

---

## {red:✦ }{navy:What happened}

… facts with **{red:[sources](https://…)}** …

:::ache scope=section
…
…
:::

## {red:✦ }{navy:What Nero thinks}

> … his words, exactly …
>
> — Nero

## {red:✦ }{navy:What we take from it}

- …
- …

:::cards
… | 5 | /api/media/….webp | …
:::

---

Written by Claude for TZERØ, a journal by Artache Creative Studio. The answers are Nero's.

DEVLOG: same shape with category: devlog, kicker "DEVLOG  ·  <GAME>  ·  #N", sections "What changed", "How it plays" (a :::slides or :::vn block), "What's next".`,
};

// ---- MCP ----
// Six tools by default: every tool's description is paid for in tokens at the start of every session, so the
// rest of the actions live behind "do" (their list is one short guide away). /api/mcp?tools=all lists them all.
const S_SLUG = { type: 'string', description: 'post address: a-z, 0-9, dashes' };
const SLIM = [
  ['state', 'Start here. What is live, what you may do alone, drafts, inbox, proposals and Nero\'s answers.', { full: { type: 'boolean' } }],
  ['guide', 'How to use this admin. Topics: start (ops and rules), markdown, blocks, ache, settings, templates.', { topic: { type: 'string' } }],
  ['read', 'An article as one text (header + TZ Markdown). as: outline (headings and blocks only, cheapest), text, json.', { slug: S_SLUG, as: { type: 'string', enum: ['text', 'outline', 'json'] }, published: { type: 'boolean' } }, ['slug']],
  ['write', 'Save a whole article as a draft from one text: header lines (title:, excerpt:, category:, world:, cover:, publish: ask) between --- lines, then TZ Markdown with :::ache and block directives.', { slug: S_SLUG, markdown: { type: 'string' }, publish: { description: 'true or "ask": publish, or ask Nero if you may not' }, note: { type: 'string' } }, ['slug', 'markdown']],
  ['edit', 'Change a draft without resending it. edits: [{find, replace, all?} | {after|before, insert} | {append} | {prepend} | {remove}]. set: {title, excerpt, category, world, cover…}.', { slug: S_SLUG, edits: { type: 'array', items: { type: 'object' } }, set: { type: 'object' }, publish: {}, note: { type: 'string' } }, ['slug']],
  ['do', 'Run many actions in one call: ops: [{op, ...}]. Ops: ' + Object.keys(OPS).join(', ') + '. Fields per op: guide topic "start".', { ops: { type: 'array', items: { type: 'object' } }, keepGoing: { type: 'boolean' } }, ['ops']],
];
const tiny = v => typeof v === 'string' ? v : JSON.stringify(v);

async function mcp(req, d) {
  if (req.method === 'GET') return err(405, 'POST JSON-RPC here');
  if (req.method === 'DELETE') return new Response(null, { status: 204 });
  const all = new URL(req.url).searchParams.get('tools') === 'all';
  let msg; try { msg = await req.json() } catch (e) { return json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'parse error' } }) }
  const batch = Array.isArray(msg), out = [];
  for (const m of batch ? msg : [msg]) { const r = await one(m, d, all); if (r) out.push(r) }
  if (!out.length) return new Response(null, { status: 202 });
  return json(batch ? out : out[0]);
}
async function one(m, d, all) {
  const ok = result => ({ jsonrpc: '2.0', id: m.id, result });
  if (!m || m.jsonrpc !== '2.0' || typeof m.method !== 'string') return { jsonrpc: '2.0', id: m && m.id || null, error: { code: -32600, message: 'invalid request' } };
  if (m.id === undefined) return null; // notifications
  if (m.method === 'initialize') return ok({ protocolVersion: (m.params && m.params.protocolVersion) || '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'tzero-admin', version: '2.0.0' }, instructions: 'TZERØ site admin for Claude. Call state first, guide for how-tos. Batch with do. Never loop or poll.' });
  if (m.method === 'ping') return ok({});
  if (m.method === 'tools/list') {
    const tools = SLIM.map(([name, description, props, required]) => ({ name, description, inputSchema: { type: 'object', properties: props, ...(required ? { required } : {}) } }));
    if (all) for (const k of Object.keys(OPS)) if (!SLIM.some(t => t[0] === k)) tools.push({ name: k, description: 'Op "' + k + '" (fields: guide topic "start")', inputSchema: { type: 'object' } });
    return ok({ tools });
  }
  if (m.method === 'tools/call') {
    const name = m.params && m.params.name, a = (m.params && m.params.arguments) || {};
    const slim = SLIM.find(x => x[0] === name);
    if (!slim && !OPS[name]) return { jsonrpc: '2.0', id: m.id, error: { code: -32602, message: 'unknown tool' } };
    for (const k of (slim && slim[3]) || []) if (a[k] === undefined || a[k] === '') return ok({ isError: true, content: [{ type: 'text', text: 'missing ' + k }] });
    let r;
    if (name === 'do') r = await route('POST', ['do'], a, new URLSearchParams(), d);
    else { const [method, path, body, qs] = OPS[name](a); r = await route(method, path, body || {}, new URLSearchParams(qs || ''), d) }
    let status = 200, payload;
    if (r instanceof Response) { status = r.status; payload = await r.text() }
    else { status = r.status || 200; payload = tiny(r.body) }
    return ok({ isError: status >= 400, content: [{ type: 'text', text: payload }] });
  }
  return { jsonrpc: '2.0', id: m.id, error: { code: -32601, message: 'method not found' } };
}

export default req => handle(req);

export const config = {
  path: ['/api/ai', '/api/ai/*', '/api/mcp'],
  rateLimit: { windowLimit: 60, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};
