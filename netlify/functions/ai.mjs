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
import { toMarkdown, toRicos, parts, acheNode } from '../lib/markdown.mjs';
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
    'POST /api/mcp': 'The same actions as MCP tools (tools/list shows them)',
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
    markdown: toMarkdown(post.richContent), ...extra,
  };
}

// Builds the post the editor would save, from Claude's fields over the current draft
function buildPost(base, a) {
  const post = { ...(base || { kind: 'article', title: '', excerpt: '', richContent: { nodes: [] }, categoryIds: [CATS.studio], tagIds: [TAG_TZERO] }) };
  if (a.title != null) post.title = String(a.title);
  if (a.excerpt != null) post.excerpt = String(a.excerpt);
  if (a.kind) post.kind = a.kind;
  if (a.world !== undefined) { if (a.world) post.world = String(a.world); else delete post.world }
  if (a.markdown != null) post.richContent = toRicos(a.markdown);
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

async function route(method, p, body, q, d, req) {
  const [area, slug, sub, idx] = p;
  try {
    if (!area && method === 'GET') return { body: MANUAL };
    if (area === 'markdown' && method === 'GET') return new Response(MARKDOWN_GUIDE, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });

    if (area === 'state' && method === 'GET') {
      const [settings, items, inbox, props, lg] = await Promise.all([
        readSettings(d.store), C(d, 'GET', '/api/admin/items'), C(d, 'GET', '/api/admin/inbox'), proposals(d.store, false), readLog(d.store, 15),
      ]);
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
        return { body: { slug, live: Boolean(r.published), draft: describe(r.draft && r.draft.post, { savedAt: r.draft && r.draft.savedAt }), published: q.get('published') === '1' ? describe(r.published) : undefined } };
      }
      if (!sub && method === 'PUT') {
        const r = await draftOf(d, slug); if (r.status !== 200) return r;
        let post; try { post = buildPost((r.draft && r.draft.post) || r.published, body) } catch (e) { return { status: 400, body: { error: e.message } } }
        const rv = await review(d, post);
        if (rv.errors.length) return { status: 400, body: { error: 'invalid', details: rv.errors, warnings: rv.warnings } };
        const s = await C(d, 'PUT', at, { post });
        return { status: s.status, body: { ...s.body, warnings: rv.warnings, editor: '/admin' } };
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
          const node = acheNode(body);
          if (!node.blockData.data.lines.length && !node.blockData.data.set) return { status: 400, body: { error: 'give lines: [...] or set: "<key>"' } };
          if (node.blockData.data.set && !LINE_KEY.test(node.blockData.data.set)) return { status: 400, body: { error: 'set' } };
          let at;
          if (body.heading != null) {
            const want = String(body.heading).trim().toLowerCase();
            const h = parts(post.richContent).find(x => x.kind === 'heading' && x.text.toLowerCase().includes(want));
            if (!h) return { status: 400, body: { error: 'no heading matches "' + body.heading + '"' } };
            let end = h.index + 1; while (end < nodes.length && nodes[end].type !== 'HEADING') end++;
            // put it after the last real part of the section (before trailing dividers and spacers)
            while (end - 1 > h.index && (nodes[end - 1].type === 'DIVIDER' || (nodes[end - 1].type === 'PARAGRAPH' && !(nodes[end - 1].nodes || []).length))) end--;
            node.blockData.data.scope = body.scope === 'part' ? 'part' : 'section';
            at = end;
          } else {
            const i = Number(body.after);
            if (!Number.isInteger(i) || i < 0 || i >= nodes.length) return { status: 400, body: { error: 'after: a part index from GET .../parts' } };
            at = i + 1;
          }
          nodes.splice(at, 0, node);
        }
        const next = { ...post, richContent: { ...(post.richContent || {}), nodes } };
        delete next.memberId;
        const s = await C(d, 'PUT', '/api/admin/item/' + encodeURIComponent(slug), { post: next });
        if (s.status !== 200) return s;
        return { body: { ok: true, savedAsDraft: true, parts: parts(next.richContent), note: r.published ? 'Saved in the draft. The live article changes when it is published again.' : undefined } };
      }
      if (sub === 'publish' && method === 'POST') {
        const r = await draftOf(d, slug); if (r.status !== 200) return r;
        if (!r.draft) return { status: 404, body: { error: 'no draft to publish' } };
        const rv = await review(d, r.draft.post);
        if (rv.errors.length) return { status: 400, body: { error: 'invalid', details: rv.errors } };
        const s = await readSettings(d.store);
        if (s.claude.publish) {
          const post = { ...r.draft.post }; delete post.memberId;
          return C(d, 'PUT', '/api/admin/item/' + encodeURIComponent(slug), { post, publish: true });
        }
        const pr = await propose(d.store, 'publish', { slug, title: r.draft.post.title }, body.note);
        await log(d.store, { login: 'claude', role: 'claude' }, 'proposal', 'asked to publish ' + slug);
        return { status: 202, body: { ok: true, proposed: true, proposal: pr.id, message: 'Waiting for Nero: he approves it in /admin/site → Claude' } };
      }
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

// ---- MCP: the same actions as tools ----
const S_SLUG = { type: 'string', description: 'The post address: a-z, 0-9, dashes' };
const TOOLS = [
  ['site_state', 'Start here: settings, what you may do alone, drafts, open inbox items, your open proposals, recent changes.', {}, () => ['GET', ['state']]],
  ['list_posts', 'Drafts and published posts and pages.', {}, () => ['GET', ['posts']]],
  ['read_post', 'Read one post as TZ Markdown (draft first; published: true adds the live copy).', { slug: S_SLUG, published: { type: 'boolean' } }, a => ['GET', ['posts', a.slug], null, a.published ? 'published=1' : ''], ['slug']],
  ['write_draft', 'Create or update a draft. Fields you leave out keep their current value. Markdown format: see the markdown_guide tool.', { slug: S_SLUG, title: { type: 'string' }, excerpt: { type: 'string' }, markdown: { type: 'string' }, category: { type: 'string', enum: ['studio', 'devlog'] }, world: { type: 'string', description: 'The game world the article travels to: a key of /assets/worlds.json; empty for the TZERØ look' }, kind: { type: 'string', enum: ['article', 'page'] }, publishAt: { type: 'string', description: 'ISO time, empty for at once' }, seoTitle: { type: 'string' }, cover: { type: 'object', properties: { url: { type: 'string' }, width: { type: 'number' }, height: { type: 'number' }, alt: { type: 'string' } } } }, a => ['PUT', ['posts', a.slug], a], ['slug']],
  ['check_post', 'Dry run a draft (or changed fields) for errors, licensing warnings and Ache\'s checks.', { slug: S_SLUG, markdown: { type: 'string' }, title: { type: 'string' }, excerpt: { type: 'string' } }, a => ['POST', ['posts', a.slug, 'check'], a], ['slug']],
  ['list_parts', 'The numbered parts of a draft, with Ache markers already there. Use before add_ache_lines.', { slug: S_SLUG }, a => ['GET', ['posts', a.slug, 'parts']], ['slug']],
  ['add_ache_lines', 'Give Ache lines for a part of an article: he walks to it and says one when readers get there. Use after (part index) or heading (section).', { slug: S_SLUG, after: { type: 'number' }, heading: { type: 'string' }, lines: { type: 'array', items: { type: 'string' } }, set: { type: 'string', description: 'a set key from his script book instead of lines' }, scope: { type: 'string', enum: ['part', 'section'] }, show: { type: 'string', enum: ['hidden', 'bubble'] } }, a => ['POST', ['posts', a.slug, 'ache'], a], ['slug']],
  ['remove_ache_lines', 'Remove the Ache marker at a part index.', { slug: S_SLUG, index: { type: 'number' } }, a => ['DELETE', ['posts', a.slug, 'ache', String(a.index)]], ['slug', 'index']],
  ['publish_post', 'Publish a draft if Nero allowed it; otherwise ask him (a proposal).', { slug: S_SLUG, note: { type: 'string' } }, a => ['POST', ['posts', a.slug, 'publish'], a], ['slug']],
  ['get_settings', 'The live site settings and your permissions.', {}, () => ['GET', ['settings']]],
  ['change_settings', 'Merge a change into the site settings (notice, mood, newsletter, home, hide, flags, links). Areas Nero has not opened to you become a proposal.', { patch: { type: 'object' }, note: { type: 'string' } }, a => ['PATCH', ['settings'], a], ['patch']],
  ['takedown', 'Hide a page path, a post or pictures (licensing). undo: true brings it back.', { type: { type: 'string', enum: ['path', 'post', 'image'] }, value: { type: 'string' }, note: { type: 'string' }, undo: { type: 'boolean' } }, a => ['POST', ['takedown'], a], ['type', 'value']],
  ['read_lines', "Ache's script book: sets, muted lines and Nero's notes for you.", {}, () => ['GET', ['lines']]],
  ['propose_lines', "Suggest new or changed sets for Ache's script book (Nero approves).", { topics: { type: 'object' }, note: { type: 'string' } }, a => ['POST', ['lines'], a], ['topics']],
  ['read_inbox', 'Material Nero and the admins dropped for you.', {}, () => ['GET', ['inbox']]],
  ['inbox_done', 'Mark an inbox item done (with the draft you wrote from it).', { id: { type: 'string' }, draft: { type: 'string' }, note: { type: 'string' } }, a => ['POST', ['inbox', a.id], { status: 'done', draft: a.draft, note: a.note }], ['id']],
  ['upload_picture', 'Upload a picture (base64, under 2 MB) and get its address.', { base64: { type: 'string' }, type: { type: 'string', enum: ['image/webp', 'image/png', 'image/jpeg', 'image/gif'] } }, a => ['POST', ['media'], a], ['base64', 'type']],
  ['my_proposals', 'Your proposals and Nero\'s answers.', { all: { type: 'boolean' } }, a => ['GET', ['proposals'], null, a.all ? 'all=1' : '']],
  ['activity_log', 'What changed in the admin lately, and who did it.', { limit: { type: 'number' } }, a => ['GET', ['log'], null, 'limit=' + (a.limit || 30)]],
  ['markdown_guide', 'How to write articles in TZ Markdown, including Ache markers.', {}, () => ['GET', ['markdown']]],
];

async function mcp(req, d) {
  if (req.method === 'GET') return err(405, 'POST JSON-RPC here');
  if (req.method === 'DELETE') return new Response(null, { status: 204 });
  let msg; try { msg = await req.json() } catch (e) { return json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'parse error' } }) }
  const batch = Array.isArray(msg), out = [];
  for (const m of batch ? msg : [msg]) { const r = await one(m, d); if (r) out.push(r) }
  if (!out.length) return new Response(null, { status: 202 });
  return json(batch ? out : out[0]);
}
async function one(m, d) {
  const ok = result => ({ jsonrpc: '2.0', id: m.id, result });
  if (!m || m.jsonrpc !== '2.0' || typeof m.method !== 'string') return { jsonrpc: '2.0', id: m && m.id || null, error: { code: -32600, message: 'invalid request' } };
  if (m.id === undefined) return null; // notifications
  if (m.method === 'initialize') return ok({ protocolVersion: (m.params && m.params.protocolVersion) || '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'tzero-admin', version: '1.0.0' }, instructions: MANUAL.rules.join('\n') });
  if (m.method === 'ping') return ok({});
  if (m.method === 'tools/list') return ok({ tools: TOOLS.map(([name, description, props, , required]) => ({ name, description, inputSchema: { type: 'object', properties: props, ...(required ? { required } : {}) } })) });
  if (m.method === 'tools/call') {
    const t = TOOLS.find(x => x[0] === (m.params && m.params.name));
    if (!t) return { jsonrpc: '2.0', id: m.id, error: { code: -32602, message: 'unknown tool' } };
    const a = (m.params && m.params.arguments) || {};
    for (const k of t[4] || []) if (a[k] === undefined || a[k] === '') return ok({ isError: true, content: [{ type: 'text', text: 'missing ' + k }] });
    const [method, path, body, qs] = t[3](a);
    const r = await route(method, path, body ? Object.fromEntries(Object.entries(body).filter(([k]) => k !== 'slug' || method !== 'PUT')) : {}, new URLSearchParams(qs || ''), d);
    let status = 200, payload;
    if (r instanceof Response) { status = r.status; payload = await r.text() }
    else { status = r.status || 200; payload = JSON.stringify(r.body, null, 1) }
    return ok({ isError: status >= 400, content: [{ type: 'text', text: payload }] });
  }
  return { jsonrpc: '2.0', id: m.id, error: { code: -32601, message: 'method not found' } };
}

export default req => handle(req);

export const config = {
  path: ['/api/ai', '/api/ai/*', '/api/mcp'],
  rateLimit: { windowLimit: 60, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};
